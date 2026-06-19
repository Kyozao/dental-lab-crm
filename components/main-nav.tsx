import { createClient } from "@/lib/supabase/server";
import { prisma } from "@/lib/prisma";

import { NavClient } from "./nav-client";

function displayNameFromEmail(email: string) {
  return email.split("@")[0] || email;
}

export async function MainNav() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  const membership = user
    ? await prisma.lab_members.findUnique({
        where: { user_id: user.id },
        select: { role: true },
      })
    : null;

  return (
    <NavClient
      userRole={membership?.role}
      userEmail={user?.email ?? null}
      userName={user?.email ? displayNameFromEmail(user.email) : null}
    />
  );
}
