import { optionalString } from "../_shared/reference-resource";

export type ServiceTypeWorkflowStep = {
  id: string;
  process_id: string;
  dependsOn: string[];
};

export type ServiceTypeWorkflow = {
  steps: ServiceTypeWorkflowStep[];
};

export type ServiceTypeInput = {
  name?: string | null;
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

function parseWorkflowJson(
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

    if (!id || !process_id) return;

    steps.push({ id, process_id, dependsOn });
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

function parseServiceTypeInput(
  payload: Record<string, unknown>,
  options: { requireName: boolean },
): ValidationResult {
  const errors: Record<string, string[]> = {};
  const name = optionalString(payload.name);

  if (options.requireName && !name) {
    addError(errors, "name", "This field is required.");
  }

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
