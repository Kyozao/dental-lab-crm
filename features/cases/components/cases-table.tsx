"use client";

import { useMemo, useState } from "react";
import { createPortal } from "react-dom";
import { useSearchParams } from "next/navigation";
import { AlertCircle } from "lucide-react";
import { CaseStatusBadge } from "@/components/app/status-badge";
import { EmptyState } from "@/components/app/empty-state";
import { CaseDetailsDialog } from "@/features/cases/components/case-details-dialog";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import type { CaseListItem } from "@/features/cases/cases";
import { useCases } from "@/features/cases/hooks/useCases";
import { useCustomers } from "@/features/cases/hooks/useCustomers";
import { useEmployees } from "@/features/cases/hooks/useEmployees";
import { useProcesses } from "@/features/cases/hooks/useProcesses";
import { useServiceTypes } from "@/features/cases/hooks/useServiceTypes";
import { getCaseDetailsApi } from "@/features/cases/services/cases-client";
import type {
  ComponentOption,
  EditableCase,
} from "@/features/cases/types";

type Props = {
  components: ComponentOption[];
  currentUserRole: string;
};

export function CasesTable({
  components,
  currentUserRole,
}: Props) {
  const searchParams = useSearchParams();
  const casesQuery = useMemo(
    () => ({
      limit: searchParams.get("limit") ?? searchParams.get("pageSize") ?? "100",
      q: searchParams.get("q") ?? undefined,
      status: searchParams.get("status") ?? undefined,
      urgent: searchParams.get("urgent") ?? undefined,
      customerId: searchParams.get("customerId") ?? undefined,
    }),
    [searchParams],
  );
  const { data: cases = [], isLoading, isError, error } = useCases(casesQuery);
  const [open, setOpen] = useState(false);
  const [selectedCase, setSelectedCase] = useState<EditableCase | null>(null);
  const [loadingCaseId, setLoadingCaseId] = useState<string | null>(null);
  const customers = useCustomers(open);
  const serviceTypes = useServiceTypes(open);
  const processes = useProcesses(open);
  const employees = useEmployees(open);
  const isOpeningCase = Boolean(loadingCaseId);
  const tableRows = useMemo(() => buildCaseRows(cases), [cases]);
  const optionQueries = [
    customers,
    serviceTypes,
    processes,
    employees,
  ];
  const optionsLoading = optionQueries.some(
    (query) => query.isLoading || query.isFetching,
  );
  const optionsError =
    optionQueries.find((query) => query.isError)?.error ?? null;

  function retryOptions() {
    void customers.refetch();
    void serviceTypes.refetch();
    void processes.refetch();
    void employees.refetch();
  }

  async function handleRowClick(caseId: string) {
    if (loadingCaseId) return;

    try {
      setLoadingCaseId(caseId);
      const details = await getCaseDetailsApi(caseId);
      setSelectedCase(details);
      setOpen(true);
    } catch (error) {
      const message =
        error instanceof Error
          ? error.message
          : "Nao foi possivel carregar os detalhes do caso.";
      window.alert(message);
    } finally {
      setLoadingCaseId(null);
    }
  }

  function handleOpenChange(nextOpen: boolean) {
    setOpen(nextOpen);
    if (!nextOpen) {
      setSelectedCase(null);
    }
  }

  return (
    <>
      {isLoading ? (
        <div className="flex min-h-64 items-center justify-center text-sm text-muted-foreground">
          Loading cases...
        </div>
      ) : null}

      {isError ? (
        <EmptyState
          title="Could not load cases"
          description={
            error instanceof Error
              ? error.message
              : "The cases API did not return a successful response."
          }
          className="py-16"
        />
      ) : null}

      {!isLoading && !isError && tableRows.length === 0 ? (
        <EmptyState
          title="No cases found"
          description="Adjust filters to see more cases."
          className="py-16"
        />
      ) : null}

      {!isLoading && !isError && tableRows.length > 0 ? (
        <div className="overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow className="border-border/40 bg-muted/50 hover:bg-muted/50">
                <TableHead className="px-6 py-4 font-semibold">Code</TableHead>
                <TableHead className="px-6 py-4 font-semibold">
                  Patient
                </TableHead>
                <TableHead className="px-6 py-4 font-semibold">
                  Customer
                </TableHead>
                <TableHead className="px-6 py-4 font-semibold">
                  Dentist
                </TableHead>
                <TableHead className="px-6 py-4 font-semibold">
                  Service
                </TableHead>
                <TableHead className="px-6 py-4 font-semibold">
                  Status
                </TableHead>
                <TableHead className="px-6 py-4 text-center font-semibold">
                  Priority
                </TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {tableRows.map((item) => {
                const isLoading = loadingCaseId === item.id;

                return (
                  <TableRow
                    key={item.id}
                    role="button"
                    tabIndex={0}
                    onClick={() => void handleRowClick(item.id)}
                    onKeyDown={(event) => {
                      if (isLoading) return;
                      if (event.key === "Enter" || event.key === " ") {
                        event.preventDefault();
                        void handleRowClick(item.id);
                      }
                    }}
                    aria-busy={isLoading}
                    className={`group transition-all duration-200 focus-visible:bg-muted/60 focus-visible:outline-none ${
                      isOpeningCase
                        ? "cursor-progress"
                        : "cursor-pointer hover:bg-muted/60 active:bg-muted/80"
                    }`}
                  >
                    <TableCell className="px-6 py-4 font-semibold text-foreground transition-colors group-hover:text-primary">
                      {item.code}
                    </TableCell>
                    <TableCell className="px-6 py-4 text-foreground">
                      {item.patientName}
                    </TableCell>
                    <TableCell className="px-6 py-4 text-sm text-muted-foreground">
                      {item.customerName}
                    </TableCell>
                    <TableCell className="px-6 py-4 text-sm text-muted-foreground">
                      {item.dentistName}
                    </TableCell>
                    <TableCell className="px-6 py-4 text-sm text-muted-foreground">
                      {item.serviceTypeName}
                    </TableCell>
                    <TableCell className="px-6 py-4">
                      <CaseStatusBadge status={item.currentStatus} />
                    </TableCell>
                    <TableCell className="px-6 py-4 text-center">
                      {item.isUrgent ? (
                        <span className="inline-flex h-7 w-7 items-center justify-center rounded-lg bg-red-100 text-red-600 transition-colors group-hover:bg-red-200">
                          <AlertCircle className="h-4 w-4" />
                        </span>
                      ) : (
                        <span className="text-xs text-muted-foreground">-</span>
                      )}
                    </TableCell>
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>
        </div>
      ) : null}

      <CaseOpeningOverlay open={isOpeningCase} />

      <CaseDetailsDialog
        open={open}
        onOpenChange={handleOpenChange}
        item={selectedCase}
        currentUserRole={currentUserRole}
        customers={customers.data ?? []}
        serviceTypes={serviceTypes.data ?? []}
        components={components}
        processes={processes.data ?? []}
        employees={employees.data ?? []}
        optionsLoading={optionsLoading}
        optionsError={
          optionsError
            ? optionsError instanceof Error
              ? optionsError.message
              : "Could not load case options."
            : null
        }
        onRetryOptions={retryOptions}
      />
    </>
  );
}

function buildCaseRows(cases: CaseListItem[]) {
  return cases.map((item) => ({
    ...item,
    customerName: item.customerName ?? "-",
    dentistName: item.dentistName ?? "-",
    serviceTypeName: item.serviceTypeName ?? "-",
  }));
}

function CaseOpeningOverlay({ open }: { open: boolean }) {
  if (!open || typeof document === "undefined") {
    return null;
  }

  return createPortal(
    <div className="fixed inset-0 isolate z-50 flex items-center justify-center bg-black/10 supports-backdrop-filter:backdrop-blur-xs">
      <div className="rounded-xl border border-border/60 bg-card px-6 py-4 shadow-lg">
        <div className="flex items-center gap-3">
          <div className="h-5 w-5 animate-spin rounded-full border-2 border-muted-foreground/40 border-t-primary" />
          <span className="text-sm font-medium text-foreground">
            Opening case...
          </span>
        </div>
      </div>
    </div>,
    document.body,
  );
}
