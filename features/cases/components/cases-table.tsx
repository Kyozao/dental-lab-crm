"use client";

import { useMemo, useState } from "react";
import { createPortal } from "react-dom";
import { useSearchParams } from "next/navigation";
import { useQuery } from "@tanstack/react-query";
import {
  CalendarDays,
  Play,
  UserRound,
} from "lucide-react";
import { EmptyState } from "@/components/app/empty-state";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { CaseDetailsDialog } from "@/features/cases/components/case-details-dialog";
import { getCaseStatusMeta } from "@/features/cases/constants";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import type { CaseListItem } from "@/features/cases/cases";
import { casesQueryKey, useCases } from "@/features/cases/hooks/useCases";
import { useCustomers } from "@/features/cases/hooks/useCustomers";
import { useEmployees } from "@/features/cases/hooks/useEmployees";
import { useProcesses } from "@/features/cases/hooks/useProcesses";
import { useServiceTypes } from "@/features/cases/hooks/useServiceTypes";
import { getCaseDetailsApi } from "@/features/cases/services/cases-client";
import { MillingDialog } from "@/features/production/components/milling-dialog";
import { getMillingWorkspaceApi } from "@/features/production/services/production-api";
import type { MillingWorkspace } from "@/features/production/production.types";
import {
  ComponentOption,
  EditableCase,
} from "@/features/cases/types";
import { casesApi } from "@/features/cases/cases";
import { CaseProcessStatus } from "@/generated/prisma/enums";
import { useQueryClient } from "@tanstack/react-query";

type Props = {
  components: ComponentOption[];
  currentUserRole: string;
};

export function CasesTable({
  components,
  currentUserRole,
}: Props) {
  const searchParams = useSearchParams();
  const queryClient = useQueryClient();
  const casesQuery = useMemo(
    () => ({
      limit: searchParams.get("limit") ?? searchParams.get("pageSize") ?? "100",
      q: searchParams.get("q") ?? undefined,
      status: searchParams.get("status") ?? undefined,
      urgent: searchParams.get("urgent") ?? undefined,
      customerId: searchParams.get("customerId") ?? undefined,
      currentProcessIds: searchParams.getAll("currentProcessId"),
    }),
    [searchParams],
  );
  const { data: cases = [], isLoading, isError, error } = useCases(casesQuery);
  const [open, setOpen] = useState(false);
  const loadCaseOptions = currentUserRole !== "PRODUCTION" && open;
  const [selectedCase, setSelectedCase] = useState<EditableCase | null>(null);
  const [loadingCaseId, setLoadingCaseId] = useState<string | null>(null);
  const [pendingProcessId, setPendingProcessId] = useState<string | null>(null);
  const [actionError, setActionError] = useState<string | null>(null);
  const customers = useCustomers(loadCaseOptions);
  const serviceTypes = useServiceTypes(loadCaseOptions);
  const processes = useProcesses(loadCaseOptions);
  const employees = useEmployees(loadCaseOptions);
  const isOpeningCase = Boolean(loadingCaseId);
  const tableRows = useMemo(() => buildCaseRows(cases), [cases]);
  const hasMillingRows = tableRows.some(
    (item) => item.currentWorkflowStepId === "milling",
  );
  const millingWorkspaceQuery = useQuery({
    queryKey: ["milling-workspace"],
    queryFn: getMillingWorkspaceApi,
    enabled: hasMillingRows,
  });
  const optionQueries = loadCaseOptions
    ? [customers, serviceTypes, processes, employees]
    : [];
  const optionsLoading = optionQueries.some(
    (query) => query.isLoading || query.isFetching,
  );
  const optionsError =
    optionQueries.find((query) => query.isError)?.error ?? null;

  function retryOptions() {
    void customers.refetch();
    void serviceTypes.refetch();
    void processes.refetch();
    void employees.refetch();
  }

  async function refreshCases() {
    await queryClient.invalidateQueries({ queryKey: casesQueryKey });
    await millingWorkspaceQuery.refetch();
  }

  async function handleRowClick(caseId: string) {
    if (loadingCaseId) return;

    try {
      setLoadingCaseId(caseId);
      const details = await getCaseDetailsApi(caseId);
      setSelectedCase(details);
      setOpen(true);
    } catch (error) {
      const message =
        error instanceof Error
          ? error.message
          : "Nao foi possivel carregar os detalhes do caso.";
      window.alert(message);
    } finally {
      setLoadingCaseId(null);
    }
  }

  async function handleTaskAction(item: CaseListItem) {
    if (!item.currentCaseProcessId || !item.currentProcessStatus) return;

    const nextStatus =
      item.currentProcessStatus === CaseProcessStatus.IN_PROGRESS
        ? CaseProcessStatus.COMPLETED
        : CaseProcessStatus.IN_PROGRESS;

    try {
      setPendingProcessId(item.currentCaseProcessId);
      setActionError(null);
      await casesApi.updateProcessStatus(item.currentCaseProcessId, nextStatus);
      await refreshCases();
    } catch (error) {
      setActionError(
        error instanceof Error ? error.message : "Could not update task.",
      );
    } finally {
      setPendingProcessId(null);
    }
  }

  function handleOpenChange(nextOpen: boolean) {
    setOpen(nextOpen);
    if (!nextOpen) {
      setSelectedCase(null);
      void refreshCases();
    }
  }

  return (
    <>
      {isLoading ? (
        <div className="flex min-h-64 items-center justify-center text-sm text-muted-foreground">
          Loading cases...
        </div>
      ) : null}

      {isError ? (
        <EmptyState
          title="Could not load cases"
          description={
            error instanceof Error
              ? error.message
              : "The cases API did not return a successful response."
          }
          className="py-16"
        />
      ) : null}

      {!isLoading && !isError && tableRows.length === 0 ? (
        <EmptyState
          title="No cases found"
          description="Adjust filters to see more cases."
          className="py-16"
        />
      ) : null}

      {actionError ? (
        <div className="px-6 pb-3 text-sm text-red-600">{actionError}</div>
      ) : null}

      {!isLoading && !isError && tableRows.length > 0 ? (
        <div className="overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow className="border-border/40 bg-muted/50 hover:bg-muted/50">
                <TableHead className="px-6 py-4 font-semibold">Code</TableHead>
                <TableHead className="px-6 py-4 font-semibold">
                  Patient
                </TableHead>
                <TableHead className="px-6 py-4 font-semibold">
                  Status
                </TableHead>
                <TableHead className="px-6 py-4 font-semibold">
                  Customer / Clinic
                </TableHead>
                <TableHead className="px-6 py-4 font-semibold">
                  Service
                </TableHead>
                <TableHead className="px-6 py-4 font-semibold">
                  Current process
                </TableHead>
                <TableHead className="px-6 py-4 font-semibold">
                  Assigned
                </TableHead>
                <TableHead className="px-6 py-4 font-semibold">Due</TableHead>
                <TableHead className="px-6 py-4 text-center font-semibold">
                  Priority
                </TableHead>
                <TableHead className="px-6 py-4 font-semibold">
                  Progress
                </TableHead>
                <TableHead className="px-6 py-4 text-right font-semibold">
                  Action
                </TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {tableRows.map((item) => {
                const isLoadingRow = loadingCaseId === item.id;
                const isPendingAction =
                  item.currentCaseProcessId !== null &&
                  pendingProcessId === item.currentCaseProcessId;

                return (
                  <TableRow
                    key={item.id}
                    role="button"
                    tabIndex={0}
                    onClick={() => void handleRowClick(item.id)}
                    onKeyDown={(event) => {
                      if (isLoadingRow) return;
                      if (event.key === "Enter" || event.key === " ") {
                        event.preventDefault();
                        void handleRowClick(item.id);
                      }
                    }}
                    aria-busy={isLoadingRow}
                    className={`group transition-all duration-200 focus-visible:bg-muted/60 focus-visible:outline-none ${
                      isOpeningCase
                        ? "cursor-progress"
                        : "cursor-pointer hover:bg-muted/60 active:bg-muted/80"
                    }`}
                  >
                    <TableCell className="px-6 py-4 font-semibold text-foreground transition-colors group-hover:text-primary">
                      {item.code}
                    </TableCell>
                    <TableCell className="px-6 py-4 text-foreground">
                      <div className="space-y-1">
                        <div className="font-medium">{item.patientName}</div>
                        {item.patientDetail ? (
                          <div className="text-sm text-muted-foreground">
                            {item.patientDetail}
                          </div>
                        ) : null}
                      </div>
                    </TableCell>
                    <TableCell className="px-6 py-4">
                      <Badge variant={getCaseStatusVariant(item.currentStatus)}>
                        {getCaseStatusMeta(item.currentStatus)?.shortLabel ??
                          item.currentStatus}
                      </Badge>
                    </TableCell>
                    <TableCell className="px-6 py-4 text-sm text-muted-foreground">
                      <div className="space-y-1">
                        <div>{item.customerName}</div>
                        <div>{item.dentistName}</div>
                      </div>
                    </TableCell>
                    <TableCell className="px-6 py-4 text-sm text-muted-foreground">
                      {item.serviceLabel}
                    </TableCell>
                    <TableCell className="px-6 py-4">
                      {item.currentProcessName && item.currentProcessStatus ? (
                        <div className="space-y-1">
                          <Badge variant={stageVariant(item.currentProcessStatus)}>
                            {item.currentProcessName}
                          </Badge>
                          <div className="text-xs text-muted-foreground">
                            {statusLabel(item.currentProcessStatus)}
                          </div>
                        </div>
                      ) : (
                        <span className="text-sm text-muted-foreground">
                          No active task
                        </span>
                      )}
                    </TableCell>
                    <TableCell className="px-6 py-4 text-sm text-muted-foreground">
                      <span className="inline-flex items-center gap-2">
                        <UserRound className="h-4 w-4" />
                        {item.currentProcessAssigneeName}
                      </span>
                    </TableCell>
                    <TableCell className="px-6 py-4 text-sm text-muted-foreground">
                      <span className="inline-flex items-center gap-2">
                        <CalendarDays className="h-4 w-4" />
                        {formatDueDate(item.dueDate)}
                      </span>
                    </TableCell>
                    <TableCell className="px-6 py-4 text-center">
                      <Badge variant={priorityVariant(item.priority)}>
                        {priorityLabel(item.priority)}
                      </Badge>
                    </TableCell>
                    <TableCell className="min-w-44 px-6 py-4">
                      <div className="space-y-2">
                        <div className="flex items-center justify-between gap-3 text-xs text-muted-foreground">
                          <span>{item.progressPercent}%</span>
                          <span>
                            {item.completedSteps}/{item.totalSteps} steps
                          </span>
                        </div>
                        <Progress value={item.progressPercent} className="h-2" />
                      </div>
                    </TableCell>
                    <TableCell className="px-6 py-4 text-right">
                      <RowAction
                        item={item}
                        isPending={isPendingAction}
                        millingWorkspace={millingWorkspaceQuery.data ?? null}
                        onTaskAction={handleTaskAction}
                        onSubmitted={refreshCases}
                      />
                    </TableCell>
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>
        </div>
      ) : null}

      <CaseOpeningOverlay open={isOpeningCase} />

      <CaseDetailsDialog
        open={open}
        onOpenChange={handleOpenChange}
        item={selectedCase}
        currentUserRole={currentUserRole}
        customers={customers.data ?? []}
        serviceTypes={serviceTypes.data ?? []}
        components={components}
        processes={processes.data ?? []}
        employees={employees.data ?? []}
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
    </>
  );
}

function buildCaseRows(cases: CaseListItem[]) {
  return cases.map((item) => ({
    ...item,
    customerName: item.customerName ?? "No customer",
    dentistName: item.dentistName ?? "No clinic",
    serviceLabel: item.serviceLabel ?? item.serviceTypeName ?? "-",
    currentProcessAssigneeName:
      item.currentProcessAssigneeName ?? "Unassigned",
  }));
}

function RowAction({
  item,
  isPending,
  millingWorkspace,
  onTaskAction,
  onSubmitted,
}: {
  item: CaseListItem;
  isPending: boolean;
  millingWorkspace: MillingWorkspace | null;
  onTaskAction: (item: CaseListItem) => Promise<void>;
  onSubmitted: () => Promise<void>;
}) {
  if (!item.currentCaseProcessId || !item.currentProcessStatus) {
    return <span className="text-sm text-muted-foreground">-</span>;
  }

  const isMilling = item.currentWorkflowStepId === "milling";
  if (isMilling && !millingWorkspace) {
    return (
      <Button type="button" size="sm" disabled>
        Loading milling...
      </Button>
    );
  }

  if (isMilling && millingWorkspace) {
    return (
      <div onClick={(event) => event.stopPropagation()}>
        <MillingDialog
          blockTypes={millingWorkspace.blockTypes}
          millingDrills={millingWorkspace.millingDrills}
          machines={millingWorkspace.machines}
          cases={
            millingWorkspace.readyCases.length > 0
              ? millingWorkspace.readyCases
              : [
                  {
                    id: item.id,
                    code: item.code,
                    patientName: item.patientName,
                    caseProcessId: item.currentCaseProcessId,
                    processId: item.currentProcessId ?? undefined,
                    customerName: item.customerName ?? undefined,
                    restoration: item.serviceLabel ?? undefined,
                    dueDate: item.dueDate,
                    status: item.currentProcessStatus,
                  },
                ]
          }
          caseId={item.id}
          trigger={
            <Button type="button" size="sm">
              {item.currentProcessStatus === CaseProcessStatus.IN_PROGRESS
                ? "Complete milling"
                : "Start milling"}
            </Button>
          }
          onSubmitted={onSubmitted}
        />
      </div>
    );
  }

  return (
    <Button
      type="button"
      size="sm"
      disabled={isPending}
      onClick={(event) => {
        event.stopPropagation();
        void onTaskAction(item);
      }}
    >
      {item.currentProcessStatus === CaseProcessStatus.READY ? (
        <Play className="h-4 w-4" />
      ) : null}
      {isPending
        ? "Saving..."
        : item.currentProcessStatus === CaseProcessStatus.IN_PROGRESS
          ? "Complete task"
          : "Start task"}
    </Button>
  );
}

function formatDueDate(value: string | null) {
  if (!value) return "No due date";

  const dueDate = new Date(value);
  const today = new Date();
  const startOfToday = new Date(today.getFullYear(), today.getMonth(), today.getDate());
  const startOfDue = new Date(
    dueDate.getFullYear(),
    dueDate.getMonth(),
    dueDate.getDate(),
  );
  const diffDays = Math.round(
    (startOfDue.getTime() - startOfToday.getTime()) / (1000 * 60 * 60 * 24),
  );

  if (diffDays === 0) return "Today";
  if (diffDays === 1) return "Tomorrow";

  return new Intl.DateTimeFormat("pt-BR", {
    dateStyle: "short",
  }).format(dueDate);
}

function priorityLabel(priority: CaseListItem["priority"]) {
  switch (priority) {
    case "urgent":
      return "Urgent";
    case "high":
      return "High";
    case "low":
      return "Low";
    default:
      return "Normal";
  }
}

function priorityVariant(priority: CaseListItem["priority"]) {
  switch (priority) {
    case "urgent":
      return "danger" as const;
    case "high":
      return "warning" as const;
    case "low":
      return "neutral" as const;
    default:
      return "info" as const;
  }
}

function statusLabel(status: string) {
  switch (status) {
    case CaseProcessStatus.IN_PROGRESS:
      return "In progress";
    case CaseProcessStatus.READY:
      return "Ready";
    case CaseProcessStatus.LOCKED:
      return "Blocked";
    case CaseProcessStatus.COMPLETED:
      return "Completed";
    case CaseProcessStatus.SKIPPED:
      return "Skipped";
    case CaseProcessStatus.CANCELLED:
      return "Cancelled";
    default:
      return status;
  }
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

function stageVariant(status: string) {
  switch (status) {
    case CaseProcessStatus.IN_PROGRESS:
      return "info" as const;
    case CaseProcessStatus.READY:
      return "neutral" as const;
    case CaseProcessStatus.LOCKED:
      return "danger" as const;
    case CaseProcessStatus.COMPLETED:
      return "success" as const;
    default:
      return "warning" as const;
  }
}

function CaseOpeningOverlay({ open }: { open: boolean }) {
  if (!open || typeof document === "undefined") {
    return null;
  }

  return createPortal(
    <div className="fixed inset-0 isolate z-50 flex items-center justify-center bg-black/10 supports-backdrop-filter:backdrop-blur-xs">
      <div className="rounded-xl border border-border/60 bg-card px-6 py-4 shadow-lg">
        <div className="flex items-center gap-3">
          <div className="h-5 w-5 animate-spin rounded-full border-2 border-muted-foreground/40 border-t-primary" />
          <span className="text-sm font-medium text-foreground">
            Opening case...
          </span>
        </div>
      </div>
    </div>,
    document.body,
  );
}
