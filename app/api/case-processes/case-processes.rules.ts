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
