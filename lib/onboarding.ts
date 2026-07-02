import { redirect } from "next/navigation";

import { getCurrentSupabaseUser } from "@/app/api/_shared/current-user";
import { prisma } from "@/lib/prisma";

export async function requireAuthenticatedUser() {
  const user = await getCurrentSupabaseUser();
  if (!user) redirect("/login");

  return user;
}

export async function requireCurrentLab() {
  const user = await requireAuthenticatedUser();
  const membership = await prisma.lab_members.findUnique({
    where: { user_id: user.id },
    select: { lab_id: true, role: true },
  });

  if (!membership) redirect("/onboarding/lab");

  return {
    user_id: user.id,
    lab_id: membership.lab_id,
    role: membership.role,
  };
}

export async function redirectIfOnboarded() {
  const user = await requireAuthenticatedUser();
  const membership = await prisma.lab_members.findUnique({
    where: { user_id: user.id },
    select: { lab_id: true, role: true },
  });

  if (membership) {
    redirect(membership.role === "PRODUCTION" ? "/production" : "/cases");
  }

  return user;
}
