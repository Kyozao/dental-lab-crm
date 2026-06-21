import { UserRole } from "@/generated/prisma/enums";

import { activeReferenceWhere } from "../_shared/archive";

export class CaseProcessAuthorizationError extends Error {
  constructor(message = "Only owners, admins, and managers can assign tasks.") {
    super(message);
    this.name = "CaseProcessAuthorizationError";
  }
}

export function assertCanAssignCaseProcess(role: UserRole) {
  if (
    role !== UserRole.OWNER &&
    role !== UserRole.ADMIN &&
    role !== UserRole.MANAGER
  ) {
    throw new CaseProcessAuthorizationError();
  }
}

export function canUpdateCaseProcessStatus(options: {
  role: UserRole;
  membership_id: string;
  assigned_lab_member_id: string | null;
}) {
  if (
    options.role === UserRole.OWNER ||
    options.role === UserRole.ADMIN ||
    options.role === UserRole.MANAGER
  ) {
    return true;
  }

  return options.assigned_lab_member_id === options.membership_id;
}

export function assertCanUpdateCaseProcessStatus(options: {
  role: UserRole;
  membership_id: string;
  assigned_lab_member_id: string | null;
}) {
  if (canUpdateCaseProcessStatus(options)) {
    return;
  }

  throw new CaseProcessAuthorizationError(
    "Only owners, admins, managers, or the employee assigned to this task can update its status.",
  );
}

export function buildCaseProcessAssigneeEligibilityWhere({
  lab_id,
  process_id,
  assigned_lab_member_id,
}: {
  lab_id: string;
  process_id: string;
  assigned_lab_member_id: string;
}) {
  return {
    id: assigned_lab_member_id,
    lab_id,
    users: {
      ...activeReferenceWhere,
    },
    processOwnerships: {
      some: {
        lab_id,
        process_id,
      },
    },
  };
}
