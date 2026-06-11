"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { CaseDetailsDialog } from "@/features/cases/components/case-details-dialog";
import { useCadDesigners } from "@/features/cases/hooks/useCadDesigners";
import { useCustomers } from "@/features/cases/hooks/useCustomers";
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
  const cadDesigners = useCadDesigners(open);

  const optionQueries = [customers, serviceTypes, cadDesigners];
  const optionsLoading = optionQueries.some(
    (query) => query.isLoading || query.isFetching,
  );
  const optionsError =
    optionQueries.find((query) => query.isError)?.error ?? null;

  function retryOptions() {
    void customers.refetch();
    void serviceTypes.refetch();
    void cadDesigners.refetch();
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
        cadDesigners={cadDesigners.data ?? []}
        components={components}
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
