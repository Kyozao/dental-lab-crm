import { PageHeader } from "@/components/app/page-header";
import { PageShell } from "@/components/app/page-shell";
import { ServicesPageClient } from "@/features/services/components/services-page-client";
import { requireCurrentLab } from "@/lib/onboarding";

export default async function ServicesPage() {
  await requireCurrentLab();

  return (
    <PageShell width="default">
      <PageHeader
        title="Services"
        description="Manage service pricing and workflow templates."
      />
      <ServicesPageClient />
    </PageShell>
  );
}
