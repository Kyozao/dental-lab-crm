import type { CaseMutationPayload } from "@/features/cases/cases";
import { ApiError } from "@/lib/api";

import type {
  CaseStatusValue,
  EditableCase,
  CaseWorkflow,
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

export type CaseServiceLineDraft = {
  localId: string;
  id?: string;
  serviceTypeId: string;
  quantity: number;
  unitPrice: string;
  isUnitPriceOverridden: boolean;
  workflow: CaseWorkflow;
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

export function buildDefaultServiceLineDraft(): CaseServiceLineDraft {
  return {
    localId: createDraftId(),
    serviceTypeId: "",
    quantity: 1,
    unitPrice: "",
    isUnitPriceOverridden: false,
    workflow: { steps: [] },
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

export function buildServiceLineDraftsFromCaseItem(
  item: EditableCase,
): CaseServiceLineDraft[] {
  if (item.serviceLines.length === 0) {
    return [buildDefaultServiceLineDraft()];
  }

  return item.serviceLines.map((serviceLine) => ({
    localId: serviceLine.id,
    id: serviceLine.id,
    serviceTypeId: serviceLine.serviceTypeId,
    quantity: serviceLine.quantity,
    unitPrice: serviceLine.unitPrice,
    isUnitPriceOverridden: serviceLine.isUnitPriceOverridden,
    workflow: {
      steps: serviceLine.processes.map((process) => ({
        id: process.workflow_step_id,
        process_id: process.process_id,
        dependsOn: process.dependsOnCaseProcessIds
          .map((dependencyId) =>
            serviceLine.processes.find((candidate) => candidate.id === dependencyId)
              ?.workflow_step_id,
          )
          .filter((stepId): stepId is string => Boolean(stepId)),
        fixed_minutes: process.fixed_minutes,
        minutes_per_unit: process.minutes_per_unit,
        expected_duration_days: process.expected_duration_days,
        dependency_lag_days: process.dependency_lag_days,
        requires_milling_machine: process.requires_milling_machine,
      })),
    },
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

export function buildCasePayload(
  form: HTMLFormElement,
  serviceLines: CaseServiceLineDraft[],
  originalStatus?: CaseStatusValue,
) {
  const formData = new FormData(form);
  const payload: CaseMutationPayload = {};
  const patientName = optionalFormString(formData, "patientName");

  if (patientName) {
    payload.patientName = patientName;
  }

  for (const field of [
    "customerId",
    "dentistId",
    "teeth",
    "shade",
    "dueDate",
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
  if (
    currentStatus &&
    (originalStatus === undefined || currentStatus !== originalStatus)
  ) {
    payload.currentStatus = currentStatus as CaseStatusValue;
  }

  const statusReason = optionalFormString(formData, "statusReason");
  if (payload.currentStatus !== undefined && statusReason !== undefined) {
    payload.statusReason = statusReason;
  }

  const elementsQty = optionalFormInteger(formData, "elementsQty");
  if (elementsQty !== undefined) {
    payload.elementsQty = elementsQty;
  }

  const urgentInput = form.elements.namedItem("isUrgent");
  if (urgentInput instanceof HTMLInputElement && !urgentInput.disabled) {
    payload.isUrgent = urgentInput.checked;
  }

  payload.serviceLines = serviceLines
    .filter((serviceLine) => serviceLine.serviceTypeId)
    .map((serviceLine) => ({
      id: serviceLine.id,
      serviceTypeId: serviceLine.serviceTypeId,
      quantity: serviceLine.quantity,
      unitPrice: serviceLine.isUnitPriceOverridden
        ? serviceLine.unitPrice || null
        : null,
      isUnitPriceOverridden: serviceLine.isUnitPriceOverridden,
      workflowJson: serviceLine.workflow,
    }));

  return payload;
}

export function buildSubmitError(error: unknown, fallback: string) {
  if (!(error instanceof ApiError)) {
    return error instanceof Error ? error.message : fallback;
  }

  const firstFieldError = Object.values(error.fields ?? {})[0]?.[0];
  return firstFieldError ? `${error.message} ${firstFieldError}` : error.message;
}
