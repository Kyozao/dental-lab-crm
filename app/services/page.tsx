import { PageShell } from "@/components/app/page-shell";
import { ServicesPageClient } from "@/features/services/components/services-page-client";
import { requireCurrentLab } from "@/lib/onboarding";

export default async function ServicesPage() {
  await requireCurrentLab();

  return (
    <PageShell width="default">
      <ServicesPageClient />
    </PageShell>
  );
}
