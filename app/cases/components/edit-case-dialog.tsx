"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { CaseDetailsDialog } from "@/app/kanban/components/case-details-dialog";
import type {
  CadDesignerOption,
  ClinicOption,
  ComponentOption,
  EditableCase,
  ServiceTypeOption,
} from "../case.shared";

type Props = {
  caseItem: EditableCase;
  clinics: ClinicOption[];
  serviceTypes: ServiceTypeOption[];
  cadDesigners: CadDesignerOption[];
  components: ComponentOption[];
  currentUserRole: string;
};

export function EditCaseDialog({
  caseItem,
  clinics,
  serviceTypes,
  cadDesigners,
  components,
  currentUserRole,
}: Props) {
  const [open, setOpen] = useState(false);

  return (
    <>
      <Button
        type="button"
        variant="outline"
        size="sm"
        onClick={() => setOpen(true)}
      >
        Edit
      </Button>

      <CaseDetailsDialog
        open={open}
        onOpenChange={setOpen}
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
