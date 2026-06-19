import { UserRole } from "@/generated/prisma/enums";
import { prisma } from "@/lib/prisma";

import { assertCanAccessBackoffice } from "../_shared/authorization";
import { ensureDefaultCatalogForLab } from "../_shared/default-catalog";
import { getSingleLabMembership } from "../_shared/membership";

type CreateLabInput = {
  name: string;
};

export class UserAlreadyHasLabError extends Error {
  constructor() {
    super("User already has a lab membership.");
    this.name = "UserAlreadyHasLabError";
  }
}

export async function createLabForUser(user_id: string, input: CreateLabInput) {
  const existingMembership = await prisma.lab_members.findUnique({
    where: { user_id },
    select: { lab_id: true },
  });

  if (existingMembership) {
    throw new UserAlreadyHasLabError();
  }

  return prisma.$transaction(async (tx) => {
    const lab = await tx.labs.create({
      data: {
        name: input.name,
        currency: "BRL",
      },
      select: {
        id: true,
        name: true,
        currency: true,
      },
    });

    await tx.lab_members.create({
      data: {
        user_id,
        lab_id: lab.id,
        role: UserRole.OWNER,
      },
    });

    await ensureDefaultCatalogForLab(tx, lab.id);

    return lab;
  });
}

export async function getCurrentLabForUser(user_id: string) {
  const { lab_id, role } = await getSingleLabMembership(user_id);
  assertCanAccessBackoffice(role);

  const lab = await prisma.labs.findUniqueOrThrow({
    where: { id: lab_id },
    select: {
      id: true,
      name: true,
      currency: true,
    },
  });

  return {
    ...lab,
    currentUserRole: role,
  };
}

export async function updateCurrentLabCurrencyForUser(
  user_id: string,
  currency: string,
) {
  const membership = await getSingleLabMembership(user_id);
  assertCanAccessBackoffice(membership.role);
  const { lab_id } = membership;

  return prisma.labs.update({
    where: { id: lab_id },
    data: { currency },
    select: {
      id: true,
      name: true,
      currency: true,
    },
  });
}
