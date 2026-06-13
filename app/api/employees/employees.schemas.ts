import { UserRole } from "@/generated/prisma/enums";

import {
  type AssignableEmployeeRole,
  isAssignableEmployeeRole,
} from "./employees.rules";

export type CreateEmployeeInput = {
  name: string;
  email: string;
  role: AssignableEmployeeRole;
};

export type UpdateEmployeeProcessesInput = {
  process_ids: string[];
};

type ValidationResult =
  | { success: true; data: CreateEmployeeInput }
  | { success: false; errors: Record<string, string[]> };

type ProcessAssignmentValidationResult =
  | { success: true; data: UpdateEmployeeProcessesInput }
  | { success: false; errors: Record<string, string[]> };

function optionalString(value: unknown) {
  if (typeof value !== "string") return undefined;
  const trimmed = value.trim();
  return trimmed.length > 0 ? trimmed : undefined;
}

function normalizeEmail(value: unknown) {
  const email = optionalString(value);
  if (!email) return undefined;
  return email.toLowerCase();
}

function isValidEmail(email: string) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
}

function parseUserRole(value: unknown) {
  if (typeof value !== "string") return undefined;
  return Object.values(UserRole).find((role) => role === value);
}

export function parseCreateEmployeeInput(
  payload: Record<string, unknown>,
): ValidationResult {
  const errors: Record<string, string[]> = {};
  const name = optionalString(payload.name);
  const email = normalizeEmail(payload.email);
  const role = parseUserRole(payload.role);

  if (!name) {
    errors.name = ["Name is required."];
  }

  if (!email) {
    errors.email = ["Email is required."];
  } else if (!isValidEmail(email)) {
    errors.email = ["Email must be valid."];
  }

  if (!role) {
    errors.role = ["Role is required."];
  } else if (!isAssignableEmployeeRole(role)) {
    errors.role = ["Role cannot be assigned to an employee."];
  }

  if (Object.keys(errors).length > 0) {
    return { success: false, errors };
  }

  const employeeRole = role as AssignableEmployeeRole;

  return {
    success: true,
    data: {
      name: name!,
      email: email!,
      role: employeeRole,
    },
  };
}

export function parseUpdateEmployeeProcessesInput(
  payload: Record<string, unknown>,
): ProcessAssignmentValidationResult {
  const errors: Record<string, string[]> = {};

  if (!Array.isArray(payload.process_ids)) {
    return {
      success: false,
      errors: { process_ids: ["Process ids must be an array."] },
    };
  }

  const processIds = payload.process_ids
    .map((processId) => optionalString(processId))
    .filter((processId): processId is string => Boolean(processId));

  if (processIds.length !== payload.process_ids.length) {
    errors.process_ids = ["Every process id must be a non-empty string."];
  }

  if (Object.keys(errors).length > 0) {
    return { success: false, errors };
  }

  return {
    success: true,
    data: {
      process_ids: [...new Set(processIds)],
    },
  };
}
