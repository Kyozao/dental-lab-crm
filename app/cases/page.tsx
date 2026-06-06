import { AddCaseDialog } from "@/features/cases/components/add-case-dialog";
import { PageHeader } from "@/components/app/page-header";
import { PageShell } from "@/components/app/page-shell";
import { Panel } from "@/components/app/panel";
import { CasesSearchBar } from "@/features/cases/components/cases-search-bar";
import { CasesTable } from "@/features/cases/components/cases-table";
import {
  mockCadDesigners,
  mockClinics,
  mockComponents,
  mockServiceTypes,
  mockUser,
} from "@/lib/mock-data/pages";

export default function CasesPage() {
  return (
    <PageShell width="wide">
      <PageHeader
        title="Cases"
        description="Manage and track mock cases locally while API calls are disabled."
        actions={
          <AddCaseDialog
            clinics={mockClinics}
            serviceTypes={mockServiceTypes}
            cadDesigners={mockCadDesigners}
            components={mockComponents}
            currentUserRole={mockUser.role}
          />
        }
      />

      <CasesSearchBar clinics={mockClinics} />

      <Panel>
        <CasesTable
          clinics={mockClinics}
          serviceTypes={mockServiceTypes}
          cadDesigners={mockCadDesigners}
          components={mockComponents}
          currentUserRole={mockUser.role}
        />
      </Panel>
    </PageShell>
  );
}
