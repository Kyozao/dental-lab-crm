import {
  CaseProcessStatus,
  type CasePriority,
  UserRole,
} from "@/generated/prisma/enums";
import { prisma } from "@/lib/prisma";
import {
  createSupabaseAdminClient,
  SupabaseAdminConfigError,
} from "@/lib/supabase/admin";

import {
  findSupabaseAuthUserByEmail,
  normalizeEmail,
} from "../auth/auth.service";
import {
  buildEmployeeDashboardCapacity,
  buildEmployeeDashboardSummary,
  buildEmployeeRecentActivity,
  type EmployeeDashboardAssignedProcessRecord,
} from "./employees.dashboard";
import {
  decimalToString,
  resolveEffectiveLaborCost,
  type DecimalLike,
} from "./employees.labor-costs";
import { ReferenceValidationError } from "../_shared/reference-resource";
import {
  applyMinuteExceptions,
  addDays,
  buildHorizonDates,
  getWeekdayCapacityMinutes,
  parseIsoDate,
  startOfDay,
} from "../_shared/schedule-capacity";
import { getSingleLabMembership } from "../_shared/membership";
import { bumpLabScheduleRevision } from "../_shared/scheduling";
import type {
  CreateEmployeeInput,
  UpdateEmployeeAvailabilityInput,
  UpdateEmployeeLaborCostsInput,
  UpdateEmployeeProductivityInput,
  UpdateEmployeeRoleInput,
  UpdateEmployeeProcessesInput,
} from "./employees.schemas";
import {
  assertCanAssignEmployeeProcesses,
  assertCanManageEmployees,
  assertCanViewEmployees,
  canAssignEmployeeProcesses,
  EmployeeAuthorizationError,
  EmployeeConflictError,
} from "./employees.rules";

export { EmployeeAuthorizationError, EmployeeConflictError };
export { SupabaseAdminConfigError };

type EmployeeProcessListItem = {
  id: string;
  name: string;
  default_labor_cost?: string;
  labor_cost_override?: string | null;
  effective_labor_cost?: string;
  productivity_points_per_hour?: string | null;
};

type EmployeeListItem = {
  id: string;
  lab_member_id: string | null;
  user_id: string | null;
  name: string;
  email: string;
  role: UserRole;
  status: "ACTIVE" | "PENDING";
  is_active: boolean;
  created_at: string;
  processes: EmployeeProcessListItem[];
};

type EmployeeRecord = {
  id: string;
  users: {
    id: string;
    name: string;
    email: string;
    is_active: boolean;
  };
  processOwnerships?: Array<{
    productivity_points_per_hour?: DecimalLike;
    labor_cost_override?: DecimalLike;
    processes: {
      id: string;
      name: string;
      default_labor_cost?: DecimalLike;
    };
  }>;
  role: UserRole;
  created_at: Date;
};

type EmployeeDetailRecord = {
  id: string;
  role: UserRole;
  created_at: Date;
  users: {
    id: string;
    name: string;
    email: string;
    is_active: boolean;
  };
  processOwnerships: Array<{
    process_id: string;
    productivity_points_per_hour: DecimalLike;
    labor_cost_override: DecimalLike;
    processes: {
      id: string;
      name: string;
      default_labor_cost: DecimalLike;
    };
  }>;
  scheduleShifts: Array<{
    id: string;
    day_of_week: number;
    available_minutes: number;
  }>;
  scheduleExceptions: Array<{
    id: string;
    exception_date: Date;
    available_minutes: number;
    reason: string | null;
  }>;
  scheduleAllocations: Array<{
    allocation_date: Date;
    planned_minutes: { toString(): string } | number;
    caseProcess: {
      id: string;
      process_id: string;
      processes: {
        name: string;
      };
      cases: {
        id: string;
        code: string;
        patient_name: string;
      };
    };
  }>;
};

type EmployeeAssignedProcessRecord = EmployeeDashboardAssignedProcessRecord & {
  cases: EmployeeDashboardAssignedProcessRecord["cases"] & {
    priority: CasePriority | null;
  };
};

type PendingInviteRecord = {
  id: string;
  name: string;
  email: string;
  role: UserRole;
  created_at: Date;
};

export class EmployeeNotFoundError extends Error {
  constructor(message = "Employee not found.") {
    super(message);
    this.name = "EmployeeNotFoundError";
  }
}

export class EmployeeInviteError extends Error {
  constructor(message = "Failed to send employee invite.") {
    super(message);
    this.name = "EmployeeInviteError";
  }
}

export class EmployeeRoleUpdateError extends Error {
  constructor(message = "Employee role cannot be updated.") {
    super(message);
    this.name = "EmployeeRoleUpdateError";
  }
}

function serializeEmployeeProcess(options: {
  process: {
    id: string;
    name: string;
    default_labor_cost?: DecimalLike;
  };
  productivity_points_per_hour?: DecimalLike;
  labor_cost_override?: DecimalLike;
}): EmployeeProcessListItem {
  const defaultLaborCost =
    options.process.default_labor_cost === undefined
      ? undefined
      : decimalToString(options.process.default_labor_cost);
  const laborCostOverride =
    options.labor_cost_override === undefined
      ? undefined
      : options.labor_cost_override === null
        ? null
        : decimalToString(options.labor_cost_override);

  return {
    id: options.process.id,
    name: options.process.name,
    default_labor_cost: defaultLaborCost,
    labor_cost_override: laborCostOverride,
    effective_labor_cost:
      defaultLaborCost === undefined
        ? undefined
        : resolveEffectiveLaborCost({
            defaultLaborCost: options.process.default_labor_cost ?? defaultLaborCost,
            laborCostOverride: options.labor_cost_override,
          }),
    productivity_points_per_hour:
      options.productivity_points_per_hour === undefined
        ? undefined
        : decimalToString(options.productivity_points_per_hour),
  };
}

function serializeEmployee(item: EmployeeRecord): EmployeeListItem {
  return {
    id: item.id,
    lab_member_id: item.id,
    user_id: item.users.id,
    name: item.users.name,
    email: item.users.email,
    role: item.role,
    status: "ACTIVE",
    is_active: item.users.is_active,
    created_at: item.created_at.toISOString(),
    processes:
      item.processOwnerships?.map((assignment) =>
        serializeEmployeeProcess({
          process: assignment.processes,
          productivity_points_per_hour: assignment.productivity_points_per_hour,
          labor_cost_override: assignment.labor_cost_override,
        }),
      ) ?? [],
  };
}

function serializePendingInvite(item: PendingInviteRecord): EmployeeListItem {
  return {
    id: item.id,
    lab_member_id: null,
    user_id: null,
    name: item.name,
    email: item.email,
    role: item.role,
    status: "PENDING",
    is_active: false,
    created_at: item.created_at.toISOString(),
    processes: [],
  };
}

function buildEmployeeSelect(lab_id: string) {
  return {
    id: true,
    role: true,
    created_at: true,
    processOwnerships: {
      where: { lab_id },
      select: {
        processes: {
          select: {
            id: true,
            name: true,
            default_labor_cost: true,
          },
        },
        productivity_points_per_hour: true,
        labor_cost_override: true,
      },
      orderBy: {
        created_at: "asc",
      },
    },
    users: {
      select: {
        id: true,
        name: true,
        email: true,
        is_active: true,
      },
    },
  } as const;
}

function buildEmployeeListSelect() {
  return {
    id: true,
    role: true,
    created_at: true,
    users: {
      select: {
        id: true,
        name: true,
        email: true,
        is_active: true,
      },
    },
  } as const;
}

function buildEmployeeDetailSelect(lab_id: string) {
  return {
    id: true,
    role: true,
    created_at: true,
    scheduleShifts: {
      select: {
        id: true,
        day_of_week: true,
        available_minutes: true,
      },
      orderBy: { day_of_week: "asc" },
    },
    scheduleExceptions: {
      select: {
        id: true,
        exception_date: true,
        available_minutes: true,
        reason: true,
      },
      orderBy: { exception_date: "asc" },
    },
    scheduleAllocations: {
      where: {
        allocation_date: {
          gte: new Date(),
        },
      },
      select: {
        allocation_date: true,
        planned_minutes: true,
        caseProcess: {
          select: {
            id: true,
            process_id: true,
            processes: {
              select: {
                name: true,
              },
            },
            cases: {
              select: {
                id: true,
                code: true,
                patient_name: true,
              },
            },
          },
        },
      },
      orderBy: { allocation_date: "asc" },
    },
    processOwnerships: {
      where: { lab_id },
        select: {
          process_id: true,
          productivity_points_per_hour: true,
          labor_cost_override: true,
          processes: {
            select: {
              id: true,
              name: true,
              default_labor_cost: true,
            },
          },
        },
      orderBy: {
        created_at: "asc",
      },
    },
    users: {
      select: {
        id: true,
        name: true,
        email: true,
        is_active: true,
      },
    },
  } as const;
}

const EMPLOYEE_ACTIVITY_LIMIT = 6;
const EMPLOYEE_TODAY_SCHEDULE_DAYS = 4;

function isActiveAssignedStatus(status: CaseProcessStatus) {
  return (
    status === CaseProcessStatus.READY || status === CaseProcessStatus.IN_PROGRESS
  );
}

function startOfWeek(input: Date) {
  const current = startOfDay(input);
  const dayOfWeek = current.getDay();
  const diff = dayOfWeek === 0 ? -6 : 1 - dayOfWeek;
  return addDays(current, diff);
}

function endOfWeek(input: Date) {
  return addDays(startOfWeek(input), 7);
}

function startOfMonth(input: Date) {
  return startOfDay(new Date(input.getFullYear(), input.getMonth(), 1));
}

function endOfMonth(input: Date) {
  return startOfDay(new Date(input.getFullYear(), input.getMonth() + 1, 1));
}


function buildEmployeeAssignedCases(
  assignedProcesses: EmployeeAssignedProcessRecord[],
) {
  return assignedProcesses
    .filter((process) => isActiveAssignedStatus(process.status))
    .sort((left, right) => {
      const leftDue = left.cases.due_date?.getTime() ?? Number.MAX_SAFE_INTEGER;
      const rightDue = right.cases.due_date?.getTime() ?? Number.MAX_SAFE_INTEGER;
      if (leftDue !== rightDue) {
        return leftDue - rightDue;
      }

      return left.cases.code.localeCompare(right.cases.code);
    })
    .map((process) => ({
      caseId: process.cases.id,
      caseCode: process.cases.code,
      patientName: process.cases.patient_name,
      customerName: process.cases.customers?.name ?? null,
      processId: process.processes.id,
      processName: process.processes.name,
      dueDate: process.cases.due_date?.toISOString() ?? null,
      priority: process.cases.priority,
      status: process.status,
      caseStatus: process.cases.current_status,
    }));
}

function buildEmployeeTodaySchedule(options: {
  allocations: EmployeeDetailRecord["scheduleAllocations"];
  today?: Date;
}) {
  const today = startOfDay(options.today ?? new Date());
  const horizonEnd = addDays(today, EMPLOYEE_TODAY_SCHEDULE_DAYS);

  return options.allocations
    .filter((allocation) => {
      const allocationDate = startOfDay(allocation.allocation_date);
      return (
        allocationDate.getTime() >= today.getTime() &&
        allocationDate.getTime() < horizonEnd.getTime()
      );
    })
    .sort(
      (left, right) =>
        left.allocation_date.getTime() - right.allocation_date.getTime(),
    )
    .slice(0, EMPLOYEE_ACTIVITY_LIMIT)
    .map((allocation) => {
      const plannedMinutes = Number(allocation.planned_minutes);

      return {
        date: allocation.allocation_date.toISOString(),
        caseProcessId: allocation.caseProcess.id,
        caseCode: allocation.caseProcess.cases.code,
        patientName: allocation.caseProcess.cases.patient_name,
        processName: allocation.caseProcess.processes.name,
        plannedMinutes,
      };
    });
}

function buildEmployeeProcessPermissions(employee: EmployeeDetailRecord) {
  return employee.processOwnerships.map((assignment) => ({
    processId: assignment.process_id,
    processName: assignment.processes.name,
    isPrimary: true,
    isAllowed: true,
    productivityPointsPerHour: Number(assignment.productivity_points_per_hour),
    defaultLaborCost: Number(assignment.processes.default_labor_cost),
    laborCostOverride:
      assignment.labor_cost_override === null
        ? null
        : Number(assignment.labor_cost_override),
    effectiveLaborCost: Number(
      resolveEffectiveLaborCost({
        defaultLaborCost: assignment.processes.default_labor_cost,
        laborCostOverride: assignment.labor_cost_override,
      }),
    ),
  }));
}

async function buildEmployeeDashboard(
  employee: EmployeeDetailRecord,
  lab_id: string,
) {
  const now = new Date();
  const today = startOfDay(now);
  const weekStart = startOfWeek(now);
  const weekEnd = endOfWeek(now);
  const monthStart = startOfMonth(now);
  const monthEnd = endOfMonth(now);

  const [
    assignedProcesses,
    completedProcessesThisWeek,
    completedProcessesThisMonth,
    processEvents,
    commentEvents,
  ] = await Promise.all([
    prisma.case_processes.findMany({
      where: {
        assigned_lab_member_id: employee.id,
        cases: {
          lab_id,
        },
      },
      select: {
        id: true,
        status: true,
        process_id: true,
        started_at: true,
        completed_at: true,
        processes: {
          select: {
            id: true,
            name: true,
          },
        },
        cases: {
          select: {
            id: true,
            code: true,
            patient_name: true,
            due_date: true,
            priority: true,
            current_status: true,
            customers: {
              select: {
                name: true,
              },
            },
          },
        },
      },
    }),
    prisma.case_processes.findMany({
      where: {
        assigned_lab_member_id: employee.id,
        completed_at: {
          gte: weekStart,
          lt: weekEnd,
        },
        cases: {
          lab_id,
        },
      },
      select: {
        id: true,
      },
    }),
    prisma.case_processes.findMany({
      where: {
        assigned_lab_member_id: employee.id,
        completed_at: {
          gte: monthStart,
          lt: monthEnd,
        },
        cases: {
          lab_id,
        },
      },
      select: {
        started_at: true,
        completed_at: true,
      },
    }),
    prisma.case_process_history_events.findMany({
      where: {
        caseProcess: {
          assigned_lab_member_id: employee.id,
          cases: {
            lab_id,
          },
        },
      },
      select: {
        id: true,
        event_type: true,
        created_at: true,
        caseProcess: {
          select: {
            id: true,
            assigned_lab_member_id: true,
            processes: {
              select: {
                name: true,
              },
            },
            cases: {
              select: {
                id: true,
                code: true,
                patient_name: true,
              },
            },
          },
        },
      },
      orderBy: {
        created_at: "desc",
      },
      take: EMPLOYEE_ACTIVITY_LIMIT * 2,
    }),
    prisma.case_comments.findMany({
      where: {
        author_lab_member_id: employee.id,
        deleted_at: null,
        cases: {
          lab_id,
        },
      },
      select: {
        id: true,
        body: true,
        created_at: true,
        cases: {
          select: {
            id: true,
            code: true,
            patient_name: true,
          },
        },
      },
      orderBy: {
        created_at: "desc",
      },
      take: EMPLOYEE_ACTIVITY_LIMIT * 2,
    }),
  ]);

  const workloadSummary = buildWorkloadSummary(employee);
  const capacity = buildEmployeeDashboardCapacity(workloadSummary);

  return {
    summary: buildEmployeeDashboardSummary({
      assignedProcesses,
      completedProcessesThisWeek,
      completedProcessesThisMonth,
      capacity,
      today,
    }),
    assignedCases: buildEmployeeAssignedCases(assignedProcesses),
    todaySchedule: buildEmployeeTodaySchedule({
      allocations: employee.scheduleAllocations,
      today,
    }),
    processPermissions: buildEmployeeProcessPermissions(employee),
    recentActivity: buildEmployeeRecentActivity({
      processEvents,
      comments: commentEvents,
    }),
    capacity,
  };
}

function buildWorkloadSummary(employee: EmployeeDetailRecord | null) {
  if (!employee) {
    return [];
  }

  const horizon = buildHorizonDates();

  const allocationsByDate = new Map<
    string,
    {
      plannedMinutes: number;
    }
  >();

  for (const allocation of employee.scheduleAllocations) {
    const isoDate = allocation.allocation_date.toISOString();
    const current = allocationsByDate.get(isoDate) ?? {
      plannedMinutes: 0,
    };

    current.plannedMinutes += Number(allocation.planned_minutes);
    allocationsByDate.set(isoDate, current);
  }

  return horizon.map((isoDate) => {
    const date = parseIsoDate(isoDate);
    const weekdayMinutes = getWeekdayCapacityMinutes(employee.scheduleShifts, date);
    const availableMinutes = applyMinuteExceptions(
      weekdayMinutes,
      employee.scheduleExceptions,
      date,
    );
    const allocation = allocationsByDate.get(isoDate) ?? {
      plannedMinutes: 0,
    };

    return {
      date: isoDate,
      plannedMinutes: allocation.plannedMinutes,
      availableMinutes,
      remainingMinutes: availableMinutes - allocation.plannedMinutes,
      isOverbooked: allocation.plannedMinutes > availableMinutes,
    };
  });
}

function serializeEmployeeScheduleProfile(employee: EmployeeDetailRecord | null) {
  if (!employee) {
    return null;
  }

  return {
    processAssignments: employee.processOwnerships.map((assignment) => ({
      processId: assignment.process_id,
      processName: assignment.processes.name,
      defaultLaborCost: decimalToString(assignment.processes.default_labor_cost),
      laborCostOverride:
        assignment.labor_cost_override === null
          ? null
          : decimalToString(assignment.labor_cost_override),
      effectiveLaborCost: resolveEffectiveLaborCost({
        defaultLaborCost: assignment.processes.default_labor_cost,
        laborCostOverride: assignment.labor_cost_override,
      }),
    })),
    weekdayCapacities: employee.scheduleShifts.map((shift) => ({
      id: shift.id,
      dayOfWeek: shift.day_of_week,
      availableMinutes: shift.available_minutes,
    })),
    exceptions: employee.scheduleExceptions.map((exception) => ({
      id: exception.id,
      exceptionDate: exception.exception_date.toISOString(),
      availableMinutes: exception.available_minutes,
      reason: exception.reason,
    })),
    workloadSummary: buildWorkloadSummary(employee),
  };
}

function getInviteRedirectTo(inviteId: string) {
  const appUrl =
    process.env.NEXT_PUBLIC_APP_URL ??
    process.env.APP_URL ??
    (process.env.VERCEL_URL ? `https://${process.env.VERCEL_URL}` : undefined) ??
    process.env.API_URL ??
    process.env.NEXT_PUBLIC_SUPABASE_URL;

  if (!appUrl) {
    return undefined;
  }

  const redirectUrl = new URL("/employee-invite/accept", appUrl.replace(/\/$/, ""));
  redirectUrl.searchParams.set("invite", inviteId);
  return redirectUrl.toString();
}

async function requireEmployeeManager(user_id: string) {
  const membership = await getSingleLabMembership(user_id);
  assertCanManageEmployees(membership.role);
  return membership;
}

async function requireEmployeeViewer(user_id: string) {
  const membership = await getSingleLabMembership(user_id);
  assertCanViewEmployees(membership.role);
  return membership;
}

async function requireProcessAssignmentManager(user_id: string) {
  const membership = await getSingleLabMembership(user_id);
  assertCanAssignEmployeeProcesses(membership.role);
  return membership;
}

async function ensureEmployeeInviteCanBeSent(options: {
  email: string;
  lab_id: string;
  pendingInvite:
    | {
        id: string;
        lab_id: string;
        auth_user_id: string | null;
      }
    | null;
}) {
  const normalizedEmail = normalizeEmail(options.email);

  const existingUser = await prisma.users.findUnique({
    where: { email: normalizedEmail },
    select: {
      id: true,
    },
  });

  if (existingUser) {
    throw new EmployeeConflictError(
      "An account with this email already exists. Employee invites currently support only new users.",
    );
  }

  const authUser = await findSupabaseAuthUserByEmail(normalizedEmail);
  if (!authUser) {
    return;
  }

  const canReusePendingInvite =
    options.pendingInvite !== null &&
    options.pendingInvite.lab_id === options.lab_id &&
    (
      options.pendingInvite.auth_user_id === null ||
      options.pendingInvite.auth_user_id === authUser.id
    );

  if (!canReusePendingInvite) {
    throw new EmployeeConflictError(
      "An account or pending invite with this email already exists. Employee invites currently support only new users.",
    );
  }
}

async function createOrUpdatePendingInvite(options: {
  lab_id: string;
  invited_by_user_id: string;
  payload: CreateEmployeeInput;
  pendingInvite:
    | {
        id: string;
      }
    | null;
}) {
  if (options.pendingInvite) {
    return prisma.employee_invites.update({
      where: { id: options.pendingInvite.id },
      data: {
        name: options.payload.name,
        email: options.payload.email,
        role: options.payload.role,
        invited_by_user_id: options.invited_by_user_id,
        cancelled_at: null,
      },
      select: {
        id: true,
        name: true,
        email: true,
        role: true,
        created_at: true,
      },
    });
  }

  return prisma.employee_invites.create({
    data: {
      lab_id: options.lab_id,
      invited_by_user_id: options.invited_by_user_id,
      name: options.payload.name,
      email: options.payload.email,
      role: options.payload.role,
    },
    select: {
      id: true,
      name: true,
      email: true,
      role: true,
      created_at: true,
    },
  });
}

export async function listEmployeesForLoggedLab(user_id: string) {
  const membership = await requireEmployeeViewer(user_id);
  const { lab_id } = membership;

  const [employees, pendingInvites] = await Promise.all([
    prisma.lab_members.findMany({
      where: {
        lab_id,
        users: {
          deleted_at: null,
        },
      },
      select: buildEmployeeListSelect(),
      orderBy: [{ role: "asc" }, { created_at: "asc" }],
    }),
    prisma.employee_invites.findMany({
      where: {
        lab_id,
        accepted_at: null,
        cancelled_at: null,
      },
      select: {
        id: true,
        name: true,
        email: true,
        role: true,
        created_at: true,
      },
      orderBy: [{ created_at: "desc" }],
    }),
  ]);

  const employeeIds = employees.map((employee) => employee.id);
  const processAssignments = employeeIds.length === 0
    ? []
    : await prisma.employee_process_assignments.findMany({
        where: {
          lab_id,
          lab_member_id: { in: employeeIds },
        },
        select: {
          lab_member_id: true,
          productivity_points_per_hour: true,
          labor_cost_override: true,
          processes: {
            select: {
              id: true,
              name: true,
              default_labor_cost: true,
            },
          },
        },
        orderBy: [{ created_at: "asc" }],
      });
  const processAssignmentsByEmployeeId = processAssignments.reduce<
    Map<string, EmployeeRecord["processOwnerships"]>
  >((map, assignment) => {
    const current = map.get(assignment.lab_member_id) ?? [];
    current.push({
      processes: assignment.processes,
      productivity_points_per_hour: assignment.productivity_points_per_hour,
      labor_cost_override: assignment.labor_cost_override,
    });
    map.set(assignment.lab_member_id, current);
    return map;
  }, new Map());

  return {
    employees: [
      ...employees.map((employee) =>
        serializeEmployee({
          ...employee,
          processOwnerships:
            processAssignmentsByEmployeeId.get(employee.id) ?? [],
        }),
      ),
      ...pendingInvites.map(serializePendingInvite),
    ],
    currentUserRole: membership.role,
    canInviteEmployees:
      membership.role === UserRole.OWNER || membership.role === UserRole.ADMIN,
  };
}

export async function getEmployeeForLoggedLab(
  user_id: string,
  lab_member_id: string,
) {
  const membership = await requireEmployeeViewer(user_id);
  const [employee, lab] = await Promise.all([
    prisma.lab_members.findFirst({
      where: {
        id: lab_member_id,
        lab_id: membership.lab_id,
        users: {
          deleted_at: null,
        },
      },
      select: buildEmployeeDetailSelect(membership.lab_id),
    }),
    prisma.labs.findUnique({
      where: {
        id: membership.lab_id,
      },
      select: {
        currency: true,
      },
    }),
  ]);

  if (!employee) {
    throw new EmployeeNotFoundError();
  }

  const dashboard = await buildEmployeeDashboard(employee, membership.lab_id);

  return {
    employee: serializeEmployee(employee),
    scheduleProfile: serializeEmployeeScheduleProfile(employee),
    dashboard,
    currentUserRole: membership.role,
    labCurrency: lab?.currency ?? "BRL",
    canAssignProcesses: canAssignEmployeeProcesses(membership.role),
    canEditRole:
      membership.role === UserRole.OWNER || membership.role === UserRole.ADMIN,
    canManageCapacity: canAssignEmployeeProcesses(membership.role),
  };
}

export async function inviteEmployeeForLoggedLab(
  user_id: string,
  payload: CreateEmployeeInput,
) {
  const { lab_id } = await requireEmployeeManager(user_id);

  const pendingInvite = await prisma.employee_invites.findFirst({
    where: {
      email: payload.email,
      accepted_at: null,
      cancelled_at: null,
    },
    select: {
      id: true,
      lab_id: true,
      auth_user_id: true,
    },
  });

  if (pendingInvite && pendingInvite.lab_id !== lab_id) {
    throw new EmployeeConflictError(
      "This email already has a pending invite in another lab.",
    );
  }

  await ensureEmployeeInviteCanBeSent({
    email: payload.email,
    lab_id,
    pendingInvite,
  });

  const inviteRecord = await createOrUpdatePendingInvite({
    lab_id,
    invited_by_user_id: user_id,
    payload,
    pendingInvite,
  });

  const supabase = createSupabaseAdminClient();
  const { data, error } = await supabase.auth.admin.inviteUserByEmail(
    payload.email,
    {
      data: {
        name: payload.name,
        role: payload.role,
        invite_id: inviteRecord.id,
      },
      redirectTo: getInviteRedirectTo(inviteRecord.id),
    },
  );

  if (error || !data.user) {
    if (!pendingInvite) {
      await prisma.employee_invites.delete({
        where: { id: inviteRecord.id },
      }).catch(() => undefined);
    }

    throw new EmployeeInviteError(error?.message);
  }

  const updatedInvite = await prisma.employee_invites.update({
    where: { id: inviteRecord.id },
    data: {
      auth_user_id: data.user.id,
      last_sent_at: new Date(),
      name: payload.name,
      role: payload.role,
      invited_by_user_id: user_id,
      cancelled_at: null,
    },
    select: {
      id: true,
      name: true,
      email: true,
      role: true,
      created_at: true,
    },
  });

  return serializePendingInvite(updatedInvite);
}

export async function updateEmployeeProcessesForLoggedLab(
  user_id: string,
  lab_member_id: string,
  payload: UpdateEmployeeProcessesInput,
) {
  const { lab_id } = await requireProcessAssignmentManager(user_id);

  const [employee, activeProcesses] = await Promise.all([
    prisma.lab_members.findFirst({
      where: {
        id: lab_member_id,
        lab_id,
        users: {
          is_active: true,
          deleted_at: null,
        },
      },
      select: {
        id: true,
        role: true,
        created_at: true,
        users: {
          select: {
            id: true,
            name: true,
            email: true,
            is_active: true,
          },
        },
      },
    }),
    prisma.processes.findMany({
      where: {
        lab_id,
        is_active: true,
        deleted_at: null,
        id: { in: payload.process_ids },
      },
      select: { id: true, name: true, default_labor_cost: true },
    }),
  ]);

  if (!employee) {
    throw new ReferenceValidationError({
      lab_member_id: [
        "Employee is inactive, archived, or not assigned to this lab.",
      ],
    });
  }

  const activeProcessIds = new Set(activeProcesses.map((process) => process.id));
  const invalidProcessIds = payload.process_ids.filter(
    (processId) => !activeProcessIds.has(processId),
  );

  if (invalidProcessIds.length > 0) {
    throw new ReferenceValidationError({
      process_ids: ["One or more processes are inactive, archived, or outside this lab."],
    });
  }

  await prisma.$transaction(async (tx) => {
    await tx.employee_process_assignments.deleteMany({
      where: {
        lab_id,
        lab_member_id,
        process_id: { notIn: payload.process_ids },
      },
    });

    if (payload.process_ids.length > 0) {
      await tx.employee_process_assignments.createMany({
        data: payload.process_ids.map((process_id) => ({
          lab_id,
          lab_member_id,
          process_id,
        })),
        skipDuplicates: true,
      });
    }

    await bumpLabScheduleRevision(tx, lab_id);
  });

  const orderedProcesses = payload.process_ids
    .map((processId) => activeProcesses.find((process) => process.id === processId))
    .filter((process) => process !== undefined);

  return serializeEmployee({
    id: employee.id,
    role: employee.role,
    created_at: employee.created_at,
    users: employee.users,
    processOwnerships: orderedProcesses.map((process) => ({
      processes: process,
    })),
  });
}

export async function updateEmployeeProductivityForLoggedLab(
  user_id: string,
  lab_member_id: string,
  payload: UpdateEmployeeProductivityInput,
) {
  const { lab_id } = await requireProcessAssignmentManager(user_id);

  const employee = await prisma.lab_members.findFirst({
    where: {
      id: lab_member_id,
      lab_id,
      users: {
        is_active: true,
        deleted_at: null,
      },
    },
    select: {
      id: true,
      processOwnerships: {
        where: { lab_id },
        select: {
          process_id: true,
        },
      },
    },
  });

  if (!employee) {
    throw new ReferenceValidationError({
      lab_member_id: [
        "Employee is inactive, archived, or not assigned to this lab.",
      ],
    });
  }

  const assignedProcessIds = new Set(
    employee.processOwnerships.map((assignment) => assignment.process_id),
  );
  const invalidProcessIds = payload.assignments
    .map((assignment) => assignment.process_id)
    .filter((processId) => !assignedProcessIds.has(processId));

  if (invalidProcessIds.length > 0) {
    throw new ReferenceValidationError({
      assignments: ["Productivity can only be updated for assigned processes."],
    });
  }

  await prisma.$transaction(async (tx) => {
    for (const assignment of payload.assignments) {
      await tx.employee_process_assignments.updateMany({
        where: {
          lab_id,
          lab_member_id,
          process_id: assignment.process_id,
        },
        data: {
          productivity_points_per_hour: assignment.productivity_points_per_hour,
        },
      });
    }

    await bumpLabScheduleRevision(tx, lab_id);
  });
}

export async function updateEmployeeLaborCostsForLoggedLab(
  user_id: string,
  lab_member_id: string,
  payload: UpdateEmployeeLaborCostsInput,
) {
  const { lab_id } = await requireProcessAssignmentManager(user_id);

  const employee = await prisma.lab_members.findFirst({
    where: {
      id: lab_member_id,
      lab_id,
      users: {
        is_active: true,
        deleted_at: null,
      },
    },
    select: {
      id: true,
      processOwnerships: {
        where: { lab_id },
        select: {
          process_id: true,
        },
      },
    },
  });

  if (!employee) {
    throw new ReferenceValidationError({
      lab_member_id: [
        "Employee is inactive, archived, or not assigned to this lab.",
      ],
    });
  }

  const assignedProcessIds = new Set(
    employee.processOwnerships.map((assignment) => assignment.process_id),
  );
  const invalidProcessIds = payload.assignments
    .map((assignment) => assignment.process_id)
    .filter((processId) => !assignedProcessIds.has(processId));

  if (invalidProcessIds.length > 0) {
    throw new ReferenceValidationError({
      assignments: ["Labor cost overrides can only be updated for assigned processes."],
    });
  }

  await prisma.$transaction(async (tx) => {
    for (const assignment of payload.assignments) {
      await tx.employee_process_assignments.updateMany({
        where: {
          lab_id,
          lab_member_id,
          process_id: assignment.process_id,
        },
        data: {
          labor_cost_override: assignment.labor_cost_override,
        },
      });
    }

    await bumpLabScheduleRevision(tx, lab_id);
  });
}

export async function updateEmployeeAvailabilityForLoggedLab(
  user_id: string,
  lab_member_id: string,
  payload: UpdateEmployeeAvailabilityInput,
) {
  const { lab_id } = await requireProcessAssignmentManager(user_id);

  const employee = await prisma.lab_members.findFirst({
    where: {
      id: lab_member_id,
      lab_id,
      users: {
        deleted_at: null,
      },
    },
    select: {
      id: true,
      scheduleShifts: {
        select: {
          id: true,
        },
      },
      scheduleExceptions: {
        select: {
          id: true,
        },
      },
    },
  });

  if (!employee) {
    throw new EmployeeNotFoundError();
  }

  const existingShiftIds = new Set(employee.scheduleShifts.map((shift) => shift.id));
  const existingExceptionIds = new Set(
    employee.scheduleExceptions.map((exception) => exception.id),
  );

  const invalidShiftIds = payload.weekday_capacities
    .map((shift) => shift.id)
    .filter((shiftId): shiftId is string => Boolean(shiftId))
    .filter((shiftId) => !existingShiftIds.has(shiftId));
  const invalidExceptionIds = payload.exceptions
    .map((exception) => exception.id)
    .filter((exceptionId): exceptionId is string => Boolean(exceptionId))
    .filter((exceptionId) => !existingExceptionIds.has(exceptionId));

  if (invalidShiftIds.length > 0 || invalidExceptionIds.length > 0) {
    throw new ReferenceValidationError({
      availability: ["Availability payload references rows outside this employee."],
    });
  }

  await prisma.$transaction(async (tx) => {
    const submittedShiftIds = payload.weekday_capacities
      .map((shift) => shift.id)
      .filter((shiftId): shiftId is string => Boolean(shiftId));
    const submittedExceptionIds = payload.exceptions
      .map((exception) => exception.id)
      .filter((exceptionId): exceptionId is string => Boolean(exceptionId));

    await tx.employee_schedule_shifts.deleteMany({
      where: {
        lab_member_id,
        id: { notIn: submittedShiftIds },
      },
    });

    await tx.employee_schedule_exceptions.deleteMany({
      where: {
        lab_member_id,
        id: { notIn: submittedExceptionIds },
      },
    });

    for (const shift of payload.weekday_capacities) {
      if (shift.id) {
        await tx.employee_schedule_shifts.update({
          where: { id: shift.id },
          data: {
            day_of_week: shift.day_of_week,
            available_minutes: shift.available_minutes,
          },
        });
        continue;
      }

      await tx.employee_schedule_shifts.create({
        data: {
          lab_member_id,
          day_of_week: shift.day_of_week,
          available_minutes: shift.available_minutes,
        },
      });
    }

    for (const exception of payload.exceptions) {
      if (exception.id) {
        await tx.employee_schedule_exceptions.update({
          where: { id: exception.id },
          data: {
            exception_date: new Date(exception.exception_date),
            available_minutes: exception.available_minutes,
            reason: exception.reason ?? null,
          },
        });
        continue;
      }

      await tx.employee_schedule_exceptions.create({
        data: {
          lab_member_id,
          exception_date: new Date(exception.exception_date),
          available_minutes: exception.available_minutes,
          reason: exception.reason ?? null,
        },
      });
    }

    await bumpLabScheduleRevision(tx, lab_id);
  });
}

export async function updateEmployeeRoleForLoggedLab(
  user_id: string,
  lab_member_id: string,
  payload: UpdateEmployeeRoleInput,
) {
  const { lab_id } = await requireEmployeeManager(user_id);

  const existingEmployee = await prisma.lab_members.findFirst({
    where: {
      id: lab_member_id,
      lab_id,
      users: {
        deleted_at: null,
      },
    },
    select: buildEmployeeSelect(lab_id),
  });

  if (!existingEmployee) {
    throw new EmployeeNotFoundError();
  }

  if (existingEmployee.role === UserRole.OWNER) {
    throw new EmployeeRoleUpdateError(
      "Owner role cannot be changed from employee management.",
    );
  }

  const updatedEmployee = await prisma.lab_members.update({
    where: {
      id: lab_member_id,
    },
    data: {
      role: payload.role,
    },
    select: buildEmployeeSelect(lab_id),
  });

  return serializeEmployee(updatedEmployee);
}
