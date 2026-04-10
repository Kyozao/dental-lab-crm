"use server";

import { getAuthenticatedAppUser } from "@/lib/auth/get-app-user";
import { prisma } from "@/lib/prisma";
import { getPublicVapidKey } from "@/lib/push";

type PushSubscriptionInput = {
  endpoint: string;
  keys?: {
    p256dh?: string;
    auth?: string;
  };
};

export async function getPushConfigAction() {
  const appUser = await getAuthenticatedAppUser();

  if (!appUser) {
    throw new Error("Not authenticated.");
  }

  return {
    publicVapidKey: getPublicVapidKey(),
  };
}

export async function savePushSubscriptionAction(
  subscription: PushSubscriptionInput,
) {
  const appUser = await getAuthenticatedAppUser();

  if (!appUser) {
    throw new Error("Not authenticated.");
  }

  if (!subscription?.endpoint || !subscription.keys?.p256dh || !subscription.keys?.auth) {
    throw new Error("Invalid push subscription payload.");
  }

  await prisma.pushSubscription.upsert({
    where: {
      endpoint: subscription.endpoint,
    },
    update: {
      userId: appUser.id,
      p256dh: subscription.keys.p256dh,
      auth: subscription.keys.auth,
      isActive: true,
    },
    create: {
      userId: appUser.id,
      endpoint: subscription.endpoint,
      p256dh: subscription.keys.p256dh,
      auth: subscription.keys.auth,
      isActive: true,
    },
  });
}

export async function disablePushSubscriptionAction(endpoint: string) {
  const appUser = await getAuthenticatedAppUser();

  if (!appUser) {
    throw new Error("Not authenticated.");
  }

  if (!endpoint) {
    return;
  }

  await prisma.pushSubscription.updateMany({
    where: {
      endpoint,
      userId: appUser.id,
    },
    data: {
      isActive: false,
    },
  });
}
