import { UserRole } from "@/generated/prisma/enums";

export const assignableEmployeeRoles = [
  UserRole.ADMIN,
  UserRole.MANAGER,
  UserRole.PRODUCTION,
] as const;

export type AssignableEmployeeRole = (typeof assignableEmployeeRoles)[number];

export class EmployeeAuthorizationError extends Error {
  constructor(message = "Only owners and admins can manage employees.") {
    super(message);
    this.name = "EmployeeAuthorizationError";
  }
}

export class EmployeeConflictError extends Error {
  constructor(message = "This employee already belongs to a lab.") {
    super(message);
    this.name = "EmployeeConflictError";
  }
}

export function isAssignableEmployeeRole(
  role: UserRole,
): role is AssignableEmployeeRole {
  return assignableEmployeeRoles.includes(role as AssignableEmployeeRole);
}

export function assertCanManageEmployees(role: UserRole) {
  if (role !== UserRole.OWNER && role !== UserRole.ADMIN) {
    throw new EmployeeAuthorizationError();
  }
}

export function assertCanViewEmployees(role: UserRole) {
  if (!canViewEmployees(role)) {
    throw new EmployeeAuthorizationError(
      "Only owners, admins, and managers can view employees.",
    );
  }
}

export function assertCanAssignEmployeeProcesses(role: UserRole) {
  if (!canAssignEmployeeProcesses(role)) {
    throw new EmployeeAuthorizationError(
      "Only owners, admins, and managers can assign employee processes.",
    );
  }
}

export function canViewEmployees(role: UserRole) {
  return (
    role === UserRole.OWNER ||
    role === UserRole.ADMIN ||
    role === UserRole.MANAGER
  );
}

export function canAssignEmployeeProcesses(role: UserRole) {
  return canViewEmployees(role);
}

export function assertUserHasNoLabMembership(membershipCount: number) {
  if (membershipCount > 0) {
    throw new EmployeeConflictError();
  }
}
