import { CaseProcessStatus, CaseStatus, type CasePriority } from "@/generated/prisma/enums";

import { resolveCasePriority } from "../_shared/scheduling";

export type DashboardEmployeeRecord = {
  id: string;
  name: string;
};

export type DashboardAssignedProcessRecord = {
  id: string;
  assigned_lab_member_id: string | null;
  status: CaseProcessStatus;
  started_at: Date | null;
  completed_at: Date | null;
  cases: {
    id: string;
    created_at: Date;
    current_status: CaseStatus;
    due_date: Date | null;
    priority: CasePriority | null;
    is_urgent: boolean;
    teeth: string | null;
    elements_qty: number | null;
  };
};

export type DashboardCaseRecord = {
  id: string;
  created_at: Date;
  current_status: CaseStatus;
  due_date: Date | null;
  priority: CasePriority | null;
  is_urgent: boolean;
  teeth: string | null;
  elements_qty: number | null;
  case_processes: Array<{
    completed_at: Date | null;
  }>;
};

export type DashboardSummary = {
  totalEmployees: number;
  totalAssignedCases: number;
  totalTeethTracked: number;
  openCases: number;
  openTeeth: number;
  completedThisMonth: number;
  urgentOpenCases: number;
  avgTurnaroundDays: number | null;
};

export type EmployeeStat = {
  id: string;
  name: string;
  totalCases: number;
  totalTeethTracked: number;
  openCases: number;
  openTeeth: number;
  closedCases: number;
  closedTeeth: number;
  completedProcessesThisWeek: number;
  completedProcessesThisMonth: number;
  urgentOpenCases: number;
  overdueCases: number;
  avgTurnaroundDays: number | null;
  completionRate: number;
};

export type DashboardStatusDatum = {
  status: CaseStatus;
  label: string;
  value: number;
  fill: string;
};

export type DashboardPayload = {
  summary: DashboardSummary;
  employeeStats: EmployeeStat[];
  statusData: DashboardStatusDatum[];
};

function startOfDay(input: Date) {
  const value = new Date(input);
  value.setHours(0, 0, 0, 0);
  return value;
}

function startOfWeek(input: Date) {
  const current = startOfDay(input);
  const dayOfWeek = current.getDay();
  const diff = dayOfWeek === 0 ? -6 : 1 - dayOfWeek;
  current.setDate(current.getDate() + diff);
  return current;
}

function endOfWeek(input: Date) {
  const current = startOfWeek(input);
  current.setDate(current.getDate() + 7);
  return current;
}

function startOfMonth(input: Date) {
  return new Date(input.getFullYear(), input.getMonth(), 1);
}

function endOfMonth(input: Date) {
  return new Date(input.getFullYear(), input.getMonth() + 1, 1);
}

function isTerminalCaseStatus(status: CaseStatus) {
  return status === CaseStatus.DONE || status === CaseStatus.CANCELLED;
}

function roundMetric(value: number, digits = 1) {
  return Number(value.toFixed(digits));
}

export function countCaseTeeth(caseItem: {
  elements_qty: number | null;
  teeth: string | null;
}) {
  if (caseItem.elements_qty && caseItem.elements_qty > 0) {
    return caseItem.elements_qty;
  }

  if (!caseItem.teeth) {
    return 0;
  }

  return caseItem.teeth.split(/[\s,;/]+/).filter(Boolean).length;
}

function resolveCaseCompletionDate(caseItem: DashboardCaseRecord) {
  const timestamps = caseItem.case_processes
    .map((process) => process.completed_at?.getTime() ?? null)
    .filter((value): value is number => value !== null);

  if (timestamps.length === 0) {
    return null;
  }

  return new Date(Math.max(...timestamps));
}

function isDateWithinRange(
  value: Date | null,
  start: Date,
  end: Date,
) {
  if (!value) {
    return false;
  }

  const timestamp = value.getTime();
  return timestamp >= start.getTime() && timestamp < end.getTime();
}

const DASHBOARD_STATUS_META: Record<
  CaseStatus,
  {
    label: string;
    fill: string;
  }
> = {
  [CaseStatus.IN_PRODUCTION]: {
    label: "Production",
    fill: "#2563eb",
  },
  [CaseStatus.STANDBY]: {
    label: "Standby",
    fill: "#eab308",
  },
  [CaseStatus.DONE]: {
    label: "Done",
    fill: "#14b8a6",
  },
  [CaseStatus.CANCELLED]: {
    label: "Cancelled",
    fill: "#ef4444",
  },
};

function buildStatusData(visibleCases: DashboardCaseRecord[]): DashboardStatusDatum[] {
  return Object.entries(DASHBOARD_STATUS_META)
    .map(([status, meta]) => ({
      status: status as CaseStatus,
      label: meta.label,
      value: visibleCases.filter((caseItem) => caseItem.current_status === status).length,
      fill: meta.fill,
    }))
    .filter((item) => item.value > 0);
}

function buildSummary(options: {
  employees: DashboardEmployeeRecord[];
  trackedCases: DashboardCaseRecord[];
  today: Date;
}): DashboardSummary {
  const monthStart = startOfMonth(options.today);
  const monthEnd = endOfMonth(options.today);
  const openCases = options.trackedCases.filter(
    (caseItem) => !isTerminalCaseStatus(caseItem.current_status),
  );
  const completedSamples = options.trackedCases
    .filter((caseItem) => caseItem.current_status === CaseStatus.DONE)
    .map((caseItem) => ({
      caseItem,
      completedAt: resolveCaseCompletionDate(caseItem),
    }))
    .filter(
      (
        sample,
      ): sample is {
        caseItem: DashboardCaseRecord;
        completedAt: Date;
      } => sample.completedAt !== null,
    );

  return {
    totalEmployees: options.employees.length,
    totalAssignedCases: options.trackedCases.length,
    totalTeethTracked: options.trackedCases.reduce(
      (total, caseItem) => total + countCaseTeeth(caseItem),
      0,
    ),
    openCases: openCases.length,
    openTeeth: openCases.reduce(
      (total, caseItem) => total + countCaseTeeth(caseItem),
      0,
    ),
    completedThisMonth: completedSamples.filter((sample) =>
      isDateWithinRange(sample.completedAt, monthStart, monthEnd),
    ).length,
    urgentOpenCases: openCases.filter(
      (caseItem) =>
        resolveCasePriority(
          caseItem.priority,
          caseItem.is_urgent,
          caseItem.due_date,
        ) === "urgent",
    ).length,
    avgTurnaroundDays:
      completedSamples.length > 0
        ? roundMetric(
            completedSamples.reduce((total, sample) => {
              const days =
                (sample.completedAt.getTime() - sample.caseItem.created_at.getTime()) /
                (1000 * 60 * 60 * 24);
              return total + days;
            }, 0) / completedSamples.length,
          )
        : null,
  };
}

function buildEmployeeStats(options: {
  employees: DashboardEmployeeRecord[];
  assignedProcesses: DashboardAssignedProcessRecord[];
  trackedCasesById: Map<string, DashboardCaseRecord>;
  today: Date;
}): EmployeeStat[] {
  const weekStart = startOfWeek(options.today);
  const weekEnd = endOfWeek(options.today);
  const monthStart = startOfMonth(options.today);
  const monthEnd = endOfMonth(options.today);
  const today = startOfDay(options.today);

  return options.employees
    .map((employee) => {
      const employeeProcesses = options.assignedProcesses.filter(
        (process) => process.assigned_lab_member_id === employee.id,
      );
      const employeeCaseIds = new Set(employeeProcesses.map((process) => process.cases.id));
      const employeeCases = [...employeeCaseIds]
        .map((caseId) => options.trackedCasesById.get(caseId) ?? null)
        .filter((caseItem): caseItem is DashboardCaseRecord => caseItem !== null);
      const openCases = employeeCases.filter(
        (caseItem) => !isTerminalCaseStatus(caseItem.current_status),
      );
      const closedCases = employeeCases.filter((caseItem) =>
        isTerminalCaseStatus(caseItem.current_status),
      );
      const turnaroundSamples = employeeProcesses
        .filter((process) => isDateWithinRange(process.completed_at, monthStart, monthEnd))
        .filter(
          (
            process,
          ): process is DashboardAssignedProcessRecord & {
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
        id: employee.id,
        name: employee.name,
        totalCases: employeeCases.length,
        totalTeethTracked: employeeCases.reduce(
          (total, caseItem) => total + countCaseTeeth(caseItem),
          0,
        ),
        openCases: openCases.length,
        openTeeth: openCases.reduce(
          (total, caseItem) => total + countCaseTeeth(caseItem),
          0,
        ),
        closedCases: closedCases.length,
        closedTeeth: closedCases.reduce(
          (total, caseItem) => total + countCaseTeeth(caseItem),
          0,
        ),
        completedProcessesThisWeek: employeeProcesses.filter((process) =>
          isDateWithinRange(process.completed_at, weekStart, weekEnd),
        ).length,
        completedProcessesThisMonth: employeeProcesses.filter((process) =>
          isDateWithinRange(process.completed_at, monthStart, monthEnd),
        ).length,
        urgentOpenCases: openCases.filter(
          (caseItem) =>
            resolveCasePriority(
              caseItem.priority,
              caseItem.is_urgent,
              caseItem.due_date,
            ) === "urgent",
        ).length,
        overdueCases: openCases.filter((caseItem) => {
          if (!caseItem.due_date) {
            return false;
          }

          return startOfDay(caseItem.due_date).getTime() < today.getTime();
        }).length,
        avgTurnaroundDays:
          turnaroundSamples.length > 0
            ? roundMetric(
                turnaroundSamples.reduce((total, value) => total + value, 0) /
                  turnaroundSamples.length,
              )
            : null,
        completionRate:
          employeeCases.length > 0
            ? Math.round((closedCases.length / employeeCases.length) * 100)
            : 0,
      };
    })
    .sort((left, right) => {
      if (right.openCases !== left.openCases) {
        return right.openCases - left.openCases;
      }

      if (right.urgentOpenCases !== left.urgentOpenCases) {
        return right.urgentOpenCases - left.urgentOpenCases;
      }

      if (right.totalCases !== left.totalCases) {
        return right.totalCases - left.totalCases;
      }

      return left.name.localeCompare(right.name);
    });
}

export function buildDashboardPayload(options: {
  employees: DashboardEmployeeRecord[];
  assignedProcesses: DashboardAssignedProcessRecord[];
  visibleCases: DashboardCaseRecord[];
  today?: Date;
}): DashboardPayload {
  const today = options.today ?? new Date();
  const trackedCaseIds = new Set(
    options.assignedProcesses.map((process) => process.cases.id),
  );
  const trackedCases = options.visibleCases.filter((caseItem) =>
    trackedCaseIds.has(caseItem.id),
  );
  const trackedCasesById = trackedCases.reduce<Map<string, DashboardCaseRecord>>(
    (map, caseItem) => {
      map.set(caseItem.id, caseItem);
      return map;
    },
    new Map(),
  );

  return {
    summary: buildSummary({
      employees: options.employees,
      trackedCases,
      today,
    }),
    employeeStats: buildEmployeeStats({
      employees: options.employees,
      assignedProcesses: options.assignedProcesses,
      trackedCasesById,
      today,
    }),
    statusData: buildStatusData(options.visibleCases),
  };
}
