import { PageHeader } from "@/components/app/page-header";
import { PageShell } from "@/components/app/page-shell";
import { EmployeesPageClient } from "@/features/employees/components/employees-page-client";
import { requireCurrentLab } from "@/lib/onboarding";

export default async function EmployeesPage() {
  await requireCurrentLab();

  return (
    <PageShell width="default">
      <PageHeader
        title="Employees"
        description="Review your lab roster, pending invites, and employee details."
      />
      <EmployeesPageClient />
    </PageShell>
  );
}
