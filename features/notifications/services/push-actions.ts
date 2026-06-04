"use server";

export async function getPushConfigAction() {
  return { publicVapidKey: null };
}

export async function savePushSubscriptionAction() {
  return { success: true };
}

export async function disablePushSubscriptionAction() {
  return { success: true };
}
