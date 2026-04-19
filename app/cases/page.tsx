import { prisma } from "@/lib/prisma";
import { getAuthenticatedAppUser } from "@/lib/auth/get-app-user";
import { getCaseFormOptions } from "@/lib/case-data";
import { redirect } from "next/navigation";
import { AddCaseDialog } from "@/components/cases/add-case-dialog";
import {
  CASE_SCOPE,
  CASE_STATUS_OPTIONS,
  type CaseScopeValue,
  type CaseStatusValue,
} from "./case.shared";
import { CasesTable } from "./components/cases-table";
import { CasesSearchBar } from "./components/cases-search-bar";

type CasesPageProps = {
  searchParams?: Promise<Record<string, string | string[] | undefined>>;
};

const PAGE_SIZE_OPTIONS = [25, 50, 100] as const;

function parsePositiveInt(value: string, fallback: number) {
  const parsed = Number.parseInt(value, 10);
  if (!Number.isFinite(parsed) || parsed < 1) return fallback;
  return parsed;
}

function buildCasesUrl(params: {
  q: string;
  scope: string;
  status: string;
  urgent: string;
  clinicId: string;
  page: number;
  pageSize: number;
}) {
  const search = new URLSearchParams();

  if (params.q) search.set("q", params.q);
  if (params.scope) search.set("scope", params.scope);
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
  const appUser = await getAuthenticatedAppUser();

  if (!appUser) {
    redirect("/login");
  }

  const params = (await searchParams) ?? {};
  const query = readParam(params, "q").trim();
  const selectedScope = readParam(params, "scope").trim();
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

  const validScopes = new Set([CASE_SCOPE.LAB, CASE_SCOPE.AGENCY]);
  const scopeFilter = validScopes.has(selectedScope as CaseScopeValue)
    ? (selectedScope as CaseScopeValue)
    : CASE_SCOPE.LAB;

  const validStatuses = new Set(
    CASE_STATUS_OPTIONS.map((option) => option.value),
  );
  const statusFilter = validStatuses.has(selectedStatus as CaseStatusValue)
    ? (selectedStatus as CaseStatusValue)
    : "";

  const where = {
    caseScope: scopeFilter,
    ...(statusFilter ? { currentStatus: statusFilter } : {}),
    ...(selectedClinicId ? { clinicId: selectedClinicId } : {}),
    ...(selectedUrgent === "urgent"
      ? { isUrgent: true }
      : selectedUrgent === "normal"
        ? { isUrgent: false }
        : {}),
    ...(query
      ? {
          OR: [
            { code: { contains: query, mode: "insensitive" as const } },
            { patientName: { contains: query, mode: "insensitive" as const } },
            {
              clinic: {
                name: {
                  contains: query,
                  mode: "insensitive" as const,
                },
              },
            },
            {
              dentist: {
                name: {
                  contains: query,
                  mode: "insensitive" as const,
                },
              },
            },
          ],
        }
      : {}),
  };

  const totalCases = await prisma.case.count({ where });
  const totalPages = Math.max(1, Math.ceil(totalCases / selectedPageSize));
  const currentPage = Math.min(
    parsePositiveInt(requestedPageRaw, 1),
    totalPages,
  );
  const skip = (currentPage - 1) * selectedPageSize;

  const [cases, { clinics, serviceTypes, cadDesigners, components }] =
    await Promise.all([
      prisma.case.findMany({
        where,
        skip,
        take: selectedPageSize,
        orderBy: { createdAt: "desc" },
        select: {
          id: true,
          code: true,
          patientName: true,
          currentStatus: true,
          isUrgent: true,
          clinic: {
            select: {
              name: true,
            },
          },
          dentist: {
            select: {
              name: true,
            },
          },
          serviceType: {
            select: {
              name: true,
            },
          },
          cadDesigner: {
            select: {
              name: true,
            },
          },
        },
      }),
      getCaseFormOptions(),
    ]);

  const previousPageUrl = buildCasesUrl({
    q: query,
    scope: scopeFilter,
    status: statusFilter,
    urgent: selectedUrgent,
    clinicId: selectedClinicId,
    page: Math.max(1, currentPage - 1),
    pageSize: selectedPageSize,
  });
  const nextPageUrl = buildCasesUrl({
    q: query,
    scope: scopeFilter,
    status: statusFilter,
    urgent: selectedUrgent,
    clinicId: selectedClinicId,
    page: Math.min(totalPages, currentPage + 1),
    pageSize: selectedPageSize,
  });

  return (
    <main className="min-h-screen bg-linear-to-br from-background via-background to-muted/30">
      <div className="mx-auto w-full max-w-7xl px-4 py-8 sm:px-6 lg:px-8">
        {/* Header */}
        <div className="mb-8 flex flex-col gap-6 sm:flex-row sm:items-center sm:justify-between">
          <div className="space-y-2">
            <h1 className="text-4xl font-bold tracking-tight">Cases</h1>
            <p className="text-base text-muted-foreground">
              {scopeFilter === CASE_SCOPE.AGENCY
                ? "Manage your agency cases and deliveries in one place"
                : "Manage and track all dental lab cases in one place"}
            </p>
          </div>
          <AddCaseDialog
            clinics={clinics}
            serviceTypes={serviceTypes}
            cadDesigners={cadDesigners}
            components={components}
            currentUserRole={appUser.role}
            defaultCaseScope={scopeFilter}
          />
        </div>

        <div className="mb-4 flex flex-wrap gap-2">
          <a
            href={buildCasesUrl({
              q: query,
              scope: CASE_SCOPE.LAB,
              status: statusFilter,
              urgent: selectedUrgent,
              clinicId: selectedClinicId,
              page: 1,
              pageSize: selectedPageSize,
            })}
            className={`rounded-lg border px-3 py-2 text-sm font-medium transition-colors ${
              scopeFilter === CASE_SCOPE.LAB
                ? "border-primary bg-primary/10 text-primary"
                : "border-border/60 hover:bg-muted/50"
            }`}
          >
            Lab Cases
          </a>
          <a
            href={buildCasesUrl({
              q: query,
              scope: CASE_SCOPE.AGENCY,
              status: statusFilter,
              urgent: selectedUrgent,
              clinicId: selectedClinicId,
              page: 1,
              pageSize: selectedPageSize,
            })}
            className={`rounded-lg border px-3 py-2 text-sm font-medium transition-colors ${
              scopeFilter === CASE_SCOPE.AGENCY
                ? "border-primary bg-primary/10 text-primary"
                : "border-border/60 hover:bg-muted/50"
            }`}
          >
            Agency Cases
          </a>
        </div>

        {/* Filters */}
        <CasesSearchBar
          clinics={clinics}
          totalCases={totalCases}
          scope={scopeFilter}
        />

        {/* Table Container */}
        <div className="rounded-xl border border-border/50 bg-card/50 backdrop-blur-sm shadow-sm overflow-hidden">
          <CasesTable
            cases={cases.map((item) => ({
              id: item.id,
              code: item.code,
              patientName: item.patientName,
              currentStatus: item.currentStatus,
              isUrgent: item.isUrgent,
              clinicName: item.clinic?.name ?? "-",
              dentistName: item.dentist?.name ?? "-",
              serviceTypeName: item.serviceType?.name ?? "-",
              cadDesignerName: item.cadDesigner?.name ?? "-",
            }))}
            clinics={clinics}
            serviceTypes={serviceTypes}
            cadDesigners={cadDesigners}
            components={components}
            currentUserRole={appUser.role}
          />

          {/* Empty State */}
          {cases.length === 0 && (
            <div className="px-6 py-16 text-center">
              <div className="mx-auto mb-4 inline-flex h-12 w-12 items-center justify-center rounded-lg bg-muted">
                <svg
                  className="h-6 w-6 text-muted-foreground"
                  xmlns="http://www.w3.org/2000/svg"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2"
                >
                  <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2z"></path>
                  <path d="M12 6v6m3 3H9"></path>
                </svg>
              </div>
              <h3 className="mb-1 text-sm font-semibold">No cases found</h3>
              <p className="text-sm text-muted-foreground">
                Create a new case to get started
              </p>
            </div>
          )}

          {/* Pagination */}
          {totalCases > 0 && (
            <div className="flex flex-col gap-4 border-t border-border/50 px-6 py-5 sm:flex-row sm:items-center sm:justify-between bg-muted/30">
              <p className="text-sm font-medium text-muted-foreground">
                Page <span className="text-foreground">{currentPage}</span> of{" "}
                <span className="text-foreground">{totalPages}</span>
              </p>
              <div className="flex items-center gap-2">
                <a
                  href={previousPageUrl}
                  aria-disabled={currentPage <= 1}
                  className="inline-flex items-center justify-center rounded-lg border border-border/50 px-3 py-2 text-sm font-medium hover:bg-muted/50 transition-colors aria-disabled:pointer-events-none aria-disabled:opacity-50 aria-disabled:cursor-not-allowed"
                >
                  Previous
                </a>
                <a
                  href={nextPageUrl}
                  aria-disabled={currentPage >= totalPages}
                  className="inline-flex items-center justify-center rounded-lg border border-border/50 px-3 py-2 text-sm font-medium hover:bg-muted/50 transition-colors aria-disabled:pointer-events-none aria-disabled:opacity-50 aria-disabled:cursor-not-allowed"
                >
                  Next
                </a>
              </div>
            </div>
          )}
        </div>
      </div>
    </main>
  );
}
