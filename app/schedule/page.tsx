import { requireCurrentLab } from "@/lib/onboarding";
import { SchedulePageClient } from "@/features/schedule/components/schedule-page-client";

export default async function SchedulePage() {
  const { role } = await requireCurrentLab();

  return (
    <main className="mx-auto flex max-w-7xl flex-col gap-6 px-4 py-6 sm:px-6">
      <header className="space-y-2">
        <p className="text-sm uppercase tracking-[0.2em] text-muted-foreground">
          Schedule
        </p>
        <h1 className="text-3xl font-semibold tracking-tight">
          Manager proposal review
        </h1>
        <p className="max-w-3xl text-sm text-muted-foreground">
          Generate a draft, review active production cases by case, adjust eligible
          assignees, and approve only when the proposal is ready to become live.
        </p>
      </header>

      <SchedulePageClient currentUserRole={role} />
    </main>
  );
}
