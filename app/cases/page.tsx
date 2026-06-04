import { AddCaseDialog } from "@/features/cases/components/add-case-dialog";
import { EmptyState } from "@/components/app/empty-state";
import { PageHeader } from "@/components/app/page-header";
import { PageShell } from "@/components/app/page-shell";
import { Panel } from "@/components/app/panel";
import {
  CASE_STATUS_OPTIONS,
  type CaseStatusValue,
} from "@/features/cases/types";
import { CasesSearchBar } from "@/features/cases/components/cases-search-bar";
import { CasesTable } from "@/features/cases/components/cases-table";
import {
  mockCadDesigners,
  mockCases,
  mockClinics,
  mockComponents,
  mockServiceTypes,
  mockUser,
} from "@/lib/mock-data/pages";

type CasesPageProps = {
  searchParams?: Promise<Record<string, string | string[] | undefined>>;
};

function readParam(
  params: Record<string, string | string[] | undefined>,
  key: string,
) {
  const value = params[key];
  if (Array.isArray(value)) return value[0] ?? "";
  return value ?? "";
}

export default async function CasesPage({ searchParams }: CasesPageProps) {
  const params = (await searchParams) ?? {};
  const query = readParam(params, "q").trim().toLowerCase();
  const selectedStatus = readParam(params, "status").trim();
  const selectedUrgent = readParam(params, "urgent").trim();
  const selectedClinicId = readParam(params, "clinicId").trim();
  const validStatuses = new Set(
    CASE_STATUS_OPTIONS.map((option) => option.value),
  );
  const statusFilter = validStatuses.has(selectedStatus as CaseStatusValue)
    ? (selectedStatus as CaseStatusValue)
    : "";

  const cases = mockCases.filter((caseItem) => {
    if (statusFilter && caseItem.currentStatus !== statusFilter) return false;
    if (selectedClinicId && caseItem.clinicId !== selectedClinicId) return false;
    if (selectedUrgent === "urgent" && !caseItem.isUrgent) return false;
    if (selectedUrgent === "normal" && caseItem.isUrgent) return false;
    if (!query) return true;

    return [
      caseItem.code,
      caseItem.patientName,
      caseItem.clinicName,
      caseItem.dentistName,
    ].some((value) => value.toLowerCase().includes(query));
  });

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

      <CasesSearchBar clinics={mockClinics} totalCases={cases.length} />

      <Panel>
        <CasesTable
          cases={cases.map((item) => ({
            id: item.id,
            code: item.code,
            patientName: item.patientName,
            currentStatus: item.currentStatus,
            isUrgent: item.isUrgent,
            clinicName: item.clinicName || "-",
            dentistName: item.dentistName || "-",
            serviceTypeName: item.serviceTypeName || "-",
            cadDesignerName: item.cadDesignerName || "-",
          }))}
          clinics={mockClinics}
          serviceTypes={mockServiceTypes}
          cadDesigners={mockCadDesigners}
          components={mockComponents}
          currentUserRole={mockUser.role}
        />

        {cases.length === 0 ? (
          <EmptyState
            title="No cases found"
            description="Adjust filters to see the mock cases."
            className="py-16"
          />
        ) : null}
      </Panel>
    </PageShell>
  );
}
