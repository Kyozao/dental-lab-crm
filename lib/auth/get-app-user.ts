import { createClient } from "@/lib/supabase/server";
import { prisma } from "@/lib/prisma";
import { cache } from "react";

export const getAuthenticatedAppUser = cache(async () => {
  const supabase = await createClient();

  // Read fresh user info directly from Supabase Auth session.
  const {
    data: { user: authUser },
    error: userError,
  } = await supabase.auth.getUser();

  if (userError || !authUser) {
    return null;
  }

  const existingUser = await prisma.user.findUnique({
    where: { id: authUser.id },
    select: {
      id: true,
      name: true,
      role: true,
      isActive: true,
      email: true,
    },
  });

  const appUser =
    existingUser ??
    (await prisma.user.create({
      data: {
        id: authUser.id,
        email: authUser.email ?? "",
        name:
          (authUser.user_metadata?.full_name as string | undefined) ??
          (authUser.user_metadata?.name as string | undefined) ??
          authUser.email?.split("@")[0] ??
          "User",
        role: "CAD_DESIGNER",
        isActive: true,
      },
      select: {
        id: true,
        name: true,
        role: true,
        isActive: true,
        email: true,
      },
    }));

  if (!appUser.isActive) {
    return null;
  }

  return appUser;
});