"use server";

import { prisma } from "@/lib/prisma";
import { getAuthenticatedAppUser } from "@/lib/auth/get-app-user";
import { createMillingSchema } from "@/lib/validators/production";
import { revalidatePath } from "next/cache";

export async function createMillingAction(input: unknown) {
  const appUser = await getAuthenticatedAppUser();

  if (!appUser) {
    throw new Error("Not authenticated");
  }

  if (appUser.role === "CAD_DESIGNER") {
    throw new Error("CAD designers cannot access production");
  }

  const parsed = createMillingSchema.parse(input);

  const milling = await prisma.caseMilling.create({
    data: {
      caseId: parsed.caseId,
      blockTypeId: parsed.blockTypeId,
      millingDrillId: parsed.millingDrillId,
      teethMilledQty: parsed.teethMilledQty,
      status: parsed.status,
      failureReason: parsed.failureReason,
      notes: parsed.notes,
      milledAt: new Date(parsed.milledAt),
    },
    include: {
      case: { select: { id: true, code: true } },
      blockType: { select: { id: true, name: true } },
      millingDrill: { select: { id: true, name: true } },
    },
  });

  revalidatePath("/production");

  return milling;
}

export async function updateMillingAction(
  millingId: string,
  input: unknown,
) {
  const appUser = await getAuthenticatedAppUser();

  if (!appUser) {
    throw new Error("Not authenticated");
  }

  if (appUser.role === "CAD_DESIGNER") {
    throw new Error("CAD designers cannot access production");
  }

  const parsed = createMillingSchema.parse(input);

  const milling = await prisma.caseMilling.update({
    where: { id: millingId },
    data: {
      blockTypeId: parsed.blockTypeId,
      millingDrillId: parsed.millingDrillId,
      teethMilledQty: parsed.teethMilledQty,
      status: parsed.status,
      failureReason: parsed.failureReason,
      notes: parsed.notes,
      milledAt: new Date(parsed.milledAt),
    },
    include: {
      case: { select: { id: true, code: true } },
      blockType: { select: { id: true, name: true } },
      millingDrill: { select: { id: true, name: true } },
    },
  });

  revalidatePath("/production");

  return milling;
}

export async function deleteMillingAction(millingId: string) {
  const appUser = await getAuthenticatedAppUser();

  if (!appUser) {
    throw new Error("Not authenticated");
  }

  if (appUser.role === "CAD_DESIGNER") {
    throw new Error("CAD designers cannot access production");
  }

  await prisma.caseMilling.delete({
    where: { id: millingId },
  });

  revalidatePath("/production");
}
