import {
  CaseProcessHistoryEventType,
  CaseProcessStatus,
  CaseStatus,
  type CasePriority,
} from "@/generated/prisma/enums";

import { startOfDay } from "../_shared/schedule-capacity";

export type EmployeeDashboardWorkloadDay = {
  date: string;
  plannedMinutes: number;
  availableMinutes: number;
  remainingMinutes: number;
  isOverbooked: boolean;
};

export type EmployeeDashboardCapacity = {
  scheduledMinutes: number;
  availableMinutes: number;
  remainingMinutes: number;
  overbookedDayCount: number;
  workloadSummary: EmployeeDashboardWorkloadDay[];
};

export type EmployeeDashboardAssignedProcessRecord = {
  id: string;
  status: CaseProcessStatus;
  process_id: string;
  started_at: Date | null;
  completed_at: Date | null;
  processes: {
    id: string;
    name: string;
  };
  cases: {
    id: string;
    code: string;
    patient_name: string;
    due_date: Date | null;
    priority: CasePriority | null;
    current_status: CaseStatus;
    customers: {
      name: string;
    } | null;
  };
};

export type EmployeeDashboardProcessEventRecord = {
  id: string;
  event_type: CaseProcessHistoryEventType;
  created_at: Date;
  caseProcess: {
    id: string;
    assigned_lab_member_id: string | null;
    processes: {
      name: string;
    };
    cases: {
      id: string;
      code: string;
      patient_name: string;
    };
  };
};

export type EmployeeDashboardCommentRecord = {
  id: string;
  body: string;
  created_at: Date;
  cases: {
    id: string;
    code: string;
    patient_name: string;
  };
};

function isActiveAssignedStatus(status: CaseProcessStatus) {
  return (
    status === CaseProcessStatus.READY || status === CaseProcessStatus.IN_PROGRESS
  );
}

function isTerminalCaseStatus(status: CaseStatus) {
  return status === CaseStatus.DONE || status === CaseStatus.CANCELLED;
}

function isSameDay(left: Date, right: Date) {
  return startOfDay(left).getTime() === startOfDay(right).getTime();
}

function truncateCommentPreview(value: string, limit = 140) {
  const normalized = value.replace(/\s+/g, " ").trim();
  if (normalized.length <= limit) {
    return normalized;
  }

  return `${normalized.slice(0, limit - 1).trimEnd()}...`;
}

function roundMetric(value: number, digits = 1) {
  return Number(value.toFixed(digits));
}

export function buildEmployeeDashboardCapacity(
  workloadSummary: EmployeeDashboardWorkloadDay[],
): EmployeeDashboardCapacity {
  const scheduledMinutes = workloadSummary.reduce(
    (total, day) => total + day.plannedMinutes,
    0,
  );
  const availableMinutes = workloadSummary.reduce(
    (total, day) => total + day.availableMinutes,
    0,
  );
  const remainingMinutes = workloadSummary.reduce(
    (total, day) => total + day.remainingMinutes,
    0,
  );
  const overbookedDayCount = workloadSummary.filter(
    (day) => day.isOverbooked,
  ).length;

  return {
    scheduledMinutes,
    availableMinutes,
    remainingMinutes,
    overbookedDayCount,
    workloadSummary,
  };
}

export function buildEmployeeDashboardSummary(options: {
  assignedProcesses: EmployeeDashboardAssignedProcessRecord[];
  completedProcessesThisWeek: Array<{ id: string }>;
  completedProcessesThisMonth: Array<{
    started_at: Date | null;
    completed_at: Date | null;
  }>;
  capacity: EmployeeDashboardCapacity;
  today?: Date;
}) {
  const today = startOfDay(options.today ?? new Date());
  const activeAssigned = options.assignedProcesses.filter((process) =>
    isActiveAssignedStatus(process.status),
  );

  const activeAssignedCases = new Set(activeAssigned.map((process) => process.cases.id));
  const dueTodayAssignedCases = new Set(
    activeAssigned
      .filter(
        (process) =>
          process.cases.due_date &&
          !isTerminalCaseStatus(process.cases.current_status) &&
          isSameDay(process.cases.due_date, today),
      )
      .map((process) => process.cases.id),
  );
  const delayedAssignedCases = new Set(
    activeAssigned
      .filter(
        (process) =>
          process.cases.due_date &&
          !isTerminalCaseStatus(process.cases.current_status) &&
          startOfDay(process.cases.due_date).getTime() < today.getTime(),
      )
      .map((process) => process.cases.id),
  );

  const turnaroundSamples = options.completedProcessesThisMonth
    .filter(
      (
        process,
      ): process is {
        started_at: Date;
        completed_at: Date;
      } => process.started_at !== null && process.completed_at !== null,
    )
    .map(
      (process) =>
        (process.completed_at.getTime() - process.started_at.getTime()) /
        (1000 * 60 * 60 * 24),
    );

  return {
    activeAssignedCases: activeAssignedCases.size,
    dueTodayAssignedCases: dueTodayAssignedCases.size,
    delayedAssignedCases: delayedAssignedCases.size,
    completedAssignedProcessesThisWeek:
      options.completedProcessesThisWeek.length,
    workloadPercentNext14Days:
      options.capacity.availableMinutes > 0
        ? roundMetric(
            (options.capacity.scheduledMinutes / options.capacity.availableMinutes) *
              100,
          )
        : null,
    avgTurnaroundDaysCompletedThisMonth:
      turnaroundSamples.length > 0
        ? roundMetric(
            turnaroundSamples.reduce((total, value) => total + value, 0) /
              turnaroundSamples.length,
          )
        : null,
  };
}

export function buildEmployeeRecentActivity(options: {
  processEvents: EmployeeDashboardProcessEventRecord[];
  comments: EmployeeDashboardCommentRecord[];
  limit?: number;
}) {
  return [
    ...options.processEvents.map((event) => ({
      id: event.id,
      type: "process" as const,
      createdAt: event.created_at.toISOString(),
      caseId: event.caseProcess.cases.id,
      caseCode: event.caseProcess.cases.code,
      patientName: event.caseProcess.cases.patient_name,
      processName: event.caseProcess.processes.name,
      eventType: event.event_type,
      commentPreview: null,
    })),
    ...options.comments.map((comment) => ({
      id: comment.id,
      type: "comment" as const,
      createdAt: comment.created_at.toISOString(),
      caseId: comment.cases.id,
      caseCode: comment.cases.code,
      patientName: comment.cases.patient_name,
      processName: null,
      eventType: null,
      commentPreview: truncateCommentPreview(comment.body),
    })),
  ]
    .sort(
      (left, right) =>
        new Date(right.createdAt).getTime() - new Date(left.createdAt).getTime(),
    )
    .slice(0, options.limit ?? 6);
}
