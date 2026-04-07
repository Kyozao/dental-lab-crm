import { getAuthenticatedAppUser } from "@/lib/auth/get-app-user";
import { getCaseFormOptions, getNavCaseSearchItems } from "@/lib/case-data";
import { prisma } from "@/lib/prisma";
import { NavClient } from "./nav-client";

export async function MainNav() {
  const appUser = await getAuthenticatedAppUser();

  if (!appUser) {
    return <NavClient />;
  }

  const [cases, { clinics, serviceTypes, cadDesigners, components }, notifications] =
    await Promise.all([
      getNavCaseSearchItems(appUser.id, appUser.role),
      getCaseFormOptions(),
      prisma.notification.findMany({
        where: { recipientUserId: appUser.id },
        orderBy: { createdAt: "desc" },
        take: 8,
        select: {
          id: true,
          title: true,
          message: true,
          createdAt: true,
          isRead: true,
          caseId: true,
        },
      }),
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
      notifications={notifications.map((notification) => ({
        ...notification,
        createdAt: notification.createdAt.toISOString(),
      }))}
    />
  );
}
