import { Suspense } from "react";

import { AddCaseDialog } from "@/features/cases/components/add-case-dialog";
import { PageHeader } from "@/components/app/page-header";
import { PageShell } from "@/components/app/page-shell";
import { CasesSearchBar } from "@/features/cases/components/cases-search-bar";
import { CasesListSection } from "@/features/cases/components/cases-list-section";
import {
  mockCustomers,
  mockComponents,
} from "@/lib/mock-data/pages";
import { requireCurrentLab } from "@/lib/onboarding";

export default async function CasesPage() {
  const { role } = await requireCurrentLab();

  return (
    <PageShell width="wide">
      <PageHeader
        title="Cases"
        description="Track active case work, stage progress, and production actions from one list."
        actions={
          <AddCaseDialog
            components={mockComponents}
            currentUserRole={role}
          />
        }
      />

      <Suspense fallback={null}>
        <CasesSearchBar customers={mockCustomers} />
      </Suspense>

      <Suspense fallback={null}>
        <CasesListSection
          components={mockComponents}
          currentUserRole={role}
        />
      </Suspense>
    </PageShell>
  );
}
