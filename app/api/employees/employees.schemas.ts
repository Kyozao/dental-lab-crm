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

export type UpdateEmployeeRoleInput = {
  role: AssignableEmployeeRole;
};

export type UpdateEmployeeProductivityInput = {
  assignments: Array<{
    process_id: string;
    productivity_points_per_hour: string;
  }>;
};

export type UpdateEmployeeAvailabilityInput = {
  weekday_capacities: Array<{
    id?: string;
    day_of_week: number;
    available_minutes: number;
  }>;
  exceptions: Array<{
    id?: string;
    exception_date: string;
    available_minutes: number;
    reason?: string | null;
  }>;
};

type ValidationResult =
  | { success: true; data: CreateEmployeeInput }
  | { success: false; errors: Record<string, string[]> };

type ProcessAssignmentValidationResult =
  | { success: true; data: UpdateEmployeeProcessesInput }
  | { success: false; errors: Record<string, string[]> };

type RoleUpdateValidationResult =
  | { success: true; data: UpdateEmployeeRoleInput }
  | { success: false; errors: Record<string, string[]> };

type ProductivityUpdateValidationResult =
  | { success: true; data: UpdateEmployeeProductivityInput }
  | { success: false; errors: Record<string, string[]> };

type AvailabilityUpdateValidationResult =
  | { success: true; data: UpdateEmployeeAvailabilityInput }
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

function parseMinuteNumber(
  value: unknown,
  field: string,
  errors: Record<string, string[]>,
) {
  const parsed = typeof value === "number" ? value : Number(value);

  if (!Number.isInteger(parsed) || parsed < 0 || parsed > 1440) {
    errors[field] = ["Minute value must be an integer between 0 and 1440."];
    return null;
  }

  return parsed;
}

function parseIdentifier(value: unknown) {
  return optionalString(value);
}

function addError(
  errors: Record<string, string[]>,
  field: string,
  message: string,
) {
  errors[field] = [...(errors[field] ?? []), message];
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

export function parseUpdateEmployeeRoleInput(
  payload: Record<string, unknown>,
): RoleUpdateValidationResult {
  const role = parseUserRole(payload.role);

  if (!role) {
    return {
      success: false,
      errors: {
        role: ["Role is required."],
      },
    };
  }

  if (!isAssignableEmployeeRole(role)) {
    return {
      success: false,
      errors: {
        role: ["Role cannot be assigned to an employee."],
      },
    };
  }

  return {
    success: true,
    data: {
      role,
    },
  };
}

export function parseUpdateEmployeeProductivityInput(
  payload: Record<string, unknown>,
): ProductivityUpdateValidationResult {
  if (!Array.isArray(payload.assignments)) {
    return {
      success: false,
      errors: {
        assignments: ["Assignments must be an array."],
      },
    };
  }

  const errors: Record<string, string[]> = {};
  const assignments = payload.assignments
    .map((entry, index) => {
      if (!entry || typeof entry !== "object" || Array.isArray(entry)) {
        addError(errors, `assignments.${index}`, "Assignment must be an object.");
        return null;
      }

      const process_id = parseIdentifier((entry as Record<string, unknown>).process_id);
      const rate = optionalString(
        (entry as Record<string, unknown>).productivity_points_per_hour,
      );

      if (!process_id) {
        addError(
          errors,
          `assignments.${index}.process_id`,
          "Process id is required.",
        );
      }

      if (!rate) {
        addError(
          errors,
          `assignments.${index}.productivity_points_per_hour`,
          "Productivity is required.",
        );
      } else if (!/^\d+(\.\d{1,2})?$/.test(rate) || Number(rate) <= 0) {
        addError(
          errors,
          `assignments.${index}.productivity_points_per_hour`,
          "Productivity must be a positive amount with up to 2 decimals.",
        );
      }

      if (!process_id || !rate) {
        return null;
      }

      return {
        process_id,
        productivity_points_per_hour: Number(rate).toFixed(2),
      };
    })
    .filter(
      (
        assignment,
      ): assignment is {
        process_id: string;
        productivity_points_per_hour: string;
      } => Boolean(assignment),
    );

  const duplicateProcessIds = new Set<string>();
  const seenProcessIds = new Set<string>();
  for (const assignment of assignments) {
    if (seenProcessIds.has(assignment.process_id)) {
      duplicateProcessIds.add(assignment.process_id);
    }
    seenProcessIds.add(assignment.process_id);
  }

  if (duplicateProcessIds.size > 0) {
    assignments.forEach((assignment, index) => {
      if (duplicateProcessIds.has(assignment.process_id)) {
        addError(
          errors,
          `assignments.${index}.process_id`,
          "Process is duplicated.",
        );
      }
    });
  }

  if (Object.keys(errors).length > 0) {
    return { success: false, errors };
  }

  return {
    success: true,
    data: {
      assignments,
    },
  };
}

export function parseUpdateEmployeeAvailabilityInput(
  payload: Record<string, unknown>,
): AvailabilityUpdateValidationResult {
  const errors: Record<string, string[]> = {};

  if (!Array.isArray(payload.weekday_capacities)) {
    errors.weekday_capacities = ["Weekday capacities must be an array."];
  }

  if (!Array.isArray(payload.exceptions)) {
    errors.exceptions = ["Exceptions must be an array."];
  }

  if (Object.keys(errors).length > 0) {
    return { success: false, errors };
  }

  type ParsedWeekdayCapacity = {
    id: string | undefined;
    day_of_week: number;
    available_minutes: number;
  };

  type ParsedException = {
    id: string | undefined;
    exception_date: string;
    available_minutes: number;
    reason: string | null;
  };

  const weekday_capacities = (payload.weekday_capacities as unknown[]).map((entry, index) => {
    if (!entry || typeof entry !== "object" || Array.isArray(entry)) {
      addError(
        errors,
        `weekday_capacities.${index}`,
        "Weekday capacity must be an object.",
      );
      return null;
    }

    const item = entry as Record<string, unknown>;
    const id = parseIdentifier(item.id);
    const day_of_week =
      typeof item.day_of_week === "number"
        ? item.day_of_week
        : Number(item.day_of_week);
    const available_minutes = parseMinuteNumber(
      item.available_minutes,
      `weekday_capacities.${index}.available_minutes`,
      errors,
    );

    if (!Number.isInteger(day_of_week) || day_of_week < 0 || day_of_week > 6) {
      addError(
        errors,
        `weekday_capacities.${index}.day_of_week`,
        "Day of week must be an integer between 0 and 6.",
      );
    }

    if (
      !Number.isInteger(day_of_week) ||
      day_of_week < 0 ||
      day_of_week > 6 ||
      available_minutes === null
    ) {
      return null;
    }

    return {
      id,
      day_of_week,
      available_minutes,
    };
  }).filter((shift): shift is ParsedWeekdayCapacity => Boolean(shift));

  const exceptions = (payload.exceptions as unknown[]).map((entry, index) => {
    if (!entry || typeof entry !== "object" || Array.isArray(entry)) {
      addError(errors, `exceptions.${index}`, "Exception must be an object.");
      return null;
    }

    const item = entry as Record<string, unknown>;
    const id = parseIdentifier(item.id);
    const exception_date = optionalString(item.exception_date);
    const reason = optionalString(item.reason) ?? null;
    const available_minutes = parseMinuteNumber(
      item.available_minutes,
      `exceptions.${index}.available_minutes`,
      errors,
    );

    if (!exception_date || Number.isNaN(Date.parse(exception_date))) {
      addError(
        errors,
        `exceptions.${index}.exception_date`,
        "Exception date must be a valid date.",
      );
    }

    if (
      !exception_date ||
      Number.isNaN(Date.parse(exception_date)) ||
      available_minutes === null
    ) {
      return null;
    }

    return {
      id,
      exception_date,
      available_minutes,
      reason,
    };
  }).filter((exception): exception is ParsedException => Boolean(exception));

  const seenWeekdays = new Set<number>();
  for (const weekday of weekday_capacities) {
    if (seenWeekdays.has(weekday.day_of_week)) {
      addError(
        errors,
        "weekday_capacities",
        "Only one weekday capacity is allowed per day.",
      );
      break;
    }
    seenWeekdays.add(weekday.day_of_week);
  }

  if (weekday_capacities.length !== 7 || seenWeekdays.size !== 7) {
    addError(
      errors,
      "weekday_capacities",
      "Provide exactly seven weekday capacity rows, one for each day 0 through 6.",
    );
  }

  const seenExceptionDates = new Set<string>();
  for (const exception of exceptions) {
    const dateKey = new Date(exception.exception_date).toISOString().slice(0, 10);
    if (seenExceptionDates.has(dateKey)) {
      addError(
        errors,
        "exceptions",
        "Only one exception is allowed per date.",
      );
      break;
    }
    seenExceptionDates.add(dateKey);
  }

  if (Object.keys(errors).length > 0) {
    return { success: false, errors };
  }

  return {
    success: true,
    data: {
      weekday_capacities,
      exceptions,
    },
  };
}
