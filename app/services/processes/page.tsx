import { PageHeader } from "@/components/app/page-header";
import { PageShell } from "@/components/app/page-shell";
import { ProcessesPageClient } from "@/features/services/components/processes-page-client";
import { requireCurrentLab } from "@/lib/onboarding";

export default async function ProcessesPage() {
  await requireCurrentLab();

  return (
    <PageShell width="default">
      <PageHeader
        title="Processes"
        description="Manage reusable internal production definitions that service workflows reference."
      />
      <ProcessesPageClient />
    </PageShell>
  );
}
