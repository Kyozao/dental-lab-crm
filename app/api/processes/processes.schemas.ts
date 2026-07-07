import { optionalString } from "../_shared/reference-resource";

export type ProcessInput = {
  name?: string | null;
  description?: string | null;
  default_fixed_minutes?: number | null;
  default_expected_duration_days?: number | null;
  default_requires_milling_machine?: boolean | null;
  default_labor_cost?: string | null;
  is_active?: unknown;
};

type ValidationResult =
  | { success: true; data: ProcessInput }
  | { success: false; errors: Record<string, string[]> };

function addError(
  errors: Record<string, string[]>,
  field: string,
  message: string,
) {
  errors[field] = [...(errors[field] ?? []), message];
}

function parseNonNegativeInteger(
  value: unknown,
  field: string,
  errors: Record<string, string[]>,
) {
  if (value === undefined) return undefined;

  const parsed = typeof value === "number" ? value : Number(value);
  if (!Number.isInteger(parsed) || parsed < 0) {
    addError(errors, field, "Must be a non-negative integer.");
    return null;
  }

  return parsed;
}

function parsePositiveInteger(
  value: unknown,
  field: string,
  errors: Record<string, string[]>,
) {
  if (value === undefined) return undefined;

  const parsed = typeof value === "number" ? value : Number(value);
  if (!Number.isInteger(parsed) || parsed < 1) {
    addError(errors, field, "Must be a positive integer.");
    return null;
  }

  return parsed;
}

function parseOptionalBoolean(
  value: unknown,
  field: string,
  errors: Record<string, string[]>,
) {
  if (value === undefined) return undefined;
  if (typeof value !== "boolean") {
    addError(errors, field, "Must be a boolean.");
    return null;
  }

  return value;
}

function parseMoney(
  value: unknown,
  field: string,
  errors: Record<string, string[]>,
) {
  if (value === undefined) return undefined;

  const rawValue =
    typeof value === "number"
      ? String(value)
      : typeof value === "string"
        ? value.trim()
        : null;

  if (!rawValue) {
    addError(errors, field, "Labor cost is required.");
    return null;
  }

  if (!/^-?\d+(\.\d{1,2})?$/.test(rawValue)) {
    addError(
      errors,
      field,
      "Labor cost must be a valid amount with up to 2 decimals.",
    );
    return null;
  }

  const parsed = Number(rawValue);
  if (!Number.isFinite(parsed) || parsed < 0) {
    addError(errors, field, "Labor cost must be zero or greater.");
    return null;
  }

  return parsed.toFixed(2);
}

function parseProcessInput(
  payload: Record<string, unknown>,
  options: { requireName: boolean; requireDefaultLaborCost: boolean },
): ValidationResult {
  const name = optionalString(payload.name);
  const errors: Record<string, string[]> = {};

  if (options.requireName && !name) {
    errors.name = ["This field is required."];
  }

  const default_fixed_minutes = parseNonNegativeInteger(
    payload.default_fixed_minutes,
    "default_fixed_minutes",
    errors,
  );
  const default_expected_duration_days = parsePositiveInteger(
    payload.default_expected_duration_days,
    "default_expected_duration_days",
    errors,
  );
  const default_requires_milling_machine = parseOptionalBoolean(
    payload.default_requires_milling_machine,
    "default_requires_milling_machine",
    errors,
  );
  const default_labor_cost = parseMoney(
    payload.default_labor_cost,
    "default_labor_cost",
    errors,
  );

  if (options.requireDefaultLaborCost && default_labor_cost === undefined) {
    addError(errors, "default_labor_cost", "Labor cost is required.");
  }

  if (payload.default_minutes_per_unit !== undefined) {
    addError(
      errors,
      "default_minutes_per_unit",
      "Minutes per unit is no longer supported.",
    );
  }

  if (payload.default_dependency_lag_days !== undefined) {
    addError(
      errors,
      "default_dependency_lag_days",
      "Dependency lag days is no longer supported.",
    );
  }

  if (Object.keys(errors).length > 0) {
    return {
      success: false,
      errors,
    };
  }

  return {
    success: true,
    data: {
      name,
      description: optionalString(payload.description),
      default_fixed_minutes,
      default_expected_duration_days,
      default_requires_milling_machine,
      default_labor_cost,
      is_active: payload.is_active,
    },
  };
}

export function parseCreateProcessInput(payload: Record<string, unknown>) {
  return parseProcessInput(payload, {
    requireName: true,
    requireDefaultLaborCost: true,
  });
}

export function parseUpdateProcessInput(payload: Record<string, unknown>) {
  return parseProcessInput(payload, {
    requireName: false,
    requireDefaultLaborCost: false,
  });
}
