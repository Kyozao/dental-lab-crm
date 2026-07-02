import { headers } from "next/headers";
import type { Prisma, PrismaClient } from "@/generated/prisma/client";

import { prisma } from "@/lib/prisma";

export const AUTH_USER_ID_HEADER = "x-authenticated-user-id";
export const AUTH_USER_EMAIL_HEADER = "x-authenticated-user-email";

export type AuthenticatedUser = {
  id: string;
  email: string;
};

type CurrentUser = AuthenticatedUser | null;

type UserSyncInput = AuthenticatedUser & {
  name?: string | null;
};

function displayNameFromEmail(email: string) {
  return email.split("@")[0] || email;
}

async function currentUserFromTrustedHeaders(): Promise<CurrentUser> {
  const headerStore = await headers();
  const id = headerStore.get(AUTH_USER_ID_HEADER);
  const email = headerStore.get(AUTH_USER_EMAIL_HEADER);

  if (!id || !email) return null;

  return { id, email };
}

export async function getCurrentSupabaseUser(): Promise<CurrentUser> {
  return currentUserFromTrustedHeaders();
}

function getUsersDelegate(client: PrismaClient | Prisma.TransactionClient) {
  return client.users;
}

export async function syncCurrentAppUser(
  user: UserSyncInput,
  client: PrismaClient | Prisma.TransactionClient = prisma,
) {
  await getUsersDelegate(client).upsert({
    where: { id: user.id },
    update: {
      email: user.email,
      ...(user.name ? { name: user.name } : {}),
      is_active: true,
      deleted_at: null,
    },
    create: {
      id: user.id,
      email: user.email,
      name: user.name?.trim() || displayNameFromEmail(user.email),
      is_active: true,
    },
  });
}

export async function ensureCurrentAppUser(): Promise<CurrentUser> {
  const user = await getCurrentSupabaseUser();
  if (!user) return null;

  await syncCurrentAppUser(user);
  return user;
}
