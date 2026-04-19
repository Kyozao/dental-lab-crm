"use client";

import * as React from "react";
import { Loader2, Search } from "lucide-react";

import type {
  CadDesignerOption,
  ClinicOption,
  ComponentOption,
  EditableCase,
  SearchCaseItem,
  ServiceTypeOption,
} from "@/app/cases/case.shared";
import { CaseDetailsDialog } from "@/components/cases/case-details-dialog";
import {
  Command,
  CommandDialog,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
  CommandShortcut,
} from "@/components/ui/command";

type Props = {
  cases: SearchCaseItem[];
  clinics: ClinicOption[];
  serviceTypes: ServiceTypeOption[];
  cadDesigners: CadDesignerOption[];
  components: ComponentOption[];
  currentUserRole: string;
};

export function CaseSearch({
  cases,
  clinics,
  serviceTypes,
  cadDesigners,
  components,
  currentUserRole,
}: Props) {
  const [open, setOpen] = React.useState(false);
  const [detailsOpen, setDetailsOpen] = React.useState(false);
  const [selectedCase, setSelectedCase] = React.useState<EditableCase | null>(
    null,
  );
  const [loadingCaseId, setLoadingCaseId] = React.useState<string | null>(null);

  React.useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      const isCtrlSpace = event.ctrlKey && event.code === "Space";
      const isCommandSearch =
        (event.metaKey || event.ctrlKey) && event.key.toLowerCase() === "k";

      if (isCtrlSpace || isCommandSearch) {
        event.preventDefault();
        setOpen((current) => !current);
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, []);

  async function handleSelect(caseId: string) {
    try {
      setLoadingCaseId(caseId);
      const response = await fetch(`/api/cases/${caseId}`);
      const payload = (await response.json().catch(() => null)) as {
        data?: {
          id: string;
          code: string | null;
          patientName: string | null;
          caseScope: EditableCase["caseScope"];
          currentStatus: EditableCase["currentStatus"];
          teeth: string | null;
          elementsQty: number | null;
          shade: string | null;
          dueDate: string | null;
          observations: string | null;
          pendingNote: string | null;
          isUrgent: boolean;
          createdAt: string;
          updatedAt: string;
          clinic: { id: string; name: string } | null;
          dentist: { id: string; name: string } | null;
          serviceType: { id: string; name: string } | null;
          cadDesigner: { id: string; name: string | null } | null;
          attachments: Array<{
            id: string;
            fileName: string;
            filePath: string;
            fileType: string | null;
            fileSize: number | null;
            kind: EditableCase["attachments"][number]["kind"];
            retentionUntil: string | null;
            createdAt: string;
            uploadedByName: string | null;
          }>;
          components: Array<{
            id: string;
            componentId: string;
            componentName: string;
            quantity: number;
            chargeClient: boolean;
            unitCost: string | null;
            unitPrice: string | null;
            notes: string | null;
          }>;
          millings: Array<{
            id: string;
            status: "SUCCESS" | "FAILED";
            teethMilledQty: number;
            failureReason: string | null;
            notes: string | null;
            milledAt: string;
            blockTypeName: string;
            blockTypeShade: string | null;
            millingDrillName: string | null;
          }>;
        };
        error?: { message?: string } | null;
      } | null;

      if (!response.ok || !payload?.data) {
        throw new Error(
          payload?.error?.message || "Could not load case details.",
        );
      }

      const caseDetails: EditableCase = {
        id: payload.data.id,
        code: payload.data.code ?? "",
        patientName: payload.data.patientName ?? "Sem nome",
        caseScope: payload.data.caseScope,
        currentStatus: payload.data.currentStatus,
        teeth: payload.data.teeth ?? "",
        elementsQty: payload.data.elementsQty,
        shade: payload.data.shade ?? "",
        dueDate: payload.data.dueDate,
        observations: payload.data.observations ?? "",
        pendingNote: payload.data.pendingNote ?? "",
        isUrgent: payload.data.isUrgent,
        createdAt: payload.data.createdAt,
        updatedAt: payload.data.updatedAt,
        clinicName: payload.data.clinic?.name ?? "",
        clinicId: payload.data.clinic?.id ?? null,
        dentistName: payload.data.dentist?.name ?? "",
        dentistId: payload.data.dentist?.id ?? null,
        serviceTypeId: payload.data.serviceType?.id ?? null,
        serviceTypeName: payload.data.serviceType?.name ?? "",
        cadDesignerId: payload.data.cadDesigner?.id ?? null,
        cadDesignerName: payload.data.cadDesigner?.name ?? "",
        attachments: payload.data.attachments,
        components: payload.data.components,
        millings: payload.data.millings,
      };

      setSelectedCase(caseDetails);
      setOpen(false);
      setDetailsOpen(true);
    } catch (error) {
      console.error(error);
      alert(
        error instanceof Error ? error.message : "Could not load case details.",
      );
    } finally {
      setLoadingCaseId(null);
    }
  }

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="flex items-center gap-2 rounded-md border border-border/60 bg-background px-2.5 py-2 text-sm text-muted-foreground transition-colors hover:bg-accent/50 hover:text-foreground sm:px-3"
      >
        <Search className="h-4 w-4" />
        <span className="hidden sm:inline">Buscar caso</span>
        <span className="rounded border border-border/60 px-1.5 py-0.5 text-xs hidden md:inline">
          Ctrl+Space
        </span>
      </button>

      <CommandDialog
        open={open}
        onOpenChange={setOpen}
        title="Buscar caso"
        description="Procure por código ou nome do paciente"
        className="sm:max-w-2xl"
      >
        <Command shouldFilter>
          <CommandInput placeholder="Digite o código ou nome do caso..." />
          <CommandList>
            <CommandEmpty>Nenhum caso encontrado.</CommandEmpty>
            <CommandGroup heading="Casos">
              {cases.map((item) => (
                <CommandItem
                  key={item.id}
                  value={`${item.code} ${item.patientName} ${item.clinicName}`}
                  onSelect={() => void handleSelect(item.id)}
                  disabled={loadingCaseId !== null}
                >
                  <div className="min-w-0">
                    <div className="truncate font-medium">
                      {item.code || "Sem código"} - {item.patientName}
                    </div>
                    <div className="truncate text-xs text-muted-foreground">
                      {item.clinicName || "Sem clínica"}
                      {item.currentStatus
                        ? ` • ${item.currentStatus.replace(/_/g, " ")}`
                        : ""}
                    </div>
                  </div>
                  <CommandShortcut>
                    {loadingCaseId === item.id ? (
                      <Loader2 className="h-4 w-4 animate-spin" />
                    ) : (
                      "Abrir"
                    )}
                  </CommandShortcut>
                </CommandItem>
              ))}
            </CommandGroup>
          </CommandList>
        </Command>
      </CommandDialog>

      <CaseDetailsDialog
        open={detailsOpen}
        onOpenChange={setDetailsOpen}
        item={selectedCase}
        currentUserRole={currentUserRole}
        clinics={clinics}
        serviceTypes={serviceTypes}
        cadDesigners={cadDesigners}
        components={components}
      />
    </>
  );
}
