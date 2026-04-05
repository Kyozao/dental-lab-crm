import { getAuthenticatedAppUser } from "@/lib/auth/get-app-user";
import { getCaseFormOptions, getNavCaseSearchItems } from "@/lib/case-data";
import { NavClient } from "./nav-client";

export async function MainNav() {
  const appUser = await getAuthenticatedAppUser();

  if (!appUser) {
    return <NavClient />;
  }

  const [cases, { clinics, serviceTypes, cadDesigners, components }] =
    await Promise.all([
      getNavCaseSearchItems(appUser.id, appUser.role),
      getCaseFormOptions(),
    ]);

  return (
    <NavClient
      userRole={appUser.role}
      currentUserRole={appUser.role}
      cases={cases}
      clinics={clinics}
      serviceTypes={serviceTypes}
      cadDesigners={cadDesigners}
      components={components}
    />
  );
}
