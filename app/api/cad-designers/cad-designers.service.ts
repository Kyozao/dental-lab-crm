import { UserRole } from "@/generated/prisma/enums";
import { prisma } from "@/lib/prisma";

import { activeReferenceWhere, archiveData } from "../_shared/archive";
import { getSingleLabMembership } from "../_shared/membership";
import {
  activeStateData,
  mapReferenceDates,
  optionalString,
  ReferenceNotFoundError,
} from "../_shared/reference-resource";
import type { CadDesignerInput } from "./cad-designers.schemas";

export async function listCadDesignersForLoggedLab(user_id: string) {
  const { lab_id } = await getSingleLabMembership(user_id);
  const designers = await prisma.users.findMany({
    where: {
      ...activeReferenceWhere,
      memberships: {
        some: {
          lab_id,
          role: UserRole.CAD_DESIGNER,
        },
      },
    },
    select: {
      id: true,
      name: true,
      email: true,
      is_active: true,
      deleted_at: true,
      created_at: true,
      updated_at: true,
    },
    orderBy: { name: "asc" },
  });

  return designers.map(mapReferenceDates);
}

export async function createCadDesignerForLoggedLab(
  user_id: string,
  payload: CadDesignerInput,
) {
  const { lab_id } = await getSingleLabMembership(user_id);
  const designer = await prisma.$transaction(async (tx) => {
    const user = await tx.users.create({
      data: {
        name: payload.name!,
        email: payload.email!,
        ...activeStateData(payload),
      },
    });

    await tx.lab_members.create({
      data: {
        user_id: user.id,
        lab_id,
        role: UserRole.CAD_DESIGNER,
      },
    });

    return user;
  });

  return mapReferenceDates(designer);
}

async function requireCadDesignerInLab(user_id: string, designerId: string) {
  const { lab_id } = await getSingleLabMembership(user_id);
  const designer = await prisma.users.findFirst({
    where: {
      id: designerId,
      memberships: {
        some: {
          lab_id,
          role: UserRole.CAD_DESIGNER,
        },
      },
    },
    select: { id: true },
  });

  if (!designer) throw new ReferenceNotFoundError("CAD designer");
}

export async function updateCadDesignerForLoggedLab(
  user_id: string,
  designerId: string,
  payload: CadDesignerInput,
) {
  await requireCadDesignerInLab(user_id, designerId);

  const designer = await prisma.users.update({
    where: { id: designerId },
    data: {
      name: optionalString(payload.name) ?? undefined,
      email: optionalString(payload.email) ?? undefined,
      ...activeStateData(payload),
    },
  });

  return mapReferenceDates(designer);
}

export async function archiveCadDesignerForLoggedLab(
  user_id: string,
  designerId: string,
) {
  const { lab_id } = await getSingleLabMembership(user_id);
  const designer = await prisma.users.findFirst({
    where: {
      id: designerId,
      ...activeReferenceWhere,
      memberships: {
        some: {
          lab_id,
          role: UserRole.CAD_DESIGNER,
        },
      },
    },
    select: { id: true },
  });

  if (!designer) throw new ReferenceNotFoundError("CAD designer");

  const archived = await prisma.users.update({
    where: { id: designerId },
    data: archiveData(),
  });

  return mapReferenceDates(archived);
}
