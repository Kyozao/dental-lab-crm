import { Prisma } from "@/generated/prisma/client";
import { MillingDrillStatus } from "@/generated/prisma/enums";
import { prisma } from "@/lib/prisma";

import { assertCanAccessBackoffice } from "../_shared/authorization";
import { getLabMember } from "../_shared/membership";
import {
  ReferenceNotFoundError,
  ReferenceValidationError,
} from "../_shared/reference-resource";
import type { MillingDrillInput } from "./milling-drills.schemas";

const drillSelect = {
  id: true,
  name: true,
  status: true,
  current_blocks_count: true,
  estimated_max_blocks: true,
  milling_machine_id: true,
  installed_at: true,
  removed_at: true,
  notes: true,
  created_at: true,
  updated_at: true,
  milling_machines: {
    select: {
      name: true,
    },
  },
} as const;

type MillingDrillRecord = Prisma.milling_drillsGetPayload<{
  select: typeof drillSelect;
}>;

function mapDrill(record: MillingDrillRecord) {
  const wearPercent =
    record.estimated_max_blocks && record.estimated_max_blocks > 0
      ? Math.min(
          999,
          Math.round(
            (record.current_blocks_count / record.estimated_max_blocks) * 100,
          ),
        )
      : null;

  return {
    id: record.id,
    name: record.name,
    status: record.status,
    currentBlocksCount: record.current_blocks_count,
    estimatedMaxBlocks: record.estimated_max_blocks,
    millingMachineId: record.milling_machine_id,
    millingMachineName: record.milling_machines?.name ?? null,
    installedAt: record.installed_at?.toISOString() ?? null,
    removedAt: record.removed_at?.toISOString() ?? null,
    notes: record.notes,
    createdAt: record.created_at.toISOString(),
    updatedAt: record.updated_at.toISOString(),
    wearPercent,
  };
}

async function assertMachineAssignment(
  lab_id: string,
  payload: MillingDrillInput,
  existing?: { status: MillingDrillStatus; milling_machine_id: string | null },
) {
  const status = payload.status ?? existing?.status;
  const millingMachineId =
    payload.millingMachineId === undefined
      ? existing?.milling_machine_id
      : payload.millingMachineId;

  if (millingMachineId && status !== MillingDrillStatus.ACTIVE) {
    throw new ReferenceValidationError({
      millingMachineId: ["Only active drills can stay assigned to a machine."],
    });
  }

  if (!millingMachineId) {
    return;
  }

  const machine = await prisma.milling_machines.findFirst({
    where: {
      id: millingMachineId,
      lab_id,
    },
    select: { id: true },
  });

  if (!machine) {
    throw new ReferenceValidationError({
      millingMachineId: ["Assigned machine was not found in this lab."],
    });
  }
}

function isDrillUniqueError(error: unknown) {
  if (
    !(error instanceof Prisma.PrismaClientKnownRequestError) ||
    error.code !== "P2002"
  ) {
    return false;
  }

  const target = error.meta?.target;
  return Array.isArray(target) && target.includes("lab_id") && target.includes("name");
}

function toDrillData(payload: MillingDrillInput) {
  return {
    name: payload.name,
    milling_machine_id:
      payload.millingMachineId === undefined
        ? undefined
        : payload.millingMachineId,
    status: payload.status,
    current_blocks_count:
      payload.currentBlocksCount === undefined
        ? undefined
        : payload.currentBlocksCount,
    estimated_max_blocks:
      payload.estimatedMaxBlocks === undefined
        ? undefined
        : payload.estimatedMaxBlocks,
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
    notes: payload.notes === undefined ? undefined : payload.notes,
  };
}

export async function listMillingDrillsForLoggedLab(user_id: string) {
  const membership = await getLabMember(user_id);
  assertCanAccessBackoffice(membership.role);
  const { lab_id } = membership;
  const drills = await prisma.milling_drills.findMany({
    where: { lab_id },
    orderBy: [{ status: "asc" }, { name: "asc" }],
    select: drillSelect,
  });

  return drills.map(mapDrill);
}

export async function getMillingDrillForLoggedLab(
  user_id: string,
  drill_id: string,
) {
  const membership = await getLabMember(user_id);
  assertCanAccessBackoffice(membership.role);
  const { lab_id } = membership;
  const drill = await prisma.milling_drills.findFirst({
    where: {
      id: drill_id,
      lab_id,
    },
    select: drillSelect,
  });

  if (!drill) {
    throw new ReferenceNotFoundError("Milling drill");
  }

  return mapDrill(drill);
}

export async function createMillingDrillForLoggedLab(
  user_id: string,
  payload: MillingDrillInput,
) {
  const membership = await getLabMember(user_id);
  assertCanAccessBackoffice(membership.role);
  const { lab_id } = membership;
  await assertMachineAssignment(lab_id, payload);

  try {
    const drill = await prisma.milling_drills.create({
      data: {
        lab_id,
        name: payload.name!,
        milling_machine_id: payload.millingMachineId ?? null,
        status: payload.status!,
        current_blocks_count: payload.currentBlocksCount ?? 0,
        estimated_max_blocks: payload.estimatedMaxBlocks ?? null,
        installed_at: payload.installedAt ? new Date(payload.installedAt) : null,
        removed_at: payload.removedAt ? new Date(payload.removedAt) : null,
        notes: payload.notes ?? null,
      },
      select: drillSelect,
    });

    return mapDrill(drill);
  } catch (error) {
    if (isDrillUniqueError(error)) {
      throw new ReferenceValidationError({
        name: ["This drill name already exists in this lab."],
      });
    }

    throw error;
  }
}

export async function updateMillingDrillForLoggedLab(
  user_id: string,
  drill_id: string,
  payload: MillingDrillInput,
) {
  const membership = await getLabMember(user_id);
  assertCanAccessBackoffice(membership.role);
  const { lab_id } = membership;
  const existing = await prisma.milling_drills.findFirst({
    where: {
      id: drill_id,
      lab_id,
    },
    select: {
      id: true,
      status: true,
      milling_machine_id: true,
    },
  });

  if (!existing) {
    throw new ReferenceNotFoundError("Milling drill");
  }

  await assertMachineAssignment(lab_id, payload, existing);

  try {
    const drill = await prisma.milling_drills.update({
      where: { id: drill_id },
      data: toDrillData(payload),
      select: drillSelect,
    });

    return mapDrill(drill);
  } catch (error) {
    if (isDrillUniqueError(error)) {
      throw new ReferenceValidationError({
        name: ["This drill name already exists in this lab."],
      });
    }

    throw error;
  }
}

export async function deleteMillingDrillForLoggedLab(
  user_id: string,
  drill_id: string,
) {
  const membership = await getLabMember(user_id);
  assertCanAccessBackoffice(membership.role);
  const { lab_id } = membership;
  const existing = await prisma.milling_drills.findFirst({
    where: { id: drill_id, lab_id },
    select: { id: true },
  });

  if (!existing) {
    throw new ReferenceNotFoundError("Milling drill");
  }

  await prisma.milling_drills.delete({
    where: { id: drill_id },
  });
}
