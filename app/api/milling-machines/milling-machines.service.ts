import { Prisma } from "@/generated/prisma/client";
import { prisma } from "@/lib/prisma";

import { assertCanAccessBackoffice } from "../_shared/authorization";
import { getLabMember } from "../_shared/membership";
import {
  ReferenceNotFoundError,
  ReferenceValidationError,
} from "../_shared/reference-resource";
import type { MillingMachineInput } from "./milling-machines.schemas";

const DEFAULT_MACHINE_SLOT_PRESETS = [
  { label: "1.0mm", sortOrder: 1 },
  { label: "2.5mm", sortOrder: 2 },
] as const;

const machineSlotSelect = {
  id: true,
  label: true,
  sort_order: true,
} as const;

const machineSelect = {
  id: true,
  name: true,
  serial_number: true,
  model: true,
  status: true,
  status_reason: true,
  installed_at: true,
  removed_at: true,
  last_maintenance_at: true,
  next_maintenance_due_at: true,
  notes: true,
  created_at: true,
  updated_at: true,
  machine_slots: {
    orderBy: { sort_order: "asc" },
    select: machineSlotSelect,
  },
  _count: {
    select: {
      milling_drills: true,
    },
  },
} as const;

type MillingMachineRecord = Prisma.milling_machinesGetPayload<{
  select: typeof machineSelect;
}>;

function mapMachine(record: MillingMachineRecord) {
  return {
    id: record.id,
    name: record.name,
    serialNumber: record.serial_number,
    model: record.model,
    status: record.status,
    statusReason: record.status_reason,
    installedAt: record.installed_at?.toISOString() ?? null,
    removedAt: record.removed_at?.toISOString() ?? null,
    lastMaintenanceAt: record.last_maintenance_at?.toISOString() ?? null,
    nextMaintenanceDueAt: record.next_maintenance_due_at?.toISOString() ?? null,
    notes: record.notes,
    createdAt: record.created_at.toISOString(),
    updatedAt: record.updated_at.toISOString(),
    assignedDrillCount: record._count.milling_drills,
    slotPresets: record.machine_slots.map((slot) => ({
      id: slot.id,
      label: slot.label,
      sortOrder: slot.sort_order,
    })),
  };
}

function isMachineUniqueError(error: unknown) {
  if (
    !(error instanceof Prisma.PrismaClientKnownRequestError) ||
    error.code !== "P2002"
  ) {
    return false;
  }

  const target = error.meta?.target;
  if (!Array.isArray(target)) return false;

  return target.includes("lab_id") && (
    target.includes("name") || target.includes("serial_number")
  );
}

function getMachineUniqueFields(
  error: unknown,
): Record<string, string[]> | null {
  if (
    !(error instanceof Prisma.PrismaClientKnownRequestError) ||
    error.code !== "P2002" ||
    !Array.isArray(error.meta?.target)
  ) {
    return null;
  }

  const target = error.meta.target;
  if (target.includes("serial_number")) {
    return {
      serialNumber: ["This serial number already exists in this lab."],
    } satisfies Record<string, string[]>;
  }

  if (target.includes("name")) {
    return {
      name: ["This machine name already exists in this lab."],
    } satisfies Record<string, string[]>;
  }

  return null;
}

function toMachineData(payload: MillingMachineInput) {
  return {
    name: payload.name,
    serial_number:
      payload.serialNumber === undefined ? undefined : payload.serialNumber,
    model: payload.model === undefined ? undefined : payload.model,
    status: payload.status,
    status_reason:
      payload.statusReason === undefined ? undefined : payload.statusReason,
    installed_at:
      payload.installedAt === undefined
        ? undefined
        : payload.installedAt
          ? new Date(payload.installedAt)
          : null,
    removed_at:
      payload.removedAt === undefined
        ? undefined
        : payload.removedAt
          ? new Date(payload.removedAt)
          : null,
    last_maintenance_at:
      payload.lastMaintenanceAt === undefined
        ? undefined
        : payload.lastMaintenanceAt
          ? new Date(payload.lastMaintenanceAt)
          : null,
    next_maintenance_due_at:
      payload.nextMaintenanceDueAt === undefined
        ? undefined
        : payload.nextMaintenanceDueAt
          ? new Date(payload.nextMaintenanceDueAt)
          : null,
    notes: payload.notes === undefined ? undefined : payload.notes,
  };
}

async function ensureMachineSlots(
  lab_id: string,
  machineIds?: string[],
) {
  const machines = await prisma.milling_machines.findMany({
    where: {
      lab_id,
      ...(machineIds ? { id: { in: machineIds } } : {}),
    },
    select: {
      id: true,
      machine_slots: {
        select: { id: true },
      },
    },
  });

  await Promise.all(
    machines
      .filter((machine) => machine.machine_slots.length === 0)
      .map((machine) =>
        prisma.milling_machine_slots.createMany({
          data: DEFAULT_MACHINE_SLOT_PRESETS.map((slot) => ({
            milling_machine_id: machine.id,
            label: slot.label,
            sort_order: slot.sortOrder,
          })),
        }),
      ),
  );
}

function validateSlotPresets(slotPresets: MillingMachineInput["slotPresets"]) {
  if (!slotPresets || slotPresets.length === 0) {
    throw new ReferenceValidationError({
      slotPresets: ["Add at least one machine slot."],
    });
  }
}

export async function listMillingMachinesForLoggedLab(user_id: string) {
  const membership = await getLabMember(user_id);
  assertCanAccessBackoffice(membership.role);
  const { lab_id } = membership;
  await ensureMachineSlots(lab_id);

  const machines = await prisma.milling_machines.findMany({
    where: { lab_id },
    orderBy: [{ status: "asc" }, { name: "asc" }],
    select: machineSelect,
  });

  return machines.map(mapMachine);
}

export async function getMillingMachineForLoggedLab(
  user_id: string,
  machine_id: string,
) {
  const membership = await getLabMember(user_id);
  assertCanAccessBackoffice(membership.role);
  const { lab_id } = membership;
  await ensureMachineSlots(lab_id, [machine_id]);

  const machine = await prisma.milling_machines.findFirst({
    where: {
      id: machine_id,
      lab_id,
    },
    select: machineSelect,
  });

  if (!machine) {
    throw new ReferenceNotFoundError("Milling machine");
  }

  return mapMachine(machine);
}

export async function createMillingMachineForLoggedLab(
  user_id: string,
  payload: MillingMachineInput,
) {
  const membership = await getLabMember(user_id);
  assertCanAccessBackoffice(membership.role);
  const { lab_id } = membership;
  validateSlotPresets(payload.slotPresets);

  try {
    const machine = await prisma.milling_machines.create({
      data: {
        lab_id,
        name: payload.name!,
        serial_number: payload.serialNumber ?? null,
        model: payload.model ?? null,
        status: payload.status!,
        status_reason: payload.statusReason ?? null,
        installed_at: payload.installedAt ? new Date(payload.installedAt) : null,
        removed_at: payload.removedAt ? new Date(payload.removedAt) : null,
        last_maintenance_at: payload.lastMaintenanceAt
          ? new Date(payload.lastMaintenanceAt)
          : null,
        next_maintenance_due_at: payload.nextMaintenanceDueAt
          ? new Date(payload.nextMaintenanceDueAt)
          : null,
        notes: payload.notes ?? null,
        machine_slots: {
          create: payload.slotPresets!.map((slot) => ({
            label: slot.label,
            sort_order: slot.sortOrder,
          })),
        },
      },
      select: machineSelect,
    });

    return mapMachine(machine);
  } catch (error) {
    if (isMachineUniqueError(error)) {
      throw new ReferenceValidationError(getMachineUniqueFields(error) ?? {});
    }

    throw error;
  }
}

export async function updateMillingMachineForLoggedLab(
  user_id: string,
  machine_id: string,
  payload: MillingMachineInput,
) {
  const membership = await getLabMember(user_id);
  assertCanAccessBackoffice(membership.role);
  const { lab_id } = membership;
  const existing = await prisma.milling_machines.findFirst({
    where: { id: machine_id, lab_id },
    select: { id: true },
  });

  if (!existing) {
    throw new ReferenceNotFoundError("Milling machine");
  }

  if (payload.slotPresets !== undefined) {
    validateSlotPresets(payload.slotPresets);
  }

  try {
    const machine = await prisma.milling_machines.update({
      where: { id: machine_id },
      data: {
        ...toMachineData(payload),
        ...(payload.slotPresets
          ? {
              machine_slots: {
                deleteMany: {},
                create: payload.slotPresets.map((slot) => ({
                  label: slot.label,
                  sort_order: slot.sortOrder,
                })),
              },
            }
          : {}),
      },
      select: machineSelect,
    });

    return mapMachine(machine);
  } catch (error) {
    if (isMachineUniqueError(error)) {
      throw new ReferenceValidationError(getMachineUniqueFields(error) ?? {});
    }

    throw error;
  }
}

export async function deleteMillingMachineForLoggedLab(
  user_id: string,
  machine_id: string,
) {
  const membership = await getLabMember(user_id);
  assertCanAccessBackoffice(membership.role);
  const { lab_id } = membership;
  const existing = await prisma.milling_machines.findFirst({
    where: { id: machine_id, lab_id },
    select: { id: true },
  });

  if (!existing) {
    throw new ReferenceNotFoundError("Milling machine");
  }

  await prisma.milling_machines.delete({
    where: { id: machine_id },
  });
}
