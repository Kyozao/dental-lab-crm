import { EmptyState } from "@/components/app/empty-state";
import { Panel, PanelHeader } from "@/components/app/panel";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { MillingDialog } from "@/features/production/components/milling-dialog";
import type {
  MillingWorkspace,
  ProductionProcess,
  ProductionQueueItem,
} from "@/features/production/production.types";
import { completeCaseProcess } from "@/features/production/services/production-api";
import { CaseProcessStatus } from "@/generated/prisma/enums";
import {
  CalendarDays,
  CircleAlert,
  FileText,
  Flag,
  History,
  Layers3,
  Play,
  UserRound,
} from "lucide-react";
import Link from "next/link";
import * as React from "react";

type QueueDetailSectionProps = {
  process: ProductionProcess;
  millingWorkspace: MillingWorkspace | null;
  onQueueChanged: () => Promise<void>;
  onOpenCase: (caseId: string) => void;
  openingCaseId: string | null;
};

export function QueueDetailSection({
  process,
  millingWorkspace,
  onQueueChanged,
  onOpenCase,
  openingCaseId,
}: QueueDetailSectionProps) {
  const [pendingProcessId, setPendingProcessId] = React.useState<string | null>(
    null,
  );
  const [error, setError] = React.useState<string | null>(null);

  async function handleStatusChange(
    caseProcessId: string,
    status: CaseProcessStatus,
  ) {
    try {
      setPendingProcessId(caseProcessId);
      setError(null);
      await completeCaseProcess(caseProcessId, status);
      await onQueueChanged();
    } catch (completionError) {
      setError(
        completionError instanceof Error
          ? completionError.message
          : "Could not complete task.",
      );
    } finally {
      setPendingProcessId(null);
    }
  }

  return (
    <Panel>
      <PanelHeader>
        <div className="flex flex-col gap-2 sm:flex-row sm:items-start sm:justify-between">
          <div>
            <h2 className="text-xl font-semibold">{process.name} queue</h2>
            <p className="text-sm text-muted-foreground">
              Target turnaround: {process.targetHours} hours
            </p>
          </div>
          <Badge variant="neutral">{process.queue.length} active</Badge>
        </div>
      </PanelHeader>

      {error ? (
        <div className="px-4 pb-2 text-sm text-red-600 sm:px-6">{error}</div>
      ) : null}

      {process.queue.length === 0 ? (
        <EmptyState title="No cases queued for this process" />
      ) : (
        <div className="grid gap-3 p-4 sm:p-6">
          {process.queue.map((item) => (
            <article
              key={item.id}
              className="rounded-md border border-border/50 p-4"
            >
              <div className="flex flex-col gap-4">
                <div className="flex flex-col gap-3 xl:flex-row xl:items-start xl:justify-between">
                  <div className="space-y-2">
                    <div className="flex flex-wrap items-center gap-2">
                      <h3 className="font-semibold">{item.caseCode}</h3>
                      <Badge variant={priorityVariant(item.priority)}>
                        {priorityLabel(item.priority)}
                      </Badge>
                      <Badge variant={stageVariant(item.status)}>
                        {item.currentStage}
                      </Badge>
                    </div>
                    <div>
                      <p className="text-sm font-medium">{item.patientName}</p>
                      {item.patientDetail ? (
                        <p className="text-sm text-muted-foreground">
                          {item.patientDetail}
                        </p>
                      ) : null}
                    </div>
                  </div>

                  <div className="grid gap-2 text-sm text-muted-foreground xl:text-right">
                    <span className="inline-flex items-center gap-2 xl:justify-end">
                      <CalendarDays className="h-4 w-4" />
                      {formatDueDate(item.dueDate)}
                    </span>
                    <span className="inline-flex items-center gap-2 xl:justify-end">
                      <UserRound className="h-4 w-4" />
                      {item.assignee}
                    </span>
                  </div>
                </div>

                <dl className="grid gap-3 text-sm sm:grid-cols-2 xl:grid-cols-4">
                  <QueueField
                    icon={CircleAlert}
                    label="Customer / Clinic"
                    value={formatCustomer(item)}
                  />
                  <QueueField
                    icon={Layers3}
                    label="Service"
                    value={item.serviceName}
                  />
                  <QueueField
                    icon={Flag}
                    label="Current stage"
                    value={statusLabel(item.status)}
                  />
                  <QueueField
                    icon={UserRound}
                    label="Assigned to"
                    value={item.assignee}
                  />
                </dl>

                <div className="rounded-md border border-border/50 bg-muted/20 p-3">
                  <div className="mb-2 flex items-center justify-between gap-3 text-sm">
                    <span className="font-medium">Progress</span>
                    <span className="text-muted-foreground">
                      {item.progressPercent}% ({item.completedSteps}/{item.totalSteps} steps)
                    </span>
                  </div>
                  <Progress value={item.progressPercent} className="h-2" />
                </div>
              </div>

              <div className="mt-4 flex flex-wrap gap-2">
                {item.workflowStepId === "milling" && millingWorkspace ? (
                  <MillingDialog
                    blockTypes={millingWorkspace.blockTypes}
                    millingDrills={millingWorkspace.millingDrills}
                    machines={millingWorkspace.machines}
                    cases={
                      millingWorkspace.readyCases.length
                        ? millingWorkspace.readyCases
                        : [
                            {
                              id: item.caseId,
                              code: item.caseCode,
                              patientName: item.patientName,
                              caseProcessId: item.caseProcessId,
                              processId: process.id,
                              customerName: item.customerName,
                              restoration: item.serviceName,
                              dueDate: item.dueDate,
                              status: "READY",
                            },
                          ]
                    }
                    caseId={item.caseId}
                    trigger={
                      <Button type="button" size="sm">
                        {item.status === "IN_PROGRESS"
                          ? "Complete milling"
                          : "Start milling"}
                      </Button>
                    }
                    onSubmitted={onQueueChanged}
                  />
                ) : (
                  <Button
                    type="button"
                    size="sm"
                    onClick={() =>
                      void handleStatusChange(
                        item.caseProcessId,
                        item.status === "IN_PROGRESS"
                          ? CaseProcessStatus.COMPLETED
                          : CaseProcessStatus.IN_PROGRESS,
                      )
                    }
                    disabled={pendingProcessId === item.caseProcessId}
                  >
                    <Play className="h-4 w-4" />
                    {pendingProcessId === item.caseProcessId
                      ? "Completing..."
                      : item.status === "IN_PROGRESS"
                        ? "Complete task"
                        : "Start task"}
                  </Button>
                )}

                {item.workflowStepId === "milling" ? (
                  <Button asChild type="button" size="sm" variant="outline">
                    <Link href="/milling">
                      <History className="h-4 w-4" />
                      Milling history
                    </Link>
                  </Button>
                ) : null}

                <Button
                  type="button"
                  size="sm"
                  variant="outline"
                  onClick={() => onOpenCase(item.caseId)}
                  disabled={openingCaseId === item.caseId}
                >
                  <FileText className="h-4 w-4" />
                  {openingCaseId === item.caseId ? "Opening..." : "Open case"}
                </Button>
              </div>

              {item.notes ? (
                <p className="mt-3 rounded-md bg-muted px-3 py-2 text-sm text-muted-foreground">
                  {item.notes}
                </p>
              ) : null}
            </article>
          ))}
        </div>
      )}
    </Panel>
  );
}

function QueueField({
  icon: Icon,
  label,
  value,
}: {
  icon: React.ComponentType<{ className?: string }>;
  label: string;
  value: string;
}) {
  return (
    <div className="rounded-md border border-border/40 px-3 py-2">
      <p className="mb-1 inline-flex items-center gap-2 text-xs font-medium uppercase tracking-wide text-muted-foreground">
        <Icon className="h-3.5 w-3.5" />
        {label}
      </p>
      <p>{value}</p>
    </div>
  );
}

function formatCustomer(item: ProductionQueueItem) {
  if (item.dentistName && item.customerName) {
    return `${item.dentistName} - ${item.customerName}`;
  }

  return item.dentistName ?? item.customerName;
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

function priorityLabel(priority: ProductionQueueItem["priority"]) {
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

function priorityVariant(priority: ProductionQueueItem["priority"]) {
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

function statusLabel(status: ProductionQueueItem["status"]) {
  switch (status) {
    case "IN_PROGRESS":
      return "In progress";
    case "READY":
      return "Ready";
    case "LOCKED":
      return "Blocked";
    case "COMPLETED":
      return "Completed";
    case "SKIPPED":
      return "Skipped";
    case "CANCELLED":
      return "Cancelled";
  }
}

function stageVariant(status: ProductionQueueItem["status"]) {
  switch (status) {
    case "IN_PROGRESS":
      return "info" as const;
    case "READY":
      return "neutral" as const;
    case "LOCKED":
      return "danger" as const;
    case "COMPLETED":
      return "success" as const;
    default:
      return "warning" as const;
  }
}
