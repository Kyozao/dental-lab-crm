import { PageHeader } from "@/components/app/page-header";
import { PageShell } from "@/components/app/page-shell";
import { ServiceWorkflowPageClient } from "@/features/services/components/service-workflow-page-client";
import { requireCurrentLab } from "@/lib/onboarding";

type Props = {
  params: Promise<{ id: string }>;
};

export default async function ServiceWorkflowPage({ params }: Props) {
  await requireCurrentLab();
  const { id } = await params;

  return (
    <PageShell width="default">
      <PageHeader
        title="Service Workflow"
        description="Edit the workflow template for this service."
      />
      <ServiceWorkflowPageClient serviceId={id} />
    </PageShell>
  );
}
