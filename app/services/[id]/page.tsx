import { PageHeader } from "@/components/app/page-header";
import { PageShell } from "@/components/app/page-shell";
import { ServiceDetailPageClient } from "@/features/services/components/service-detail-page-client";
import { requireCurrentLab } from "@/lib/onboarding";

type Props = {
  params: Promise<{ id: string }>;
};

export default async function ServiceDetailPage({ params }: Props) {
  await requireCurrentLab();
  const { id } = await params;

  return (
    <PageShell width="default">
      <PageHeader
        title="Service"
        description="Edit service overview."
      />
      <ServiceDetailPageClient serviceId={id} />
    </PageShell>
  );
}
