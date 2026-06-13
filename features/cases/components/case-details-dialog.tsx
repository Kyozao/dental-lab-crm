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
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
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
import { WorkflowEditor } from "@/features/workflows/components/workflow-editor";
import type { Employee } from "@/features/employees/types";

import {
  type CustomerOption,
  type CaseWorkflow,
  type CaseProcessItem,
  type ComponentOption,
  type EditableCase,
  type ProcessOption,
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
  components: ComponentOption[];
  processes: ProcessOption[];
  employees: Employee[];
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
  components,
  processes,
  employees,
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
      attachments: [],
      components: [],
      millings: [],
      processes: [],
      availableProcesses: processes,
    }),
    [customers, processes],
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
  const [selectedServiceTypeId, setSelectedServiceTypeId] = React.useState(
    caseItem.serviceTypeId ?? "",
  );
  const [workflow, setWorkflow] = React.useState<CaseWorkflow>(() =>
    buildWorkflowFromCaseProcesses(caseItem),
  );
  const [caseProcesses, setCaseProcesses] = React.useState<CaseProcessItem[]>(
    () => caseItem.processes ?? [],
  );
  const [updatingProcessId, setUpdatingProcessId] = React.useState<
    string | null
  >(null);
  const [processStatusError, setProcessStatusError] = React.useState<
    string | null
  >(null);
  const [componentRows, setComponentRows] = React.useState<
    CaseComponentDraft[]
  >(() => buildDraftFromCaseItem(caseItem));

  React.useEffect(() => {
    if (!open) return;
    setSelectedCustomerId(caseItem.customerId ?? "");
    setSelectedServiceTypeId(caseItem.serviceTypeId ?? "");
    setWorkflow(
      isCreateMode
        ? getServiceTypeWorkflow(caseItem.serviceTypeId, serviceTypes)
        : buildWorkflowFromCaseProcesses(caseItem),
    );
    setCaseProcesses(caseItem.processes ?? []);
    setProcessStatusError(null);
    setComponentRows(buildDraftFromCaseItem(caseItem));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, caseItem.id, isCreateMode]);

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

  function handleServiceTypeChange(serviceTypeId: string) {
    setSelectedServiceTypeId(serviceTypeId);
    if (isCreateMode) {
      setWorkflow(getServiceTypeWorkflow(serviceTypeId, serviceTypes));
    }
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
        payload.workflowJson = workflow;
        await casesApi.create(payload);
        await queryClient.invalidateQueries({ queryKey: casesQueryKey });
        onOpenChange(false);
        return;
      }

      await updateCaseApi(caseItem.id, payload);
      await casesApi.replaceWorkflow(caseItem.id, workflow);
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

  async function handleProcessStatusChange(
    caseProcessId: string,
    status: string,
  ) {
    if (isCreateMode) return;

    const previousProcesses = caseProcesses;

    try {
      setUpdatingProcessId(caseProcessId);
      setProcessStatusError(null);
      setCaseProcesses((currentProcesses) =>
        currentProcesses.map((process) =>
          process.id === caseProcessId
            ? {
                ...process,
                status,
                completed_at:
                  status === "COMPLETED" ? new Date().toISOString() : null,
                started_at:
                  status === "IN_PROGRESS" && !process.started_at
                    ? new Date().toISOString()
                    : process.started_at,
              }
            : process,
        ),
      );
      const updatedWorkflow = await casesApi.updateProcessStatus(
        caseProcessId,
        status,
      );
      setCaseProcesses(updatedWorkflow.processes);
      void queryClient.invalidateQueries({ queryKey: casesQueryKey });
    } catch (error) {
      console.error(error);
      setCaseProcesses(previousProcesses);
      setProcessStatusError(
        buildSubmitError(error, "Could not update task status."),
      );
    } finally {
      setUpdatingProcessId(null);
    }
  }

  async function handleProcessAssigneeChange(
    caseProcessId: string,
    assignedLabMemberId: string | null,
  ) {
    if (isCreateMode) return;

    const previousProcesses = caseProcesses;
    const employee = assignedLabMemberId
      ? employees.find(
          (currentEmployee) =>
            currentEmployee.lab_member_id === assignedLabMemberId,
        )
      : null;

    try {
      setUpdatingProcessId(caseProcessId);
      setProcessStatusError(null);
      setCaseProcesses((currentProcesses) =>
        currentProcesses.map((process) =>
          process.id === caseProcessId
            ? {
                ...process,
                assigned_lab_member_id: assignedLabMemberId,
                assignedToName: employee?.name ?? null,
              }
            : process,
        ),
      );
      const updatedWorkflow = await casesApi.updateProcessAssignee(
        caseProcessId,
        assignedLabMemberId,
      );
      setCaseProcesses(updatedWorkflow.processes);
      void queryClient.invalidateQueries({ queryKey: casesQueryKey });
    } catch (error) {
      console.error(error);
      setCaseProcesses(previousProcesses);
      setProcessStatusError(
        buildSubmitError(error, "Could not update task assignee."),
      );
    } finally {
      setUpdatingProcessId(null);
    }
  }

  function handleFormSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    void handleSubmit(event.currentTarget);
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[92vh] overflow-y-auto p-0 sm:max-w-[96vw] xl:max-w-[1180px]">
        <DialogHeader className="border-b px-6 py-5">
          <DialogTitle className="text-xl">
            {caseItem.patientName} {caseItem.code ? `- ${caseItem.code}` : ""}
          </DialogTitle>
        </DialogHeader>

        <form onSubmit={handleFormSubmit} className="grid gap-6 px-6 pb-6">
          <input type="hidden" name="id" value={caseItem.id} />
          <input
            type="hidden"
            name="componentsPayload"
            value={componentsPayload}
            readOnly
          />

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

          <Tabs defaultValue="overview" className="gap-5">
            <TabsList className="w-full justify-start overflow-x-auto">
              <TabsTrigger value="overview">Overview</TabsTrigger>
              <TabsTrigger value="workflow">Workflow</TabsTrigger>
              <TabsTrigger value="components">Components</TabsTrigger>
              <TabsTrigger value="files" disabled={isCreateMode}>
                Files
              </TabsTrigger>
              <TabsTrigger value="milling" disabled={isCreateMode}>
                Milling
              </TabsTrigger>
            </TabsList>

            {optionsLoading ? <CaseOptionsFallback /> : null}

            <TabsContent value="overview" className="grid gap-6">
              <CaseBadges caseItem={caseItem} />
              {!isCreateMode ? (
                <CaseReferenceSummary caseItem={caseItem} />
              ) : null}
              <CaseEditFieldsSection
                caseItem={caseItem}
                customers={customers}
                serviceTypes={serviceTypes}
                availableDentists={availableDentists}
                selectedCustomerId={selectedCustomerId}
                onSelectedCustomerChange={setSelectedCustomerId}
                selectedServiceTypeId={selectedServiceTypeId}
                onSelectedServiceTypeChange={handleServiceTypeChange}
                canEditAll={canEditAll}
                canEditPendingOnly={canEditPendingOnly}
                disableResourceFields={disableResourceFields}
                optionsLoading={optionsLoading}
                overdue={overdue}
                isCreateMode={isCreateMode}
              />
            </TabsContent>

            <TabsContent value="workflow">
              <WorkflowEditor
                workflow={workflow}
                processes={
                  processes.length > 0
                    ? processes
                    : (caseItem.availableProcesses ?? [])
                }
                taskItems={caseProcesses}
                assigneeOptions={employees
                  .filter((employee) => employee.is_active)
                  .map((employee) => ({
                    id: employee.lab_member_id,
                    name: employee.name,
                    processIds: employee.processes.map((process) => process.id),
                  }))}
                disabled={disableResourceFields || !canEditAll}
                statusDisabled={isCreateMode}
                assigneeDisabled={
                  isCreateMode ||
                  !["OWNER", "ADMIN", "MANAGER"].includes(currentUserRole)
                }
                updatingProcessId={updatingProcessId}
                statusError={processStatusError}
                onStatusChange={(caseProcessId, status) =>
                  void handleProcessStatusChange(caseProcessId, status)
                }
                onAssigneeChange={(caseProcessId, assignedLabMemberId) =>
                  void handleProcessAssigneeChange(
                    caseProcessId,
                    assignedLabMemberId,
                  )
                }
                onChange={setWorkflow}
              />
            </TabsContent>

            <TabsContent value="components">
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
            </TabsContent>

            <TabsContent value="files">
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
            </TabsContent>

            <TabsContent value="milling">
              {!isCreateMode ? (
                <CaseMillingSection caseItem={caseItem} />
              ) : null}
            </TabsContent>
          </Tabs>

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

function getServiceTypeWorkflow(
  serviceTypeId: string | null | undefined,
  serviceTypes: ServiceTypeOption[],
): CaseWorkflow {
  const workflow = serviceTypes.find(
    (serviceType) => serviceType.id === serviceTypeId,
  )?.workflow_json;

  return workflow ? cloneWorkflow(workflow) : { steps: [] };
}

function buildWorkflowFromCaseProcesses(caseItem: EditableCase): CaseWorkflow {
  const stepIdByCaseProcessId = new Map(
    (caseItem.processes ?? []).map((process) => [
      process.id,
      process.workflow_step_id,
    ]),
  );

  return {
    steps: (caseItem.processes ?? []).map((process) => ({
      id: process.workflow_step_id,
      process_id: process.process_id,
      dependsOn: process.dependsOnCaseProcessIds
        .map((caseProcessId) => stepIdByCaseProcessId.get(caseProcessId))
        .filter((stepId): stepId is string => Boolean(stepId)),
    })),
  };
}

function cloneWorkflow(workflow: CaseWorkflow): CaseWorkflow {
  return {
    steps: workflow.steps.map((step) => ({
      ...step,
      dependsOn: [...step.dependsOn],
    })),
  };
}
