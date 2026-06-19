import { MillingDrillStatus } from "@/generated/prisma/enums";

export type MillingDrillInput = {
  name?: string;
  millingMachineId?: string | null;
  status?: MillingDrillStatus;
  currentBlocksCount?: number;
  estimatedMaxBlocks?: number | null;
  installedAt?: string | null;
  removedAt?: string | null;
  notes?: string | null;
};

type ValidationResult<T> =
  | { success: true; data: T }
  | { success: false; errors: Record<string, string[]> };

function optionalString(value: unknown) {
  if (value === undefined || value === null) return value;
  if (typeof value !== "string") return undefined;

  const trimmed = value.trim();
  return trimmed || null;
}

function optionalDateString(value: unknown) {
  const parsed = optionalString(value);
  if (parsed === undefined || parsed === null) return parsed;
  return Number.isNaN(Date.parse(parsed)) ? undefined : parsed;
}

function optionalInteger(value: unknown) {
  if (value === undefined || value === null || value === "") return undefined;
  if (typeof value === "number" && Number.isInteger(value)) return value;
  if (typeof value === "string" && value.trim()) {
    const parsed = Number.parseInt(value, 10);
    return Number.isNaN(parsed) ? undefined : parsed;
  }

  return undefined;
}

function addError(
  errors: Record<string, string[]>,
  field: string,
  message: string,
) {
  errors[field] = [...(errors[field] ?? []), message];
}

function parseBaseInput(
  payload: Record<string, unknown>,
  mode: "create" | "update",
): ValidationResult<MillingDrillInput> {
  const errors: Record<string, string[]> = {};
  const name = optionalString(payload.name);
  const millingMachineId = optionalString(payload.millingMachineId);
  const statusRaw = optionalString(payload.status);
  const currentBlocksCount = optionalInteger(payload.currentBlocksCount);
  const estimatedMaxBlocks = optionalInteger(payload.estimatedMaxBlocks);
  const installedAt = optionalDateString(payload.installedAt);
  const removedAt = optionalDateString(payload.removedAt);
  const notes = optionalString(payload.notes);

  if (mode === "create" && !name) {
    addError(errors, "name", "Drill name is required.");
  }

  if (payload.name !== undefined && name === undefined) {
    addError(errors, "name", "Drill name is invalid.");
  }

  if (
    statusRaw !== undefined &&
    statusRaw !== null &&
    statusRaw !== MillingDrillStatus.ACTIVE &&
    statusRaw !== MillingDrillStatus.STORED &&
    statusRaw !== MillingDrillStatus.RETIRED &&
    statusRaw !== MillingDrillStatus.LOST
  ) {
    addError(errors, "status", "Drill status is invalid.");
  }

  if (
    payload.millingMachineId !== undefined &&
    millingMachineId === undefined
  ) {
    addError(errors, "millingMachineId", "Assigned machine is invalid.");
  }

  if (
    payload.currentBlocksCount !== undefined &&
    currentBlocksCount === undefined
  ) {
    addError(errors, "currentBlocksCount", "Blocks used must be a whole number.");
  }

  if (
    payload.estimatedMaxBlocks !== undefined &&
    estimatedMaxBlocks === undefined
  ) {
    addError(
      errors,
      "estimatedMaxBlocks",
      "Estimated max blocks must be a whole number.",
    );
  }

  if (currentBlocksCount !== undefined && currentBlocksCount < 0) {
    addError(errors, "currentBlocksCount", "Blocks used cannot be negative.");
  }

  if (estimatedMaxBlocks !== undefined && estimatedMaxBlocks < 0) {
    addError(
      errors,
      "estimatedMaxBlocks",
      "Estimated max blocks cannot be negative.",
    );
  }

  if (installedAt && removedAt) {
    const installedAtTime = Date.parse(installedAt);
    const removedAtTime = Date.parse(removedAt);
    if (removedAtTime < installedAtTime) {
      addError(errors, "removedAt", "Removed date must be after installed date.");
    }
  }

  const nextStatus = (statusRaw as MillingDrillStatus | undefined) ?? undefined;
  if (millingMachineId && nextStatus && nextStatus !== MillingDrillStatus.ACTIVE) {
    addError(
      errors,
      "millingMachineId",
      "Only active drills can stay assigned to a machine.",
    );
  }

  if (payload.installedAt !== undefined && installedAt === undefined) {
    addError(errors, "installedAt", "Installed date is invalid.");
  }

  if (payload.removedAt !== undefined && removedAt === undefined) {
    addError(errors, "removedAt", "Removed date is invalid.");
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
      name: name ?? undefined,
      millingMachineId: millingMachineId ?? undefined,
      status: nextStatus,
      currentBlocksCount,
      estimatedMaxBlocks: estimatedMaxBlocks ?? undefined,
      installedAt: installedAt ?? undefined,
      removedAt: removedAt ?? undefined,
      notes: notes ?? undefined,
    },
  };
}

export function parseCreateMillingDrillInput(payload: Record<string, unknown>) {
  const parsed = parseBaseInput(payload, "create");
  if (!parsed.success) return parsed;

  return {
    success: true as const,
    data: {
      name: parsed.data.name!,
      millingMachineId: parsed.data.millingMachineId ?? null,
      status: parsed.data.status ?? MillingDrillStatus.ACTIVE,
      currentBlocksCount: parsed.data.currentBlocksCount ?? 0,
      estimatedMaxBlocks: parsed.data.estimatedMaxBlocks ?? null,
      installedAt: parsed.data.installedAt ?? null,
      removedAt: parsed.data.removedAt ?? null,
      notes: parsed.data.notes ?? null,
    },
  };
}

export function parseUpdateMillingDrillInput(payload: Record<string, unknown>) {
  return parseBaseInput(payload, "update");
}
