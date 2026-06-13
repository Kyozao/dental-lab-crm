"use client";

import * as React from "react";
import { Loader2, Search } from "lucide-react";

import type {
  ComponentOption,
  EditableCase,
  SearchCaseItem,
} from "@/features/cases/types";
import { CaseDetailsDialog } from "@/features/cases/components/case-details-dialog";
import { useCustomers } from "@/features/cases/hooks/useCustomers";
import { useEmployees } from "@/features/cases/hooks/useEmployees";
import { useProcesses } from "@/features/cases/hooks/useProcesses";
import { useServiceTypes } from "@/features/cases/hooks/useServiceTypes";
import { getCaseDetailsApi } from "@/features/cases/services/cases-client";
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
  components: ComponentOption[];
  currentUserRole: string;
};

export function CaseSearch({
  cases,
  components,
  currentUserRole,
}: Props) {
  const [open, setOpen] = React.useState(false);
  const [detailsOpen, setDetailsOpen] = React.useState(false);
  const [selectedCase, setSelectedCase] = React.useState<EditableCase | null>(
    null,
  );
  const [loadingCaseId, setLoadingCaseId] = React.useState<string | null>(null);
  const customers = useCustomers(detailsOpen);
  const serviceTypes = useServiceTypes(detailsOpen);
  const processes = useProcesses(detailsOpen);
  const employees = useEmployees(detailsOpen);
  const optionQueries = [
    customers,
    serviceTypes,
    processes,
    employees,
  ];
  const optionsLoading = optionQueries.some(
    (query) => query.isLoading || query.isFetching,
  );
  const optionsError =
    optionQueries.find((query) => query.isError)?.error ?? null;

  function retryOptions() {
    void customers.refetch();
    void serviceTypes.refetch();
    void processes.refetch();
    void employees.refetch();
  }

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
      const caseDetails = await getCaseDetailsApi(caseId);

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
                  value={`${item.code} ${item.patientName} ${item.customerName}`}
                  onSelect={() => void handleSelect(item.id)}
                  disabled={loadingCaseId !== null}
                >
                  <div className="min-w-0">
                    <div className="truncate font-medium">
                      {item.code || "Sem código"} - {item.patientName}
                    </div>
                    <div className="truncate text-xs text-muted-foreground">
                      {item.customerName || "Sem clínica"}
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
        customers={customers.data ?? []}
        serviceTypes={serviceTypes.data ?? []}
        components={components}
        processes={processes.data ?? []}
        employees={employees.data ?? []}
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
