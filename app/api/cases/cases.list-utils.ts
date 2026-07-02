import { CaseProcessStatus } from "@/generated/prisma/enums";
import { resolveCasePriority as resolveSharedCasePriority } from "../_shared/scheduling";

export type CaseListSummaryProcess = {
  id: string;
  process_id: string;
  workflow_step_id: string;
  status: CaseProcessStatus;
  processes: {
    name: string;
  };
  assignedLabMember: {
    id: string;
    users: {
      name: string;
    };
  } | null;
};

export type CaseListSummaryServiceLine = {
  service_name_snapshot: string;
  case_processes: CaseListSummaryProcess[];
};

type CaseActiveProcess = {
  caseProcessId: string;
  processId: string;
  workflowStepId: string;
  processName: string;
  status: CaseProcessStatus;
  assignedLabMemberId: string | null;
  assignedLabMemberName: string | null;
  serviceLabel: string;
  progressPercent: number;
  completedSteps: number;
  totalSteps: number;
};

export function buildCasePatientDetail(caseItem: {
  teeth: string | null;
  elements_qty: number | null;
  shade: string | null;
}) {
  const details: string[] = [];

  if (caseItem.teeth) {
    details.push(caseItem.teeth);
  }

  if (!caseItem.teeth && caseItem.elements_qty) {
    details.push(
      `${caseItem.elements_qty} element${caseItem.elements_qty === 1 ? "" : "s"}`,
    );
  }

  if (caseItem.shade) {
    details.push(`Shade ${caseItem.shade}`);
  }

  return details.length > 0 ? details.join(" • ") : null;
}

export function resolveCasePriority(
  priorityOrIsUrgent:
    | "LOW"
    | "NORMAL"
    | "HIGH"
    | "URGENT"
    | boolean
    | null
    | undefined,
  isUrgentOrDueDate: boolean | Date | null,
  maybeDueDate?: Date | null,
) {
  if (typeof priorityOrIsUrgent === "boolean") {
    return resolveSharedCasePriority(
      undefined,
      priorityOrIsUrgent,
      (isUrgentOrDueDate as Date | null) ?? null,
    );
  }

  return resolveSharedCasePriority(
    priorityOrIsUrgent,
    isUrgentOrDueDate as boolean,
    maybeDueDate ?? null,
  );
}

export function computeCaseProgress(
  processStatuses: CaseProcessStatus[],
  currentStatus: CaseProcessStatus,
) {
  const totalSteps = processStatuses.length;
  const completedSteps = processStatuses.filter(
    (status) =>
      status === CaseProcessStatus.COMPLETED ||
      status === CaseProcessStatus.SKIPPED,
  ).length;
  const inProgressWeight =
    currentStatus === CaseProcessStatus.IN_PROGRESS ? 0.5 : 0;
  const progressPercent =
    totalSteps > 0
      ? Math.round(((completedSteps + inProgressWeight) / totalSteps) * 100)
      : 0;

  return {
    completedSteps,
    totalSteps,
    progressPercent,
  };
}

function buildCaseActiveProcess(
  serviceLine: CaseListSummaryServiceLine,
  process: CaseListSummaryProcess,
): CaseActiveProcess {
  const progress = computeCaseProgress(
    serviceLine.case_processes.map((item) => item.status),
    process.status,
  );

  return {
    caseProcessId: process.id,
    processId: process.process_id,
    workflowStepId: process.workflow_step_id,
    processName: process.processes.name,
    status: process.status,
    assignedLabMemberId: process.assignedLabMember?.id ?? null,
    assignedLabMemberName: process.assignedLabMember?.users.name ?? null,
    serviceLabel: serviceLine.service_name_snapshot,
    progressPercent: progress.progressPercent,
    completedSteps: progress.completedSteps,
    totalSteps: progress.totalSteps,
  };
}

export function selectCurrentCaseProcess(caseItem: {
  case_services: CaseListSummaryServiceLine[];
}) {
  for (const serviceLine of caseItem.case_services) {
    const inProgress = serviceLine.case_processes.find(
      (process) => process.status === CaseProcessStatus.IN_PROGRESS,
    );

    if (inProgress) {
      return buildCaseActiveProcess(serviceLine, inProgress);
    }
  }

  for (const serviceLine of caseItem.case_services) {
    const ready = serviceLine.case_processes.find(
      (process) => process.status === CaseProcessStatus.READY,
    );

    if (ready) {
      return buildCaseActiveProcess(serviceLine, ready);
    }
  }

  return null;
}
