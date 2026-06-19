import { PageShell } from "@/components/app/page-shell";
import { EmployeeDetailPageClient } from "@/features/employees/components/employee-detail-page-client";
import { requireCurrentLab } from "@/lib/onboarding";

export default async function EmployeeDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  await requireCurrentLab();
  const { id } = await params;

  return (
    <PageShell width="default">
      <EmployeeDetailPageClient employeeId={id} />
    </PageShell>
  );
}
