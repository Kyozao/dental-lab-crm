import { PageHeader } from "@/components/app/page-header";
import { PageShell } from "@/components/app/page-shell";
import { CustomersPageClient } from "@/features/customers/components/customers-page-client";
import { requireCurrentLab } from "@/lib/onboarding";

export default async function CustomersPage() {
  await requireCurrentLab();

  return (
    <PageShell width="default">
      <PageHeader
        title="Customers"
        description="Browse your lab directory and open customer details."
      />
      <CustomersPageClient />
    </PageShell>
  );
}
