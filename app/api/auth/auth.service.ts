import { prisma } from "@/lib/prisma";
import {
  createSupabaseAdminClient,
  SupabaseAdminConfigError,
} from "@/lib/supabase/admin";

const AUTH_USER_PAGE_SIZE = 200;

export function normalizeEmail(email: string) {
  return email.trim().toLowerCase();
}

export async function findSupabaseAuthUserByEmail(email: string) {
  const supabase = createSupabaseAdminClient();
  let page = 1;

  while (true) {
    const { data, error } = await supabase.auth.admin.listUsers({
      page,
      perPage: AUTH_USER_PAGE_SIZE,
    });

    if (error) {
      throw error;
    }

    const matchedUser =
      data.users.find(
        (user) => user.email?.toLowerCase() === email,
      ) ?? null;

    if (matchedUser) {
      return matchedUser;
    }

    if (data.users.length < AUTH_USER_PAGE_SIZE || page >= data.lastPage) {
      return null;
    }

    page += 1;
  }
}

export { SupabaseAdminConfigError };

export async function emailExistsForAuth(email: string) {
  const normalizedEmail = normalizeEmail(email);

  const existingAppUser = await prisma.users.findUnique({
    where: { email: normalizedEmail },
    select: { id: true },
  });

  if (existingAppUser) {
    return true;
  }

  const authUser = await findSupabaseAuthUserByEmail(normalizedEmail);
  return Boolean(authUser);
}
