"use client";

import * as React from "react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import {
  ArrowLeft,
  Check,
  ChevronDown,
  MessageCircle,
  Search,
  Send,
} from "lucide-react";

import { EmptyState } from "@/components/app/empty-state";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
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
  CaseCommentItem,
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
import { cn } from "@/lib/utils";

type Props = {
  currentUserId: string;
  currentUserRole: string;
};

type MessageListRow =
  | {
      type: "day";
      id: string;
      label: string;
    }
  | {
      type: "message";
      id: string;
      comment: CaseCommentItem;
      isOwn: boolean;
      showAuthor: boolean;
      startsGroup: boolean;
      endsGroup: boolean;
    };

const THREADS_STALE_TIME_MS = 30_000;
const THREAD_DETAIL_STALE_TIME_MS = 60_000;
const PREFETCH_THREAD_COUNT = 4;
const DESKTOP_BREAKPOINT_PX = 1024;

export function MessagesPageClient({ currentUserId, currentUserRole }: Props) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const queryClient = useQueryClient();
  const selectedCaseId = searchParams.get("case");
  const [searchValue, setSearchValue] = React.useState(
    searchParams.get("q") ?? "",
  );
  const [requestedScope, setRequestedScope] =
    React.useState<MessageThreadScope>("assigned");
  const deferredSearch = React.useDeferredValue(searchValue.trim());
  const [draft, setDraft] = React.useState("");
  const [isPosting, setIsPosting] = React.useState(false);
  const [composerError, setComposerError] = React.useState<string | null>(null);
  const [caseDialogOpen, setCaseDialogOpen] = React.useState(false);
  const [dialogCase, setDialogCase] = React.useState<EditableCase | null>(null);
  const [openingCaseId, setOpeningCaseId] = React.useState<string | null>(null);
  const [detailsExpanded, setDetailsExpanded] = React.useState(false);
  const lastMarkedThreadRef = React.useRef<string | null>(null);
  const conversationRef = React.useRef<HTMLDivElement | null>(null);
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

  const threadView =
    threadQuery.data ?? buildThreadPlaceholder(selectedThreadSummary);
  const showConversationSkeleton =
    Boolean(threadView?.latestMessageId) && threadQuery.isPlaceholderData;
  const messageRows = React.useMemo(
    () =>
      threadView ? buildMessageRows(threadView.comments, currentUserId) : [],
    [currentUserId, threadView],
  );

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
    setDetailsExpanded(false);
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

    if (
      !selectedCaseId ||
      !threads.some((thread) => thread.caseId === selectedCaseId)
    ) {
      updateSelectedCase(
        router,
        pathname,
        searchParams,
        threads[0]?.caseId ?? null,
      );
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

  const activeConversationId = threadView?.caseId ?? null;
  const activeConversationMessageCount = threadView?.comments.length ?? 0;

  React.useEffect(() => {
    if (!activeConversationId || showConversationSkeleton) {
      return;
    }

    const viewport = conversationRef.current;
    if (!viewport) {
      return;
    }

    viewport.scrollTo({
      top: viewport.scrollHeight,
      behavior: "smooth",
    });
  }, [
    activeConversationId,
    activeConversationMessageCount,
    showConversationSkeleton,
  ]);

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
      await queryClient.invalidateQueries({
        queryKey: [MESSAGE_THREADS_QUERY_KEY],
      });
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
    <main className="box-border flex h-full min-h-0 overflow-hidden bg-background text-slate-900">
      <div className="relative isolate flex min-h-0 flex-1 overflow-hidden">
        <div className="relative mx-auto box-border flex h-full min-h-0 w-full max-w-[96rem] flex-1 flex-col px-0 sm:px-6 sm:py-8">
          <section className="grid min-h-0 flex-1 overflow-hidden bg-background lg:grid-cols-[23rem_minmax(0,1fr)]">
            <aside
              className={cn(
                "flex min-h-0 flex-col border-r border-border/40 bg-card",
                isMobileConversation ? "hidden lg:flex" : "flex",
              )}
            >
              <div className="border-b border-border/40 bg-card px-4 py-4">
                <div className="flex items-center justify-between gap-3">
                  <div>
                    <p className="text-[11px] font-semibold uppercase tracking-[0.24em] text-slate-500">
                      Case inbox
                    </p>
                    <h1 className="mt-1 text-[1.65rem] font-semibold tracking-[-0.03em] text-slate-900">
                      Messages
                    </h1>
                  </div>
                  <div className="rounded-full bg-background px-3 py-1 text-xs font-medium text-slate-500 shadow-sm ring-1 ring-border/50">
                    {threads.length} active
                  </div>
                </div>

                <div className="mt-4 flex items-center gap-3 rounded-full bg-background px-4 py-3 shadow-sm ring-1 ring-border/50 transition focus-within:ring-2 focus-within:ring-emerald-500/30">
                  <Search className="h-4 w-4 text-slate-400" />
                  <Input
                    value={searchValue}
                    onChange={(event) => setSearchValue(event.target.value)}
                    placeholder="Search patient, case, customer, or message"
                    className="h-auto border-0 bg-transparent px-0 text-[15px] shadow-none focus-visible:ring-0"
                  />
                </div>

                {threadsPayload?.canViewAll ? (
                  <div className="mt-4 inline-flex rounded-full bg-muted p-1 shadow-inner">
                    <button
                      type="button"
                      onClick={() => setRequestedScope("assigned")}
                      className={cn(
                        "rounded-full px-4 py-2 text-sm font-medium transition",
                        activeScope === "assigned"
                          ? "bg-white text-slate-900 shadow-sm"
                          : "text-slate-500 hover:text-slate-700",
                      )}
                    >
                      Assigned
                    </button>
                    <button
                      type="button"
                      onClick={() => setRequestedScope("all")}
                      className={cn(
                        "rounded-full px-4 py-2 text-sm font-medium transition",
                        activeScope === "all"
                          ? "bg-white text-slate-900 shadow-sm"
                          : "text-slate-500 hover:text-slate-700",
                      )}
                    >
                      All accessible
                    </button>
                  </div>
                ) : null}
              </div>

              <div className="min-h-0 flex-1 overflow-y-auto">
                {threadsQuery.isLoading ? (
                  <div className="space-y-3 p-4">
                    {Array.from({ length: 8 }).map((_, index) => (
                      <ThreadListSkeleton key={index} />
                    ))}
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
                    className="px-6 py-16"
                  />
                ) : null}

                {!threadsQuery.isLoading &&
                !threadsQuery.isError &&
                threads.length === 0 ? (
                  <EmptyState
                    title="No active case threads"
                    description="Eligible inbox threads come from active accessible cases. Adjust the search or wait for a new assigned case."
                    icon={MessageCircle}
                    className="px-6 py-20"
                  />
                ) : null}

                {!threadsQuery.isLoading &&
                !threadsQuery.isError &&
                threads.length > 0 ? (
                  <div className="divide-y divide-slate-200/80">
                    {threads.map((thread) => {
                      const isActive = thread.caseId === selectedCaseId;
                      const hasUnread = thread.unreadCount > 0;

                      return (
                        <button
                          key={thread.caseId}
                          type="button"
                          onMouseEnter={() =>
                            void prefetchThread(queryClient, thread.caseId)
                          }
                          onFocus={() =>
                            void prefetchThread(queryClient, thread.caseId)
                          }
                          onClick={() =>
                            updateSelectedCase(
                              router,
                              pathname,
                              searchParams,
                              thread.caseId,
                            )
                          }
                          className={cn(
                            "flex w-full items-start gap-3 px-4 py-3 text-left transition",
                            isActive
                              ? "bg-[#d9fdd3]"
                              : "bg-transparent hover:bg-white/80",
                          )}
                        >
                          <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-full bg-[#dfe7ec] text-sm font-semibold text-slate-700">
                            {getThreadInitials(thread.patientName)}
                          </div>
                          <div className="min-w-0 flex-1">
                            <div className="flex items-start justify-between gap-3">
                              <div className="min-w-0">
                                <p className="truncate text-[15px] font-medium text-slate-900">
                                  {thread.patientName}
                                </p>
                                <p className="truncate text-xs text-slate-500">
                                  {buildThreadLabel(
                                    thread.caseCode,
                                    thread.customerName,
                                    "#",
                                  )}
                                </p>
                              </div>
                              <div className="shrink-0 text-right">
                                <p
                                  className={cn(
                                    "text-[11px] font-medium",
                                    hasUnread
                                      ? "text-emerald-700"
                                      : "text-slate-400",
                                  )}
                                >
                                  {formatThreadTime(thread.latestMessageAt)}
                                </p>
                                {hasUnread ? (
                                  <span className="mt-1 inline-flex min-w-5 items-center justify-center rounded-full bg-emerald-600 px-1.5 py-0.5 text-[11px] font-semibold text-white">
                                    {thread.unreadCount}
                                  </span>
                                ) : null}
                              </div>
                            </div>

                            <div className="mt-1 flex items-start gap-2">
                              <p
                                className={cn(
                                  "line-clamp-1 min-w-0 flex-1 text-sm",
                                  hasUnread
                                    ? "text-slate-700"
                                    : "text-slate-500",
                                )}
                              >
                                {thread.latestMessagePreview ??
                                  "No messages yet. Start the case thread."}
                              </p>
                              {!hasUnread && thread.latestMessageId ? (
                                <Check className="mt-0.5 h-3.5 w-3.5 shrink-0 text-slate-400" />
                              ) : null}
                            </div>

                            <div className="mt-2 flex flex-wrap items-center gap-2 text-[11px] text-slate-500">
                              {thread.serviceLabel ? (
                                <span className="rounded-full bg-white px-2 py-1 ring-1 ring-slate-200">
                                  {thread.serviceLabel}
                                </span>
                              ) : null}
                              {thread.currentProcessName ? (
                                <span className="truncate">
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
              </div>
            </aside>

            <section
              className={cn(
                "flex min-h-0 h-full flex-col overflow-hidden bg-background",
                !isMobileConversation ? "hidden lg:flex" : "flex",
              )}
            >
              {!selectedCaseId ? (
                <div className="flex min-h-0 flex-1 items-center justify-center bg-background px-6">
                  <EmptyState
                    title="Select a conversation"
                    description="Pick a case thread to review history and send updates without leaving the inbox."
                    icon={MessageCircle}
                    className="py-28"
                  />
                </div>
              ) : !threadView ? (
                <div className="flex min-h-0 flex-1 items-center justify-center bg-background text-sm text-slate-500">
                  Loading conversation...
                </div>
              ) : threadQuery.isError ? (
                <div className="flex min-h-0 flex-1 items-center justify-center bg-background px-6">
                  <EmptyState
                    title="Could not load conversation"
                    description={
                      threadQuery.error instanceof Error
                        ? threadQuery.error.message
                        : "The selected thread could not be loaded."
                    }
                    className="py-28"
                  />
                </div>
              ) : (
                <div className="flex min-h-0 h-full flex-1 flex-col overflow-hidden">
                  <header className="border-b border-border/40 bg-card px-4 py-3 shadow-sm">
                    <div className="flex items-start gap-4">
                      <div
                        role="button"
                        tabIndex={0}
                        onClick={() => void handleOpenCase()}
                        onKeyDown={(event) => {
                          if (event.key === "Enter" || event.key === " ") {
                            event.preventDefault();
                            void handleOpenCase();
                          }
                        }}
                        aria-disabled={openingCaseId === threadView.caseId}
                        className={cn(
                          "flex min-w-0 flex-1 items-start gap-3 rounded-2xl p-1 text-left transition hover:bg-muted/50",
                          openingCaseId === threadView.caseId &&
                            "cursor-wait opacity-70",
                        )}
                      >
                        <button
                          type="button"
                          className="mt-0.5 shrink-0 rounded-full p-2 text-slate-500 transition hover:bg-white lg:hidden"
                          onClick={(event) => {
                            event.stopPropagation();
                            updateSelectedCase(
                              router,
                              pathname,
                              searchParams,
                              null,
                            );
                          }}
                        >
                          <ArrowLeft className="h-5 w-5" />
                        </button>
                        <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-[#dfe7ec] text-sm font-semibold text-slate-700">
                          {getThreadInitials(threadView.patientName)}
                        </div>
                        <div className="min-w-0">
                          <div className="flex flex-wrap items-center gap-x-2 gap-y-1">
                            <h2 className="truncate text-[1.05rem] font-semibold tracking-[-0.02em] text-slate-900">
                              {threadView.patientName}
                            </h2>
                            <span className="text-xs text-slate-400">•</span>
                            <p className="truncate text-sm text-slate-500">
                              {buildThreadLabel(
                                threadView.caseCode,
                                threadView.customerName,
                                "#",
                              )}
                            </p>
                          </div>
                          <button
                            type="button"
                            onClick={(event) => {
                              event.stopPropagation();
                              setDetailsExpanded((current) => !current);
                            }}
                            className="mt-1 inline-flex items-center gap-1 text-sm text-slate-500 transition hover:text-slate-700"
                          >
                            <span>
                              {threadView.serviceLabel ??
                                threadView.currentProcessName ??
                                "Case details"}
                            </span>
                            <ChevronDown
                              className={cn(
                                "h-4 w-4 transition",
                                detailsExpanded ? "rotate-180" : "rotate-0",
                              )}
                            />
                          </button>
                        </div>
                      </div>

                      <div className="flex shrink-0 items-center gap-2 pt-1">
                        <Badge
                          variant={getCaseStatusVariant(
                            threadView.currentStatus,
                          )}
                        >
                          {getCaseStatusMeta(threadView.currentStatus)
                            ?.shortLabel ?? threadView.currentStatus}
                        </Badge>
                      </div>
                    </div>

                    {detailsExpanded ? (
                      <div className="mt-3 flex flex-wrap gap-2 border-t border-slate-200 pt-3 text-xs text-slate-600">
                        {threadView.serviceLabel ? (
                          <span className="rounded-full bg-white px-3 py-1.5 ring-1 ring-slate-200">
                            Service: {threadView.serviceLabel}
                          </span>
                        ) : null}
                        {threadView.currentProcessName ? (
                          <span className="rounded-full bg-white px-3 py-1.5 ring-1 ring-slate-200">
                            Process:{" "}
                            {buildThreadLabel(
                              threadView.currentProcessName,
                              threadView.currentProcessAssigneeName,
                            )}
                          </span>
                        ) : null}
                        {threadView.patientDetail ? (
                          <span className="rounded-full bg-white px-3 py-1.5 ring-1 ring-slate-200">
                            {threadView.patientDetail}
                          </span>
                        ) : null}
                      </div>
                    ) : null}
                  </header>

                  <div
                    ref={conversationRef}
                    className="min-h-0 flex-1 overflow-y-scroll bg-background px-3 py-4 pb-6 [scrollbar-gutter:stable] sm:px-6"
                  >
                    <div className="mx-auto flex max-w-4xl flex-col gap-1">
                      {showConversationSkeleton ? (
                        <ConversationSkeleton />
                      ) : threadView.comments.length === 0 ? (
                        <div className="flex min-h-full items-center justify-center">
                          <EmptyState
                            title="No messages yet"
                            description="This case is already in the inbox. Use the composer below to send the first update."
                            icon={MessageCircle}
                            className="rounded-[2rem] bg-white/70 px-10 py-14 shadow-sm ring-1 ring-white/60 backdrop-blur"
                          />
                        </div>
                      ) : null}

                      {!showConversationSkeleton
                        ? messageRows.map((row) => {
                            if (row.type === "day") {
                              return (
                                <div key={row.id} className="py-4">
                                  <div className="mx-auto w-fit rounded-full bg-[#d8dbd4] px-3 py-1 text-[11px] font-medium text-slate-600 shadow-sm">
                                    {row.label}
                                  </div>
                                </div>
                              );
                            }

                            return (
                              <div
                                key={row.id}
                                className={cn(
                                  "flex",
                                  row.isOwn ? "justify-end" : "justify-start",
                                  row.startsGroup ? "mt-3" : "mt-1",
                                )}
                              >
                                <div
                                  className={cn(
                                    "max-w-[86%] px-3.5 py-2.5 text-sm shadow-sm sm:max-w-[72%]",
                                    row.isOwn
                                      ? "bg-[#d9fdd3] text-slate-900"
                                      : "bg-white text-slate-900",
                                    row.isOwn
                                      ? row.startsGroup
                                        ? "rounded-[1.35rem] rounded-br-md"
                                        : row.endsGroup
                                          ? "rounded-[1.35rem] rounded-tr-md"
                                          : "rounded-[1.35rem] rounded-r-md"
                                      : row.startsGroup
                                        ? "rounded-[1.35rem] rounded-bl-md"
                                        : row.endsGroup
                                          ? "rounded-[1.35rem] rounded-tl-md"
                                          : "rounded-[1.35rem] rounded-l-md",
                                  )}
                                >
                                  {row.showAuthor ? (
                                    <p className="mb-1 text-[11px] font-semibold tracking-[0.01em] text-emerald-700">
                                      {row.comment.authorName}
                                      <span className="ml-1 font-normal text-slate-500">
                                        {row.comment.authorRole}
                                      </span>
                                    </p>
                                  ) : null}

                                  <p className="whitespace-pre-wrap break-words leading-6">
                                    {row.comment.body}
                                  </p>

                                  <div className="mt-1 flex items-center justify-end gap-1.5 text-[11px] text-slate-500">
                                    <span>
                                      {formatBubbleTime(row.comment.createdAt)}
                                    </span>
                                    {row.isOwn ? (
                                      <Check className="h-3.5 w-3.5" />
                                    ) : null}
                                  </div>
                                </div>
                              </div>
                            );
                          })
                        : null}
                    </div>
                  </div>

                  <div className="sticky bottom-0 shrink-0 border-t border-border/40 bg-card px-3 py-3 sm:px-6">
                    <div className="mx-auto max-w-4xl">
                      <div className="flex items-center gap-3 rounded-[1.65rem] bg-white px-4 py-3 shadow-sm ring-1 ring-slate-200">
                        <Textarea
                          value={draft}
                          onChange={(event) => setDraft(event.target.value)}
                          placeholder={
                            threadView.canReply
                              ? "Type a case update"
                              : "You cannot reply in this thread"
                          }
                          rows={1}
                          disabled={!threadView.canReply || isPosting}
                          className="field-sizing-fixed h-11 min-h-11 max-h-36 resize-none border-0 px-0 py-2.5 text-[15px] leading-6 shadow-none focus-visible:ring-0"
                        />
                        <button
                          type="button"
                          onClick={() => void handleSendMessage()}
                          disabled={
                            !threadView.canReply || isPosting || !draft.trim()
                          }
                          className="inline-flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-[#00a884] text-white transition hover:bg-[#00906f] disabled:cursor-not-allowed disabled:bg-slate-300"
                        >
                          <Send className="h-4 w-4" />
                        </button>
                      </div>
                      {composerError ? (
                        <p className="mt-2 text-sm text-rose-600">
                          {composerError}
                        </p>
                      ) : null}
                    </div>
                  </div>
                </div>
              )}
            </section>
          </section>
        </div>
      </div>

      <CaseDetailsDialog
        open={caseDialogOpen}
        onOpenChange={(nextOpen) => {
          setCaseDialogOpen(nextOpen);
          if (!nextOpen) {
            setDialogCase(null);
            void queryClient.invalidateQueries({
              queryKey: [MESSAGE_THREADS_QUERY_KEY],
            });
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
    </main>
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
        .map((thread) => (thread.caseId === caseId ? updater(thread) : thread))
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

function formatBubbleTime(value: string) {
  return new Intl.DateTimeFormat("pt-BR", {
    timeStyle: "short",
  }).format(new Date(value));
}

function formatDayLabel(value: string) {
  const date = new Date(value);
  const today = startOfDay(new Date());
  const target = startOfDay(date);
  const diffDays = Math.round(
    (target.getTime() - today.getTime()) / (1000 * 60 * 60 * 24),
  );

  if (diffDays === 0) return "Today";
  if (diffDays === -1) return "Yesterday";

  return new Intl.DateTimeFormat("pt-BR", {
    dateStyle: "medium",
  }).format(date);
}

function buildMessageRows(
  comments: CaseCommentItem[],
  currentUserId: string,
): MessageListRow[] {
  const rows: MessageListRow[] = [];
  let previousComment: CaseCommentItem | null = null;

  comments.forEach((comment, index) => {
    const nextComment = comments[index + 1] ?? null;
    const currentDayKey = getDayKey(comment.createdAt);
    const previousDayKey = previousComment
      ? getDayKey(previousComment.createdAt)
      : null;

    if (currentDayKey !== previousDayKey) {
      rows.push({
        type: "day",
        id: `day-${currentDayKey}`,
        label: formatDayLabel(comment.createdAt),
      });
    }

    const isOwn = comment.authorUserId === currentUserId;
    const startsGroup =
      !previousComment || !belongsToSameGroup(previousComment, comment);
    const endsGroup = !nextComment || !belongsToSameGroup(comment, nextComment);

    rows.push({
      type: "message",
      id: comment.id,
      comment,
      isOwn,
      showAuthor: !isOwn && startsGroup,
      startsGroup,
      endsGroup,
    });

    previousComment = comment;
  });

  return rows;
}

function belongsToSameGroup(left: CaseCommentItem, right: CaseCommentItem) {
  if (left.authorUserId !== right.authorUserId) {
    return false;
  }

  if (getDayKey(left.createdAt) !== getDayKey(right.createdAt)) {
    return false;
  }

  const diffMs =
    new Date(right.createdAt).getTime() - new Date(left.createdAt).getTime();

  return diffMs < 5 * 60 * 1000;
}

function getDayKey(value: string) {
  const date = new Date(value);
  return `${date.getFullYear()}-${date.getMonth()}-${date.getDate()}`;
}

function startOfDay(date: Date) {
  return new Date(date.getFullYear(), date.getMonth(), date.getDate());
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
    const mediaQuery = window.matchMedia(
      `(min-width: ${DESKTOP_BREAKPOINT_PX}px)`,
    );
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
    <div className="space-y-2 py-3">
      <div className="py-3">
        <div className="mx-auto h-6 w-24 animate-pulse rounded-full bg-[#d8dbd4]" />
      </div>
      <div className="flex justify-start">
        <div className="w-[68%] rounded-[1.35rem] rounded-bl-md bg-white px-4 py-3 shadow-sm sm:w-[46%]">
          <div className="mb-3 h-3 w-24 animate-pulse rounded bg-slate-200" />
          <div className="space-y-2">
            <div className="h-3 w-full animate-pulse rounded bg-slate-200" />
            <div className="h-3 w-5/6 animate-pulse rounded bg-slate-200" />
          </div>
        </div>
      </div>
      <div className="flex justify-end">
        <div className="w-[62%] rounded-[1.35rem] rounded-br-md bg-[#d9fdd3] px-4 py-3 shadow-sm sm:w-[40%]">
          <div className="mb-3 ml-auto h-3 w-20 animate-pulse rounded bg-emerald-200" />
          <div className="space-y-2">
            <div className="ml-auto h-3 w-full animate-pulse rounded bg-emerald-200" />
            <div className="ml-auto h-3 w-4/5 animate-pulse rounded bg-emerald-200" />
          </div>
        </div>
      </div>
      <div className="flex justify-start">
        <div className="w-[74%] rounded-[1.35rem] rounded-bl-md bg-white px-4 py-3 shadow-sm sm:w-[52%]">
          <div className="mb-3 h-3 w-28 animate-pulse rounded bg-slate-200" />
          <div className="space-y-2">
            <div className="h-3 w-full animate-pulse rounded bg-slate-200" />
            <div className="h-3 w-2/3 animate-pulse rounded bg-slate-200" />
          </div>
        </div>
      </div>
    </div>
  );
}

function ThreadListSkeleton() {
  return (
    <div className="flex items-start gap-3 rounded-[1.4rem] bg-white/70 px-3 py-3 ring-1 ring-slate-200/70">
      <div className="h-12 w-12 animate-pulse rounded-full bg-slate-200" />
      <div className="min-w-0 flex-1">
        <div className="flex items-center justify-between gap-3">
          <div className="h-4 w-32 animate-pulse rounded bg-slate-200" />
          <div className="h-3 w-10 animate-pulse rounded bg-slate-200" />
        </div>
        <div className="mt-2 h-3 w-28 animate-pulse rounded bg-slate-200" />
        <div className="mt-3 h-3 w-full animate-pulse rounded bg-slate-200" />
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
          .map(
            (dependencyId) =>
              serviceLine.processes.find(
                (candidate) => candidate.id === dependencyId,
              )?.workflow_step_id,
          )
          .filter((stepId): stepId is string => Boolean(stepId)),
        fixed_minutes: process.fixed_minutes,
        expected_duration_days: process.expected_duration_days,
        requires_milling_machine: process.requires_milling_machine,
      })),
    },
  }));
}
