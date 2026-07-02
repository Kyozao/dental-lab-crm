import { Prisma } from "@/generated/prisma/client";
import {
  CasePriority,
  CaseProcessSchedulingStatus,
  CaseProcessStatus,
  ScheduleProposalStatus,
  UserRole,
} from "@/generated/prisma/enums";
import { prisma } from "@/lib/prisma";

import { RoleAuthorizationError } from "../_shared/authorization";
import {
  addDays,
  applyMinuteExceptions,
  applyExceptions,
  buildHorizonDates,
  calculateShiftMinutes,
  clampMinutes,
  getWeekdayCapacityMinutes,
  parseIsoDate,
  startOfDay,
} from "../_shared/schedule-capacity";
import { getSingleLabMembership, MissingLabMembershipError } from "../_shared/membership";
import { bumpLabScheduleRevision, resolveCasePriority } from "../_shared/scheduling";
import type { ApproveScheduleProposalInput } from "./schedule.schemas";

type ScheduleContext = Awaited<ReturnType<typeof loadScheduleContext>>;

type SchedulingStatusLiteral = "SCHEDULED" | "AT_RISK" | "UNSCHEDULED";

type ProposalProcessChange = {
  caseProcessId: string;
  assignedLabMemberId: string;
  originalAssignedLabMemberId: string;
  plannedMillingMachineId: string | null;
  plannedStartDate: string | null;
  plannedEndDate: string | null;
  schedulingStatus: SchedulingStatusLiteral;
  allocations: Array<{
    date: string;
    plannedMinutes: number;
    millingMachineId: string | null;
  }>;
};

type ScheduleProposalRisk = {
  caseProcessId: string;
  caseCode: string;
  processName: string;
  reason: string;
};

type ScheduleProposalSummary = {
  scheduledCount: number;
  atRiskCount: number;
  unscheduledCount: number;
  riskCount: number;
};

export type ScheduleReviewAssigneeOption = {
  labMemberId: string;
  labMemberName: string;
};

export type ScheduleEmployeeWorkloadDay = {
  date: string;
  plannedMinutes: number;
  availableMinutes: number;
  remainingMinutes: number;
  isOverbooked: boolean;
};

export type ScheduleReviewEmployeeWorkload = {
  labMemberId: string;
  labMemberName: string;
  shiftsConfigured: boolean;
  scheduledMinutes: number;
  availableMinutes: number;
  remainingMinutes: number;
  overbookedDayCount: number;
  days: ScheduleEmployeeWorkloadDay[];
};

export type ScheduleReviewProcess = {
  caseProcessId: string;
  workflowStepId: string;
  processName: string;
  status: CaseProcessStatus;
  editable: boolean;
  assignedLabMemberId: string | null;
  assignedLabMemberName: string | null;
  plannedStartDate: string | null;
  plannedEndDate: string | null;
  schedulingStatus: SchedulingStatusLiteral;
  riskReason: string | null;
  assigneeOptions: ScheduleReviewAssigneeOption[];
};

export type ScheduleReviewCase = {
  caseId: string;
  caseCode: string;
  patientName: string;
  customerName: string;
  dueDate: string | null;
  priority: "urgent" | "high" | "normal" | "low";
  proposalStatus: SchedulingStatusLiteral;
  riskCount: number;
  activeProcessCount: number;
  processes: ScheduleReviewProcess[];
};

type ScheduleReviewSourceProcess = {
  caseId: string;
  caseCode: string;
  patientName: string;
  customerName: string;
  dueDate: string | null;
  priority: "urgent" | "high" | "normal" | "low";
  caseProcessId: string;
  workflowStepId: string;
  processName: string;
  status: CaseProcessStatus;
  editable: boolean;
  assignedLabMemberId: string | null;
  assignedLabMemberName: string | null;
  plannedStartDate: string | null;
  plannedEndDate: string | null;
  schedulingStatus: SchedulingStatusLiteral;
  assigneeOptions: ScheduleReviewAssigneeOption[];
};

type ScheduleProposalPayload = {
  summary: ScheduleProposalSummary;
  changes: ProposalProcessChange[];
  risks: ScheduleProposalRisk[];
  reviewCases: ScheduleReviewCase[];
  employeeWorkloads: ScheduleReviewEmployeeWorkload[];
};

type MachineCapacityMap = Map<string, Map<string, number>>;

type LabMemberValidatorClient = Pick<Prisma.TransactionClient, "lab_members">;

export class ScheduleProposalNotFoundError extends Error {
  constructor() {
    super("Schedule proposal not found.");
    this.name = "ScheduleProposalNotFoundError";
  }
}

export class ScheduleProposalConflictError extends Error {
  constructor(message = "Schedule proposal is stale.") {
    super(message);
    this.name = "ScheduleProposalConflictError";
  }
}

export class ScheduleProposalValidationError extends Error {
  errors: Record<string, string[]>;

  constructor(errors: Record<string, string[]>, message = "Schedule proposal is invalid.") {
    super(message);
    this.name = "ScheduleProposalValidationError";
    this.errors = errors;
  }
}

function assertCanManageSchedule(role: UserRole) {
  if (role === UserRole.PRODUCTION) {
    throw new RoleAuthorizationError("Production users cannot manage the schedule.");
  }
}

function buildEmployeeDayCapacities(context: ScheduleContext) {
  const horizon = buildHorizonDates();
  const employeeMinutes = new Map<string, Map<string, number>>();
  const machineMinutes = new Map<string, Map<string, number>>();

  for (const employee of context.employees) {
    const capacityByDate = new Map<string, number>();
    for (const isoDate of horizon) {
      const date = parseIsoDate(isoDate);
      const weekdayMinutes = getWeekdayCapacityMinutes(employee.scheduleShifts, date);
      const availableMinutes = applyMinuteExceptions(
        weekdayMinutes,
        employee.scheduleExceptions,
        date,
      );
      capacityByDate.set(isoDate, availableMinutes);
    }
    employeeMinutes.set(employee.id, capacityByDate);
  }

  for (const machine of context.machines) {
    const capacityByDate = new Map<string, number>();
    for (const isoDate of horizon) {
      const date = parseIsoDate(isoDate);
      const shiftMinutes = calculateShiftMinutes(machine.scheduleShifts, date);
      const availableMinutes = applyExceptions(
        shiftMinutes,
        machine.scheduleExceptions,
        date,
      );
      capacityByDate.set(isoDate, availableMinutes);
    }
    machineMinutes.set(machine.id, capacityByDate);
  }

  return {
    horizon,
    employeeMinutes,
    machineMinutes,
  };
}

function priorityWeight(priority: CasePriority) {
  switch (priority) {
    case CasePriority.URGENT:
      return 4;
    case CasePriority.HIGH:
      return 3;
    case CasePriority.NORMAL:
      return 2;
    case CasePriority.LOW:
      return 1;
    default:
      return 0;
  }
}

function getProcessTotalMinutes(process: ScheduleContext["caseProcesses"][number]) {
  return (
    process.snapshot_fixed_minutes +
    process.snapshot_minutes_per_unit * process.case_services.quantity
  );
}

function getAvailableMinutes(
  capacityMap: Map<string, Map<string, number>>,
  resourceId: string,
  isoDate: string,
) {
  return capacityMap.get(resourceId)?.get(isoDate) ?? 0;
}

function consumeMinutes(
  capacityMap: Map<string, Map<string, number>>,
  resourceId: string,
  isoDate: string,
  minutes: number,
) {
  const byDate = capacityMap.get(resourceId);
  if (!byDate) return;
  byDate.set(isoDate, Math.max(0, (byDate.get(isoDate) ?? 0) - minutes));
}

function chooseMachineCandidate(
  context: ScheduleContext,
  machineMinutes: MachineCapacityMap,
  isoDate: string,
  plannedMachineId: string | null,
) {
  const candidates = plannedMachineId
    ? context.machines.filter((machine) => machine.id === plannedMachineId)
    : context.machines;

  return candidates
    .filter((machine) => getAvailableMinutes(machineMinutes, machine.id, isoDate) > 0)
    .sort(
      (left, right) =>
        getAvailableMinutes(machineMinutes, right.id, isoDate) -
        getAvailableMinutes(machineMinutes, left.id, isoDate),
    )[0] ?? null;
}

function buildDependencyReadyDates(changes: ProposalProcessChange[]) {
  return new Map(
    changes
      .filter((change) => change.plannedEndDate)
      .map((change) => [change.caseProcessId, change.plannedEndDate as string]),
  );
}

function isMovable(process: ScheduleContext["caseProcesses"][number]) {
  return (
    !process.scheduling_locked &&
    process.started_at === null &&
    process.completed_at === null &&
    process.status !== CaseProcessStatus.IN_PROGRESS &&
    process.status !== CaseProcessStatus.COMPLETED &&
    process.status !== CaseProcessStatus.SKIPPED &&
    process.status !== CaseProcessStatus.CANCELLED
  );
}

function mapSchedulingStatus(
  status: SchedulingStatusLiteral,
): CaseProcessSchedulingStatus {
  if (status === "AT_RISK") {
    return CaseProcessSchedulingStatus.AT_RISK;
  }

  if (status === "SCHEDULED") {
    return CaseProcessSchedulingStatus.SCHEDULED;
  }

  return CaseProcessSchedulingStatus.UNSCHEDULED;
}

function resolveCaseReviewStatus(processes: ScheduleReviewProcess[]): SchedulingStatusLiteral {
  if (processes.some((process) => process.schedulingStatus === "AT_RISK")) {
    return "AT_RISK";
  }

  if (processes.some((process) => process.schedulingStatus === "UNSCHEDULED")) {
    return "UNSCHEDULED";
  }

  return "SCHEDULED";
}

function resolveAssigneeName(
  process: ScheduleReviewSourceProcess,
  assignedLabMemberId: string | null,
) {
  if (!assignedLabMemberId) {
    return null;
  }

  return (
    process.assigneeOptions.find((option) => option.labMemberId === assignedLabMemberId)
      ?.labMemberName ??
    process.assignedLabMemberName
  );
}

export function buildProposalEmployeeWorkloads(input: {
  employees: Array<{
    id: string;
    users: {
      name: string;
    };
    scheduleShifts: Array<{
      day_of_week: number;
      available_minutes: number;
    }>;
    scheduleExceptions: Array<{
      exception_date: Date;
      available_minutes: number;
    }>;
  }>;
  changes: ProposalProcessChange[];
}) {
  const horizon = buildHorizonDates();
  const plannedMinutesByEmployee = new Map<string, Map<string, number>>();

  for (const change of input.changes) {
    if (!change.assignedLabMemberId) {
      continue;
    }

    const employeeMinutes = plannedMinutesByEmployee.get(change.assignedLabMemberId) ?? new Map<string, number>();

    for (const allocation of change.allocations) {
      employeeMinutes.set(
        allocation.date,
        (employeeMinutes.get(allocation.date) ?? 0) + allocation.plannedMinutes,
      );
    }

    plannedMinutesByEmployee.set(change.assignedLabMemberId, employeeMinutes);
  }

  return input.employees.map((employee) => {
    const employeeMinutes = plannedMinutesByEmployee.get(employee.id) ?? new Map<string, number>();
    const days = horizon.map((isoDate) => {
      const date = parseIsoDate(isoDate);
      const weekdayMinutes = getWeekdayCapacityMinutes(employee.scheduleShifts, date);
      const availableMinutes = applyMinuteExceptions(
        weekdayMinutes,
        employee.scheduleExceptions,
        date,
      );
      const plannedMinutes = employeeMinutes.get(isoDate) ?? 0;

      return {
        date: isoDate,
        plannedMinutes,
        availableMinutes,
        remainingMinutes: availableMinutes - plannedMinutes,
        isOverbooked: plannedMinutes > availableMinutes,
      };
    });

    return {
      labMemberId: employee.id,
      labMemberName: employee.users.name,
      shiftsConfigured: employee.scheduleShifts.length > 0,
      scheduledMinutes: days.reduce((total, day) => total + day.plannedMinutes, 0),
      availableMinutes: days.reduce((total, day) => total + day.availableMinutes, 0),
      remainingMinutes: days.reduce((total, day) => total + day.remainingMinutes, 0),
      overbookedDayCount: days.filter((day) => day.isOverbooked).length,
      days,
    };
  });
}

export function buildCaseGroupedScheduleReview(input: {
  processes: ScheduleReviewSourceProcess[];
  changes?: ProposalProcessChange[];
  risks?: ScheduleProposalRisk[];
}) {
  const changeByProcessId = new Map(
    (input.changes ?? []).map((change) => [change.caseProcessId, change]),
  );
  const riskByProcessId = new Map(
    (input.risks ?? []).map((risk) => [risk.caseProcessId, risk.reason]),
  );
  const grouped = new Map<string, ScheduleReviewCase>();

  for (const process of input.processes) {
    if (
      process.status !== CaseProcessStatus.READY &&
      process.status !== CaseProcessStatus.IN_PROGRESS
    ) {
      continue;
    }

    const proposedChange = changeByProcessId.get(process.caseProcessId);
    const assignedLabMemberId = proposedChange
      ? proposedChange.assignedLabMemberId || null
      : process.assignedLabMemberId;
    const reviewProcess: ScheduleReviewProcess = {
      caseProcessId: process.caseProcessId,
      workflowStepId: process.workflowStepId,
      processName: process.processName,
      status: process.status,
      editable: process.editable,
      assignedLabMemberId,
      assignedLabMemberName: resolveAssigneeName(process, assignedLabMemberId),
      plannedStartDate: proposedChange?.plannedStartDate ?? process.plannedStartDate,
      plannedEndDate: proposedChange?.plannedEndDate ?? process.plannedEndDate,
      schedulingStatus: proposedChange?.schedulingStatus ?? process.schedulingStatus,
      riskReason: riskByProcessId.get(process.caseProcessId) ?? null,
      assigneeOptions: process.assigneeOptions,
    };

    const existing = grouped.get(process.caseId);
    if (existing) {
      existing.processes.push(reviewProcess);
      existing.riskCount += reviewProcess.riskReason ? 1 : 0;
      existing.activeProcessCount = existing.processes.length;
      existing.proposalStatus = resolveCaseReviewStatus(existing.processes);
      continue;
    }

    grouped.set(process.caseId, {
      caseId: process.caseId,
      caseCode: process.caseCode,
      patientName: process.patientName,
      customerName: process.customerName,
      dueDate: process.dueDate,
      priority: process.priority,
      proposalStatus: resolveCaseReviewStatus([reviewProcess]),
      riskCount: reviewProcess.riskReason ? 1 : 0,
      activeProcessCount: 1,
      processes: [reviewProcess],
    });
  }

  return [...grouped.values()];
}

function buildReviewSourceProcesses(context: ScheduleContext): ScheduleReviewSourceProcess[] {
  return context.caseProcesses.map((process) => {
    const assignedLabMemberName = process.assignedLabMember?.users.name ?? null;
    const assigneeOptions = process.processes.employeeAssignments
      .map((assignment) => {
        const employee = context.employees.find((item) => item.id === assignment.lab_member_id);
        if (!employee) return null;

        return {
          labMemberId: employee.id,
          labMemberName: employee.users.name,
        };
      })
      .filter(
        (option): option is ScheduleReviewAssigneeOption => Boolean(option),
      );

    return {
      caseId: process.case_id,
      caseCode: process.cases.code,
      patientName: process.cases.patient_name,
      customerName: process.cases.customers?.name ?? "No customer",
      dueDate: process.cases.due_date?.toISOString() ?? null,
      priority: resolveCasePriority(
        process.cases.priority,
        process.cases.is_urgent,
        process.cases.due_date,
      ),
      caseProcessId: process.id,
      workflowStepId: process.workflow_step_id,
      processName: process.processes.name,
      status: process.status,
      editable: isMovable(process),
      assignedLabMemberId: process.assigned_lab_member_id,
      assignedLabMemberName,
      plannedStartDate: process.planned_start_date?.toISOString() ?? null,
      plannedEndDate: process.planned_end_date?.toISOString() ?? null,
      schedulingStatus: process.scheduling_status as SchedulingStatusLiteral,
      assigneeOptions,
    };
  });
}

function buildScheduleProposalPayload(context: ScheduleContext): ScheduleProposalPayload {
  const capacity = buildEmployeeDayCapacities(context);
  const proposedChanges: ProposalProcessChange[] = [];
  const risks: ScheduleProposalRisk[] = [];
  const readyByProcessId = buildDependencyReadyDates([]);

  const sortedProcesses = [...context.caseProcesses].sort((left, right) => {
    const priorityDelta = priorityWeight(right.cases.priority) - priorityWeight(left.cases.priority);
    if (priorityDelta !== 0) return priorityDelta;

    const dueDelta =
      (left.cases.due_date?.getTime() ?? Number.MAX_SAFE_INTEGER) -
      (right.cases.due_date?.getTime() ?? Number.MAX_SAFE_INTEGER);
    if (dueDelta !== 0) return dueDelta;

    return left.created_at.getTime() - right.created_at.getTime();
  });

  for (const process of sortedProcesses) {
    if (!isMovable(process)) {
      continue;
    }

    const totalMinutes = getProcessTotalMinutes(process);
    const dependencyDates = process.dependencies
      .map((dependency) => readyByProcessId.get(dependency.depends_on_case_process_id))
      .filter((value): value is string => Boolean(value))
      .map((value) => parseIsoDate(value));
    const dependencyReadyDate =
      dependencyDates.length > 0
        ? dependencyDates.reduce((latest, current) => (current > latest ? current : latest))
        : startOfDay(new Date());
    const earliestDate = addDays(
      dependencyReadyDate,
      process.snapshot_dependency_lag_days,
    );

    const candidateAssignments = process.processes.employeeAssignments
      .filter((assignment) =>
        process.assigned_lab_member_id
          ? assignment.lab_member_id === process.assigned_lab_member_id
          : true,
      );

    if (candidateAssignments.length === 0) {
      risks.push({
        caseProcessId: process.id,
        caseCode: process.cases.code,
        processName: process.processes.name,
        reason: "No eligible employee is assigned to this process.",
      });
      proposedChanges.push({
        caseProcessId: process.id,
        assignedLabMemberId: process.assigned_lab_member_id ?? "",
        originalAssignedLabMemberId: process.assigned_lab_member_id ?? "",
        plannedMillingMachineId: process.planned_milling_machine_id,
        plannedStartDate: null,
        plannedEndDate: null,
        schedulingStatus: "UNSCHEDULED",
        allocations: [],
      });
      continue;
    }

    let chosenChange: ProposalProcessChange | null = null;

    for (const assignment of candidateAssignments) {
      let remainingMinutes = totalMinutes;
      let remainingDays = process.snapshot_expected_duration_days;
      const allocations: ProposalProcessChange["allocations"] = [];
      let plannedStartDate: string | null = null;
      let plannedEndDate: string | null = null;
      let assignedMachineId: string | null = process.planned_milling_machine_id;

      for (const isoDate of capacity.horizon) {
        const date = parseIsoDate(isoDate);
        if (date < earliestDate) {
          continue;
        }

        const employeeMinutes = getAvailableMinutes(
          capacity.employeeMinutes,
          assignment.lab_member_id,
          isoDate,
        );
        if (employeeMinutes <= 0) {
          continue;
        }

        const machine = process.snapshot_requires_milling_machine
          ? chooseMachineCandidate(
              context,
              capacity.machineMinutes,
              isoDate,
              process.planned_milling_machine_id,
            )
          : null;

        if (process.snapshot_requires_milling_machine && !machine) {
          continue;
        }

        const machineMinutes = machine
          ? getAvailableMinutes(capacity.machineMinutes, machine.id, isoDate)
          : Number.MAX_SAFE_INTEGER;
        const maxChunk = clampMinutes(Math.ceil(remainingMinutes / Math.max(1, remainingDays)));
        const allocatedMinutes = Math.min(
          remainingMinutes,
          employeeMinutes,
          machineMinutes,
          Math.max(1, maxChunk),
        );

        if (allocatedMinutes <= 0) {
          continue;
        }

        consumeMinutes(
          capacity.employeeMinutes,
          assignment.lab_member_id,
          isoDate,
          allocatedMinutes,
        );
        if (machine) {
          consumeMinutes(capacity.machineMinutes, machine.id, isoDate, allocatedMinutes);
          assignedMachineId = machine.id;
        }

        allocations.push({
          date: isoDate,
          plannedMinutes: allocatedMinutes,
          millingMachineId: machine?.id ?? null,
        });
        plannedStartDate ??= isoDate;
        plannedEndDate = isoDate;
        remainingMinutes -= allocatedMinutes;
        remainingDays = Math.max(0, remainingDays - 1);

        if (remainingMinutes <= 0 && remainingDays <= 0) {
          break;
        }
      }

      if (plannedStartDate && plannedEndDate && remainingMinutes <= 0 && remainingDays <= 0) {
        chosenChange = {
          caseProcessId: process.id,
          assignedLabMemberId: assignment.lab_member_id,
          originalAssignedLabMemberId: assignment.lab_member_id,
          plannedMillingMachineId: assignedMachineId,
          plannedStartDate,
          plannedEndDate,
          schedulingStatus: "SCHEDULED",
          allocations,
        };
        break;
      }
    }

    if (!chosenChange) {
      risks.push({
        caseProcessId: process.id,
        caseCode: process.cases.code,
        processName: process.processes.name,
        reason: "Not enough employee or machine capacity inside the planning horizon.",
      });
      proposedChanges.push({
        caseProcessId: process.id,
        assignedLabMemberId: process.assigned_lab_member_id ?? "",
        originalAssignedLabMemberId: process.assigned_lab_member_id ?? "",
        plannedMillingMachineId: process.planned_milling_machine_id,
        plannedStartDate: null,
        plannedEndDate: null,
        schedulingStatus: "AT_RISK",
        allocations: [],
      });
      continue;
    }

    proposedChanges.push(chosenChange);
    if (chosenChange.plannedEndDate) {
      readyByProcessId.set(chosenChange.caseProcessId, chosenChange.plannedEndDate);
    }
  }

  return {
    summary: {
      scheduledCount: proposedChanges.filter((change) => change.schedulingStatus === "SCHEDULED").length,
      atRiskCount: proposedChanges.filter((change) => change.schedulingStatus === "AT_RISK").length,
      unscheduledCount: proposedChanges.filter((change) => change.schedulingStatus === "UNSCHEDULED").length,
      riskCount: risks.length,
    },
    changes: proposedChanges,
    risks,
    reviewCases: buildCaseGroupedScheduleReview({
      processes: buildReviewSourceProcesses(context),
      changes: proposedChanges,
      risks,
    }),
    employeeWorkloads: buildProposalEmployeeWorkloads({
      employees: context.employees,
      changes: proposedChanges,
    }),
  };
}

function parseStoredScheduleProposalPayload(value: unknown): ScheduleProposalPayload {
  if (!value || typeof value !== "object" || Array.isArray(value)) {
    throw new ScheduleProposalConflictError("Schedule proposal payload is invalid.");
  }

  const payload = value as Partial<ScheduleProposalPayload>;
  if (
    !payload.summary ||
    !Array.isArray(payload.changes) ||
    !Array.isArray(payload.risks) ||
    !Array.isArray(payload.reviewCases)
  ) {
    throw new ScheduleProposalConflictError("Schedule proposal payload is invalid.");
  }

  const changes = payload.changes.map((change) => ({
    ...change,
    originalAssignedLabMemberId:
      "originalAssignedLabMemberId" in change &&
      typeof change.originalAssignedLabMemberId === "string"
        ? change.originalAssignedLabMemberId
        : change.assignedLabMemberId,
  }));

  return {
    ...payload,
    changes,
    employeeWorkloads: Array.isArray(payload.employeeWorkloads)
      ? payload.employeeWorkloads
      : [],
  } as ScheduleProposalPayload;
}

export function applyEditedProposalChanges(
  proposalPayload: ScheduleProposalPayload,
  editedChanges: ApproveScheduleProposalInput["changes"],
) {
  const errors: Record<string, string[]> = {};
  const changeByProcessId = new Map(
    editedChanges.map((change) => [change.caseProcessId, change]),
  );
  const allowedAssigneesByProcessId = new Map(
    proposalPayload.reviewCases.flatMap((reviewCase) =>
      reviewCase.processes.map((process) => [
        process.caseProcessId,
        new Set(process.assigneeOptions.map((option) => option.labMemberId)),
      ] as const),
    ),
  );

  for (const editedChange of editedChanges) {
    const original = proposalPayload.changes.find(
      (change) => change.caseProcessId === editedChange.caseProcessId,
    );

    if (!original) {
      errors.changes = [...(errors.changes ?? []), "Edited changes must match the draft proposal."];
      continue;
    }

    const allowedAssignees = allowedAssigneesByProcessId.get(editedChange.caseProcessId);
    if (!allowedAssignees) {
      errors.changes = [...(errors.changes ?? []), "Edited changes must target reviewable processes."];
      continue;
    }

    if (
      editedChange.assignedLabMemberId &&
      !allowedAssignees.has(editedChange.assignedLabMemberId)
    ) {
      errors[`changes.${editedChange.caseProcessId}.assignedLabMemberId`] = [
        "Assigned lab member is not eligible for this process.",
      ];
    }
  }

  if (Object.keys(errors).length > 0) {
    throw new ScheduleProposalValidationError(errors);
  }

  return proposalPayload.changes.map((change) => {
    const editedChange = changeByProcessId.get(change.caseProcessId);
    if (!editedChange) return change;

    return {
      ...change,
      assignedLabMemberId: editedChange.assignedLabMemberId ?? "",
    };
  });
}

async function validateAssignedLabMember(
  client: LabMemberValidatorClient,
  lab_id: string,
  process_id: string,
  assigned_lab_member_id: string,
) {
  const labMember = await client.lab_members.findFirst({
    where: {
      id: assigned_lab_member_id,
      lab_id,
      users: {
        is_active: true,
        deleted_at: null,
      },
      processOwnerships: {
        some: {
          lab_id,
          process_id,
        },
      },
    },
    select: { id: true },
  });

  if (!labMember) {
    throw new ScheduleProposalValidationError({
      assignedLabMemberId: [
        "Assigned lab member is inactive, archived, outside this lab, or not assigned to this process.",
      ],
    });
  }
}

async function loadScheduleContext(user_id: string) {
  const membership = await getSingleLabMembership(user_id);
  const processWhere: Prisma.case_processesWhereInput = {
    cases: { lab_id: membership.lab_id },
    status: {
      in: [CaseProcessStatus.READY, CaseProcessStatus.IN_PROGRESS],
    },
    ...(membership.role === UserRole.PRODUCTION
      ? { assigned_lab_member_id: membership.id }
      : {}),
  };

  const [lab, caseProcesses, employees, machines, proposals] = await Promise.all([
    prisma.labs.findUniqueOrThrow({
      where: { id: membership.lab_id },
      select: {
        id: true,
        timezone: true,
        schedule_revision: true,
      },
    }),
    prisma.case_processes.findMany({
      where: processWhere,
      include: {
        processes: {
          select: {
            id: true,
            name: true,
            employeeAssignments: {
              select: {
                lab_member_id: true,
              },
            },
          },
        },
        assignedLabMember: {
          select: {
            users: {
              select: {
                name: true,
              },
            },
          },
        },
        cases: {
          select: {
            id: true,
            code: true,
            patient_name: true,
            due_date: true,
            priority: true,
            is_urgent: true,
            customers: {
              select: {
                name: true,
              },
            },
          },
        },
        case_services: {
          select: {
            quantity: true,
            service_name_snapshot: true,
            delivery_buffer_days_snapshot: true,
          },
        },
        dependencies: {
          select: {
            depends_on_case_process_id: true,
          },
        },
        scheduleAllocations: {
          select: {
            allocation_date: true,
            planned_minutes: true,
            milling_machine_id: true,
          },
        },
      },
      orderBy: [{ cases: { due_date: "asc" } }, { created_at: "asc" }],
    }),
    prisma.lab_members.findMany({
      where: {
        lab_id: membership.lab_id,
        users: {
          is_active: true,
          deleted_at: null,
        },
        ...(membership.role === UserRole.PRODUCTION ? { id: membership.id } : {}),
      },
      select: {
        id: true,
        role: true,
        users: {
          select: {
            name: true,
          },
        },
        processOwnerships: {
          select: {
            process_id: true,
            productivity_points_per_hour: true,
          },
        },
        scheduleShifts: {
          select: {
            day_of_week: true,
            available_minutes: true,
          },
        },
        scheduleExceptions: {
          select: {
            exception_date: true,
            available_minutes: true,
          },
        },
      },
      orderBy: { created_at: "asc" },
    }),
    prisma.milling_machines.findMany({
      where: {
        lab_id: membership.lab_id,
        status: { in: ["ACTIVE", "MAINTENANCE"] },
      },
      select: {
        id: true,
        name: true,
        productivity_points_per_hour: true,
        scheduleShifts: {
          select: {
            day_of_week: true,
            start_minute: true,
            end_minute: true,
            is_active: true,
          },
        },
        scheduleExceptions: {
          select: {
            exception_date: true,
            start_minute: true,
            end_minute: true,
            is_available: true,
          },
        },
      },
      orderBy: { name: "asc" },
    }),
    prisma.schedule_proposals.findMany({
      where: {
        lab_id: membership.lab_id,
      },
      orderBy: { created_at: "desc" },
      take: 10,
    }),
  ]);

  return {
    membership,
    lab,
    caseProcesses,
    employees,
    machines,
    proposals,
  };
}

function serializeScheduleOverview(context: ScheduleContext) {
  const horizon = buildHorizonDates();
  const activeCases = buildCaseGroupedScheduleReview({
    processes: buildReviewSourceProcesses(context),
  });

  return {
    timezone: context.lab.timezone,
    scheduleRevision: context.lab.schedule_revision,
    canManage: context.membership.role !== UserRole.PRODUCTION,
    horizon,
    activeCaseCount: activeCases.length,
    activeProcessCount: context.caseProcesses.length,
    activeCases,
    employees: context.employees.map((employee) => ({
      id: employee.id,
      name: employee.users.name,
      role: employee.role,
      processes: employee.processOwnerships.map((assignment) => ({
        processId: assignment.process_id,
      })),
      shiftsConfigured: employee.scheduleShifts.length > 0,
    })),
    machines: context.machines.map((machine) => ({
      id: machine.id,
      name: machine.name,
      productivityPointsPerHour: Number(machine.productivity_points_per_hour),
      shiftsConfigured: machine.scheduleShifts.length > 0,
    })),
    proposals: context.proposals.map((proposal) => ({
      id: proposal.id,
      status: proposal.status,
      sourceRevision: proposal.source_revision,
      createdAt: proposal.created_at.toISOString(),
      decidedAt: proposal.decided_at?.toISOString() ?? null,
      summary: proposal.summary_json,
    })),
  };
}

function serializeScheduleProposalRecord(proposal: {
  id: string;
  status: ScheduleProposalStatus;
  source_revision: number;
  created_at: Date;
  decided_at: Date | null;
  changes_json: Prisma.JsonValue;
}) {
  const payload = parseStoredScheduleProposalPayload(proposal.changes_json);

  return {
    id: proposal.id,
    status: proposal.status,
    sourceRevision: proposal.source_revision,
    createdAt: proposal.created_at.toISOString(),
    decidedAt: proposal.decided_at?.toISOString() ?? null,
    summary: payload.summary,
    changes: payload.changes,
    risks: payload.risks,
    reviewCases: payload.reviewCases,
    employeeWorkloads: payload.employeeWorkloads,
  };
}

export async function listScheduleForLoggedLab(user_id: string) {
  const context = await loadScheduleContext(user_id);
  return serializeScheduleOverview(context);
}

export async function createScheduleProposalForLoggedLab(user_id: string) {
  const context = await loadScheduleContext(user_id);
  assertCanManageSchedule(context.membership.role);

  const payload = buildScheduleProposalPayload(context);
  const proposal = await prisma.schedule_proposals.create({
    data: {
      lab_id: context.membership.lab_id,
      status: ScheduleProposalStatus.DRAFT,
      source_revision: context.lab.schedule_revision,
      summary_json: payload.summary as Prisma.InputJsonValue,
      changes_json: payload as Prisma.InputJsonValue,
      created_by_user_id: user_id,
    },
  });

  return {
    id: proposal.id,
    status: proposal.status,
    sourceRevision: proposal.source_revision,
    createdAt: proposal.created_at.toISOString(),
    summary: payload.summary,
    changes: payload.changes,
    risks: payload.risks,
    reviewCases: payload.reviewCases,
    employeeWorkloads: payload.employeeWorkloads,
  };
}

export async function getScheduleProposalForLoggedLab(
  user_id: string,
  proposalId: string,
) {
  const membership = await getSingleLabMembership(user_id);
  const proposal = await prisma.schedule_proposals.findFirst({
    where: {
      id: proposalId,
      lab_id: membership.lab_id,
    },
  });

  if (!proposal) {
    throw new ScheduleProposalNotFoundError();
  }

  return serializeScheduleProposalRecord(proposal);
}

export async function approveScheduleProposalForLoggedLab(
  user_id: string,
  proposalId: string,
  input: ApproveScheduleProposalInput,
) {
  const membership = await getSingleLabMembership(user_id);
  assertCanManageSchedule(membership.role);

  return prisma.$transaction(async (tx) => {
    const proposal = await tx.schedule_proposals.findFirst({
      where: {
        id: proposalId,
        lab_id: membership.lab_id,
      },
    });

    if (!proposal) {
      throw new ScheduleProposalNotFoundError();
    }

    if (proposal.status !== ScheduleProposalStatus.DRAFT) {
      throw new ScheduleProposalConflictError("Only draft proposals can be approved.");
    }

    const lab = await tx.labs.findUniqueOrThrow({
      where: { id: membership.lab_id },
      select: { schedule_revision: true },
    });

    if (lab.schedule_revision !== proposal.source_revision) {
      throw new ScheduleProposalConflictError();
    }

    const proposalPayload = parseStoredScheduleProposalPayload(proposal.changes_json);
    const mergedChanges = applyEditedProposalChanges(proposalPayload, input.changes);
    const processIds = mergedChanges.map((change) => change.caseProcessId);
    const processes = await tx.case_processes.findMany({
      where: {
        id: { in: processIds },
        cases: { lab_id: membership.lab_id },
      },
      select: {
        id: true,
        process_id: true,
      },
    });
    const processById = new Map(processes.map((process) => [process.id, process]));

    if (processById.size !== processIds.length) {
      throw new ScheduleProposalValidationError({
        changes: ["Proposal changes reference case processes outside this lab."],
      });
    }

    for (const change of mergedChanges) {
      const process = processById.get(change.caseProcessId);
      if (!process) {
        throw new ScheduleProposalValidationError({
          changes: ["Proposal changes reference an unknown case process."],
        });
      }

      if (change.assignedLabMemberId) {
        await validateAssignedLabMember(
          tx,
          membership.lab_id,
          process.process_id,
          change.assignedLabMemberId,
        );
      }
    }

    await tx.case_process_schedule_allocations.deleteMany({
      where: {
        case_process_id: { in: processIds },
      },
    });

    for (const change of mergedChanges) {
      await tx.case_processes.update({
        where: { id: change.caseProcessId },
        data: {
          assigned_lab_member_id: change.assignedLabMemberId || null,
          planned_milling_machine_id: change.plannedMillingMachineId,
          planned_start_date: change.plannedStartDate ? new Date(change.plannedStartDate) : null,
          planned_end_date: change.plannedEndDate ? new Date(change.plannedEndDate) : null,
          scheduling_status: mapSchedulingStatus(change.schedulingStatus),
        },
      });

      if (change.allocations.length > 0 && change.assignedLabMemberId) {
        await tx.case_process_schedule_allocations.createMany({
          data: change.allocations.map((allocation) => ({
            case_process_id: change.caseProcessId,
            lab_member_id: change.assignedLabMemberId,
            allocation_date: new Date(allocation.date),
            planned_minutes: allocation.plannedMinutes,
            milling_machine_id: allocation.millingMachineId,
          })),
        });
      }
    }

    const workloadEmployees = await tx.lab_members.findMany({
      where: {
        lab_id: membership.lab_id,
        users: {
          is_active: true,
          deleted_at: null,
        },
      },
      select: {
        id: true,
        users: {
          select: {
            name: true,
          },
        },
        scheduleShifts: {
          select: {
            day_of_week: true,
            available_minutes: true,
          },
        },
        scheduleExceptions: {
          select: {
            exception_date: true,
            available_minutes: true,
          },
        },
      },
    });

    const approvedAt = new Date();
    await tx.schedule_proposals.update({
      where: { id: proposal.id },
      data: {
        status: ScheduleProposalStatus.APPROVED,
        approved_by_user_id: user_id,
        decided_at: approvedAt,
        changes_json: {
          ...proposalPayload,
          changes: mergedChanges,
          reviewCases: buildCaseGroupedScheduleReview({
            processes: proposalPayload.reviewCases.flatMap((reviewCase) =>
              reviewCase.processes.map((process) => ({
                caseId: reviewCase.caseId,
                caseCode: reviewCase.caseCode,
                patientName: reviewCase.patientName,
                customerName: reviewCase.customerName,
                dueDate: reviewCase.dueDate,
                priority: reviewCase.priority,
                caseProcessId: process.caseProcessId,
                workflowStepId: process.workflowStepId,
                processName: process.processName,
                status: process.status,
                editable: process.editable,
                assignedLabMemberId: process.assignedLabMemberId,
                assignedLabMemberName: process.assignedLabMemberName,
                plannedStartDate: process.plannedStartDate,
                plannedEndDate: process.plannedEndDate,
                schedulingStatus: process.schedulingStatus,
                assigneeOptions: process.assigneeOptions,
              })),
            ),
            changes: mergedChanges,
            risks: proposalPayload.risks,
          }),
          employeeWorkloads: buildProposalEmployeeWorkloads({
            employees: workloadEmployees,
            changes: mergedChanges,
          }),
        } as Prisma.InputJsonValue,
      },
    });

    await bumpLabScheduleRevision(tx, membership.lab_id);

    return {
      id: proposal.id,
      status: ScheduleProposalStatus.APPROVED,
      decidedAt: approvedAt.toISOString(),
    };
  });
}

export async function rejectScheduleProposalForLoggedLab(
  user_id: string,
  proposalId: string,
) {
  const membership = await getSingleLabMembership(user_id);
  assertCanManageSchedule(membership.role);

  const proposal = await prisma.schedule_proposals.findFirst({
    where: {
      id: proposalId,
      lab_id: membership.lab_id,
    },
    select: { id: true, status: true },
  });

  if (!proposal) {
    throw new ScheduleProposalNotFoundError();
  }

  if (proposal.status !== ScheduleProposalStatus.DRAFT) {
    throw new ScheduleProposalConflictError("Only draft proposals can be rejected.");
  }

  const rejected = await prisma.schedule_proposals.update({
    where: { id: proposal.id },
    data: {
      status: ScheduleProposalStatus.REJECTED,
      rejected_by_user_id: user_id,
      decided_at: new Date(),
    },
  });

  return {
    id: rejected.id,
    status: rejected.status,
  };
}

export { MissingLabMembershipError, RoleAuthorizationError };
