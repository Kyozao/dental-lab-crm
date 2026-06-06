import { CaseStatus, type CaseStatus as CaseStatusValue } from "@/generated/prisma/enums";

export type CreateCaseInput = {
  patientName: string;
  clientCaseCode?: string | null;
  clinicId?: string | null;
  serviceTypeId?: string | null;
  dentistId?: string | null;
  cadDesignerId?: string | null;
  currentStatus?: CaseStatusValue;
  teeth?: string | null;
  elementsQty?: number | null;
  shade?: string | null;
  dueDate?: Date | null;
  isUrgent?: boolean;
  observations?: string | null;
  pendingNote?: string | null;
};

type ValidationResult =
  | { success: true; data: CreateCaseInput }
  | { success: false; errors: Record<string, string[]> };

const caseStatusValues = new Set<string>(Object.values(CaseStatus));

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
    addError(errors, "dueDate", "Due date must be a valid date.");
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
    addError(errors, "elementsQty", "Elements quantity must be a positive integer.");
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
  const patientName =
    typeof body.patientName === "string" ? body.patientName.trim() : "";

  if (!patientName) {
    addError(errors, "patientName", "Patient name is required.");
  }

  const currentStatus = optionalString(body.currentStatus);
  if (currentStatus && !caseStatusValues.has(currentStatus)) {
    addError(errors, "currentStatus", "Current status is invalid.");
  }

  const dueDate = optionalDate(body.dueDate, errors);
  const elementsQty = optionalPositiveInteger(body.elementsQty, errors);

  if (Object.keys(errors).length > 0) {
    return { success: false, errors };
  }

  return {
    success: true,
    data: {
      patientName,
      clientCaseCode: optionalString(body.clientCaseCode),
      clinicId: optionalString(body.clinicId),
      serviceTypeId: optionalString(body.serviceTypeId),
      dentistId: optionalString(body.dentistId),
      cadDesignerId: optionalString(body.cadDesignerId),
      currentStatus: currentStatus
        ? (currentStatus as CaseStatusValue)
        : undefined,
      teeth: optionalString(body.teeth),
      elementsQty,
      shade: optionalString(body.shade),
      dueDate,
      isUrgent:
        typeof body.isUrgent === "boolean" ? body.isUrgent : undefined,
      observations: optionalString(body.observations),
      pendingNote: optionalString(body.pendingNote),
    },
  };
}
