import type { CaseMutationPayload } from "@/features/cases/cases";
import { ApiError } from "@/lib/api";

import type {
  AttachmentKindValue,
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

function toDecimalInputValue(value: string | null) {
  return value ?? "";
}

export function buildDefaultComponentDraft(): CaseComponentDraft {
  return {
    localId: crypto.randomUUID(),
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
    unitCost: toDecimalInputValue(component.unitCost),
    unitPrice: toDecimalInputValue(component.unitPrice),
    notes: component.notes ?? "",
  }));
}

export function formatBytes(bytes: number | null) {
  if (!bytes) return "-";
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

export function toDateInputValue(date: string | null) {
  if (!date) return "";
  const parsed = new Date(date);
  if (Number.isNaN(parsed.getTime())) return "";
  const year = parsed.getFullYear();
  const month = String(parsed.getMonth() + 1).padStart(2, "0");
  const day = String(parsed.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

export function formatDateTime(value: string) {
  return new Intl.DateTimeFormat("pt-BR", {
    dateStyle: "short",
    timeStyle: "short",
  }).format(new Date(value));
}

export function isCaseOverdue(dueDate: string | null) {
  if (!dueDate) return false;
  const due = new Date(dueDate);
  if (Number.isNaN(due.getTime())) return false;

  const today = new Date();
  today.setHours(0, 0, 0, 0);
  due.setHours(0, 0, 0, 0);

  return due < today;
}

export function getAttachmentKindLabel(kind: AttachmentKindValue) {
  switch (kind) {
    case "SCAN_INPUT":
      return "Scan";
    case "DESIGN_OUTPUT":
    case "MODEL_OUTPUT":
      return "Final";
    default:
      return "Arquivo";
  }
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
    "cadDesignerId",
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
