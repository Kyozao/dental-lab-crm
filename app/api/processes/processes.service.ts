import { prisma } from "@/lib/prisma";

import { activeReferenceWhere, archiveData } from "../_shared/archive";
import { assertCanAccessBackoffice } from "../_shared/authorization";
import { getLabMember } from "../_shared/membership";
import {
  activeStateData,
  mapReferenceDates,
  optionalString,
  ReferenceNotFoundError,
} from "../_shared/reference-resource";
import type { ProcessInput } from "./processes.schemas";

export async function listProcessesForLoggedLab(user_id: string) {
  const membership = await getLabMember(user_id);
  assertCanAccessBackoffice(membership.role);
  const { lab_id } = membership;
  const processes = await prisma.processes.findMany({
    where: {
      lab_id,
      ...activeReferenceWhere,
    },
    orderBy: { name: "asc" },
  });

  return processes.map(mapReferenceDates);
}

export async function createProcessForLoggedLab(
  user_id: string,
  payload: ProcessInput,
) {
  const membership = await getLabMember(user_id);
  assertCanAccessBackoffice(membership.role);
  const { lab_id } = membership;
  const process = await prisma.processes.create({
    data: {
      lab_id,
      name: payload.name!,
      description: optionalString(payload.description),
      ...activeStateData(payload),
    },
  });

  return mapReferenceDates(process);
}

export async function updateProcessForLoggedLab(
  user_id: string,
  process_id: string,
  payload: ProcessInput,
) {
  const membership = await getLabMember(user_id);
  assertCanAccessBackoffice(membership.role);
  const { lab_id } = membership;
  const existing = await prisma.processes.findFirst({
    where: { id: process_id, lab_id },
    select: { id: true },
  });

  if (!existing) throw new ReferenceNotFoundError("Process");

  const process = await prisma.processes.update({
    where: { id: process_id },
    data: {
      name: optionalString(payload.name) ?? undefined,
      description: optionalString(payload.description),
      ...activeStateData(payload),
    },
  });

  return mapReferenceDates(process);
}

export async function archiveProcessForLoggedLab(
  user_id: string,
  process_id: string,
) {
  const membership = await getLabMember(user_id);
  assertCanAccessBackoffice(membership.role);
  const { lab_id } = membership;
  const existing = await prisma.processes.findFirst({
    where: {
      id: process_id,
      lab_id,
      ...activeReferenceWhere,
    },
    select: { id: true },
  });

  if (!existing) throw new ReferenceNotFoundError("Process");

  const process = await prisma.processes.update({
    where: { id: process_id },
    data: archiveData(),
  });

  return mapReferenceDates(process);
}
