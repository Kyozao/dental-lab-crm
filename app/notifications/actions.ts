"use server";

import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/prisma";
import { getAuthenticatedAppUser } from "@/lib/auth/get-app-user";

export async function markNotificationReadAction(notificationId: string) {
  const appUser = await getAuthenticatedAppUser();

  if (!appUser) {
    throw new Error("Not authenticated.");
  }

  await prisma.notification.updateMany({
    where: {
      id: notificationId,
      recipientUserId: appUser.id,
    },
    data: {
      isRead: true,
      readAt: new Date(),
    },
  });

  revalidatePath("/");
}

export async function markAllNotificationsReadAction() {
  const appUser = await getAuthenticatedAppUser();

  if (!appUser) {
    throw new Error("Not authenticated.");
  }

  await prisma.notification.updateMany({
    where: {
      recipientUserId: appUser.id,
      isRead: false,
    },
    data: {
      isRead: true,
      readAt: new Date(),
    },
  });

  revalidatePath("/");
}

export async function getLatestNotificationsAction() {
  const appUser = await getAuthenticatedAppUser();

  if (!appUser) {
    return [];
  }

  const notifications = await prisma.notification.findMany({
    where: {
      recipientUserId: appUser.id,
    },
    orderBy: { createdAt: "desc" },
    take: 12,
    select: {
      id: true,
      title: true,
      message: true,
      createdAt: true,
      isRead: true,
      caseId: true,
    },
  });

  return notifications.map((notification) => ({
    ...notification,
    createdAt: notification.createdAt.toISOString(),
  }));
}
