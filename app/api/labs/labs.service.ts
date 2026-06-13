import { UserRole } from "@/generated/prisma/enums";
import { prisma } from "@/lib/prisma";

import { ensureDefaultCatalogForLab } from "../_shared/default-catalog";

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
      },
      select: {
        id: true,
        name: true,
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
