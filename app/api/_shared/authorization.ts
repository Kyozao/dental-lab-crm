import { UserRole } from "@/generated/prisma/enums";

export class RoleAuthorizationError extends Error {
  constructor(message = "Forbidden") {
    super(message);
    this.name = "RoleAuthorizationError";
  }
}

export function canAccessBackoffice(role: UserRole) {
  return role !== UserRole.PRODUCTION;
}

export function assertCanAccessBackoffice(role: UserRole) {
  if (!canAccessBackoffice(role)) {
    throw new RoleAuthorizationError(
      "Production users cannot access this resource.",
    );
  }
}
