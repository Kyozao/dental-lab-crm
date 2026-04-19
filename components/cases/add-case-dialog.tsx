"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { CaseDetailsDialog } from "@/components/cases/case-details-dialog";
import type {
  CaseScopeValue,
  CadDesignerOption,
  ClinicOption,
  ComponentOption,
  ServiceTypeOption,
} from "@/app/cases/case.shared";

type Props = {
  clinics: ClinicOption[];
  serviceTypes: ServiceTypeOption[];
  cadDesigners: CadDesignerOption[];
  components: ComponentOption[];
  currentUserRole: string;
  defaultCaseScope?: CaseScopeValue;
};

export function AddCaseDialog({
  clinics,
  serviceTypes,
  cadDesigners,
  components,
  currentUserRole,
  defaultCaseScope = "LAB",
}: Props) {
  const [open, setOpen] = useState(false);

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
        defaultCaseScope={defaultCaseScope}
        clinics={clinics}
        serviceTypes={serviceTypes}
        cadDesigners={cadDesigners}
        components={components}
      />
    </>
  );
}
