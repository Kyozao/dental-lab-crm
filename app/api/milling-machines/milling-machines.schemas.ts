import { MillingMachineStatus } from "@/generated/prisma/enums";

export type MillingMachineSlotInput = {
  id?: string;
  label: string;
  sortOrder: number;
};

export type MillingMachineInput = {
  name?: string;
  serialNumber?: string | null;
  model?: string | null;
  status?: MillingMachineStatus;
  statusReason?: string | null;
  installedAt?: string | null;
  removedAt?: string | null;
  lastMaintenanceAt?: string | null;
  nextMaintenanceDueAt?: string | null;
  notes?: string | null;
  slotPresets?: MillingMachineSlotInput[];
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
  if (value === undefined || value === null) return value;
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

function parseSlotPresets(
  value: unknown,
): MillingMachineSlotInput[] | undefined | null {
  if (value === undefined) return undefined;
  if (value === null) return null;
  if (!Array.isArray(value)) return undefined;

  const parsed: MillingMachineSlotInput[] = [];
  for (const item of value) {
    if (typeof item !== "object" || item === null) {
      return undefined;
    }

    const slotItem = item as Record<string, unknown>;
    const id = optionalString(slotItem.id);
    const label = optionalString(slotItem.label);
    const sortOrder = optionalInteger(slotItem.sortOrder);

    if (!label || sortOrder === undefined || sortOrder === null) {
      return undefined;
    }

    parsed.push({
      id: id ?? undefined,
      label,
      sortOrder,
    });
  }

  return parsed;
}

function parseBaseInput(
  payload: Record<string, unknown>,
  mode: "create" | "update",
): ValidationResult<MillingMachineInput> {
  const errors: Record<string, string[]> = {};
  const name = optionalString(payload.name);
  const serialNumber = optionalString(payload.serialNumber);
  const model = optionalString(payload.model);
  const statusRaw = optionalString(payload.status);
  const statusReason = optionalString(payload.statusReason);
  const installedAt = optionalDateString(payload.installedAt);
  const removedAt = optionalDateString(payload.removedAt);
  const lastMaintenanceAt = optionalDateString(payload.lastMaintenanceAt);
  const nextMaintenanceDueAt = optionalDateString(payload.nextMaintenanceDueAt);
  const notes = optionalString(payload.notes);
  const slotPresets = parseSlotPresets(payload.slotPresets);

  if (mode === "create" && !name) {
    addError(errors, "name", "Machine name is required.");
  }

  if (mode === "create" && (!slotPresets || slotPresets.length === 0)) {
    addError(errors, "slotPresets", "Add at least one machine slot.");
  }

  if (payload.name !== undefined && name === undefined) {
    addError(errors, "name", "Machine name is invalid.");
  }

  if (
    statusRaw !== undefined &&
    statusRaw !== null &&
    statusRaw !== MillingMachineStatus.ACTIVE &&
    statusRaw !== MillingMachineStatus.INACTIVE &&
    statusRaw !== MillingMachineStatus.MAINTENANCE
  ) {
    addError(errors, "status", "Machine status is invalid.");
  }

  if (payload.serialNumber !== undefined && serialNumber === undefined) {
    addError(errors, "serialNumber", "Serial number is invalid.");
  }

  if (payload.model !== undefined && model === undefined) {
    addError(errors, "model", "Model is invalid.");
  }

  if (payload.statusReason !== undefined && statusReason === undefined) {
    addError(errors, "statusReason", "Status reason is invalid.");
  }

  if (payload.installedAt !== undefined && installedAt === undefined) {
    addError(errors, "installedAt", "Installed date is invalid.");
  }

  if (payload.removedAt !== undefined && removedAt === undefined) {
    addError(errors, "removedAt", "Removed date is invalid.");
  }

  if (
    payload.lastMaintenanceAt !== undefined &&
    lastMaintenanceAt === undefined
  ) {
    addError(errors, "lastMaintenanceAt", "Last maintenance date is invalid.");
  }

  if (
    payload.nextMaintenanceDueAt !== undefined &&
    nextMaintenanceDueAt === undefined
  ) {
    addError(
      errors,
      "nextMaintenanceDueAt",
      "Next maintenance due date is invalid.",
    );
  }

  if (payload.notes !== undefined && notes === undefined) {
    addError(errors, "notes", "Notes are invalid.");
  }

  if (payload.slotPresets !== undefined && slotPresets === undefined) {
    addError(errors, "slotPresets", "Machine slot presets are invalid.");
  }

  if (slotPresets != null) {
    if (slotPresets.length === 0) {
      addError(errors, "slotPresets", "Add at least one machine slot.");
    }

    const labels = new Set<string>();
    const sortOrders = new Set<number>();
    for (const [index, slot] of slotPresets.entries()) {
      const normalizedLabel = slot.label.trim().toLowerCase();
      if (!normalizedLabel) {
        addError(
          errors,
          `slotPresets.${index}.label`,
          "Slot label is required.",
        );
      }

      if (labels.has(normalizedLabel)) {
        addError(
          errors,
          `slotPresets.${index}.label`,
          "Slot labels must be unique per machine.",
        );
      }
      labels.add(normalizedLabel);

      if (sortOrders.has(slot.sortOrder)) {
        addError(
          errors,
          `slotPresets.${index}.sortOrder`,
          "Slot order values must be unique per machine.",
        );
      }
      sortOrders.add(slot.sortOrder);
    }
  }

  if (installedAt && removedAt) {
    const installedAtTime = Date.parse(installedAt);
    const removedAtTime = Date.parse(removedAt);
    if (removedAtTime < installedAtTime) {
      addError(errors, "removedAt", "Removed date must be after installed date.");
    }
  }

  if (lastMaintenanceAt && nextMaintenanceDueAt) {
    const lastMaintenanceTime = Date.parse(lastMaintenanceAt);
    const nextMaintenanceTime = Date.parse(nextMaintenanceDueAt);
    if (nextMaintenanceTime < lastMaintenanceTime) {
      addError(
        errors,
        "nextMaintenanceDueAt",
        "Next maintenance due date must be after last maintenance date.",
      );
    }
  }

  if (Object.keys(errors).length > 0) {
    return { success: false, errors };
  }

  return {
    success: true,
    data: {
      name: name ?? undefined,
      serialNumber: serialNumber ?? undefined,
      model: model ?? undefined,
      status: (statusRaw as MillingMachineStatus | undefined) ?? undefined,
      statusReason: statusReason ?? undefined,
      installedAt: installedAt ?? undefined,
      removedAt: removedAt ?? undefined,
      lastMaintenanceAt: lastMaintenanceAt ?? undefined,
      nextMaintenanceDueAt: nextMaintenanceDueAt ?? undefined,
      notes: notes ?? undefined,
      slotPresets: slotPresets ?? undefined,
    },
  };
}

export function parseCreateMillingMachineInput(payload: Record<string, unknown>) {
  const parsed = parseBaseInput(payload, "create");
  if (!parsed.success) return parsed;

  return {
    success: true as const,
    data: {
      name: parsed.data.name!,
      serialNumber: parsed.data.serialNumber ?? null,
      model: parsed.data.model ?? null,
      status: parsed.data.status ?? MillingMachineStatus.ACTIVE,
      statusReason: parsed.data.statusReason ?? null,
      installedAt: parsed.data.installedAt ?? null,
      removedAt: parsed.data.removedAt ?? null,
      lastMaintenanceAt: parsed.data.lastMaintenanceAt ?? null,
      nextMaintenanceDueAt: parsed.data.nextMaintenanceDueAt ?? null,
      notes: parsed.data.notes ?? null,
      slotPresets: parsed.data.slotPresets ?? [],
    },
  };
}

export function parseUpdateMillingMachineInput(payload: Record<string, unknown>) {
  return parseBaseInput(payload, "update");
}
