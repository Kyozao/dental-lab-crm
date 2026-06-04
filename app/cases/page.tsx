import { AddCaseDialog } from "@/features/cases/components/add-case-dialog";
import { EmptyState } from "@/components/app/empty-state";
import { PageHeader } from "@/components/app/page-header";
import { PageShell } from "@/components/app/page-shell";
import { Panel } from "@/components/app/panel";
import { Button } from "@/components/ui/button";
import {
  CASE_STATUS_OPTIONS,
  type CadDesignerOption,
  type CaseStatusValue,
  type ClinicOption,
  type ComponentOption,
  type EditableCase,
  type ServiceTypeOption,
} from "@/features/cases/types";
import { CasesTable } from "@/features/cases/components/cases-table";
import { CasesSearchBar } from "@/features/cases/components/cases-search-bar";
import { serverApiGet } from "@/lib/api/server";

type CasesPageProps = {
  searchParams?: Promise<Record<string, string | string[] | undefined>>;
};

type UserResponse = {
  role: string;
};

type BootstrapResponse = {
  clinics: ClinicOption[];
  serviceTypes: ServiceTypeOption[];
  cadDesigners: CadDesignerOption[];
  components: ComponentOption[];
};

const PAGE_SIZE_OPTIONS = [25, 50, 100] as const;

function parsePositiveInt(value: string, fallback: number) {
  const parsed = Number.parseInt(value, 10);
  if (!Number.isFinite(parsed) || parsed < 1) return fallback;
  return parsed;
}

function buildCasesUrl(params: {
  q: string;
  status: string;
  urgent: string;
  clinicId: string;
  page: number;
  pageSize: number;
}) {
  const search = new URLSearchParams();

  if (params.q) search.set("q", params.q);
  if (params.status) search.set("status", params.status);
  if (params.urgent) search.set("urgent", params.urgent);
  if (params.clinicId) search.set("clinicId", params.clinicId);

  search.set("page", String(params.page));
  search.set("pageSize", String(params.pageSize));

  return `/cases?${search.toString()}`;
}

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
  const query = readParam(params, "q").trim();
  const selectedStatus = readParam(params, "status").trim();
  const selectedUrgent = readParam(params, "urgent").trim();
  const selectedClinicId = readParam(params, "clinicId").trim();
  const selectedPageSizeRaw = readParam(params, "pageSize").trim();
  const requestedPageRaw = readParam(params, "page").trim();

  const selectedPageSize = PAGE_SIZE_OPTIONS.includes(
    Number(selectedPageSizeRaw) as (typeof PAGE_SIZE_OPTIONS)[number],
  )
    ? Number(selectedPageSizeRaw)
    : PAGE_SIZE_OPTIONS[0];

  const validStatuses = new Set(
    CASE_STATUS_OPTIONS.map((option) => option.value),
  );
  const statusFilter = validStatuses.has(selectedStatus as CaseStatusValue)
    ? (selectedStatus as CaseStatusValue)
    : "";
  const requestedPage = parsePositiveInt(requestedPageRaw, 1);

  const apiParams = new URLSearchParams({
    page: String(requestedPage),
    pageSize: String(selectedPageSize),
  });
  if (query) apiParams.set("q", query);
  if (statusFilter) apiParams.set("status", statusFilter);
  if (selectedUrgent) apiParams.set("urgent", selectedUrgent);
  if (selectedClinicId) apiParams.set("clinicId", selectedClinicId);

  const [userEnvelope, casesEnvelope, bootstrapEnvelope] = await Promise.all([
    serverApiGet<UserResponse>("/api/me"),
    serverApiGet<EditableCase[]>(`/api/cases?${apiParams.toString()}`),
    serverApiGet<BootstrapResponse>("/api/registry/bootstrap"),
  ]);

  const { clinics, serviceTypes, cadDesigners, components } =
    bootstrapEnvelope.data;
  const totalCases = Number(casesEnvelope.meta?.total ?? casesEnvelope.data.length);
  const totalPages = Math.max(1, Math.ceil(totalCases / selectedPageSize));
  const currentPage = Math.min(requestedPage, totalPages);

  const previousPageUrl = buildCasesUrl({
    q: query,
    status: statusFilter,
    urgent: selectedUrgent,
    clinicId: selectedClinicId,
    page: Math.max(1, currentPage - 1),
    pageSize: selectedPageSize,
  });
  const nextPageUrl = buildCasesUrl({
    q: query,
    status: statusFilter,
    urgent: selectedUrgent,
    clinicId: selectedClinicId,
    page: Math.min(totalPages, currentPage + 1),
    pageSize: selectedPageSize,
  });

  return (
    <PageShell width="wide">
      <PageHeader
        title="Cases"
        description="Manage and track all dental lab cases in one place"
        actions={
          <AddCaseDialog
            clinics={clinics}
            serviceTypes={serviceTypes}
            cadDesigners={cadDesigners}
            components={components}
            currentUserRole={userEnvelope.data.role}
          />
        }
      />

      <CasesSearchBar clinics={clinics} totalCases={totalCases} />

      <Panel>
        <CasesTable
          cases={casesEnvelope.data.map((item) => ({
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
          clinics={clinics}
          serviceTypes={serviceTypes}
          cadDesigners={cadDesigners}
          components={components}
          currentUserRole={userEnvelope.data.role}
        />

        {casesEnvelope.data.length === 0 && (
          <EmptyState
            title="No cases found"
            description="Create a new case to get started"
            className="py-16"
          />
        )}

        {totalCases > 0 && (
          <div className="flex flex-col gap-4 border-t border-border/40 bg-muted/30 px-6 py-5 sm:flex-row sm:items-center sm:justify-between">
            <p className="text-sm font-medium text-muted-foreground">
              Page <span className="text-foreground">{currentPage}</span> of{" "}
              <span className="text-foreground">{totalPages}</span>
            </p>
            <div className="flex items-center gap-2">
              <Button
                asChild
                variant="outline"
                size="sm"
                aria-disabled={currentPage <= 1}
              >
                <a
                  href={previousPageUrl}
                  tabIndex={currentPage <= 1 ? -1 : undefined}
                >
                  Previous
                </a>
              </Button>
              <Button
                asChild
                variant="outline"
                size="sm"
                aria-disabled={currentPage >= totalPages}
              >
                <a
                  href={nextPageUrl}
                  tabIndex={currentPage >= totalPages ? -1 : undefined}
                >
                  Next
                </a>
              </Button>
            </div>
          </div>
        )}
      </Panel>
    </PageShell>
  );
}
