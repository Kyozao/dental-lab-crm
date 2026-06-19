import { CaseStatus, type CaseStatus as CaseStatusValue } from "@/generated/prisma/enums";
import {
  parseWorkflowJson,
  type ServiceTypeWorkflow,
} from "../service-types/service-types.schemas";

export type CreateCaseInput = {
  patient_name: string;
  clientCaseCode?: string | null;
  customer_id?: string | null;
  dentist_id?: string | null;
  current_status?: CaseStatusValue;
  status_reason?: string | null;
  teeth?: string | null;
  elements_qty?: number | null;
  shade?: string | null;
  due_date?: Date | null;
  is_urgent?: boolean;
  observations?: string | null;
  pending_note?: string | null;
  service_lines: CaseServiceLineInput[];
};

export type UpdateCaseInput = Partial<CreateCaseInput>;

export type CaseServiceLineInput = {
  id?: string;
  service_type_id: string;
  quantity: number;
  unit_price?: string | null;
  is_unit_price_overridden?: boolean;
  workflow_json?: ServiceTypeWorkflow;
};

export type ListCasesInput = {
  limit: number;
  status?: CaseStatusValue;
  customer_id?: string;
  urgent?: boolean;
  q?: string;
  current_process_ids?: string[];
};

type ValidationResult =
  | { success: true; data: CreateCaseInput }
  | { success: false; errors: Record<string, string[]> };

type UpdateValidationResult =
  | { success: true; data: UpdateCaseInput }
  | { success: false; errors: Record<string, string[]> };

type ReplaceWorkflowInput = {
  case_service_id: string;
  workflow_json: ServiceTypeWorkflow;
};

type ReplaceWorkflowValidationResult =
  | { success: true; data: ReplaceWorkflowInput }
  | { success: false; errors: Record<string, string[]> };

const caseStatusValues = new Set<string>(Object.values(CaseStatus));
const statusesRequiringReason = new Set<string>([CaseStatus.STANDBY]);
const statusesAllowingReason = new Set<string>([
  CaseStatus.STANDBY,
  CaseStatus.CANCELLED,
]);
const DEFAULT_CASE_LIST_LIMIT = 100;
const MAX_CASE_LIST_LIMIT = 200;

function addError(
  errors: Record<string, string[]>,
  field: string,
  message: string,
) {
  errors[field] = [...(errors[field] ?? []), message];
}

function optionalString(value: unknown) {
  if (value === undefined || value === null) return undefined;
  if (typeof value !== "string") return undefined;

  const trimmed = value.trim();
  return trimmed || null;
}

function optionalDate(
  value: unknown,
  errors: Record<string, string[]>,
): Date | null | undefined {
  const dateValue = optionalString(value);
  if (dateValue === null || dateValue === undefined) return dateValue;

  const parsed = new Date(dateValue);
  if (Number.isNaN(parsed.getTime())) {
    addError(errors, "due_date", "Due date must be a valid date.");
    return undefined;
  }

  return parsed;
}

function optionalPositiveInteger(
  value: unknown,
  field: string,
  errors: Record<string, string[]>,
) {
  if (value === undefined || value === null || value === "") return undefined;

  const parsed = typeof value === "number" ? value : Number(value);
  if (!Number.isInteger(parsed) || parsed < 1) {
    addError(
      errors,
      field,
      field === "elements_qty"
        ? "Elements quantity must be a positive integer."
        : "Must be a positive integer.",
    );
    return undefined;
  }

  return parsed;
}

function optionalMoney(
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

function validateStatusReason(
  nextStatus: string | null | undefined,
  statusReason: string | null | undefined,
  errors: Record<string, string[]>,
) {
  if (nextStatus === undefined) {
    if (statusReason !== undefined) {
      addError(
        errors,
        "status_reason",
        "Status reason can only be sent when current status is changing.",
      );
    }
    return;
  }

  if (nextStatus === null) {
    if (statusReason !== undefined) {
      addError(errors, "status_reason", "Status reason is invalid.");
    }
    return;
  }

  if (!statusesAllowingReason.has(nextStatus)) {
    if (statusReason !== undefined) {
      addError(
        errors,
        "status_reason",
        "Status reason is only allowed for StandBy or Cancelled.",
      );
    }
    return;
  }

  if (statusesRequiringReason.has(nextStatus) && !statusReason) {
    addError(
      errors,
      "status_reason",
      "Status reason is required when moving a case to StandBy.",
    );
  }
}

function parseServiceLines(
  value: unknown,
  errors: Record<string, string[]>,
) {
  if (!Array.isArray(value) || value.length === 0) {
    addError(errors, "service_lines", "At least one service line is required.");
    return [];
  }

  return value.flatMap((item, index): CaseServiceLineInput[] => {
    const field = `service_lines.${index}`;

    if (!item || typeof item !== "object" || Array.isArray(item)) {
      addError(errors, field, "Service line must be an object.");
      return [];
    }

    const line = item as Record<string, unknown>;
    const service_type_id = optionalString(line.service_type_id);
    const quantity = optionalPositiveInteger(
      line.quantity,
      `${field}.quantity`,
      errors,
    );
    const unit_price = optionalMoney(
      line.unit_price,
      `${field}.unit_price`,
      errors,
    );
    const is_unit_price_overridden =
      typeof line.is_unit_price_overridden === "boolean"
        ? line.is_unit_price_overridden
        : undefined;
    const workflow_json = parseWorkflowJson(line.workflow_json, errors);

    if (!service_type_id) {
      addError(errors, `${field}.service_type_id`, "Service type is required.");
    }

    if (is_unit_price_overridden && !unit_price) {
      addError(
        errors,
        `${field}.unit_price`,
        "Unit price is required when overriding the service price.",
      );
    }

    if (!service_type_id || quantity === undefined) {
      return [];
    }

    return [
      {
        id: optionalString(line.id) ?? undefined,
        service_type_id,
        quantity,
        unit_price,
        is_unit_price_overridden,
        ...(workflow_json ? { workflow_json } : {}),
      },
    ];
  });
}

export function parseCreateCaseInput(payload: unknown): ValidationResult {
  const errors: Record<string, string[]> = {};

  if (!payload || typeof payload !== "object" || Array.isArray(payload)) {
    return {
      success: false,
      errors: { body: ["Request body must be a JSON object."] },
    };
  }

  const body = payload as Record<string, unknown>;
  const patient_name =
    typeof body.patient_name === "string" ? body.patient_name.trim() : "";

  if (!patient_name) {
    addError(errors, "patient_name", "Patient name is required.");
  }

  const current_status = optionalString(body.current_status);
  if (current_status && !caseStatusValues.has(current_status)) {
    addError(errors, "current_status", "Current status is invalid.");
  }
  const status_reason = optionalString(body.status_reason);
  validateStatusReason(current_status, status_reason, errors);

  const due_date = optionalDate(body.due_date, errors);
  const elements_qty = optionalPositiveInteger(
    body.elements_qty,
    "elements_qty",
    errors,
  );
  const service_lines = parseServiceLines(body.service_lines, errors);

  if (Object.keys(errors).length > 0) {
    return { success: false, errors };
  }

  return {
    success: true,
    data: {
      patient_name,
      clientCaseCode: optionalString(body.clientCaseCode),
      customer_id: optionalString(body.customer_id),
      dentist_id: optionalString(body.dentist_id),
      current_status: current_status
        ? (current_status as CaseStatusValue)
        : undefined,
      status_reason,
      teeth: optionalString(body.teeth),
      elements_qty,
      shade: optionalString(body.shade),
      due_date,
      is_urgent:
        typeof body.is_urgent === "boolean" ? body.is_urgent : undefined,
      observations: optionalString(body.observations),
      pending_note: optionalString(body.pending_note),
      service_lines,
    },
  };
}

export function parseReplaceCaseWorkflowInput(
  payload: unknown,
): ReplaceWorkflowValidationResult {
  const errors: Record<string, string[]> = {};

  if (!payload || typeof payload !== "object" || Array.isArray(payload)) {
    return {
      success: false,
      errors: { body: ["Request body must be a JSON object."] },
    };
  }

  const body = payload as Record<string, unknown>;
  const workflow_json = parseWorkflowJson(body.workflow_json, errors);
  const case_service_id = optionalString(body.case_service_id);

  if (!workflow_json) {
    addError(errors, "workflow_json", "Workflow is required.");
  }

  if (!case_service_id) {
    addError(errors, "case_service_id", "Case service id is required.");
  }

  if (Object.keys(errors).length > 0) {
    return { success: false, errors };
  }

  return {
    success: true,
    data: {
      case_service_id: case_service_id as string,
      workflow_json: workflow_json as ServiceTypeWorkflow,
    },
  };
}

export function parseUpdateCaseInput(payload: unknown): UpdateValidationResult {
  const errors: Record<string, string[]> = {};

  if (!payload || typeof payload !== "object" || Array.isArray(payload)) {
    return {
      success: false,
      errors: { body: ["Request body must be a JSON object."] },
    };
  }

  const body = payload as Record<string, unknown>;
  const data: UpdateCaseInput = {};

  if ("patient_name" in body) {
    const patient_name =
      typeof body.patient_name === "string" ? body.patient_name.trim() : "";

    if (!patient_name) {
      addError(errors, "patient_name", "Patient name is required.");
    } else {
      data.patient_name = patient_name;
    }
  }

  if ("current_status" in body) {
    const current_status = optionalString(body.current_status);
    if (current_status && !caseStatusValues.has(current_status)) {
      addError(errors, "current_status", "Current status is invalid.");
    } else if (current_status !== undefined) {
      data.current_status = current_status as CaseStatusValue;
    }
  }

  if ("status_reason" in body) {
    data.status_reason = optionalString(body.status_reason);
  }

  validateStatusReason(
    "current_status" in body ? (data.current_status ?? null) : undefined,
    data.status_reason,
    errors,
  );

  if ("due_date" in body) {
    data.due_date = optionalDate(body.due_date, errors);
  }

  if ("elements_qty" in body) {
    data.elements_qty = optionalPositiveInteger(
      body.elements_qty,
      "elements_qty",
      errors,
    );
  }

  if ("clientCaseCode" in body) {
    data.clientCaseCode = optionalString(body.clientCaseCode);
  }

  if ("customer_id" in body) {
    data.customer_id = optionalString(body.customer_id);
  }

  if ("dentist_id" in body) {
    data.dentist_id = optionalString(body.dentist_id);
  }

  if ("teeth" in body) {
    data.teeth = optionalString(body.teeth);
  }

  if ("shade" in body) {
    data.shade = optionalString(body.shade);
  }

  if ("is_urgent" in body) {
    data.is_urgent = typeof body.is_urgent === "boolean" ? body.is_urgent : false;
  }

  if ("observations" in body) {
    data.observations = optionalString(body.observations);
  }

  if ("pending_note" in body) {
    data.pending_note = optionalString(body.pending_note);
  }

  if ("service_lines" in body) {
    data.service_lines = parseServiceLines(body.service_lines, errors);
  }

  if (Object.keys(errors).length > 0) {
    return { success: false, errors };
  }

  return { success: true, data };
}

function parsePositiveInteger(value: string | null) {
  if (!value) return undefined;

  const parsed = Number(value);
  if (!Number.isInteger(parsed) || parsed < 1) return null;

  return parsed;
}

function parseUrgentFilter(value: string | null) {
  if (!value) return undefined;
  if (value === "urgent" || value === "true") return true;
  if (value === "normal" || value === "false") return false;

  return null;
}

function parseStringList(values: string[]) {
  const normalized = values
    .map((value) => optionalString(value))
    .filter((value): value is string => Boolean(value));

  return [...new Set(normalized)];
}

export function parseListCasesInput(searchParams: URLSearchParams) {
  const errors: Record<string, string[]> = {};
  const requestedLimit = parsePositiveInteger(searchParams.get("limit"));
  const status = optionalString(searchParams.get("status"));
  const customer_id = optionalString(searchParams.get("customer_id"));
  const urgent = parseUrgentFilter(searchParams.get("urgent"));
  const q = optionalString(searchParams.get("q") ?? searchParams.get("search"));
  const current_process_ids = parseStringList(
    searchParams.getAll("currentProcessId"),
  );

  if (requestedLimit === null) {
    addError(errors, "limit", "Limit must be a positive integer.");
  }

  if (status && !caseStatusValues.has(status)) {
    addError(errors, "status", "Status is invalid.");
  }

  if (urgent === null) {
    addError(errors, "urgent", "Urgent must be urgent, normal, true, or false.");
  }

  if (Object.keys(errors).length > 0) {
    return { success: false as const, errors };
  }

  return {
    success: true as const,
    data: {
      limit: Math.min(requestedLimit ?? DEFAULT_CASE_LIST_LIMIT, MAX_CASE_LIST_LIMIT),
      status: status ? (status as CaseStatusValue) : undefined,
      customer_id: customer_id ?? undefined,
      urgent: urgent ?? undefined,
      q: q ?? undefined,
      current_process_ids:
        current_process_ids.length > 0 ? current_process_ids : undefined,
    } satisfies ListCasesInput,
  };
}
