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

export const weekdayLabels = [
  "Sunday",
  "Monday",
  "Tuesday",
  "Wednesday",
  "Thursday",
  "Friday",
  "Saturday",
] as const;

export function formatEmployeeDate(value: string) {
  return new Intl.DateTimeFormat("en", {
    month: "short",
    day: "2-digit",
    year: "numeric",
  }).format(new Date(value));
}

export function formatEmployeeDateShort(value: string) {
  return new Intl.DateTimeFormat("en", {
    month: "short",
    day: "2-digit",
  }).format(new Date(value));
}

export function formatMinutesAsHours(minutes: number) {
  return `${(minutes / 60).toFixed(1)}h`;
}

export function minuteValueToTime(minuteValue: number) {
  const hours = Math.floor(minuteValue / 60)
    .toString()
    .padStart(2, "0");
  const minutes = (minuteValue % 60).toString().padStart(2, "0");
  return `${hours}:${minutes}`;
}

export function timeToMinuteValue(value: string) {
  const [hours, minutes] = value.split(":").map(Number);

  if (
    !Number.isInteger(hours) ||
    !Number.isInteger(minutes) ||
    hours < 0 ||
    hours > 23 ||
    minutes < 0 ||
    minutes > 59
  ) {
    return 0;
  }

  return hours * 60 + minutes;
}

export function roleBadgeVariant(
  role: UserRoleValue,
): "info" | "warning" | "neutral" {
  if (role === UserRole.OWNER || role === UserRole.ADMIN) return "info";
  if (role === UserRole.MANAGER) return "warning";
  return "neutral";
}
