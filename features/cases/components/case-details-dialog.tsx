"use client";

import * as React from "react";
import { Download, Paperclip, Trash2 } from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";

import {
  CASE_STATUS_OPTIONS,
  type AttachmentKindValue,
  type CadDesignerOption,
  type ClinicOption,
  type ComponentOption,
  type EditableCase,
  type ServiceTypeOption,
} from "@/features/cases/types";
import { isCaseOverdue } from "@/features/kanban/shared";

type Props = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  item?: EditableCase | null;
  mode?: "create" | "edit";
  currentUserRole: string;
  clinics: ClinicOption[];
  serviceTypes: ServiceTypeOption[];
  cadDesigners: CadDesignerOption[];
  components: ComponentOption[];
  defaultCaseScope?: "LAB" | "AGENCY";
};

type CaseComponentDraft = {
  localId: string;
  componentId: string;
  quantity: number;
  chargeClient: boolean;
  unitCost: string;
  unitPrice: string;
  notes: string;
};

function toDecimalInputValue(value: string | null) {
  return value ?? "";
}

function buildDefaultComponentDraft(): CaseComponentDraft {
  return {
    localId: crypto.randomUUID(),
    componentId: "",
    quantity: 1,
    chargeClient: true,
    unitCost: "",
    unitPrice: "",
    notes: "",
  };
}

function buildDraftFromCaseItem(item: EditableCase): CaseComponentDraft[] {
  return item.components.map((component) => ({
    localId: component.id,
    componentId: component.componentId,
    quantity: component.quantity,
    chargeClient: component.chargeClient,
    unitCost: toDecimalInputValue(component.unitCost),
    unitPrice: toDecimalInputValue(component.unitPrice),
    notes: component.notes ?? "",
  }));
}

function formatBytes(bytes: number | null) {
  if (!bytes) return "—";
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

function toDateInputValue(date: string | null) {
  if (!date) return "";
  const parsed = new Date(date);
  if (Number.isNaN(parsed.getTime())) return "";
  const year = parsed.getFullYear();
  const month = String(parsed.getMonth() + 1).padStart(2, "0");
  const day = String(parsed.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

function formatDateTime(value: string) {
  return new Intl.DateTimeFormat("pt-BR", {
    dateStyle: "short",
    timeStyle: "short",
  }).format(new Date(value));
}

function getAttachmentKindLabel(kind: AttachmentKindValue) {
  switch (kind) {
    case "SCAN_INPUT":
      return "Scan";
    case "DESIGN_OUTPUT":
    case "MODEL_OUTPUT":
      return "Final";
    default:
      return "Arquivo";
  }
}

export function CaseDetailsDialog({
  open,
  onOpenChange,
  item,
  mode = "edit",
  currentUserRole,
  clinics,
  serviceTypes,
  cadDesigners,
  components,
  defaultCaseScope = "LAB",
}: Props) {
  const isCreateMode = mode === "create";

  const defaultCaseItem = React.useMemo<EditableCase>(
    () => ({
      id: "",
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
      clinicName: "",
      clinicId: null,
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
    [defaultCaseScope],
  );

  const caseItem = item ?? defaultCaseItem;

  const [isUploading, setIsUploading] = React.useState(false);
  const [isSaving, setIsSaving] = React.useState(false);
  const [isDeleting, setIsDeleting] = React.useState(false);
  const [deletingAttachmentId, setDeletingAttachmentId] = React.useState<
    string | null
  >(null);
  const [submitError, setSubmitError] = React.useState<string | null>(null);
  const [selectedClinicId, setSelectedClinicId] = React.useState(
    caseItem?.clinicId ?? "",
  );
  const [componentRows, setComponentRows] = React.useState<
    CaseComponentDraft[]
  >(() => buildDraftFromCaseItem(caseItem));

  // We intentionally depend on `caseItem.id` and `open` instead of the full
  // `caseItem` object to avoid resetting state on every render.
  React.useEffect(() => {
    if (!open) return;
    setSelectedClinicId(caseItem?.clinicId ?? "");
    setComponentRows(buildDraftFromCaseItem(caseItem));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, caseItem.id]);

  const canEditAll = currentUserRole !== "CAD_DESIGNER";
  const canEditPendingOnly = currentUserRole === "CAD_DESIGNER";
  const canSelectComponents = canEditAll || canEditPendingOnly;

  const selectedClinic = clinics.find(
    (clinic) => clinic.id === selectedClinicId,
  );
  const availableDentists = selectedClinic?.dentists ?? [];
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

  function handleComponentSelected(localId: string, componentId: string) {
    const component = components.find((item) => item.id === componentId);

    updateComponentRow(localId, (row) => ({
      ...row,
      componentId,
      unitCost: canEditAll
        ? row.unitCost || component?.defaultCost || ""
        : row.unitCost,
      unitPrice: canEditAll
        ? row.unitPrice || component?.defaultPrice || ""
        : row.unitPrice,
    }));
  }

  function handleAddComponentRow() {
    setComponentRows((prev) => [...prev, buildDefaultComponentDraft()]);
  }

  function handleRemoveComponentRow(localId: string) {
    setComponentRows((prev) => prev.filter((row) => row.localId !== localId));
  }

  async function handleDelete() {
    if (!caseItem) return;

    const confirmed = window.confirm(
      `Tem certeza que deseja excluir o caso "${caseItem.patientName}"? Esta ação não pode ser desfeita.`,
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

  async function handleSubmit() {
    try {
      setIsSaving(true);
      setSubmitError(null);

      if (isCreateMode) {
        onOpenChange(false);
        return;
      }

      onOpenChange(false);
    } catch (error) {
      console.error(error);
      setSubmitError(
        error instanceof Error
          ? error.message
          : isCreateMode
            ? "Could not create case."
            : "Could not save case.",
      );
      alert(
        error instanceof Error
          ? error.message
          : isCreateMode
            ? "Could not create case."
            : "Could not save case.",
      );
    } finally {
      setIsSaving(false);
    }
  }

  function handleFormSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    void handleSubmit();
  }

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

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-3xl">
        <DialogHeader>
          <DialogTitle>
            {caseItem.patientName} {caseItem.code ? `— ${caseItem.code}` : ""}
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

          <div className="flex flex-wrap gap-2">
            <Badge variant="secondary">{caseItem.currentStatus}</Badge>
            {caseItem.isUrgent ? (
              <Badge variant="destructive">Urgente</Badge>
            ) : null}
            {caseItem.pendingNote ? (
              <Badge variant="outline">Pendente</Badge>
            ) : null}
          </div>

          <div className="grid gap-3 rounded-xl border p-4 text-sm sm:grid-cols-2 lg:grid-cols-3">
            <div>
              <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
                Clínica
              </p>
              <p>{caseItem.clinicName || "Sem clínica"}</p>
            </div>
            <div>
              <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
                Dentista
              </p>
              <p>{caseItem.dentistName || "Sem dentista"}</p>
            </div>
            <div>
              <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
                Serviço
              </p>
              <p>{caseItem.serviceTypeName || "Sem tipo"}</p>
            </div>
            <div>
              <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
                CADista
              </p>
              <p>{caseItem.cadDesignerName || "Não atribuído"}</p>
            </div>
            <div>
              <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
                Criado em
              </p>
              <p>{formatDateTime(caseItem.createdAt)}</p>
            </div>
            <div>
              <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
                Atualizado em
              </p>
              <p>{formatDateTime(caseItem.updatedAt)}</p>
            </div>
          </div>

          {!isCreateMode ? (
            <div className="rounded-xl border p-4">
              <div className="mb-3">
                <p className="font-medium">Fresagem</p>
                <p className="text-sm text-muted-foreground">
                  Histórico de produção deste caso.
                </p>
              </div>

              {caseItem.millings.length === 0 ? (
                <div className="text-sm text-muted-foreground">
                  Nenhum registro de fresagem.
                </div>
              ) : (
                <div className="space-y-3">
                  {caseItem.millings.map((milling) => (
                    <div
                      key={milling.id}
                      className="rounded-lg border p-3 text-sm"
                    >
                      <div className="mb-2 flex flex-wrap items-center gap-2">
                        <p className="font-medium">{milling.blockTypeName}</p>
                        <Badge
                          variant={
                            milling.status === "SUCCESS"
                              ? "secondary"
                              : "destructive"
                          }
                        >
                          {milling.status === "SUCCESS" ? "Sucesso" : "Falhou"}
                        </Badge>
                        {milling.blockTypeShade ? (
                          <Badge variant="outline">
                            {milling.blockTypeShade}
                          </Badge>
                        ) : null}
                      </div>

                      <div className="grid gap-2 text-sm text-muted-foreground sm:grid-cols-2 lg:grid-cols-3">
                        <div>
                          <span className="font-medium text-foreground">
                            Dentes fresados:
                          </span>{" "}
                          {milling.teethMilledQty}
                        </div>
                        <div>
                          <span className="font-medium text-foreground">
                            Broca:
                          </span>{" "}
                          {milling.millingDrillName ?? "-"}
                        </div>
                        <div>
                          <span className="font-medium text-foreground">
                            Data:
                          </span>{" "}
                          {formatDateTime(milling.milledAt)}
                        </div>
                      </div>

                      {milling.failureReason ? (
                        <p className="mt-2 text-sm text-red-600">
                          Motivo da falha: {milling.failureReason}
                        </p>
                      ) : null}

                      {milling.notes ? (
                        <p className="mt-2 text-sm text-muted-foreground">
                          Notas: {milling.notes}
                        </p>
                      ) : null}
                    </div>
                  ))}
                </div>
              )}
            </div>
          ) : null}

          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-2">
              <label className="text-sm font-medium">Código</label>
              <input
                name="code"
                defaultValue={caseItem.code}
                disabled={!canEditAll}
                className="flex h-10 w-full rounded-md border bg-background px-3 py-2 text-sm disabled:opacity-60"
              />
            </div>

            <div className="space-y-2">
              <label className="text-sm font-medium">Paciente</label>
              <input
                name="patientName"
                defaultValue={caseItem.patientName}
                disabled={!canEditAll}
                className="flex h-10 w-full rounded-md border bg-background px-3 py-2 text-sm disabled:opacity-60"
              />
            </div>

            <div className="space-y-2">
              <label className="text-sm font-medium">Clínica</label>
              <select
                name="clinicId"
                value={selectedClinicId}
                onChange={(e) => setSelectedClinicId(e.target.value)}
                disabled={!canEditAll}
                className="flex h-10 w-full rounded-md border bg-background px-3 py-2 text-sm disabled:opacity-60"
              >
                <option value="">Sem clínica</option>
                {clinics.map((clinic) => (
                  <option key={clinic.id} value={clinic.id}>
                    {clinic.name}
                  </option>
                ))}
              </select>
            </div>

            <div className="space-y-2">
              <label className="text-sm font-medium">Dentista</label>
              <select
                key={selectedClinicId}
                name="dentistId"
                defaultValue={
                  availableDentists.some(
                    (dentist) => dentist.id === caseItem.dentistId,
                  )
                    ? (caseItem.dentistId ?? "")
                    : ""
                }
                disabled={!canEditAll}
                className="flex h-10 w-full rounded-md border bg-background px-3 py-2 text-sm disabled:opacity-60"
              >
                <option value="">Sem dentista</option>
                {availableDentists.map((dentist) => (
                  <option key={dentist.id} value={dentist.id}>
                    {dentist.name}
                  </option>
                ))}
              </select>
            </div>

            <div className="space-y-2">
              <label className="text-sm font-medium">Tipo de serviço</label>
              <select
                name="serviceTypeId"
                defaultValue={caseItem.serviceTypeId ?? ""}
                disabled={!canEditAll}
                className="flex h-10 w-full rounded-md border bg-background px-3 py-2 text-sm disabled:opacity-60"
              >
                <option value="">Sem tipo</option>
                {serviceTypes.map((serviceType) => (
                  <option key={serviceType.id} value={serviceType.id}>
                    {serviceType.name}
                  </option>
                ))}
              </select>
            </div>

            <div className="space-y-2">
              <label className="text-sm font-medium">CADista</label>
              <select
                name="cadDesignerId"
                defaultValue={caseItem.cadDesignerId ?? ""}
                disabled={!canEditAll}
                className="flex h-10 w-full rounded-md border bg-background px-3 py-2 text-sm disabled:opacity-60"
              >
                <option value="">Não atribuído</option>
                {cadDesigners.map((designer) => (
                  <option key={designer.id} value={designer.id}>
                    {designer.name ?? "Sem nome"}
                  </option>
                ))}
              </select>
            </div>
            <div className="space-y-2">
              <label className="text-sm font-medium">Status</label>
              <select
                name="currentStatus"
                defaultValue={caseItem.currentStatus}
                disabled={!canEditAll}
                className="flex h-10 w-full rounded-md border bg-background px-3 py-2 text-sm disabled:opacity-60"
              >
                {CASE_STATUS_OPTIONS.map((status) => (
                  <option key={status.value} value={status.value}>
                    {status.label}
                  </option>
                ))}
              </select>
            </div>

            <div className="space-y-2">
              <label className="text-sm font-medium">Dentes</label>
              <input
                name="teeth"
                defaultValue={caseItem.teeth}
                disabled={!canEditAll}
                className="flex h-10 w-full rounded-md border bg-background px-3 py-2 text-sm disabled:opacity-60"
              />
            </div>

            <div className="space-y-2">
              <label className="text-sm font-medium">Nº de elementos</label>
              <input
                name="elementsQty"
                type="number"
                min={1}
                defaultValue={caseItem.elementsQty ?? ""}
                disabled={!canEditAll}
                className="flex h-10 w-full rounded-md border bg-background px-3 py-2 text-sm disabled:opacity-60"
              />
            </div>

            <div className="space-y-2">
              <label className="text-sm font-medium">Cor</label>
              <input
                name="shade"
                defaultValue={caseItem.shade}
                disabled={!canEditAll}
                className="flex h-10 w-full rounded-md border bg-background px-3 py-2 text-sm disabled:opacity-60"
              />
            </div>

            <div className="space-y-2">
              <label className="text-sm font-medium">Prazo</label>
              <input
                name="dueDate"
                type="date"
                defaultValue={toDateInputValue(caseItem.dueDate)}
                disabled={!canEditAll}
                className="flex h-10 w-full rounded-md border bg-background px-3 py-2 text-sm disabled:opacity-60"
              />
              {overdue ? (
                <p className="text-xs text-red-500">Prazo atrasado</p>
              ) : null}
            </div>

            <div className="flex items-end gap-2">
              <input
                id={`urgent-${caseItem.id}`}
                name="isUrgent"
                type="checkbox"
                defaultChecked={caseItem.isUrgent}
                disabled={!canEditAll}
                className="h-4 w-4"
              />
              <label
                htmlFor={`urgent-${caseItem.id}`}
                className="text-sm font-medium"
              >
                Urgente
              </label>
            </div>
          </div>

          <div className="space-y-2">
            <label className="text-sm font-medium">Pendência</label>
            <textarea
              name="pendingNote"
              defaultValue={caseItem.pendingNote}
              disabled={!(canEditAll || canEditPendingOnly)}
              className="min-h-25 w-full rounded-md border bg-background px-3 py-2 text-sm disabled:opacity-60"
            />
          </div>

          <div className="space-y-2">
            <label className="text-sm font-medium">Observações</label>
            <textarea
              name="observations"
              defaultValue={caseItem.observations}
              disabled={!canEditAll}
              className="min-h-30 w-full rounded-md border bg-background px-3 py-2 text-sm disabled:opacity-60"
            />
          </div>

          <div className="rounded-xl border p-4">
            <div className="mb-4 flex items-center justify-between gap-3">
              <div>
                <p className="font-medium">Componentes do caso</p>
                <p className="text-sm text-muted-foreground">
                  {canEditAll
                    ? "Defina o que foi usado e o que deve ser cobrado da clínica."
                    : "Selecione os componentes usados neste caso."}
                </p>
              </div>

              {canSelectComponents ? (
                <Button
                  type="button"
                  variant="outline"
                  onClick={handleAddComponentRow}
                >
                  Adicionar componente
                </Button>
              ) : null}
            </div>

            {componentRows.length === 0 ? (
              <div className="rounded-md border border-dashed px-4 py-3 text-sm text-muted-foreground">
                Nenhum componente adicionado.
              </div>
            ) : (
              <div className="space-y-4">
                {componentRows.map((row, index) => (
                  <div key={row.localId} className="rounded-lg border p-3">
                    <div className="mb-3 flex items-center justify-between gap-3">
                      <p className="text-sm font-medium">Item #{index + 1}</p>

                      {canSelectComponents ? (
                        <Button
                          type="button"
                          variant="ghost"
                          size="sm"
                          onClick={() => handleRemoveComponentRow(row.localId)}
                        >
                          Remover
                        </Button>
                      ) : null}
                    </div>

                    <div className="grid gap-3 md:grid-cols-2">
                      <div className="space-y-2 md:col-span-2">
                        <label className="text-sm font-medium">
                          Componente
                        </label>
                        <select
                          value={row.componentId}
                          onChange={(event) =>
                            handleComponentSelected(
                              row.localId,
                              event.target.value,
                            )
                          }
                          disabled={!canSelectComponents}
                          className="flex h-10 w-full rounded-md border bg-background px-3 py-2 text-sm disabled:opacity-60"
                        >
                          <option value="">Selecione</option>
                          {components.map((component) => (
                            <option key={component.id} value={component.id}>
                              {component.name}
                            </option>
                          ))}
                        </select>
                      </div>

                      {canEditAll ? (
                        <>
                          <div className="space-y-2">
                            <label className="text-sm font-medium">
                              Quantidade
                            </label>
                            <input
                              type="number"
                              min={1}
                              value={row.quantity}
                              onChange={(event) => {
                                const parsed = Number(event.target.value);
                                updateComponentRow(row.localId, (current) => ({
                                  ...current,
                                  quantity:
                                    Number.isInteger(parsed) && parsed > 0
                                      ? parsed
                                      : 1,
                                }));
                              }}
                              disabled={!canEditAll}
                              className="flex h-10 w-full rounded-md border bg-background px-3 py-2 text-sm disabled:opacity-60"
                            />
                          </div>

                          <div className="space-y-2">
                            <label className="text-sm font-medium">
                              Cobrar da clínica
                            </label>
                            <div className="flex h-10 items-center gap-2 rounded-md border bg-background px-3 py-2">
                              <input
                                type="checkbox"
                                checked={row.chargeClient}
                                onChange={(event) =>
                                  updateComponentRow(
                                    row.localId,
                                    (current) => ({
                                      ...current,
                                      chargeClient: event.target.checked,
                                    }),
                                  )
                                }
                                disabled={!canEditAll}
                                className="h-4 w-4"
                              />
                              <span className="text-sm">
                                Incluir na cobrança
                              </span>
                            </div>
                          </div>

                          <div className="space-y-2">
                            <label className="text-sm font-medium">
                              Custo unitário
                            </label>
                            <input
                              type="number"
                              step="0.01"
                              min={0}
                              value={row.unitCost}
                              onChange={(event) =>
                                updateComponentRow(row.localId, (current) => ({
                                  ...current,
                                  unitCost: event.target.value,
                                }))
                              }
                              disabled={!canEditAll}
                              className="flex h-10 w-full rounded-md border bg-background px-3 py-2 text-sm disabled:opacity-60"
                            />
                          </div>

                          <div className="space-y-2">
                            <label className="text-sm font-medium">
                              Preço unitário
                            </label>
                            <input
                              type="number"
                              step="0.01"
                              min={0}
                              value={row.unitPrice}
                              onChange={(event) =>
                                updateComponentRow(row.localId, (current) => ({
                                  ...current,
                                  unitPrice: event.target.value,
                                }))
                              }
                              disabled={!canEditAll}
                              className="flex h-10 w-full rounded-md border bg-background px-3 py-2 text-sm disabled:opacity-60"
                            />
                          </div>

                          <div className="space-y-2 md:col-span-2">
                            <label className="text-sm font-medium">
                              Observações do item
                            </label>
                            <textarea
                              value={row.notes}
                              onChange={(event) =>
                                updateComponentRow(row.localId, (current) => ({
                                  ...current,
                                  notes: event.target.value,
                                }))
                              }
                              disabled={!canEditAll}
                              className="min-h-20 w-full rounded-md border bg-background px-3 py-2 text-sm disabled:opacity-60"
                            />
                          </div>
                        </>
                      ) : null}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          {!isCreateMode ? (
            <div className="rounded-xl border p-4">
              <div className="mb-4">
                <p className="font-medium">Arquivos do caso</p>
                <p className="text-sm text-muted-foreground">
                  Primeiro envie o scan compactado, depois o CAD envia o arquivo
                  final `.zip`/`.rar`. O histórico fica disponível por pelo
                  menos 90 dias.
                </p>
              </div>

              <div className="grid gap-4 lg:grid-cols-2">
                <div className="rounded-lg border p-3">
                  <div className="mb-3 flex items-start justify-between gap-3">
                    <div>
                      <p className="font-medium">1. Scan do caso</p>
                      <p className="text-xs text-muted-foreground">
                        Envie o scan em `.zip`, `.rar` ou `.7z`.
                      </p>
                    </div>

                    {canUploadScan ? (
                      <label className="inline-flex cursor-pointer items-center gap-2 rounded-md border px-3 py-2 text-sm">
                        <Paperclip className="h-4 w-4" />
                        {isUploading ? "Enviando..." : "Enviar scan"}
                        <input
                          type="file"
                          accept=".zip,.rar,.7z"
                          className="hidden"
                          onChange={handleFileChange}
                          disabled={isUploading}
                        />
                      </label>
                    ) : null}
                  </div>

                  <AttachmentList
                    attachments={scanAttachments}
                    emptyMessage="Nenhum scan enviado ainda."
                    onDownload={handleDownload}
                    onDelete={handleDeleteAttachment}
                    deletingAttachmentId={deletingAttachmentId}
                    canDelete={canUploadFinal}
                  />
                </div>

                <div className="rounded-lg border p-3">
                  <div className="mb-3 flex items-start justify-between gap-3">
                    <div>
                      <p className="font-medium">2. Arquivo final</p>
                      <p className="text-xs text-muted-foreground">
                        Envie a entrega final em `.zip`, `.rar` ou `.7z`.
                      </p>
                    </div>

                    {canUploadFinal ? (
                      <label className="inline-flex cursor-pointer items-center gap-2 rounded-md border px-3 py-2 text-sm">
                        <Paperclip className="h-4 w-4" />
                        {isUploading ? "Enviando..." : "Enviar final"}
                        <input
                          type="file"
                          accept=".zip,.rar,.7z"
                          className="hidden"
                          onChange={handleFileChange}
                          disabled={isUploading}
                        />
                      </label>
                    ) : null}
                  </div>

                  <AttachmentList
                    attachments={finalAttachments}
                    emptyMessage="Nenhum arquivo final enviado ainda."
                    onDownload={handleDownload}
                    onDelete={handleDeleteAttachment}
                    deletingAttachmentId={deletingAttachmentId}
                    canDelete={canUploadFinal}
                  />
                </div>
              </div>

              {otherAttachments.length > 0 ? (
                <div className="mt-4 rounded-lg border p-3">
                  <div className="mb-3">
                    <p className="font-medium">Outros anexos</p>
                    <p className="text-xs text-muted-foreground">
                      Arquivos extras vinculados ao caso.
                    </p>
                  </div>

                  <AttachmentList
                    attachments={otherAttachments}
                    emptyMessage="Sem anexos extras."
                    onDownload={handleDownload}
                    onDelete={handleDeleteAttachment}
                    deletingAttachmentId={deletingAttachmentId}
                    canDelete={canUploadFinal}
                  />
                </div>
              ) : null}
            </div>
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

            <Button type="submit" disabled={isSaving || isDeleting}>
              {isSaving
                ? isCreateMode
                  ? "Criando..."
                  : "Salvando..."
                : isCreateMode
                  ? "Criar caso"
                  : "Salvar alterações"}
            </Button>
          </div>

          {submitError ? (
            <p className="text-sm text-red-600">{submitError}</p>
          ) : null}
        </form>{" "}
      </DialogContent>
    </Dialog>
  );
}

function AttachmentList({
  attachments,
  emptyMessage,
  onDownload,
  onDelete,
  deletingAttachmentId,
  canDelete,
}: {
  attachments: EditableCase["attachments"];
  emptyMessage: string;
  onDownload: (filePath: string) => void | Promise<void>;
  onDelete: (attachmentId: string, fileName: string) => void | Promise<void>;
  deletingAttachmentId: string | null;
  canDelete: boolean;
}) {
  if (attachments.length === 0) {
    return <div className="text-sm text-muted-foreground">{emptyMessage}</div>;
  }

  return (
    <div className="space-y-3">
      {attachments.map((attachment) => (
        <div
          key={attachment.id}
          className="flex items-center justify-between gap-3 rounded-lg border p-3"
        >
          <div className="min-w-0">
            <div className="mb-1 flex flex-wrap items-center gap-2">
              <div className="truncate font-medium">{attachment.fileName}</div>
              <Badge variant="outline">
                {getAttachmentKindLabel(attachment.kind)}
              </Badge>
            </div>
            <div className="text-xs text-muted-foreground">
              {attachment.fileType || "arquivo"} •{" "}
              {formatBytes(attachment.fileSize)} •{" "}
              {new Intl.DateTimeFormat("pt-BR").format(
                new Date(attachment.createdAt),
              )}
              {attachment.retentionUntil
                ? ` • histórico até ${new Intl.DateTimeFormat("pt-BR").format(new Date(attachment.retentionUntil))}`
                : ""}
              {attachment.uploadedByName
                ? ` • ${attachment.uploadedByName}`
                : ""}
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => void onDownload(attachment.filePath)}
            >
              <Download className="mr-2 h-4 w-4" />
              Baixar
            </Button>

            {canDelete ? (
              <Button
                type="button"
                variant="destructive"
                size="sm"
                onClick={() =>
                  void onDelete(attachment.id, attachment.fileName)
                }
                disabled={deletingAttachmentId === attachment.id}
              >
                <Trash2 className="mr-2 h-4 w-4" />
                {deletingAttachmentId === attachment.id
                  ? "Excluindo..."
                  : "Excluir"}
              </Button>
            ) : null}
          </div>
        </div>
      ))}
    </div>
  );
}
