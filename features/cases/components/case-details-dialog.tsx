"use client";

import * as React from "react";
import { useQueryClient } from "@tanstack/react-query";

import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { casesApi } from "@/features/cases/cases";
import { CaseComponentsSection } from "@/features/cases/components/case-components-section";
import { CaseEditFieldsSection } from "@/features/cases/components/case-edit-fields-section";
import { CaseFilesSection } from "@/features/cases/components/case-files-section";
import {
  CaseBadges,
  CaseMillingSection,
  CaseReferenceSummary,
} from "@/features/cases/components/case-summary-sections";
import {
  buildCasePayload,
  buildDefaultComponentDraft,
  buildDraftFromCaseItem,
  buildSubmitError,
  type CaseComponentDraft,
} from "@/features/cases/components/case-details-dialog.utils";
import { CaseOptionsFallback } from "@/features/cases/components/case-details-options";
import { casesQueryKey } from "@/features/cases/hooks/useCases";
import { updateCaseApi } from "@/features/cases/services/cases-client";

import {
  type CadDesignerOption,
  type CustomerOption,
  type ComponentOption,
  type EditableCase,
  type ServiceTypeOption,
} from "@/features/cases/types";

type Props = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  item?: EditableCase | null;
  mode?: "create" | "edit";
  currentUserRole: string;
  customers: CustomerOption[];
  serviceTypes: ServiceTypeOption[];
  cadDesigners: CadDesignerOption[];
  components: ComponentOption[];
  defaultCaseScope?: "LAB" | "AGENCY";
  optionsLoading?: boolean;
  optionsError?: string | null;
  onRetryOptions?: () => void;
};

export function CaseDetailsDialog({
  open,
  onOpenChange,
  item,
  mode = "edit",
  currentUserRole,
  customers,
  serviceTypes,
  cadDesigners,
  components,
  defaultCaseScope = "LAB",
  optionsLoading = false,
  optionsError = null,
  onRetryOptions,
}: Props) {
  const queryClient = useQueryClient();
  const isCreateMode = mode === "create";

  const defaultCaseItem = React.useMemo<EditableCase>(
    () => ({
      id: "",
      dentalLabId: customers[0]?.dentalLabId ?? "",
      labCustomerId: customers[0]?.labCustomerId ?? null,
      labCustomerName: "",
      code: "",
      patientName: "",
      caseScope: defaultCaseScope,
      currentStatus: "ENTRY",
      teeth: "",
      elementsQty: null,
      shade: "",
      dueDate: null,
      observations: "",
      pendingNote: "",
      isUrgent: false,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      customerName: "",
      customerId: null,
      dentistName: "",
      dentistId: null,
      serviceTypeId: null,
      serviceTypeName: "",
      cadDesignerId: null,
      cadDesignerName: "",
      attachments: [],
      components: [],
      millings: [],
    }),
    [customers, defaultCaseScope],
  );

  const caseItem = item ?? defaultCaseItem;

  const [isUploading, setIsUploading] = React.useState(false);
  const [isSaving, setIsSaving] = React.useState(false);
  const [isDeleting, setIsDeleting] = React.useState(false);
  const [deletingAttachmentId, setDeletingAttachmentId] = React.useState<
    string | null
  >(null);
  const [submitError, setSubmitError] = React.useState<string | null>(null);
  const [selectedCustomerId, setSelectedCustomerId] = React.useState(
    caseItem.customerId ?? "",
  );
  const [componentRows, setComponentRows] = React.useState<
    CaseComponentDraft[]
  >(() => buildDraftFromCaseItem(caseItem));

  React.useEffect(() => {
    if (!open) return;
    setSelectedCustomerId(caseItem.customerId ?? "");
    setComponentRows(buildDraftFromCaseItem(caseItem));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, caseItem.id]);

  const canEditAll = currentUserRole !== "CAD_DESIGNER";
  const canEditPendingOnly = currentUserRole === "CAD_DESIGNER";
  const canSelectComponents = canEditAll || canEditPendingOnly;
  const optionsReady = !optionsLoading && !optionsError;
  const disableResourceFields = !optionsReady;

  const selectedCustomer = customers.find(
    (customer) => customer.id === selectedCustomerId,
  );
  const availableDentists = selectedCustomer?.dentists ?? [];
  const overdue = isCaseOverdue(caseItem.dueDate);
  const scanAttachments = caseItem.attachments.filter(
    (attachment) => attachment.kind === "SCAN_INPUT",
  );
  const finalAttachments = caseItem.attachments.filter(
    (attachment) =>
      attachment.kind === "DESIGN_OUTPUT" || attachment.kind === "MODEL_OUTPUT",
  );
  const otherAttachments = caseItem.attachments.filter(
    (attachment) =>
      attachment.kind !== "SCAN_INPUT" &&
      attachment.kind !== "DESIGN_OUTPUT" &&
      attachment.kind !== "MODEL_OUTPUT",
  );
  const canUploadScan = canEditAll;
  const canUploadFinal = canEditAll || currentUserRole === "CAD_DESIGNER";

  const componentsPayload = React.useMemo(
    () =>
      JSON.stringify(
        componentRows
          .filter((row) => row.componentId)
          .map((row) => ({
            componentId: row.componentId,
            quantity: row.quantity,
            chargeClient: row.chargeClient,
            unitCost: row.unitCost.trim() || undefined,
            unitPrice: row.unitPrice.trim() || undefined,
            notes: row.notes.trim() || undefined,
          })),
      ),
    [componentRows],
  );

  function updateComponentRow(
    localId: string,
    updater: (row: CaseComponentDraft) => CaseComponentDraft,
  ) {
    setComponentRows((prev) =>
      prev.map((row) => (row.localId === localId ? updater(row) : row)),
    );
  }

  async function handleDelete() {
    if (!caseItem) return;

    const confirmed = window.confirm(
      `Tem certeza que deseja excluir o caso "${caseItem.patientName}"? Esta acao nao pode ser desfeita.`,
    );

    if (!confirmed) return;

    try {
      setIsDeleting(true);
      onOpenChange(false);
    } catch (error) {
      console.error(error);
      alert(error instanceof Error ? error.message : "Could not delete case.");
    } finally {
      setIsDeleting(false);
    }
  }

  async function handleFileChange(event: React.ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0];
    if (!file) return;

    try {
      setIsUploading(true);
    } catch (error) {
      console.error(error);
      alert(error instanceof Error ? error.message : "Upload failed.");
    } finally {
      setIsUploading(false);
      event.target.value = "";
    }
  }

  async function handleDownload(filePath: string) {
    const blob = new Blob([`Mock download for ${filePath}\n`], {
      type: "text/plain",
    });
    const blobUrl = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = blobUrl;
    link.download = filePath.split("/").pop() ?? "mock-file.txt";
    document.body.appendChild(link);
    link.click();
    link.remove();
    URL.revokeObjectURL(blobUrl);
  }

  async function handleDeleteAttachment(
    attachmentId: string,
    fileName: string,
  ) {
    const confirmed = window.confirm(`Delete the uploaded file "${fileName}"?`);

    if (!confirmed) return;

    try {
      setDeletingAttachmentId(attachmentId);
    } catch (error) {
      console.error(error);
      alert(error instanceof Error ? error.message : "Could not delete file.");
    } finally {
      setDeletingAttachmentId(null);
    }
  }

  async function handleSubmit(form: HTMLFormElement) {
    try {
      if (!optionsReady) return;

      setIsSaving(true);
      setSubmitError(null);
      const payload = buildCasePayload(form);

      if (isCreateMode) {
        await casesApi.create(payload);
        await queryClient.invalidateQueries({ queryKey: casesQueryKey });
        onOpenChange(false);
        return;
      }

      await updateCaseApi(caseItem.id, payload);
      await queryClient.invalidateQueries({ queryKey: casesQueryKey });
      onOpenChange(false);
    } catch (error) {
      console.error(error);
      setSubmitError(
        buildSubmitError(
          error,
          isCreateMode ? "Could not create case." : "Could not save case.",
        ),
      );
    } finally {
      setIsSaving(false);
    }
  }

  function handleFormSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    void handleSubmit(event.currentTarget);
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-3xl">
        <DialogHeader>
          <DialogTitle>
            {caseItem.patientName} {caseItem.code ? `- ${caseItem.code}` : ""}
          </DialogTitle>
        </DialogHeader>

        <form onSubmit={handleFormSubmit} className="grid gap-6">
          <input type="hidden" name="id" value={caseItem.id} />
          <input
            type="hidden"
            name="componentsPayload"
            value={componentsPayload}
            readOnly
          />

          <CaseBadges caseItem={caseItem} />
          <CaseReferenceSummary caseItem={caseItem} />

          {!isCreateMode ? <CaseMillingSection caseItem={caseItem} /> : null}

          {optionsError ? (
            <div className="flex flex-wrap items-center justify-between gap-3 rounded-md border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
              <span>{optionsError}</span>
              {onRetryOptions ? (
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={onRetryOptions}
                >
                  Retry
                </Button>
              ) : null}
            </div>
          ) : null}

          {optionsLoading ? <CaseOptionsFallback /> : null}

          <CaseEditFieldsSection
            caseItem={caseItem}
            customers={customers}
            serviceTypes={serviceTypes}
            cadDesigners={cadDesigners}
            availableDentists={availableDentists}
            selectedCustomerId={selectedCustomerId}
            onSelectedCustomerChange={setSelectedCustomerId}
            canEditAll={canEditAll}
            canEditPendingOnly={canEditPendingOnly}
            disableResourceFields={disableResourceFields}
            optionsLoading={optionsLoading}
            overdue={overdue}
            isCreateMode={isCreateMode}
          />

          <CaseComponentsSection
            rows={componentRows}
            components={components}
            canEditAll={canEditAll}
            canSelectComponents={canSelectComponents}
            onAddRow={() =>
              setComponentRows((prev) => [
                ...prev,
                buildDefaultComponentDraft(),
              ])
            }
            onRemoveRow={(localId) =>
              setComponentRows((prev) =>
                prev.filter((row) => row.localId !== localId),
              )
            }
            onUpdateRow={updateComponentRow}
          />

          {!isCreateMode ? (
            <CaseFilesSection
              scanAttachments={scanAttachments}
              finalAttachments={finalAttachments}
              otherAttachments={otherAttachments}
              canUploadScan={canUploadScan}
              canUploadFinal={canUploadFinal}
              isUploading={isUploading}
              deletingAttachmentId={deletingAttachmentId}
              onFileChange={handleFileChange}
              onDownload={handleDownload}
              onDeleteAttachment={handleDeleteAttachment}
            />
          ) : null}

          <div className="flex gap-3">
            {!isCreateMode ? (
              <Button
                type="button"
                variant="destructive"
                onClick={handleDelete}
                disabled={isDeleting || isSaving}
              >
                {isDeleting ? "Excluindo..." : "Excluir caso"}
              </Button>
            ) : null}

            <Button
              type="submit"
              disabled={isSaving || isDeleting || disableResourceFields}
            >
              {isSaving
                ? isCreateMode
                  ? "Criando..."
                  : "Salvando..."
                : isCreateMode
                  ? "Criar caso"
                  : "Salvar alteracoes"}
            </Button>
          </div>

          {submitError ? (
            <p className="text-sm text-red-600">{submitError}</p>
          ) : null}
        </form>
      </DialogContent>
    </Dialog>
  );
}

function isCaseOverdue(dueDate: string | null) {
  if (!dueDate) return false;

  const due = new Date(dueDate);
  if (Number.isNaN(due.getTime())) return false;

  const today = new Date();
  today.setHours(0, 0, 0, 0);
  due.setHours(0, 0, 0, 0);

  return due < today;
}
