import { getAuthenticatedAppUser } from "@/lib/auth/get-app-user";
import { NavClient } from "./nav-client";

export async function MainNav() {
  const appUser = await getAuthenticatedAppUser();

  return <NavClient userRole={appUser?.role} />;
}
