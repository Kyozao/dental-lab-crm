import { CaseStatus, type CaseStatus as CaseStatusValue } from "@/generated/prisma/enums";
import {
  parseWorkflowJson,
  type ServiceTypeWorkflow,
} from "../service-types/service-types.schemas";

export type CreateCaseInput = {
  patient_name: string;
  clientCaseCode?: string | null;
  customer_id?: string | null;
  service_type_id?: string | null;
  dentist_id?: string | null;
  current_status?: CaseStatusValue;
  teeth?: string | null;
  elements_qty?: number | null;
  shade?: string | null;
  due_date?: Date | null;
  is_urgent?: boolean;
  observations?: string | null;
  pending_note?: string | null;
  workflow_json?: ServiceTypeWorkflow;
};

export type UpdateCaseInput = Partial<CreateCaseInput>;

export type ListCasesInput = {
  limit: number;
  status?: CaseStatusValue;
  customer_id?: string;
  urgent?: boolean;
  q?: string;
};

type ValidationResult =
  | { success: true; data: CreateCaseInput }
  | { success: false; errors: Record<string, string[]> };

type UpdateValidationResult =
  | { success: true; data: UpdateCaseInput }
  | { success: false; errors: Record<string, string[]> };

type WorkflowValidationResult =
  | { success: true; data: ServiceTypeWorkflow }
  | { success: false; errors: Record<string, string[]> };

const caseStatusValues = new Set<string>(Object.values(CaseStatus));
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
  errors: Record<string, string[]>,
) {
  if (value === undefined || value === null || value === "") return undefined;

  const parsed = typeof value === "number" ? value : Number(value);
  if (!Number.isInteger(parsed) || parsed < 1) {
    addError(errors, "elements_qty", "Elements quantity must be a positive integer.");
    return undefined;
  }

  return parsed;
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

  const due_date = optionalDate(body.due_date, errors);
  const elements_qty = optionalPositiveInteger(body.elements_qty, errors);
  const workflow_json = parseWorkflowJson(body.workflow_json, errors);

  if (Object.keys(errors).length > 0) {
    return { success: false, errors };
  }

  return {
    success: true,
    data: {
      patient_name,
      clientCaseCode: optionalString(body.clientCaseCode),
      customer_id: optionalString(body.customer_id),
      service_type_id: optionalString(body.service_type_id),
      dentist_id: optionalString(body.dentist_id),
      current_status: current_status
        ? (current_status as CaseStatusValue)
        : undefined,
      teeth: optionalString(body.teeth),
      elements_qty,
      shade: optionalString(body.shade),
      due_date,
      is_urgent:
        typeof body.is_urgent === "boolean" ? body.is_urgent : undefined,
      observations: optionalString(body.observations),
      pending_note: optionalString(body.pending_note),
      ...(workflow_json ? { workflow_json } : {}),
    },
  };
}

export function parseReplaceCaseWorkflowInput(
  payload: unknown,
): WorkflowValidationResult {
  const errors: Record<string, string[]> = {};

  if (!payload || typeof payload !== "object" || Array.isArray(payload)) {
    return {
      success: false,
      errors: { body: ["Request body must be a JSON object."] },
    };
  }

  const workflow_json = parseWorkflowJson(
    (payload as Record<string, unknown>).workflow_json,
    errors,
  );

  if (!workflow_json) {
    addError(errors, "workflow_json", "Workflow is required.");
    return { success: false, errors };
  }

  if (Object.keys(errors).length > 0) {
    return { success: false, errors };
  }

  return { success: true, data: workflow_json };
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

  if ("due_date" in body) {
    data.due_date = optionalDate(body.due_date, errors);
  }

  if ("elements_qty" in body) {
    data.elements_qty = optionalPositiveInteger(body.elements_qty, errors);
  }

  if ("clientCaseCode" in body) {
    data.clientCaseCode = optionalString(body.clientCaseCode);
  }

  if ("customer_id" in body) {
    data.customer_id = optionalString(body.customer_id);
  }

  if ("service_type_id" in body) {
    data.service_type_id = optionalString(body.service_type_id);
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

export function parseListCasesInput(searchParams: URLSearchParams) {
  const errors: Record<string, string[]> = {};
  const requestedLimit = parsePositiveInteger(searchParams.get("limit"));
  const status = optionalString(searchParams.get("status"));
  const customer_id = optionalString(searchParams.get("customer_id"));
  const urgent = parseUrgentFilter(searchParams.get("urgent"));
  const q = optionalString(searchParams.get("q") ?? searchParams.get("search"));

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
    } satisfies ListCasesInput,
  };
}
