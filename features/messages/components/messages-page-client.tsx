"use client";

import * as React from "react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import {
  ArrowLeft,
  ExternalLink,
  MessageCircle,
  Search,
  Send,
} from "lucide-react";

import { EmptyState } from "@/components/app/empty-state";
import { PageHeader } from "@/components/app/page-header";
import { PageShell } from "@/components/app/page-shell";
import { Panel } from "@/components/app/panel";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Textarea } from "@/components/ui/textarea";
import { CaseDetailsDialog } from "@/features/cases/components/case-details-dialog";
import { getCaseStatusMeta } from "@/features/cases/constants";
import { useCustomers } from "@/features/cases/hooks/useCustomers";
import { useEmployees } from "@/features/cases/hooks/useEmployees";
import { useProcesses } from "@/features/cases/hooks/useProcesses";
import { useServiceTypes } from "@/features/cases/hooks/useServiceTypes";
import {
  createCaseCommentApi,
  getCaseDetailsApi,
} from "@/features/cases/services/cases-client";
import type {
  CustomerOption,
  EditableCase,
  ServiceTypeOption,
} from "@/features/cases/types";
import {
  getMessageThreadQueryKey,
  getMessageThreadsQueryKey,
  MESSAGE_THREADS_QUERY_KEY,
  messagesApi,
} from "@/features/messages/services/messages-api";
import type {
  MessageThreadDetail,
  MessageThreadScope,
  MessageThreadSummary,
  MessageThreadsPayload,
} from "@/features/messages/types";
import type { Employee } from "@/features/employees/types";
import { mockComponents } from "@/lib/mock-data/pages";

type Props = {
  currentUserId: string;
  currentUserRole: string;
};

const THREADS_STALE_TIME_MS = 30_000;
const THREAD_DETAIL_STALE_TIME_MS = 60_000;
const PREFETCH_THREAD_COUNT = 4;
const DESKTOP_BREAKPOINT_PX = 1024;

export function MessagesPageClient({
  currentUserId,
  currentUserRole,
}: Props) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const queryClient = useQueryClient();
  const selectedCaseId = searchParams.get("case");
  const [searchValue, setSearchValue] = React.useState(searchParams.get("q") ?? "");
  const [requestedScope, setRequestedScope] =
    React.useState<MessageThreadScope>("assigned");
  const deferredSearch = React.useDeferredValue(searchValue.trim());
  const [draft, setDraft] = React.useState("");
  const [isPosting, setIsPosting] = React.useState(false);
  const [composerError, setComposerError] = React.useState<string | null>(null);
  const [caseDialogOpen, setCaseDialogOpen] = React.useState(false);
  const [dialogCase, setDialogCase] = React.useState<EditableCase | null>(null);
  const [openingCaseId, setOpeningCaseId] = React.useState<string | null>(null);
  const lastMarkedThreadRef = React.useRef<string | null>(null);
  const isDesktop = useDesktopLayout();

  const threadsQueryKey = React.useMemo(
    () =>
      getMessageThreadsQueryKey({
        q: deferredSearch || undefined,
        scope: requestedScope,
      }),
    [deferredSearch, requestedScope],
  );

  const threadsQuery = useQuery({
    queryKey: threadsQueryKey,
    queryFn: () =>
      messagesApi.getThreads({
        q: deferredSearch || undefined,
        scope: requestedScope,
      }),
    staleTime: THREADS_STALE_TIME_MS,
  });
  const threadsPayload = threadsQuery.data;
  const threads = React.useMemo(
    () => threadsPayload?.threads ?? [],
    [threadsPayload?.threads],
  );
  const activeScope = threadsPayload?.scope ?? requestedScope;
  const selectedThreadSummary = React.useMemo(
    () => threads.find((thread) => thread.caseId === selectedCaseId) ?? null,
    [selectedCaseId, threads],
  );

  const threadQuery = useQuery({
    queryKey: getMessageThreadQueryKey(selectedCaseId),
    queryFn: () => messagesApi.getThread(selectedCaseId as string),
    enabled: Boolean(selectedCaseId),
    staleTime: THREAD_DETAIL_STALE_TIME_MS,
    placeholderData: () => buildThreadPlaceholder(selectedThreadSummary),
  });

  const threadView = threadQuery.data ?? buildThreadPlaceholder(selectedThreadSummary);
  const showConversationSkeleton =
    Boolean(threadView?.latestMessageId) && threadQuery.isPlaceholderData;

  const loadCaseOptions = caseDialogOpen && currentUserRole !== "PRODUCTION";
  const customers = useCustomers(loadCaseOptions);
  const serviceTypes = useServiceTypes(loadCaseOptions);
  const processes = useProcesses(loadCaseOptions);
  const employees = useEmployees(loadCaseOptions);
  const optionQueries = loadCaseOptions
    ? [customers, serviceTypes, processes, employees]
    : [];
  const optionsLoading = optionQueries.some(
    (query) => query.isLoading || query.isFetching,
  );
  const optionsError =
    optionQueries.find((query) => query.isError)?.error ?? null;

  React.useEffect(() => {
    const params = new URLSearchParams(searchParams.toString());

    if (searchValue.trim()) {
      params.set("q", searchValue.trim());
    } else {
      params.delete("q");
    }

    const next = params.toString();
    const current = searchParams.toString();
    if (next !== current) {
      router.replace(next ? `${pathname}?${next}` : pathname, {
        scroll: false,
      });
    }
  }, [pathname, router, searchParams, searchValue]);

  React.useEffect(() => {
    setDraft("");
    setComposerError(null);
  }, [selectedCaseId]);

  React.useEffect(() => {
    if (threads.length === 0) {
      if (selectedCaseId) {
        updateSelectedCase(router, pathname, searchParams, null);
      }
      return;
    }

    if (!isDesktop) {
      return;
    }

    if (!selectedCaseId || !threads.some((thread) => thread.caseId === selectedCaseId)) {
      updateSelectedCase(router, pathname, searchParams, threads[0]?.caseId ?? null);
    }
  }, [isDesktop, pathname, router, searchParams, selectedCaseId, threads]);

  React.useEffect(() => {
    const prefetchIds = [
      selectedCaseId,
      ...threads
        .map((thread) => thread.caseId)
        .filter((caseId) => caseId !== selectedCaseId)
        .slice(0, PREFETCH_THREAD_COUNT - 1),
    ].filter((caseId): caseId is string => Boolean(caseId));

    prefetchIds.forEach((caseId) => {
      void prefetchThread(queryClient, caseId);
    });
  }, [queryClient, selectedCaseId, threads]);

  React.useEffect(() => {
    if (!threadQuery.data || !selectedCaseId) return;

    const marker = `${selectedCaseId}:${threadQuery.data.latestMessageId ?? "none"}`;
    if (lastMarkedThreadRef.current === marker) return;
    lastMarkedThreadRef.current = marker;

    void messagesApi
      .markThreadRead(selectedCaseId)
      .then(() => {
        applyThreadUpdate(queryClient, selectedCaseId, (thread) => ({
          ...thread,
          unreadCount: 0,
          latestMessageAt: thread.latestMessageAt,
        }));

        queryClient.setQueryData<MessageThreadDetail | undefined>(
          getMessageThreadQueryKey(selectedCaseId),
          (current) =>
            current
              ? {
                  ...current,
                  unreadCount: 0,
                  latestMessageAt: current.latestMessageAt,
                }
              : current,
        );
      })
      .catch(() => {
        lastMarkedThreadRef.current = null;
      });
  }, [queryClient, selectedCaseId, threadQuery.data]);

  function retryOptions() {
    void customers.refetch();
    void serviceTypes.refetch();
    void processes.refetch();
    void employees.refetch();
  }

  async function handleOpenCase() {
    if (!selectedCaseId || openingCaseId) return;

    try {
      setOpeningCaseId(selectedCaseId);
      setComposerError(null);
      const details = await getCaseDetailsApi(selectedCaseId);
      setDialogCase(details);
      setCaseDialogOpen(true);
    } catch (error) {
      setComposerError(
        error instanceof Error ? error.message : "Could not open case details.",
      );
    } finally {
      setOpeningCaseId(null);
    }
  }

  async function handleSendMessage() {
    if (!selectedCaseId) return;

    const body = draft.trim();
    if (!body) return;

    try {
      setIsPosting(true);
      setComposerError(null);
      const comment = await createCaseCommentApi(selectedCaseId, body);
      setDraft("");

      queryClient.setQueryData<MessageThreadDetail | undefined>(
        getMessageThreadQueryKey(selectedCaseId),
        (current) =>
          current
            ? {
                ...current,
                comments: [...current.comments, comment],
                latestMessageId: comment.id,
                latestMessagePreview: comment.body,
                latestMessageAt: comment.createdAt,
                unreadCount: 0,
              }
            : current,
      );

      applyThreadUpdate(queryClient, selectedCaseId, (thread) => ({
        ...thread,
        latestMessageId: comment.id,
        latestMessagePreview: comment.body,
        latestMessageAt: comment.createdAt,
        unreadCount: 0,
      }));

      await messagesApi.markThreadRead(selectedCaseId);
      await queryClient.invalidateQueries({ queryKey: [MESSAGE_THREADS_QUERY_KEY] });
    } catch (error) {
      setComposerError(
        error instanceof Error ? error.message : "Could not send message.",
      );
    } finally {
      setIsPosting(false);
    }
  }

  const isMobileConversation = Boolean(selectedCaseId);
  const dialogCustomers =
    currentUserRole === "PRODUCTION"
      ? buildProductionCustomerOptions(dialogCase)
      : (customers.data ?? []);
  const dialogServiceTypes =
    currentUserRole === "PRODUCTION"
      ? buildProductionServiceTypeOptions(dialogCase)
      : (serviceTypes.data ?? []);
  const dialogProcesses =
    currentUserRole === "PRODUCTION"
      ? (dialogCase?.availableProcesses ?? [])
      : (processes.data ?? []);
  const dialogEmployees =
    currentUserRole === "PRODUCTION"
      ? []
      : ((employees.data ?? []) as Employee[]);

  return (
    <PageShell width="wide">
      <PageHeader
        title="Messages"
        description="Assigned case chats in one inbox. Open a thread to review history and reply without hunting through individual case dialogs."
      />

      <div className="grid gap-6 lg:grid-cols-[22rem_minmax(0,1fr)] xl:grid-cols-[24rem_minmax(0,1fr)]">
        <Panel
          className={`min-h-[72vh] ${
            isMobileConversation ? "hidden lg:block" : "block"
          }`}
        >
          <div className="border-b border-border/40 p-4">
            <div className="flex items-center gap-2 rounded-xl border border-border/50 bg-muted/40 px-3">
              <Search className="h-4 w-4 text-muted-foreground" />
              <Input
                value={searchValue}
                onChange={(event) => setSearchValue(event.target.value)}
                placeholder="Search patient, case, customer, or message"
                className="border-0 bg-transparent px-0 shadow-none focus-visible:ring-0"
              />
            </div>

            {threadsPayload?.canViewAll ? (
              <div className="mt-3 flex gap-2">
                <Button
                  type="button"
                  size="sm"
                  variant={activeScope === "assigned" ? "default" : "outline"}
                  onClick={() => setRequestedScope("assigned")}
                >
                  Assigned
                </Button>
                <Button
                  type="button"
                  size="sm"
                  variant={activeScope === "all" ? "default" : "outline"}
                  onClick={() => setRequestedScope("all")}
                >
                  All accessible
                </Button>
              </div>
            ) : null}
          </div>

          <ScrollArea className="h-[calc(72vh-88px)]">
            {threadsQuery.isLoading ? (
              <div className="p-4 text-sm text-muted-foreground">
                Loading conversations...
              </div>
            ) : null}

            {threadsQuery.isError ? (
              <EmptyState
                title="Could not load conversations"
                description={
                  threadsQuery.error instanceof Error
                    ? threadsQuery.error.message
                    : "The inbox API did not return a successful response."
                }
                className="py-16"
              />
            ) : null}

            {!threadsQuery.isLoading &&
            !threadsQuery.isError &&
            threads.length === 0 ? (
              <EmptyState
                title="No active case threads"
                description="Eligible inbox threads come from active accessible cases. Adjust the search or wait for a new assigned case."
                icon={MessageCircle}
                className="py-20"
              />
            ) : null}

            {!threadsQuery.isLoading && !threadsQuery.isError && threads.length > 0 ? (
              <div className="divide-y divide-border/40">
                {threads.map((thread) => {
                  const isActive = thread.caseId === selectedCaseId;

                  return (
                    <button
                      key={thread.caseId}
                      type="button"
                      onMouseEnter={() => void prefetchThread(queryClient, thread.caseId)}
                      onFocus={() => void prefetchThread(queryClient, thread.caseId)}
                      onClick={() =>
                        updateSelectedCase(
                          router,
                          pathname,
                          searchParams,
                          thread.caseId,
                        )
                      }
                      className={`flex w-full items-start gap-3 px-4 py-4 text-left transition ${
                        isActive
                          ? "bg-emerald-50/70"
                          : "hover:bg-muted/50"
                      }`}
                    >
                      <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-emerald-100 text-sm font-semibold text-emerald-800">
                        {getThreadInitials(thread.patientName)}
                      </div>
                      <div className="min-w-0 flex-1">
                        <div className="flex items-start justify-between gap-3">
                          <div className="min-w-0">
                            <p className="truncate font-medium text-foreground">
                              {thread.patientName}
                            </p>
                            <p className="truncate text-xs text-muted-foreground">
                              {buildThreadLabel(
                                thread.caseCode,
                                thread.customerName,
                                "#",
                              )}
                            </p>
                          </div>
                          <div className="shrink-0 text-right">
                            <p className="text-xs text-muted-foreground">
                              {formatThreadTime(thread.latestMessageAt)}
                            </p>
                            {thread.unreadCount > 0 ? (
                              <span className="mt-1 inline-flex min-w-5 items-center justify-center rounded-full bg-emerald-600 px-1.5 py-0.5 text-[11px] font-semibold text-white">
                                {thread.unreadCount}
                              </span>
                            ) : null}
                          </div>
                        </div>
                        <p className="mt-2 truncate text-sm text-muted-foreground">
                          {thread.latestMessagePreview ?? "No messages yet."}
                        </p>
                        <div className="mt-2 flex flex-wrap items-center gap-2 text-xs text-muted-foreground">
                          {thread.serviceLabel ? <span>{thread.serviceLabel}</span> : null}
                          {thread.currentProcessName ? (
                            <span>
                              {buildThreadLabel(
                                thread.currentProcessName,
                                thread.currentProcessAssigneeName,
                              )}
                            </span>
                          ) : null}
                        </div>
                      </div>
                    </button>
                  );
                })}
              </div>
            ) : null}
          </ScrollArea>
        </Panel>

        <Panel
          className={`min-h-[72vh] overflow-hidden ${
            !isMobileConversation ? "hidden lg:block" : "block"
          }`}
        >
          {!selectedCaseId ? (
            <EmptyState
              title="Select a conversation"
              description="Pick a case thread on the left to review chat history."
              icon={MessageCircle}
              className="py-28"
            />
          ) : !threadView ? (
            <div className="flex min-h-[72vh] items-center justify-center text-sm text-muted-foreground">
              Loading conversation...
            </div>
          ) : threadQuery.isError ? (
            <EmptyState
              title="Could not load conversation"
              description={
                threadQuery.error instanceof Error
                  ? threadQuery.error.message
                  : "The selected thread could not be loaded."
              }
              className="py-28"
            />
          ) : (
            <div className="flex h-[72vh] flex-col bg-[radial-gradient(circle_at_top,_rgba(16,185,129,0.10),_transparent_30%),linear-gradient(180deg,rgba(255,255,255,0.9),rgba(248,250,252,0.96))]">
              <div className="border-b border-border/40 bg-background/90 px-4 py-4 backdrop-blur">
                <div className="flex items-start justify-between gap-4">
                  <div className="flex min-w-0 items-start gap-3">
                    <Button
                      type="button"
                      variant="ghost"
                      size="icon"
                      className="shrink-0 lg:hidden"
                      onClick={() =>
                        updateSelectedCase(router, pathname, searchParams, null)
                      }
                    >
                      <ArrowLeft className="h-4 w-4" />
                    </Button>
                    <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-emerald-100 text-sm font-semibold text-emerald-800">
                      {getThreadInitials(threadView.patientName)}
                    </div>
                    <div className="min-w-0">
                      <div className="flex flex-wrap items-center gap-2">
                        <h2 className="truncate text-lg font-semibold">
                          {threadView.patientName}
                        </h2>
                        <Badge variant={getCaseStatusVariant(threadView.currentStatus)}>
                          {getCaseStatusMeta(threadView.currentStatus)?.shortLabel ??
                            threadView.currentStatus}
                        </Badge>
                      </div>
                      <p className="text-sm text-muted-foreground">
                        {buildThreadLabel(
                          threadView.caseCode,
                          threadView.customerName,
                          "#",
                        )}
                      </p>
                      <div className="mt-2 flex flex-wrap gap-2 text-xs text-muted-foreground">
                        {threadView.serviceLabel ? <span>{threadView.serviceLabel}</span> : null}
                        {threadView.currentProcessName ? (
                          <span>
                            {buildThreadLabel(
                              threadView.currentProcessName,
                              threadView.currentProcessAssigneeName,
                            )}
                          </span>
                        ) : null}
                      </div>
                    </div>
                  </div>
                  <Button
                    type="button"
                    variant="outline"
                    onClick={() => void handleOpenCase()}
                    disabled={openingCaseId === threadView.caseId}
                  >
                    <ExternalLink className="h-4 w-4" />
                    {openingCaseId === threadView.caseId ? "Opening..." : "Open case"}
                  </Button>
                </div>
              </div>

              <ScrollArea className="flex-1 px-4 py-5">
                <div className="mx-auto flex max-w-4xl flex-col gap-3">
                  {showConversationSkeleton ? (
                    <ConversationSkeleton />
                  ) : threadView.comments.length === 0 ? (
                    <EmptyState
                      title="No messages yet"
                      description="This case is already eligible for the inbox. Use the composer below to send the first update."
                      icon={MessageCircle}
                      className="py-24"
                    />
                  ) : null}
                  {!showConversationSkeleton
                    ? threadView.comments.map((comment) => {
                        const isOwn = comment.authorUserId === currentUserId;

                        return (
                          <div
                            key={comment.id}
                            className={`flex ${
                              isOwn ? "justify-end" : "justify-start"
                            }`}
                          >
                            <div
                              className={`max-w-[85%] rounded-2xl px-4 py-3 shadow-sm ${
                                isOwn
                                  ? "rounded-br-md bg-emerald-500 text-white"
                                  : "rounded-bl-md border border-border/40 bg-background text-foreground"
                              }`}
                            >
                              <div className="mb-1 flex items-center gap-2 text-xs opacity-80">
                                <span className="font-medium">{comment.authorName}</span>
                                <span>{comment.authorRole}</span>
                              </div>
                              <p className="whitespace-pre-wrap text-sm leading-6">
                                {comment.body}
                              </p>
                              <p
                                className={`mt-2 text-[11px] ${
                                  isOwn
                                    ? "text-emerald-50/90"
                                    : "text-muted-foreground"
                                }`}
                              >
                                {formatMessageTime(comment.createdAt)}
                              </p>
                            </div>
                          </div>
                        );
                      })
                    : null}
                </div>
              </ScrollArea>

              <div className="border-t border-border/40 bg-background/95 p-4">
                <div className="mx-auto max-w-4xl">
                  <div className="flex items-end gap-3 rounded-2xl border border-border/50 bg-background p-3 shadow-sm">
                    <Textarea
                      value={draft}
                      onChange={(event) => setDraft(event.target.value)}
                      placeholder={
                        threadView.canReply
                          ? "Write a message for this case"
                          : "You cannot reply in this thread"
                      }
                      rows={2}
                      disabled={!threadView.canReply || isPosting}
                      className="min-h-[56px] border-0 px-0 shadow-none focus-visible:ring-0"
                    />
                    <Button
                      type="button"
                      size="icon"
                      onClick={() => void handleSendMessage()}
                      disabled={!threadView.canReply || isPosting || !draft.trim()}
                    >
                      <Send className="h-4 w-4" />
                    </Button>
                  </div>
                  {composerError ? (
                    <p className="mt-2 text-sm text-red-600">{composerError}</p>
                  ) : null}
                </div>
              </div>
            </div>
          )}
        </Panel>
      </div>

      <CaseDetailsDialog
        open={caseDialogOpen}
        onOpenChange={(nextOpen) => {
          setCaseDialogOpen(nextOpen);
          if (!nextOpen) {
            setDialogCase(null);
            void queryClient.invalidateQueries({ queryKey: [MESSAGE_THREADS_QUERY_KEY] });
            if (selectedCaseId) {
              void queryClient.invalidateQueries({
                queryKey: getMessageThreadQueryKey(selectedCaseId),
              });
            }
          }
        }}
        item={dialogCase}
        currentUserRole={currentUserRole}
        customers={dialogCustomers}
        serviceTypes={dialogServiceTypes}
        components={mockComponents}
        processes={dialogProcesses}
        employees={dialogEmployees}
        optionsLoading={optionsLoading}
        optionsError={
          optionsError
            ? optionsError instanceof Error
              ? optionsError.message
              : "Could not load case options."
            : null
        }
        onRetryOptions={retryOptions}
      />
    </PageShell>
  );
}

function applyThreadUpdate(
  queryClient: ReturnType<typeof useQueryClient>,
  caseId: string,
  updater: (thread: MessageThreadSummary) => MessageThreadSummary,
) {
  queryClient.setQueriesData<MessageThreadsPayload | undefined>(
    { queryKey: [MESSAGE_THREADS_QUERY_KEY] },
    (current) => {
      if (!current) return current;

      const updatedThreads = current.threads
        .map((thread) =>
          thread.caseId === caseId ? updater(thread) : thread,
        )
        .sort((left, right) =>
          right.latestMessageAt.localeCompare(left.latestMessageAt),
        );

      return {
        ...current,
        threads: updatedThreads,
      };
    },
  );
}

async function prefetchThread(
  queryClient: ReturnType<typeof useQueryClient>,
  caseId: string,
) {
  await queryClient.prefetchQuery({
    queryKey: getMessageThreadQueryKey(caseId),
    queryFn: () => messagesApi.getThread(caseId),
    staleTime: THREAD_DETAIL_STALE_TIME_MS,
  });
}

function updateSelectedCase(
  router: ReturnType<typeof useRouter>,
  pathname: string,
  searchParams: ReturnType<typeof useSearchParams>,
  caseId: string | null,
) {
  const params = new URLSearchParams(searchParams.toString());

  if (caseId) {
    params.set("case", caseId);
  } else {
    params.delete("case");
  }

  const next = params.toString();
  router.replace(next ? `${pathname}?${next}` : pathname, { scroll: false });
}

function getCaseStatusVariant(
  status: string,
): "neutral" | "warning" | "info" | "success" | "danger" {
  const tone = getCaseStatusMeta(status)?.tone;

  switch (tone) {
    case "warning":
      return "warning";
    case "info":
      return "info";
    case "success":
      return "success";
    case "danger":
      return "danger";
    default:
      return "neutral";
  }
}

function getThreadInitials(value: string) {
  return value
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0]?.toUpperCase() ?? "")
    .join("");
}

function buildThreadLabel(
  primary: string,
  secondary: string | null,
  primaryPrefix = "",
) {
  return secondary
    ? `${primaryPrefix}${primary} - ${secondary}`
    : `${primaryPrefix}${primary}`;
}

function formatThreadTime(value: string) {
  const date = new Date(value);
  const now = new Date();
  const sameDay =
    date.getFullYear() === now.getFullYear() &&
    date.getMonth() === now.getMonth() &&
    date.getDate() === now.getDate();

  return new Intl.DateTimeFormat(
    "pt-BR",
    sameDay ? { timeStyle: "short" } : { dateStyle: "short" },
  ).format(date);
}

function formatMessageTime(value: string) {
  return new Intl.DateTimeFormat("pt-BR", {
    dateStyle: "short",
    timeStyle: "short",
  }).format(new Date(value));
}

function buildThreadPlaceholder(
  thread: MessageThreadSummary | null,
): MessageThreadDetail | undefined {
  if (!thread) return undefined;

  return {
    ...thread,
    comments: [],
  };
}

function useDesktopLayout() {
  const [isDesktop, setIsDesktop] = React.useState(false);

  React.useEffect(() => {
    const mediaQuery = window.matchMedia(`(min-width: ${DESKTOP_BREAKPOINT_PX}px)`);
    const syncMatch = () => setIsDesktop(mediaQuery.matches);

    syncMatch();
    mediaQuery.addEventListener("change", syncMatch);

    return () => {
      mediaQuery.removeEventListener("change", syncMatch);
    };
  }, []);

  return isDesktop;
}

function ConversationSkeleton() {
  return (
    <div className="space-y-4 py-2">
      <div className="flex justify-start">
        <div className="w-[68%] rounded-2xl rounded-bl-md border border-border/40 bg-background px-4 py-3 shadow-sm">
          <div className="mb-3 h-3 w-24 animate-pulse rounded bg-muted" />
          <div className="space-y-2">
            <div className="h-3 w-full animate-pulse rounded bg-muted" />
            <div className="h-3 w-5/6 animate-pulse rounded bg-muted" />
          </div>
        </div>
      </div>
      <div className="flex justify-end">
        <div className="w-[62%] rounded-2xl rounded-br-md bg-emerald-100 px-4 py-3 shadow-sm">
          <div className="mb-3 ml-auto h-3 w-20 animate-pulse rounded bg-emerald-200" />
          <div className="space-y-2">
            <div className="ml-auto h-3 w-full animate-pulse rounded bg-emerald-200" />
            <div className="ml-auto h-3 w-4/5 animate-pulse rounded bg-emerald-200" />
          </div>
        </div>
      </div>
      <div className="flex justify-start">
        <div className="w-[74%] rounded-2xl rounded-bl-md border border-border/40 bg-background px-4 py-3 shadow-sm">
          <div className="mb-3 h-3 w-28 animate-pulse rounded bg-muted" />
          <div className="space-y-2">
            <div className="h-3 w-full animate-pulse rounded bg-muted" />
            <div className="h-3 w-2/3 animate-pulse rounded bg-muted" />
          </div>
        </div>
      </div>
    </div>
  );
}

function buildProductionCustomerOptions(
  caseItem: EditableCase | null,
): CustomerOption[] {
  if (!caseItem?.customerId) return [];

  return [
    {
      id: caseItem.customerId,
      dentalLabId: caseItem.dentalLabId,
      labCustomerId: caseItem.labCustomerId ?? null,
      name: caseItem.customerName,
      dentists: caseItem.dentistId
        ? [
            {
              id: caseItem.dentistId,
              name: caseItem.dentistName || "Assigned dentist",
            },
          ]
        : [],
      price_table: null,
    },
  ];
}

function buildProductionServiceTypeOptions(
  caseItem: EditableCase | null,
): ServiceTypeOption[] {
  if (!caseItem) return [];

  return caseItem.serviceLines.map((serviceLine) => ({
    id: serviceLine.serviceTypeId,
    name: serviceLine.serviceTypeName,
    base_price: serviceLine.serviceBasePriceSnapshot,
    currency: caseItem.labCurrency,
    workflow_json: {
      steps: serviceLine.processes.map((process) => ({
        id: process.workflow_step_id,
        process_id: process.process_id,
        dependsOn: process.dependsOnCaseProcessIds
          .map((dependencyId) =>
            serviceLine.processes.find(
              (candidate) => candidate.id === dependencyId,
            )?.workflow_step_id,
          )
          .filter((stepId): stepId is string => Boolean(stepId)),
      })),
    },
  }));
}
