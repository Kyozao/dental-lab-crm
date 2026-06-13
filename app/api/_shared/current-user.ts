import { prisma } from "@/lib/prisma";
import { createClient } from "@/lib/supabase/server";

type CurrentUser =
  | {
      id: string;
      email: string;
    }
  | null;

function displayNameFromEmail(email: string) {
  return email.split("@")[0] || email;
}

export async function getCurrentSupabaseUser(): Promise<CurrentUser> {
  const supabase = await createClient();
  const {
    data: { user },
    error,
  } = await supabase.auth.getUser();

  if (error || !user?.email) return null;

  return {
    id: user.id,
    email: user.email,
  };
}

export async function ensureCurrentAppUser(): Promise<CurrentUser> {
  const user = await getCurrentSupabaseUser();
  if (!user) return null;

  await prisma.users.upsert({
    where: { id: user.id },
    update: {
      email: user.email,
      is_active: true,
      deleted_at: null,
    },
    create: {
      id: user.id,
      email: user.email,
      name: displayNameFromEmail(user.email),
    },
  });

  return user;
}
