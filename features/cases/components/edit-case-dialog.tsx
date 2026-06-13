"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { CaseDetailsDialog } from "@/features/cases/components/case-details-dialog";
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
  caseId: string;
  components: ComponentOption[];
  currentUserRole: string;
};

export function EditCaseDialog({
  caseId,
  components,
  currentUserRole,
}: Props) {
  const [open, setOpen] = useState(false);
  const [caseItem, setCaseItem] = useState<EditableCase | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const customers = useCustomers(open);
  const serviceTypes = useServiceTypes(open);
  const processes = useProcesses(open);
  const employees = useEmployees(open);

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

  async function handleOpenDialog() {
    try {
      setIsLoading(true);
      const details = await getCaseDetailsApi(caseId);
      setCaseItem(details);
      setOpen(true);
    } catch (error) {
      const message =
        error instanceof Error
          ? error.message
          : "Nao foi possivel carregar os detalhes do caso.";
      window.alert(message);
    } finally {
      setIsLoading(false);
    }
  }

  function handleOpenChange(nextOpen: boolean) {
    setOpen(nextOpen);
    if (!nextOpen) {
      setCaseItem(null);
    }
  }

  return (
    <>
      <Button
        type="button"
        variant="outline"
        size="sm"
        onClick={handleOpenDialog}
        disabled={isLoading}
      >
        {isLoading ? "Loading..." : "Edit"}
      </Button>

      <CaseDetailsDialog
        open={open}
        onOpenChange={handleOpenChange}
        item={caseItem}
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
