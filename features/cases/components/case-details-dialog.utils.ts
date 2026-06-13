import type { CaseMutationPayload } from "@/features/cases/cases";
import { ApiError } from "@/lib/api";

import type {
  CaseStatusValue,
  EditableCase,
} from "@/features/cases/types";

export type CaseComponentDraft = {
  localId: string;
  componentId: string;
  quantity: number;
  chargeClient: boolean;
  unitCost: string;
  unitPrice: string;
  notes: string;
};

let nextDraftId = 1;

function createDraftId() {
  return `draft-${nextDraftId++}`;
}

export function buildDefaultComponentDraft(): CaseComponentDraft {
  return {
    localId: createDraftId(),
    componentId: "",
    quantity: 1,
    chargeClient: true,
    unitCost: "",
    unitPrice: "",
    notes: "",
  };
}

export function buildDraftFromCaseItem(
  item: EditableCase,
): CaseComponentDraft[] {
  return item.components.map((component) => ({
    localId: component.id,
    componentId: component.componentId,
    quantity: component.quantity,
    chargeClient: component.chargeClient,
    unitCost: component.unitCost ?? "",
    unitPrice: component.unitPrice ?? "",
    notes: component.notes ?? "",
  }));
}

function optionalFormString(formData: FormData, field: string) {
  if (!formData.has(field)) return undefined;

  const value = formData.get(field);
  if (typeof value !== "string") return undefined;

  const trimmed = value.trim();
  return trimmed || null;
}

function optionalFormInteger(formData: FormData, field: string) {
  if (!formData.has(field)) return undefined;

  const value = formData.get(field);
  if (typeof value !== "string" || value.trim() === "") return null;

  return Number(value);
}

export function buildCasePayload(form: HTMLFormElement) {
  const formData = new FormData(form);
  const payload: CaseMutationPayload = {};
  const patientName = optionalFormString(formData, "patientName");

  if (patientName) {
    payload.patientName = patientName;
  }

  for (const field of [
    "customerId",
    "dentistId",
    "serviceTypeId",
    "teeth",
    "shade",
    "dueDate",
    "pendingNote",
    "observations",
  ] as const) {
    const value = optionalFormString(formData, field);
    if (value !== undefined) {
      payload[field] = value;
    }
  }

  if (payload.customerId === null && payload.dentistId === undefined) {
    payload.dentistId = null;
  }

  const currentStatus = optionalFormString(formData, "currentStatus");
  if (currentStatus) {
    payload.currentStatus = currentStatus as CaseStatusValue;
  }

  const elementsQty = optionalFormInteger(formData, "elementsQty");
  if (elementsQty !== undefined) {
    payload.elementsQty = elementsQty;
  }

  const urgentInput = form.elements.namedItem("isUrgent");
  if (urgentInput instanceof HTMLInputElement && !urgentInput.disabled) {
    payload.isUrgent = urgentInput.checked;
  }

  return payload;
}

export function buildSubmitError(error: unknown, fallback: string) {
  if (!(error instanceof ApiError)) {
    return error instanceof Error ? error.message : fallback;
  }

  const firstFieldError = Object.values(error.fields ?? {})[0]?.[0];
  return firstFieldError ? `${error.message} ${firstFieldError}` : error.message;
}
