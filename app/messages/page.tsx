import { MessagesPageClient } from "@/features/messages/components/messages-page-client";
import { requireCurrentLab } from "@/lib/onboarding";

export default async function MessagesPage() {
  const { role, user_id } = await requireCurrentLab();

  return <MessagesPageClient currentUserId={user_id} currentUserRole={role} />;
}
