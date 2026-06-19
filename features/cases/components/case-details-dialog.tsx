"use client";

import * as React from "react";
import { useQueryClient } from "@tanstack/react-query";
import { ArrowLeft, Settings2 } from "lucide-react";

import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { casesApi } from "@/features/cases/cases";
import { CaseComponentsSection } from "@/features/cases/components/case-components-section";
import { CaseEditFieldsSection } from "@/features/cases/components/case-edit-fields-section";
import { CaseFilesSection } from "@/features/cases/components/case-files-section";
import {
  buildCasePayload,
  buildDefaultComponentDraft,
  buildDefaultServiceLineDraft,
  buildDraftFromCaseItem,
  buildServiceLineDraftsFromCaseItem,
  buildSubmitError,
  type CaseComponentDraft,
  type CaseServiceLineDraft,
} from "@/features/cases/components/case-details-dialog.utils";
import { CaseOptionsFallback } from "@/features/cases/components/case-details-options";
import {
  CaseBadges,
  CaseCommentsSection,
  CaseMillingSection,
  CaseReferenceSummary,
  CaseStatusHistorySection,
} from "@/features/cases/components/case-summary-sections";
import { casesQueryKey } from "@/features/cases/hooks/useCases";
import {
  createCaseCommentApi,
  deleteCaseCommentApi,
  getCaseCommentsApi,
  updateCaseApi,
} from "@/features/cases/services/cases-client";
import { WorkflowEditor } from "@/features/workflows/components/workflow-editor";
import type { Employee } from "@/features/employees/types";
import { formatCurrency } from "@/lib/currency";

import {
  type CustomerOption,
  type CaseCommentItem,
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

type DialogView = "main" | "serviceWorkflow";

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
      currentStatus: "IN_PRODUCTION",
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
      serviceTypeName: null,
      serviceLineCount: 0,
      serviceBasePriceSnapshot: null,
      casePrice: null,
      isPriceOverridden: false,
      labCurrency: serviceTypes[0]?.currency ?? "BRL",
      attachments: [],
      components: [],
      millings: [],
      comments: [],
      statusHistory: [],
      serviceLines: [],
      processes: [],
      availableProcesses: processes,
    }),
    [customers, processes, serviceTypes],
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
  const [serviceLineRows, setServiceLineRows] = React.useState<
    CaseServiceLineDraft[]
  >(() => buildServiceLineDraftsFromCaseItem(caseItem));
  const [activeTab, setActiveTab] = React.useState("overview");
  const [selectedServiceLineLocalId, setSelectedServiceLineLocalId] =
    React.useState(serviceLineRows[0]?.localId ?? "");
  const [dialogView, setDialogView] = React.useState<DialogView>("main");
  const [comments, setComments] = React.useState<CaseCommentItem[]>(
    () => caseItem.comments ?? [],
  );
  const [selectedStatus, setSelectedStatus] = React.useState(caseItem.currentStatus);
  const [statusReason, setStatusReason] = React.useState("");
  const [standbyDialogOpen, setStandbyDialogOpen] = React.useState(false);
  const [standbyDraftReason, setStandbyDraftReason] = React.useState("");
  const [commentsError, setCommentsError] = React.useState<string | null>(null);
  const [isPostingComment, setIsPostingComment] = React.useState(false);
  const [deletingCommentId, setDeletingCommentId] = React.useState<string | null>(
    null,
  );

  React.useEffect(() => {
    if (!open) return;
    const nextServiceLineRows = buildServiceLineDraftsFromCaseItem(caseItem);
    setSelectedCustomerId(caseItem.customerId ?? "");
    setCaseProcesses(caseItem.processes ?? []);
    setProcessStatusError(null);
    setComponentRows(buildDraftFromCaseItem(caseItem));
    setServiceLineRows(nextServiceLineRows);
    setActiveTab("overview");
    setSelectedServiceLineLocalId(nextServiceLineRows[0]?.localId ?? "");
    setDialogView("main");
    setComments(caseItem.comments ?? []);
    setSelectedStatus(caseItem.currentStatus);
    setStatusReason("");
    setStandbyDialogOpen(false);
    setStandbyDraftReason("");
    setCommentsError(null);

    if (!isCreateMode && caseItem.id) {
      void loadComments(caseItem.id);
    }
  }, [open, caseItem, isCreateMode]);

  const isProductionReadOnly = currentUserRole === "PRODUCTION";
  const canEditAll = !isProductionReadOnly;
  const canSelectComponents = canEditAll;
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
  const canUploadFinal = canEditAll;

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

  const selectedServiceLine =
    serviceLineRows.find((row) => row.localId === selectedServiceLineLocalId) ??
    serviceLineRows[0] ??
    null;
  const selectedServiceLineIndex = selectedServiceLine
    ? serviceLineRows.findIndex(
        (row) => row.localId === selectedServiceLine.localId,
      )
    : -1;
  const serviceLineProcessItems = selectedServiceLine?.id
    ? caseProcesses.filter(
        (process) => process.case_service_id === selectedServiceLine.id,
      )
    : [];
  const totalServicesAmount = serviceLineRows.reduce((sum, row) => {
    const unitPrice = Number(row.unitPrice || 0);
    return sum + unitPrice * row.quantity;
  }, 0);
  const selectedServiceLineName =
    selectedServiceLine &&
    serviceTypes.find(
      (serviceType) => serviceType.id === selectedServiceLine.serviceTypeId,
    )?.name;

  const getDefaultUnitPriceForCustomer = React.useCallback(
    (customerId: string, serviceTypeId: string) => {
      const customer = customers.find((item) => item.id === customerId);
      const serviceType = serviceTypes.find((item) => item.id === serviceTypeId);
      if (!serviceType) return "";

      return (
        customer?.price_table?.service_prices.find(
          (row) => row.service_type_id === serviceTypeId,
        )?.price ??
        serviceType.base_price
      );
    },
    [customers, serviceTypes],
  );

  function updateComponentRow(
    localId: string,
    updater: (row: CaseComponentDraft) => CaseComponentDraft,
  ) {
    setComponentRows((prev) =>
      prev.map((row) => (row.localId === localId ? updater(row) : row)),
    );
  }

  function updateServiceLineRow(
    localId: string,
    updater: (row: CaseServiceLineDraft) => CaseServiceLineDraft,
  ) {
    setServiceLineRows((prev) =>
      prev.map((row) => (row.localId === localId ? updater(row) : row)),
    );
  }

  function handleServiceTypeChange(localId: string, serviceTypeId: string) {
    const serviceType = serviceTypes.find((item) => item.id === serviceTypeId);
    updateServiceLineRow(localId, (row) => ({
      ...row,
      serviceTypeId,
      unitPrice: row.isUnitPriceOverridden
        ? row.unitPrice
        : getDefaultUnitPriceForCustomer(selectedCustomerId, serviceTypeId),
      workflow: cloneWorkflow(serviceType?.workflow_json ?? { steps: [] }),
    }));
  }

  React.useEffect(() => {
    setServiceLineRows((currentRows) =>
      currentRows.map((row) =>
        row.isUnitPriceOverridden || !row.serviceTypeId
          ? row
          : {
              ...row,
              unitPrice: getDefaultUnitPriceForCustomer(
                selectedCustomerId,
                row.serviceTypeId,
              ),
            },
      ),
    );
  }, [getDefaultUnitPriceForCustomer, selectedCustomerId]);

  function handleStatusSelection(nextStatus: typeof selectedStatus) {
    if (nextStatus === selectedStatus) return;

    if (nextStatus === "STANDBY" && canEditAll) {
      setStandbyDraftReason("");
      setStandbyDialogOpen(true);
      return;
    }

    setSelectedStatus(nextStatus);
    if (nextStatus !== "STANDBY") {
      setStatusReason("");
    }
  }

  function handleStandbyDialogConfirm() {
    const trimmedReason = standbyDraftReason.trim();
    if (!trimmedReason) return;

    setSelectedStatus("STANDBY");
    setStatusReason(trimmedReason);
    setStandbyDialogOpen(false);
    setStandbyDraftReason("");
  }

  function handleStandbyDialogOpenChange(nextOpen: boolean) {
    setStandbyDialogOpen(nextOpen);
    if (!nextOpen) {
      setStandbyDraftReason("");
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
    } finally {
      setIsDeleting(false);
    }
  }

  async function handleFileChange(event: React.ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0];
    if (!file) return;

    try {
      setIsUploading(true);
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
    } finally {
      setDeletingAttachmentId(null);
    }
  }

  async function handleSubmit(form: HTMLFormElement) {
    try {
      if (!optionsReady || isProductionReadOnly) return;

      setIsSaving(true);
      setSubmitError(null);
      const payload = buildCasePayload(
        form,
        serviceLineRows,
        isCreateMode ? undefined : caseItem.currentStatus,
      );

      if (isCreateMode) {
        await casesApi.create(payload);
      } else {
        await updateCaseApi(caseItem.id, payload);
      }

      await queryClient.invalidateQueries({ queryKey: casesQueryKey });
      onOpenChange(false);
    } catch (error) {
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
      setCaseProcesses(previousProcesses);
      setProcessStatusError(
        buildSubmitError(error, "Could not update task assignee."),
      );
    } finally {
      setUpdatingProcessId(null);
    }
  }

  async function loadComments(caseId: string) {
    try {
      setCommentsError(null);
      setComments(await getCaseCommentsApi(caseId));
    } catch (error) {
      setCommentsError(buildSubmitError(error, "Could not load comments."));
    }
  }

  async function handleAddComment(body: string) {
    if (isCreateMode) return;

    try {
      setIsPostingComment(true);
      setCommentsError(null);
      const comment = await createCaseCommentApi(caseItem.id, body);
      setComments((current) => [...current, comment]);
    } catch (error) {
      setCommentsError(buildSubmitError(error, "Could not post comment."));
    } finally {
      setIsPostingComment(false);
    }
  }

  async function handleDeleteComment(commentId: string) {
    if (isCreateMode) return;

    try {
      setDeletingCommentId(commentId);
      setCommentsError(null);
      await deleteCaseCommentApi(caseItem.id, commentId);
      await loadComments(caseItem.id);
    } catch (error) {
      setCommentsError(buildSubmitError(error, "Could not delete comment."));
    } finally {
      setDeletingCommentId(null);
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
          {dialogView === "serviceWorkflow" ? (
            <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
              <div className="grid gap-1">
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  className="-ml-3 w-fit px-3"
                  onClick={() => {
                    setDialogView("main");
                    setActiveTab("services");
                  }}
                >
                  <ArrowLeft className="size-4" />
                  Back to services
                </Button>
                <DialogTitle className="text-xl">
                  {selectedServiceLineName ??
                    (selectedServiceLineIndex >= 0
                      ? `Service line ${selectedServiceLineIndex + 1}`
                      : "Service workflow")}
                </DialogTitle>
                <p className="text-sm text-muted-foreground">
                  Edit the workflow for this service line without leaving the
                  case dialog.
                </p>
              </div>
            </div>
          ) : (
            <DialogTitle className="text-xl">
              {caseItem.patientName} {caseItem.code ? `- ${caseItem.code}` : ""}
            </DialogTitle>
          )}
        </DialogHeader>

        <form onSubmit={handleFormSubmit} className="grid gap-6 px-6 pb-6">
          <input type="hidden" name="id" value={caseItem.id} />
          <input type="hidden" name="statusReason" value={statusReason} readOnly />
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

          {dialogView === "main" ? (
            <Tabs
              value={activeTab}
              onValueChange={setActiveTab}
              className="gap-5"
            >
              <TabsList className="w-full justify-start">
                <TabsTrigger value="overview">Overview</TabsTrigger>
                <TabsTrigger value="services">Services</TabsTrigger>
                <TabsTrigger value="components">Components</TabsTrigger>
                <TabsTrigger value="files" disabled={isCreateMode}>
                  Files
                </TabsTrigger>
                <TabsTrigger value="milling" disabled={isCreateMode}>
                  Milling
                </TabsTrigger>
                <TabsTrigger value="comments" disabled={isCreateMode}>
                  Comments
                </TabsTrigger>
              </TabsList>

              {optionsLoading ? <CaseOptionsFallback /> : null}

              <TabsContent value="overview" className="grid gap-6">
                <CaseBadges caseItem={caseItem} />
                {!isCreateMode ? (
                  <CaseReferenceSummary caseItem={caseItem} />
                ) : null}
                {!isCreateMode ? (
                  <CaseStatusHistorySection caseItem={caseItem} />
                ) : null}
                <p className="text-sm text-muted-foreground">
                  Services total:{" "}
                  {formatCurrency(
                    String(totalServicesAmount),
                    caseItem.labCurrency,
                  )}
                </p>
                <CaseEditFieldsSection
                  caseItem={caseItem}
                  customers={customers}
                  availableDentists={availableDentists}
                  selectedCustomerId={selectedCustomerId}
                  onSelectedCustomerChange={setSelectedCustomerId}
                  canEditAll={canEditAll}
                  disableResourceFields={disableResourceFields}
                  optionsLoading={optionsLoading}
                  overdue={overdue}
                  isCreateMode={isCreateMode}
                  selectedStatus={selectedStatus}
                  onSelectedStatusChange={handleStatusSelection}
                />
              </TabsContent>

              <TabsContent value="services" className="grid gap-4">
                <div className="flex items-center justify-between">
                  <div>
                    <h3 className="text-sm font-medium">Service lines</h3>
                    <p className="text-sm text-muted-foreground">
                      Add one or more services with quantity and optional
                      unit-price override.
                    </p>
                  </div>
                  <Button
                    type="button"
                    variant="outline"
                    onClick={() => {
                      const next = buildDefaultServiceLineDraft();
                      setServiceLineRows((prev) => [...prev, next]);
                      setSelectedServiceLineLocalId(next.localId);
                    }}
                    disabled={!canEditAll || disableResourceFields}
                  >
                    Add service
                  </Button>
                </div>

                <div className="grid gap-3">
                  {serviceLineRows.map((row, index) => {
                    const serviceType = serviceTypes.find(
                      (item) => item.id === row.serviceTypeId,
                    );
                    return (
                      <div
                        key={row.localId}
                        className="grid gap-3 rounded-lg border p-4 lg:grid-cols-[minmax(0,2.4fr)_104px_168px_132px_160px]"
                      >
                        <div className="grid gap-2">
                          <label className="text-sm font-medium">Service</label>
                          <select
                            value={row.serviceTypeId}
                            onChange={(event) =>
                              handleServiceTypeChange(
                                row.localId,
                                event.target.value,
                              )
                            }
                            disabled={!canEditAll || disableResourceFields}
                            className="flex h-10 w-full rounded-md border bg-background px-3 py-2 text-sm disabled:opacity-60"
                          >
                            <option value="">Select service</option>
                            {serviceTypes.map((serviceTypeOption) => (
                              <option
                                key={serviceTypeOption.id}
                                value={serviceTypeOption.id}
                              >
                                {serviceTypeOption.name}
                              </option>
                            ))}
                          </select>
                        </div>

                        <div className="grid gap-2">
                          <label className="text-sm font-medium">Qty</label>
                          <Input
                            type="number"
                            min={1}
                            value={row.quantity}
                            onChange={(event) =>
                              updateServiceLineRow(row.localId, (current) => ({
                                ...current,
                                quantity: Math.max(
                                  1,
                                  Number(event.target.value || 1),
                                ),
                              }))
                            }
                            disabled={!canEditAll}
                          />
                        </div>

                        <div className="grid gap-2">
                          <label className="text-sm font-medium">
                            Unit price
                          </label>
                          <Input
                            type="number"
                            min={0}
                            step="0.01"
                            value={row.unitPrice}
                            onChange={(event) =>
                              updateServiceLineRow(row.localId, (current) => ({
                                ...current,
                                unitPrice: event.target.value,
                              }))
                            }
                            disabled={!canEditAll || !row.isUnitPriceOverridden}
                          />
                        </div>

                        <div className="grid gap-2">
                          <span className="text-sm font-medium">Pricing</span>
                          <label className="flex min-h-10 items-center gap-2 rounded-md border px-3">
                            <input
                              id={`line-override-${row.localId}`}
                              type="checkbox"
                              checked={row.isUnitPriceOverridden}
                              onChange={(event) =>
                                updateServiceLineRow(
                                  row.localId,
                                  (current) => ({
                                    ...current,
                                    isUnitPriceOverridden: event.target.checked,
                                    unitPrice: event.target.checked
                                      ? current.unitPrice
                                      : getDefaultUnitPriceForCustomer(
                                          selectedCustomerId,
                                          current.serviceTypeId,
                                        ) || current.unitPrice,
                                  }),
                                )
                              }
                              disabled={!canEditAll}
                              className="h-4 w-4"
                            />
                            <span className="text-sm font-medium">
                              Override
                            </span>
                          </label>
                        </div>

                        <div className="grid gap-2 justify-items-center">
                          <span className="text-sm font-medium">Actions</span>
                          <div className="flex min-h-10 items-center justify-start gap-2 lg:justify-end">
                            <Button
                              type="button"
                              variant="outline"
                              size="icon"
                              aria-label={`Edit workflow for service line ${index + 1}`}
                              onClick={() => {
                                setSelectedServiceLineLocalId(row.localId);
                                setActiveTab("services");
                                setDialogView("serviceWorkflow");
                              }}
                            >
                              <Settings2 className="h-4 w-4" />
                            </Button>
                            <Button
                              type="button"
                              variant="destructive"
                              size="sm"
                              onClick={() => {
                                const nextRows = serviceLineRows.filter(
                                  (serviceLine) =>
                                    serviceLine.localId !== row.localId,
                                );
                                setServiceLineRows(
                                  nextRows.length > 0
                                    ? nextRows
                                    : [buildDefaultServiceLineDraft()],
                                );
                                setSelectedServiceLineLocalId(
                                  nextRows[0]?.localId ?? "",
                                );
                              }}
                              disabled={
                                !canEditAll || serviceLineRows.length === 1
                              }
                            >
                              Remove
                            </Button>
                          </div>
                        </div>

                        <div className="lg:col-span-5">
                          <p className="text-sm text-muted-foreground">
                            Line {index + 1} total:{" "}
                            {formatCurrency(
                              String(Number(row.unitPrice || 0) * row.quantity),
                              serviceType?.currency ?? caseItem.labCurrency,
                            )}
                          </p>
                        </div>
                      </div>
                    );
                  })}
                </div>
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

              <TabsContent value="comments">
                {!isCreateMode ? (
                  <CaseCommentsSection
                    comments={comments}
                    onAddComment={handleAddComment}
                    onDeleteComment={handleDeleteComment}
                    isSubmitting={isPostingComment}
                    deletingCommentId={deletingCommentId}
                    error={commentsError}
                  />
                ) : null}
              </TabsContent>
            </Tabs>
          ) : null}

          {dialogView === "serviceWorkflow" && selectedServiceLine ? (
            <section className="grid gap-4">
              <div className="rounded-lg border border-border/60 bg-muted/20 p-4">
                <p className="text-sm font-medium">
                  {selectedServiceLineName ??
                    (selectedServiceLineIndex >= 0
                      ? `Service line ${selectedServiceLineIndex + 1}`
                      : "Selected service line")}
                </p>
                <p className="text-sm text-muted-foreground">
                  Quantity {selectedServiceLine.quantity} at{" "}
                  {formatCurrency(
                    selectedServiceLine.unitPrice || "0",
                    serviceTypes.find(
                      (serviceType) =>
                        serviceType.id === selectedServiceLine.serviceTypeId,
                    )?.currency ?? caseItem.labCurrency,
                  )}
                  {selectedServiceLine.isUnitPriceOverridden
                    ? " with override enabled."
                    : "."}
                </p>
              </div>

              <WorkflowEditor
                workflow={selectedServiceLine.workflow}
                processes={
                  processes.length > 0
                    ? processes
                    : (caseItem.availableProcesses ?? [])
                }
                taskItems={serviceLineProcessItems}
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
                onChange={(workflow) =>
                  updateServiceLineRow(
                    selectedServiceLine.localId,
                    (current) => ({
                      ...current,
                      workflow,
                    }),
                  )
                }
              />
            </section>
          ) : null}

          {!isProductionReadOnly ? (
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
          ) : null}

          {submitError ? (
            <p className="text-sm text-red-600">{submitError}</p>
          ) : null}
        </form>
      </DialogContent>

      <Dialog open={standbyDialogOpen} onOpenChange={handleStandbyDialogOpenChange}>
        <DialogContent className="sm:max-w-lg">
          <DialogHeader>
            <DialogTitle>StandBy reason</DialogTitle>
            <DialogDescription>
              Enter the reason for moving this case to standby.
            </DialogDescription>
          </DialogHeader>
          <div className="grid gap-2">
            <label className="text-sm font-medium" htmlFor="standby-reason">
              Reason
            </label>
            <Textarea
              id="standby-reason"
              value={standbyDraftReason}
              onChange={(event) => setStandbyDraftReason(event.target.value)}
              placeholder="Explain why this case is being paused"
              rows={4}
            />
          </div>
          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              onClick={() => handleStandbyDialogOpenChange(false)}
            >
              Cancel
            </Button>
            <Button
              type="button"
              onClick={handleStandbyDialogConfirm}
              disabled={!standbyDraftReason.trim()}
            >
              Save reason
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
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

function cloneWorkflow(workflow: {
  steps: Array<{ id: string; process_id: string; dependsOn: string[] }>;
}) {
  return {
    steps: workflow.steps.map((step) => ({
      ...step,
      dependsOn: [...step.dependsOn],
    })),
  };
}
