import { optionalString } from "../_shared/reference-resource";

export type ServiceTypeWorkflowStep = {
  id: string;
  process_id: string;
  dependsOn: string[];
  fixed_minutes: number;
  minutes_per_unit: number;
  expected_duration_days: number;
  dependency_lag_days: number;
  requires_milling_machine: boolean;
};

export type ServiceTypeWorkflow = {
  steps: ServiceTypeWorkflowStep[];
};

export type ServiceTypeInput = {
  name?: string | null;
  base_price?: string | null;
  delivery_buffer_days?: number | null;
  notes?: string | null;
  is_active?: unknown;
  workflow_json?: ServiceTypeWorkflow;
};

type ValidationResult =
  | { success: true; data: ServiceTypeInput }
  | { success: false; errors: Record<string, string[]> };

export const emptyWorkflow: ServiceTypeWorkflow = { steps: [] };

function addError(
  errors: Record<string, string[]>,
  field: string,
  message: string,
) {
  errors[field] = [...(errors[field] ?? []), message];
}

function parseStringArray(
  value: unknown,
  field: string,
  errors: Record<string, string[]>,
) {
  if (!Array.isArray(value)) {
    addError(errors, field, "This field must be an array.");
    return [];
  }

  const items: string[] = [];
  value.forEach((item, index) => {
    const parsed = optionalString(item);
    if (!parsed) {
      addError(errors, `${field}.${index}`, "Dependency step id is required.");
      return;
    }

    items.push(parsed);
  });

  return items;
}

function parseNonNegativeInteger(
  value: unknown,
  field: string,
  errors: Record<string, string[]>,
) {
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
  const parsed = typeof value === "number" ? value : Number(value);

  if (!Number.isInteger(parsed) || parsed < 1) {
    addError(errors, field, "Must be a positive integer.");
    return null;
  }

  return parsed;
}

function addCycleErrors(
  steps: ServiceTypeWorkflowStep[],
  errors: Record<string, string[]>,
) {
  const byId = new Map(steps.map((step) => [step.id, step]));
  const visiting = new Set<string>();
  const visited = new Set<string>();
  const cycleIds = new Set<string>();

  function visit(stepId: string) {
    if (visiting.has(stepId)) {
      cycleIds.add(stepId);
      return;
    }

    if (visited.has(stepId)) return;

    const step = byId.get(stepId);
    if (!step) return;

    visiting.add(stepId);
    step.dependsOn.forEach(visit);
    visiting.delete(stepId);
    visited.add(stepId);
  }

  steps.forEach((step) => visit(step.id));

  if (cycleIds.size > 0) {
    addError(
      errors,
      "workflow_json.steps",
      "Workflow dependencies cannot contain cycles.",
    );
  }
}

export function parseWorkflowJson(
  value: unknown,
  errors: Record<string, string[]>,
) {
  if (value === undefined) return undefined;

  if (!value || typeof value !== "object" || Array.isArray(value)) {
    addError(errors, "workflow_json", "Workflow must be an object.");
    return undefined;
  }

  const body = value as Record<string, unknown>;
  if (!Array.isArray(body.steps)) {
    addError(errors, "workflow_json.steps", "Steps must be an array.");
    return undefined;
  }

  const stepIds = new Set<string>();
  const steps: ServiceTypeWorkflowStep[] = [];

  body.steps.forEach((item, index) => {
    const field = `workflow_json.steps.${index}`;
    if (!item || typeof item !== "object" || Array.isArray(item)) {
      addError(errors, field, "Step must be an object.");
      return;
    }

    const step = item as Record<string, unknown>;
    const id = optionalString(step.id);
    const process_id = optionalString(step.process_id);
    const dependsOn = parseStringArray(
      step.dependsOn ?? [],
      `${field}.dependsOn`,
      errors,
    );
    const fixed_minutes = parseNonNegativeInteger(
      step.fixed_minutes ?? step.fixed_points ?? 0,
      `${field}.fixed_minutes`,
      errors,
    );
    const minutes_per_unit = parseNonNegativeInteger(
      step.minutes_per_unit ?? step.points_per_unit ?? 0,
      `${field}.minutes_per_unit`,
      errors,
    );
    const expected_duration_days = parsePositiveInteger(
      step.expected_duration_days ?? 1,
      `${field}.expected_duration_days`,
      errors,
    );
    const dependency_lag_days = parseNonNegativeInteger(
      step.dependency_lag_days ?? 0,
      `${field}.dependency_lag_days`,
      errors,
    );
    const requires_milling_machine =
      typeof step.requires_milling_machine === "boolean"
        ? step.requires_milling_machine
        : false;

    if (!id) {
      addError(errors, `${field}.id`, "Step id is required.");
    } else if (stepIds.has(id)) {
      addError(errors, `${field}.id`, "Step id is duplicated.");
    } else {
      stepIds.add(id);
    }

    if (!process_id) {
      addError(errors, `${field}.process_id`, "Process is required.");
    }

    if (id && dependsOn.includes(id)) {
      addError(errors, `${field}.dependsOn`, "Step cannot depend on itself.");
    }

    if (
      !id ||
      !process_id ||
      fixed_minutes === null ||
      minutes_per_unit === null ||
      expected_duration_days === null ||
      dependency_lag_days === null
    ) {
      return;
    }

    steps.push({
      id,
      process_id,
      dependsOn,
      fixed_minutes,
      minutes_per_unit,
      expected_duration_days,
      dependency_lag_days,
      requires_milling_machine,
    });
  });

  steps.forEach((step, index) => {
    step.dependsOn.forEach((dependencyId) => {
      if (!stepIds.has(dependencyId)) {
        addError(
          errors,
          `workflow_json.steps.${index}.dependsOn`,
          `Dependency step "${dependencyId}" does not exist in this workflow.`,
        );
      }
    });
  });

  addCycleErrors(steps, errors);

  return { steps };
}

export function normalizeWorkflow(value: unknown): ServiceTypeWorkflow {
  if (!value || typeof value !== "object" || Array.isArray(value)) {
    return emptyWorkflow;
  }

  const steps = Array.isArray((value as { steps?: unknown }).steps)
    ? (value as { steps: unknown[] }).steps
    : [];

  return {
    steps: steps.flatMap((item) => {
      if (!item || typeof item !== "object" || Array.isArray(item)) {
        return [];
      }

      const step = item as Record<string, unknown>;
      const id = optionalString(step.id);
      const process_id = optionalString(step.process_id);
      const dependsOn = Array.isArray(step.dependsOn)
        ? step.dependsOn
            .map((dependency) => optionalString(dependency))
            .filter((dependency): dependency is string => Boolean(dependency))
        : [];

      if (!id || !process_id) {
        return [];
      }

      return [
        {
          id,
          process_id,
          dependsOn,
          fixed_minutes:
            typeof (step.fixed_minutes ?? step.fixed_points) === "number" &&
            Number.isInteger(step.fixed_minutes ?? step.fixed_points)
              ? Math.max(0, Number(step.fixed_minutes ?? step.fixed_points))
              : 1,
          minutes_per_unit:
            typeof (step.minutes_per_unit ?? step.points_per_unit) === "number" &&
            Number.isInteger(step.minutes_per_unit ?? step.points_per_unit)
              ? Math.max(
                  0,
                  Number(step.minutes_per_unit ?? step.points_per_unit),
                )
              : 0,
          expected_duration_days:
            typeof step.expected_duration_days === "number" &&
            Number.isInteger(step.expected_duration_days)
              ? Math.max(1, step.expected_duration_days)
              : 1,
          dependency_lag_days:
            typeof step.dependency_lag_days === "number" &&
            Number.isInteger(step.dependency_lag_days)
              ? Math.max(0, step.dependency_lag_days)
              : 0,
          requires_milling_machine: step.requires_milling_machine === true,
        },
      ];
    }),
  };
}

function parseMoney(
  value: unknown,
  field: string,
  errors: Record<string, string[]>,
) {
  if (value === undefined) return undefined;
  if (value === null || value === "") return null;

  const rawValue =
    typeof value === "number"
      ? String(value)
      : typeof value === "string"
        ? value.trim()
        : null;

  if (!rawValue) {
    addError(errors, field, "Price is required.");
    return undefined;
  }

  if (!/^\d+(\.\d{1,2})?$/.test(rawValue)) {
    addError(errors, field, "Price must be a valid amount with up to 2 decimals.");
    return undefined;
  }

  const parsed = Number(rawValue);
  if (!Number.isFinite(parsed) || parsed < 0) {
    addError(errors, field, "Price must be zero or greater.");
    return undefined;
  }

  return parsed.toFixed(2);
}

function parseOptionalNonNegativeInteger(
  value: unknown,
  field: string,
  errors: Record<string, string[]>,
) {
  if (value === undefined) return undefined;
  if (value === null || value === "") return null;
  return parseNonNegativeInteger(value, field, errors);
}

function parseServiceTypeInput(
  payload: Record<string, unknown>,
  options: { requireName: boolean },
): ValidationResult {
  const errors: Record<string, string[]> = {};
  const name = optionalString(payload.name);

  if (options.requireName && !name) {
    addError(errors, "name", "This field is required.");
  }

  const base_price = parseMoney(payload.base_price, "base_price", errors);
  if (options.requireName && base_price === undefined) {
    addError(errors, "base_price", "Price is required.");
  }

  const delivery_buffer_days = parseOptionalNonNegativeInteger(
    payload.delivery_buffer_days,
    "delivery_buffer_days",
    errors,
  );

  if (payload.processes !== undefined) {
    addError(
      errors,
      "processes",
      "Use workflow_json.steps instead of processes.",
    );
  }

  const workflow_json = parseWorkflowJson(payload.workflow_json, errors);

  if (Object.keys(errors).length > 0) {
    return { success: false, errors };
  }

  return {
    success: true,
    data: {
      name,
      base_price,
      ...(delivery_buffer_days !== undefined
        ? { delivery_buffer_days }
        : {}),
      notes: optionalString(payload.notes),
      is_active: payload.is_active,
      workflow_json,
    },
  };
}

export function parseCreateServiceTypeInput(payload: Record<string, unknown>) {
  return parseServiceTypeInput(payload, { requireName: true });
}

export function parseUpdateServiceTypeInput(payload: Record<string, unknown>) {
  return parseServiceTypeInput(payload, { requireName: false });
}
