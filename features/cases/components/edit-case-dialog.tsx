"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { CaseDetailsDialog } from "@/features/cases/components/case-details-dialog";
import { getCaseDetailsApi } from "@/features/cases/services/cases-client";
import type {
  CadDesignerOption,
  ClinicOption,
  ComponentOption,
  EditableCase,
  ServiceTypeOption,
} from "@/features/cases/types";

type Props = {
  caseId: string;
  clinics: ClinicOption[];
  serviceTypes: ServiceTypeOption[];
  cadDesigners: CadDesignerOption[];
  components: ComponentOption[];
  currentUserRole: string;
};

export function EditCaseDialog({
  caseId,
  clinics,
  serviceTypes,
  cadDesigners,
  components,
  currentUserRole,
}: Props) {
  const [open, setOpen] = useState(false);
  const [caseItem, setCaseItem] = useState<EditableCase | null>(null);
  const [isLoading, setIsLoading] = useState(false);

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
        clinics={clinics}
        serviceTypes={serviceTypes}
        cadDesigners={cadDesigners}
        components={components}
      />
    </>
  );
}
