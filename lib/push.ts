import webpush from "web-push";
import { prisma } from "@/lib/prisma";

type PushPayload = {
  title: string;
  body: string;
  url?: string;
};

function getVapidKeys() {
  const publicKey = process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY;
  const privateKey = process.env.VAPID_PRIVATE_KEY;
  const subject = process.env.VAPID_SUBJECT || "mailto:admin@synoa.local";

  if (!publicKey || !privateKey) {
    return null;
  }

  return { publicKey, privateKey, subject };
}

function configureWebPush() {
  const keys = getVapidKeys();

  if (!keys) {
    return false;
  }

  webpush.setVapidDetails(keys.subject, keys.publicKey, keys.privateKey);
  return true;
}

export async function sendPushToUser(userId: string, payload: PushPayload) {
  const isConfigured = configureWebPush();

  if (!isConfigured) {
    return;
  }

  const subscriptions = await prisma.pushSubscription.findMany({
    where: {
      userId,
      isActive: true,
    },
    select: {
      id: true,
      endpoint: true,
      p256dh: true,
      auth: true,
    },
  });

  await Promise.all(
    subscriptions.map(async (subscription) => {
      try {
        await webpush.sendNotification(
          {
            endpoint: subscription.endpoint,
            keys: {
              p256dh: subscription.p256dh,
              auth: subscription.auth,
            },
          },
          JSON.stringify(payload),
        );
      } catch (error) {
        console.error(error);
        await prisma.pushSubscription.update({
          where: { id: subscription.id },
          data: { isActive: false },
        });
      }
    }),
  );
}

export function getPublicVapidKey() {
  return process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY || "";
}
