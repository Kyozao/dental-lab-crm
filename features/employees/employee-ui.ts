import { UserRole, type UserRole as UserRoleValue } from "@/generated/prisma/enums";

import type { EmployeeRole } from "@/features/employees/types";

export const assignableRoles: EmployeeRole[] = [
  UserRole.ADMIN,
  UserRole.MANAGER,
  UserRole.PRODUCTION,
];

export const roleLabels: Record<UserRoleValue, string> = {
  [UserRole.OWNER]: "Owner",
  [UserRole.ADMIN]: "Admin",
  [UserRole.MANAGER]: "Manager",
  [UserRole.PRODUCTION]: "Production",
};

export function formatEmployeeDate(value: string) {
  return new Intl.DateTimeFormat("en", {
    month: "short",
    day: "2-digit",
    year: "numeric",
  }).format(new Date(value));
}

export function roleBadgeVariant(
  role: UserRoleValue,
): "info" | "warning" | "neutral" {
  if (role === UserRole.OWNER || role === UserRole.ADMIN) return "info";
  if (role === UserRole.MANAGER) return "warning";
  return "neutral";
}
