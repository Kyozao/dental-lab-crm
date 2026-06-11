"use client";

import { useState } from "react";

import { Button } from "@/components/ui/button";
import { CaseDetailsDialog } from "@/features/cases/components/case-details-dialog";
import { useCadDesigners } from "@/features/cases/hooks/useCadDesigners";
import { useCustomers } from "@/features/cases/hooks/useCustomers";
import { useServiceTypes } from "@/features/cases/hooks/useServiceTypes";
import type { ComponentOption } from "@/features/cases/types";

type Props = {
  components: ComponentOption[];
  currentUserRole: string;
};

export function AddCaseDialog({
  components,
  currentUserRole,
}: Props) {
  const [open, setOpen] = useState(false);
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

  return (
    <>
      <Button type="button" onClick={() => setOpen(true)}>
        Add Case
      </Button>

      <CaseDetailsDialog
        open={open}
        onOpenChange={setOpen}
        mode="create"
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
