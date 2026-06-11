import { CaseProcessStatus, UserRole } from "@/generated/prisma/enums";
import { prisma } from "@/lib/prisma";

import { activeReferenceWhere } from "../_shared/archive";
import { getSingleLabMembership } from "../_shared/membership";
import {
  ReferenceNotFoundError,
  ReferenceValidationError,
} from "../_shared/reference-resource";
import type { UpdateCaseProcessInput } from "./case-processes.schemas";

async function validateAssignedUser(lab_id: string, assigned_to_id: string) {
  const user = await prisma.users.findFirst({
    where: {
      id: assigned_to_id,
      ...activeReferenceWhere,
      memberships: {
        some: {
          lab_id,
          role: { in: [UserRole.CAD_DESIGNER, UserRole.PRODUCTION] },
        },
      },
    },
    select: { id: true },
  });

  if (!user) {
    throw new ReferenceValidationError({
      assigned_to_id: ["Assigned user is inactive, archived, or not assigned to this lab."],
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

export async function updateCaseProcessForLoggedLab(
  user_id: string,
  case_process_id: string,
  payload: UpdateCaseProcessInput,
) {
  const { lab_id } = await getSingleLabMembership(user_id);
  const existing = await prisma.case_processes.findFirst({
    where: {
      id: case_process_id,
      cases: { lab_id },
    },
    select: {
      id: true,
      started_at: true,
    },
  });

  if (!existing) throw new ReferenceNotFoundError("Case process");

  if (payload.assigned_to_id) {
    await validateAssignedUser(lab_id, payload.assigned_to_id);
  }

  const now = new Date();
  const caseProcess = await prisma.case_processes.update({
    where: { id: case_process_id },
    data: {
      status: payload.status,
      assigned_to_id: payload.assigned_to_id,
      started_at:
        payload.status === CaseProcessStatus.IN_PROGRESS && !existing.started_at
          ? now
          : undefined,
      completed_at:
        payload.status === CaseProcessStatus.COMPLETED ? now : undefined,
    },
    select: {
      id: true,
      case_id: true,
      process_id: true,
      workflow_step_id: true,
      status: true,
      assigned_to_id: true,
      started_at: true,
      completed_at: true,
      created_at: true,
      updated_at: true,
      processes: {
        select: {
          name: true,
        },
      },
      assignedTo: {
        select: {
          name: true,
        },
      },
      dependencies: {
        select: {
          depends_on_case_process_id: true,
        },
      },
    },
  });

  if (payload.status === CaseProcessStatus.COMPLETED) {
    await unlockReadyDependents(case_process_id);
  }

  return {
    id: caseProcess.id,
    case_id: caseProcess.case_id,
    process_id: caseProcess.process_id,
    processName: caseProcess.processes.name,
    workflow_step_id: caseProcess.workflow_step_id,
    status: caseProcess.status,
    assigned_to_id: caseProcess.assigned_to_id,
    assignedToName: caseProcess.assignedTo?.name ?? null,
    dependsOnCaseProcessIds: caseProcess.dependencies.map(
      (dependency) => dependency.depends_on_case_process_id,
    ),
    started_at: caseProcess.started_at,
    completed_at: caseProcess.completed_at,
    created_at: caseProcess.created_at,
    updated_at: caseProcess.updated_at,
  };
}
