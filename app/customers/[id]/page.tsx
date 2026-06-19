import { PageShell } from "@/components/app/page-shell";
import { CustomerDetailPageClient } from "@/features/customers/components/customer-detail-page-client";
import { requireCurrentLab } from "@/lib/onboarding";

export default async function CustomerDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  await requireCurrentLab();
  const { id } = await params;

  return (
    <PageShell width="default">
      <CustomerDetailPageClient customerId={id} />
    </PageShell>
  );
}
