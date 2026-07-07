import {
  CaseProcessHistoryEventType,
  CaseProcessStatus,
} from "@/generated/prisma/enums";
import { prisma } from "@/lib/prisma";

import { getSingleLabMembership } from "../_shared/membership";
import {
  ReferenceNotFoundError,
  ReferenceValidationError,
} from "../_shared/reference-resource";
import type { UpdateCaseProcessInput } from "./case-processes.schemas";
import { bumpLabScheduleRevision } from "../_shared/scheduling";
import {
  assertCanAssignCaseProcess,
  assertCanUpdateCaseProcessStatus,
  buildCaseProcessAssigneeEligibilityWhere,
} from "./case-processes.rules";

const caseProcessSelect = {
  id: true,
  case_id: true,
  case_service_id: true,
  process_id: true,
  workflow_step_id: true,
  status: true,
  assigned_lab_member_id: true,
  snapshot_fixed_minutes: true,
  snapshot_expected_duration_days: true,
  snapshot_requires_milling_machine: true,
  planned_start_date: true,
  planned_end_date: true,
  scheduling_locked: true,
  scheduling_status: true,
  planned_milling_machine_id: true,
  started_at: true,
  completed_at: true,
  created_at: true,
  updated_at: true,
  processes: {
    select: {
      name: true,
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
  dependencies: {
    select: {
      depends_on_case_process_id: true,
    },
  },
} as const;

type CaseProcessWithRelations = {
  id: string;
  case_id: string;
  case_service_id: string;
  process_id: string;
  workflow_step_id: string;
  status: CaseProcessStatus;
  assigned_lab_member_id: string | null;
  snapshot_fixed_minutes: number;
  snapshot_expected_duration_days: number;
  snapshot_requires_milling_machine: boolean;
  planned_start_date: Date | null;
  planned_end_date: Date | null;
  scheduling_locked: boolean;
  scheduling_status: string;
  planned_milling_machine_id: string | null;
  started_at: Date | null;
  completed_at: Date | null;
  created_at: Date;
  updated_at: Date;
  processes: {
    name: string;
  };
  assignedLabMember: {
    users: {
      name: string;
    };
  } | null;
  dependencies: Array<{
    depends_on_case_process_id: string;
  }>;
};

function mapCaseProcess(caseProcess: CaseProcessWithRelations) {
  return {
    id: caseProcess.id,
    case_id: caseProcess.case_id,
    case_service_id: caseProcess.case_service_id,
    process_id: caseProcess.process_id,
    processName: caseProcess.processes.name,
    workflow_step_id: caseProcess.workflow_step_id,
    status: caseProcess.status,
    assigned_lab_member_id: caseProcess.assigned_lab_member_id,
    fixed_minutes: caseProcess.snapshot_fixed_minutes,
    expected_duration_days: caseProcess.snapshot_expected_duration_days,
    requires_milling_machine: caseProcess.snapshot_requires_milling_machine,
    planned_start_date: caseProcess.planned_start_date,
    planned_end_date: caseProcess.planned_end_date,
    scheduling_locked: caseProcess.scheduling_locked,
    scheduling_status: caseProcess.scheduling_status,
    planned_milling_machine_id: caseProcess.planned_milling_machine_id,
    assignedToName: caseProcess.assignedLabMember?.users.name ?? null,
    dependsOnCaseProcessIds: caseProcess.dependencies.map(
      (dependency) => dependency.depends_on_case_process_id,
    ),
    started_at: caseProcess.started_at,
    completed_at: caseProcess.completed_at,
    created_at: caseProcess.created_at,
    updated_at: caseProcess.updated_at,
  };
}

async function validateAssignedLabMember(
  lab_id: string,
  process_id: string,
  assigned_lab_member_id: string,
) {
  const labMember = await prisma.lab_members.findFirst({
    where: buildCaseProcessAssigneeEligibilityWhere({
      lab_id,
      process_id,
      assigned_lab_member_id,
    }),
    select: { id: true },
  });

  if (!labMember) {
    throw new ReferenceValidationError({
      assigned_lab_member_id: [
        "Assigned lab member is inactive, archived, outside this lab, or not assigned to this process.",
      ],
    });
  }
}

async function unlockReadyDependents(case_process_id: string) {
  const dependents = await prisma.case_process_dependencies.findMany({
    where: { depends_on_case_process_id: case_process_id },
    select: {
      caseProcess: {
        select: {
          id: true,
          status: true,
          dependencies: {
            select: {
              dependsOnCaseProcess: {
                select: {
                  status: true,
                },
              },
            },
          },
        },
      },
    },
  });

  const readyIds = dependents
    .map((dependency) => dependency.caseProcess)
    .filter(
      (process) =>
        process.status === CaseProcessStatus.LOCKED &&
        process.dependencies.every(
          (dependency) =>
            dependency.dependsOnCaseProcess.status === CaseProcessStatus.COMPLETED,
        ),
    )
    .map((process) => process.id);

  if (readyIds.length === 0) return;

  await prisma.case_processes.updateMany({
    where: { id: { in: readyIds } },
    data: { status: CaseProcessStatus.READY },
  });
}

async function lockBlockedDependents(case_process_id: string) {
  const dependents = await prisma.case_process_dependencies.findMany({
    where: { depends_on_case_process_id: case_process_id },
    select: {
      caseProcess: {
        select: {
          id: true,
          status: true,
          dependencies: {
            select: {
              dependsOnCaseProcess: {
                select: {
                  status: true,
                },
              },
            },
          },
        },
      },
    },
  });

  const blockedIds = dependents
    .map((dependency) => dependency.caseProcess)
    .filter(
      (process) =>
        process.status === CaseProcessStatus.READY &&
        process.dependencies.some(
          (dependency) =>
            dependency.dependsOnCaseProcess.status !== CaseProcessStatus.COMPLETED,
        ),
    )
    .map((process) => process.id);

  if (blockedIds.length === 0) return;

  await prisma.case_processes.updateMany({
    where: { id: { in: blockedIds } },
    data: { status: CaseProcessStatus.LOCKED },
  });
}

function requiresCompletedDependencies(status: CaseProcessStatus) {
  return (
    status === CaseProcessStatus.IN_PROGRESS ||
    status === CaseProcessStatus.COMPLETED
  );
}

function isActiveOrCompletedStatus(status: CaseProcessStatus) {
  return (
    status === CaseProcessStatus.IN_PROGRESS ||
    status === CaseProcessStatus.COMPLETED
  );
}

export function getCaseProcessHistoryEventType(input: {
  previousStatus: CaseProcessStatus;
  nextStatus?: CaseProcessStatus;
}) {
  if (input.nextStatus === undefined || input.previousStatus === input.nextStatus) {
    return null;
  }

  if (input.nextStatus === CaseProcessStatus.IN_PROGRESS) {
    return CaseProcessHistoryEventType.STARTED;
  }

  if (input.nextStatus === CaseProcessStatus.COMPLETED) {
    return CaseProcessHistoryEventType.COMPLETED;
  }

  return null;
}

const caseProcessHistorySelect = {
  id: true,
  case_process_id: true,
  actor_user_id: true,
  event_type: true,
  created_at: true,
  actorUser: {
    select: {
      name: true,
      email: true,
    },
  },
  caseProcess: {
    select: {
      process_id: true,
      processes: {
        select: {
          name: true,
        },
      },
    },
  },
} as const;

type CaseProcessHistoryWithRelations = {
  id: string;
  case_process_id: string;
  actor_user_id: string | null;
  event_type: CaseProcessHistoryEventType;
  created_at: Date;
  actorUser: {
    name: string;
    email: string;
  } | null;
  caseProcess: {
    process_id: string;
    processes: {
      name: string;
    };
  };
};

function mapCaseProcessHistoryEvent(
  historyEvent: CaseProcessHistoryWithRelations,
) {
  return {
    id: historyEvent.id,
    caseProcessId: historyEvent.case_process_id,
    processId: historyEvent.caseProcess.process_id,
    processName: historyEvent.caseProcess.processes.name,
    eventType: historyEvent.event_type,
    actorUserId: historyEvent.actor_user_id,
    actorName:
      historyEvent.actorUser?.name ?? historyEvent.actorUser?.email ?? null,
    createdAt: historyEvent.created_at,
  };
}

export async function updateCaseProcessForLoggedLab(
  user_id: string,
  case_process_id: string,
  payload: UpdateCaseProcessInput,
) {
  const membership = await getSingleLabMembership(user_id);
  const { lab_id } = membership;
  const existing = await prisma.case_processes.findFirst({
    where: {
      id: case_process_id,
      cases: { lab_id },
    },
    select: {
      id: true,
      process_id: true,
      status: true,
      assigned_lab_member_id: true,
      started_at: true,
      dependencies: {
        select: {
          dependsOnCaseProcess: {
            select: {
              status: true,
            },
          },
        },
      },
      dependentProcesses: {
        select: {
          caseProcess: {
            select: {
              status: true,
            },
          },
        },
      },
    },
  });

  if (!existing) throw new ReferenceNotFoundError("Case process");

  if (payload.assigned_lab_member_id !== undefined) {
    assertCanAssignCaseProcess(membership.role);

    if (payload.assigned_lab_member_id) {
      await validateAssignedLabMember(
        lab_id,
        existing.process_id,
        payload.assigned_lab_member_id,
      );
    }
  }

  if (payload.status !== undefined) {
    assertCanUpdateCaseProcessStatus({
      role: membership.role,
      membership_id: membership.id,
      assigned_lab_member_id: existing.assigned_lab_member_id,
    });
  }

  if (
    payload.status &&
    requiresCompletedDependencies(payload.status) &&
    existing.dependencies.some(
      (dependency) =>
        dependency.dependsOnCaseProcess.status !== CaseProcessStatus.COMPLETED,
    )
  ) {
    throw new ReferenceValidationError({
      status: ["All dependency steps must be completed before this status is allowed."],
    });
  }

  if (
    payload.status &&
    existing.status === CaseProcessStatus.COMPLETED &&
    payload.status !== CaseProcessStatus.COMPLETED &&
    existing.dependentProcesses.some((dependency) =>
      isActiveOrCompletedStatus(dependency.caseProcess.status),
    )
  ) {
    throw new ReferenceValidationError({
      status: [
        "Roll back completed or active downstream steps before rolling back this dependency.",
      ],
    });
  }

  const now = new Date();
  const historyEventType = getCaseProcessHistoryEventType({
    previousStatus: existing.status,
    nextStatus: payload.status,
  });
  const caseProcess = await prisma.case_processes.update({
    where: { id: case_process_id },
    data: {
      status: payload.status,
      assigned_lab_member_id: payload.assigned_lab_member_id,
      started_at:
        payload.status === CaseProcessStatus.IN_PROGRESS && !existing.started_at
          ? now
          : undefined,
      completed_at:
        payload.status === CaseProcessStatus.COMPLETED
          ? now
          : payload.status
            ? null
            : undefined,
    },
    select: caseProcessSelect,
  });

  if (payload.status === CaseProcessStatus.COMPLETED) {
    await unlockReadyDependents(case_process_id);
  } else if (
    payload.status &&
    existing.status === CaseProcessStatus.COMPLETED
  ) {
    await lockBlockedDependents(case_process_id);
  }

  if (historyEventType) {
    await prisma.case_process_history_events.create({
      data: {
        case_id: caseProcess.case_id,
        case_process_id,
        actor_user_id: user_id,
        event_type: historyEventType,
      },
    });
  }

  await prisma.$transaction(async (tx) => {
    await bumpLabScheduleRevision(tx, lab_id);
  });

  const [caseProcesses, processHistory] = await Promise.all([
    prisma.case_processes.findMany({
      where: { case_id: caseProcess.case_id },
      select: caseProcessSelect,
      orderBy: { created_at: "asc" },
    }),
    prisma.case_process_history_events.findMany({
      where: { case_id: caseProcess.case_id },
      select: caseProcessHistorySelect,
      orderBy: { created_at: "desc" },
    }),
  ]);

  return {
    process: mapCaseProcess(caseProcess),
    processes: caseProcesses.map(mapCaseProcess),
    processHistory: processHistory.map(mapCaseProcessHistoryEvent),
  };
}
