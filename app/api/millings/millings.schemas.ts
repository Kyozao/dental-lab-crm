import { MillingStatus } from "@/generated/prisma/enums";

export type SelectedDrillSlotInput = {
  machineSlotId: string;
  drillId: string;
};

export type CreateMillingInput = {
  caseId: string;
  caseProcessId?: string | null;
  blockTypeId: string;
  millingMachineId: string;
  selectedDrillSlots: SelectedDrillSlotInput[];
  teethMilledQty?: number;
  blocksUsedQty: number;
  status: MillingStatus;
  failureReason?: string | null;
  notes?: string | null;
  milledAt: string;
};

export type UpdateMillingInput = Partial<CreateMillingInput>;

type ValidationResult<T> =
  | { success: true; data: T }
  | { success: false; errors: Record<string, string[]> };

function optionalString(value: unknown) {
  if (value === undefined || value === null) return value;
  if (typeof value !== "string") return undefined;

  const trimmed = value.trim();
  return trimmed || null;
}

function parseInteger(value: unknown) {
  if (typeof value === "number" && Number.isInteger(value)) return value;
  if (typeof value === "string" && value.trim()) {
    const parsed = Number.parseInt(value, 10);
    return Number.isNaN(parsed) ? undefined : parsed;
  }

  return undefined;
}

function isDateTimeString(value: string) {
  return !Number.isNaN(Date.parse(value));
}

function addError(
  errors: Record<string, string[]>,
  field: string,
  message: string,
) {
  errors[field] = [...(errors[field] ?? []), message];
}

function parseSelectedDrillSlots(
  value: unknown,
): SelectedDrillSlotInput[] | undefined | null {
  if (value === undefined) return undefined;
  if (value === null) return null;
  if (!Array.isArray(value)) return undefined;

  const parsed: SelectedDrillSlotInput[] = [];
  for (const item of value) {
    if (typeof item !== "object" || item === null) {
      return undefined;
    }

    const machineSlotId = optionalString(
      (item as Record<string, unknown>).machineSlotId,
    );
    const drillId = optionalString((item as Record<string, unknown>).drillId);

    if (!machineSlotId || !drillId) {
      return undefined;
    }

    parsed.push({ machineSlotId, drillId });
  }

  return parsed;
}

function parseBaseMillingInput(
  payload: Record<string, unknown>,
  mode: "create" | "update",
): ValidationResult<UpdateMillingInput> {
  const errors: Record<string, string[]> = {};
  const caseId = optionalString(payload.caseId);
  const caseProcessId = optionalString(payload.caseProcessId);
  const blockTypeId = optionalString(payload.blockTypeId);
  const millingMachineId = optionalString(payload.millingMachineId);
  const selectedDrillSlots = parseSelectedDrillSlots(payload.selectedDrillSlots);
  const failureReason = optionalString(payload.failureReason);
  const notes = optionalString(payload.notes);
  const milledAt = optionalString(payload.milledAt);
  const teethMilledQty = parseInteger(payload.teethMilledQty);
  const blocksUsedQty = parseInteger(payload.blocksUsedQty);
  const statusRaw = optionalString(payload.status);

  if (mode === "create" && !caseId) {
    addError(errors, "caseId", "Case is required.");
  }

  if (mode === "create" && !blockTypeId) {
    addError(errors, "blockTypeId", "Block type is required.");
  }

  if (mode === "create" && !millingMachineId) {
    addError(errors, "millingMachineId", "Milling machine is required.");
  }

  if (mode === "create" && (!selectedDrillSlots || selectedDrillSlots.length === 0)) {
    addError(
      errors,
      "selectedDrillSlots",
      "Select a drill for every required machine slot.",
    );
  }

  if (selectedDrillSlots && selectedDrillSlots.length > 0) {
    const slotIds = new Set<string>();
    const drillIds = new Set<string>();

    for (const [index, slot] of selectedDrillSlots.entries()) {
      if (slotIds.has(slot.machineSlotId)) {
        addError(
          errors,
          `selectedDrillSlots.${index}.machineSlotId`,
          "Each machine slot can only be selected once.",
        );
      }
      slotIds.add(slot.machineSlotId);

      if (drillIds.has(slot.drillId)) {
        addError(
          errors,
          `selectedDrillSlots.${index}.drillId`,
          "The same drill cannot fill multiple slots.",
        );
      }
      drillIds.add(slot.drillId);
    }
  }

  if (payload.teethMilledQty !== undefined && teethMilledQty === undefined) {
    addError(errors, "teethMilledQty", "Teeth milled quantity must be an integer.");
  }

  if (
    teethMilledQty !== undefined &&
    (teethMilledQty < 0 || teethMilledQty > 32)
  ) {
    addError(
      errors,
      "teethMilledQty",
      "Teeth milled quantity must be between 0 and 32.",
    );
  }

  if (payload.blocksUsedQty !== undefined && blocksUsedQty === undefined) {
    addError(errors, "blocksUsedQty", "Blocks used quantity must be an integer.");
  }

  if (
    blocksUsedQty !== undefined &&
    (blocksUsedQty < 1 || blocksUsedQty > 32)
  ) {
    addError(
      errors,
      "blocksUsedQty",
      "Blocks used quantity must be between 1 and 32.",
    );
  }

  if (mode === "create" && !milledAt) {
    addError(errors, "milledAt", "Milled at is required.");
  } else if (milledAt && !isDateTimeString(milledAt)) {
    addError(errors, "milledAt", "Milled at must be a valid datetime.");
  }

  if (
    statusRaw !== undefined &&
    statusRaw !== null &&
    statusRaw !== MillingStatus.SUCCESS &&
    statusRaw !== MillingStatus.FAILED
  ) {
    addError(errors, "status", "Status is invalid.");
  }

  if (payload.caseProcessId !== undefined && caseProcessId === undefined) {
    addError(errors, "caseProcessId", "Case process id is invalid.");
  }

  if (
    payload.millingMachineId !== undefined &&
    millingMachineId === undefined
  ) {
    addError(errors, "millingMachineId", "Milling machine id is invalid.");
  }

  if (
    payload.selectedDrillSlots !== undefined &&
    selectedDrillSlots === undefined
  ) {
    addError(
      errors,
      "selectedDrillSlots",
      "Selected drill slots payload is invalid.",
    );
  }

  if (payload.failureReason !== undefined && failureReason === undefined) {
    addError(errors, "failureReason", "Failure reason is invalid.");
  }

  if (payload.notes !== undefined && notes === undefined) {
    addError(errors, "notes", "Notes are invalid.");
  }

  if (Object.keys(errors).length > 0) {
    return { success: false, errors };
  }

  return {
    success: true,
    data: {
      caseId: caseId ?? undefined,
      caseProcessId: caseProcessId ?? undefined,
      blockTypeId: blockTypeId ?? undefined,
      millingMachineId: millingMachineId ?? undefined,
      selectedDrillSlots: selectedDrillSlots ?? undefined,
      teethMilledQty,
      blocksUsedQty,
      status: (statusRaw as MillingStatus | undefined) ?? undefined,
      failureReason: failureReason ?? undefined,
      notes: notes ?? undefined,
      milledAt: milledAt ?? undefined,
    },
  };
}

export function parseCreateMillingInput(payload: Record<string, unknown>) {
  const parsed = parseBaseMillingInput(payload, "create");
  if (!parsed.success) return parsed;

  return {
    success: true as const,
    data: {
      caseId: parsed.data.caseId!,
      caseProcessId: parsed.data.caseProcessId ?? null,
      blockTypeId: parsed.data.blockTypeId!,
      millingMachineId: parsed.data.millingMachineId!,
      selectedDrillSlots: parsed.data.selectedDrillSlots ?? [],
      teethMilledQty: parsed.data.teethMilledQty,
      blocksUsedQty: parsed.data.blocksUsedQty ?? 1,
      status: parsed.data.status ?? MillingStatus.SUCCESS,
      failureReason: parsed.data.failureReason ?? null,
      notes: parsed.data.notes ?? null,
      milledAt: parsed.data.milledAt!,
    },
  };
}

export function parseUpdateMillingInput(payload: Record<string, unknown>) {
  return parseBaseMillingInput(payload, "update");
}
