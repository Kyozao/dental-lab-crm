"use server";

export async function markNotificationReadAction() {
  return { success: true };
}

export async function markAllNotificationsReadAction() {
  return { success: true };
}

export async function getLatestNotificationsAction() {
  return [];
}
