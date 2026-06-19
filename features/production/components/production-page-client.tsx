"use client";

import { PageHeader } from "@/components/app/page-header";
import { PageShell } from "@/components/app/page-shell";
import { Panel, PanelHeader } from "@/components/app/panel";
import { Button } from "@/components/ui/button";
import { CaseDetailsDialog } from "@/features/cases/components/case-details-dialog";
import { getCaseDetailsApi } from "@/features/cases/services/cases-client";
import type {
  CustomerOption,
  EditableCase,
  ServiceTypeOption,
} from "@/features/cases/types";
import type {
  MillingWorkspace,
  ProductionProcess,
} from "@/features/production/production.types";
import { CreateProcessDialog } from "@/features/production/components/create-process-dialog";
import { MetricPills } from "@/features/production/components/metric-pills";
import { ProductionOverviewCard } from "@/features/production/components/production-overview-card";
import { ProductionProcessTable } from "@/features/production/components/production-process-table";
import { QueueDetailSection } from "@/features/production/components/queue-detail-section";
import {
  getMillingWorkspaceApi,
  getProductionProcessesApi,
} from "@/features/production/services/production-api";
import { mockComponents } from "@/lib/mock-data/pages";
import { Plus } from "lucide-react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import * as React from "react";

export function ProductionPageClient() {
  const [processes, setProcesses] = React.useState<ProductionProcess[]>([]);
  const [millingWorkspace, setMillingWorkspace] =
    React.useState<MillingWorkspace | null>(null);
  const [isLoading, setIsLoading] = React.useState(true);
  const [error, setError] = React.useState<string | null>(null);
  const [createOpen, setCreateOpen] = React.useState(false);
  const [caseDialogOpen, setCaseDialogOpen] = React.useState(false);
  const [selectedCase, setSelectedCase] = React.useState<EditableCase | null>(
    null,
  );
  const [openingCaseId, setOpeningCaseId] = React.useState<string | null>(null);
  const pathname = usePathname();
  const router = useRouter();
  const searchParams = useSearchParams();

  const requestedProcessId = searchParams.get("process");
  const selectedProcess =
    processes.find((process) => process.id === requestedProcessId) ??
    processes[0] ??
    null;

  const loadProductionData = React.useCallback(async () => {
    setIsLoading(true);
    setError(null);

    try {
      const [processData, millingData] = await Promise.all([
        getProductionProcessesApi(),
        getMillingWorkspaceApi(),
      ]);
      setProcesses(processData);
      setMillingWorkspace(millingData);
    } catch (loadError) {
      setError(
        loadError instanceof Error
          ? loadError.message
          : "Could not load production queue.",
      );
    } finally {
      setIsLoading(false);
    }
  }, []);

  React.useEffect(() => {
    void loadProductionData();
  }, [loadProductionData]);

  function selectProcess(processId: string) {
    const params = new URLSearchParams(searchParams.toString());
    params.set("process", processId);
    router.replace(`${pathname}?${params.toString()}`, { scroll: false });
  }

  function createProcess(process: ProductionProcess) {
    setProcesses((current) => [...current, process]);
    selectProcess(process.id);
  }

  async function openCase(caseId: string) {
    if (openingCaseId) return;

    try {
      setOpeningCaseId(caseId);
      const details = await getCaseDetailsApi(caseId);
      setSelectedCase(details);
      setCaseDialogOpen(true);
    } catch (caseError) {
      setError(
        caseError instanceof Error
          ? caseError.message
          : "Could not open case details.",
      );
    } finally {
      setOpeningCaseId(null);
    }
  }

  async function handleCaseDialogOpenChange(nextOpen: boolean) {
    setCaseDialogOpen(nextOpen);
    if (!nextOpen) {
      setSelectedCase(null);
      await loadProductionData();
    }
  }

  const totalQueued = processes.reduce(
    (sum, process) => sum + process.queue.length,
    0,
  );
  const rushCases = processes.reduce(
    (sum, process) =>
      sum + process.queue.filter((item) => item.priority === "urgent").length,
    0,
  );
  const totalCapacity = processes.reduce(
    (sum, process) => sum + process.capacity,
    0,
  );
  const loadPercent = totalCapacity
    ? Math.round((totalQueued / totalCapacity) * 100)
    : 0;
  const dialogCustomers = buildProductionCustomerOptions(selectedCase);
  const dialogServiceTypes = buildProductionServiceTypeOptions(selectedCase);
  const dialogProcesses = selectedCase?.availableProcesses ?? [];

  return (
    <PageShell width="wide">
      <PageHeader
        title="Production"
        description="Track active process queues and complete milling work through the milling record flow."
        actions={
          <Button type="button" onClick={() => setCreateOpen(true)}>
            <Plus className="h-4 w-4" />
            Process
          </Button>
        }
      />

      <MetricPills
        metrics={[
          { label: "Processes", value: processes.length, tone: "info" },
          { label: "Queued", value: totalQueued, tone: "neutral" },
          { label: "Rush", value: rushCases, tone: "warning" },
          { label: "Load", value: `${loadPercent}%`, tone: "success" },
        ]}
      />

      {error ? (
        <Panel>
          <div className="p-4 text-sm text-red-600 sm:p-6">{error}</div>
        </Panel>
      ) : null}

      <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_18rem]">
        <div className="grid gap-6">
          <Panel>
            <PanelHeader>
              <h2 className="text-xl font-semibold">Production processes</h2>
              <p className="text-sm text-muted-foreground">
                {isLoading
                  ? "Loading active production work."
                  : "Select a process to preview the active queue."}
              </p>
            </PanelHeader>
            <ProductionProcessTable
              processes={processes}
              selectedProcessId={selectedProcess?.id ?? ""}
              onViewQueue={selectProcess}
            />
          </Panel>

          {selectedProcess ? (
            <QueueDetailSection
              process={selectedProcess}
              millingWorkspace={millingWorkspace}
              onQueueChanged={loadProductionData}
              onOpenCase={(caseId) => void openCase(caseId)}
              openingCaseId={openingCaseId}
            />
          ) : null}
        </div>

        <ProductionOverviewCard processes={processes} />
      </div>

      <CreateProcessDialog
        open={createOpen}
        onOpenChange={setCreateOpen}
        onCreate={createProcess}
      />

      <CaseDetailsDialog
        open={caseDialogOpen}
        onOpenChange={(nextOpen) => void handleCaseDialogOpenChange(nextOpen)}
        item={selectedCase}
        currentUserRole="PRODUCTION"
        customers={dialogCustomers}
        serviceTypes={dialogServiceTypes}
        components={mockComponents}
        processes={dialogProcesses}
        employees={[]}
        optionsLoading={false}
        optionsError={null}
      />
    </PageShell>
  );
}

function buildProductionCustomerOptions(
  caseItem: EditableCase | null,
): CustomerOption[] {
  if (!caseItem?.customerId) return [];

  return [
    {
      id: caseItem.customerId,
      dentalLabId: caseItem.dentalLabId,
      labCustomerId: caseItem.labCustomerId ?? null,
      name: caseItem.customerName,
      dentists: caseItem.dentistId
        ? [
            {
              id: caseItem.dentistId,
              name: caseItem.dentistName || "Assigned dentist",
            },
          ]
        : [],
      price_table: null,
    },
  ];
}

function buildProductionServiceTypeOptions(
  caseItem: EditableCase | null,
): ServiceTypeOption[] {
  if (!caseItem) return [];

  return caseItem.serviceLines.map((serviceLine) => ({
    id: serviceLine.serviceTypeId,
    name: serviceLine.serviceTypeName,
    base_price: serviceLine.serviceBasePriceSnapshot,
    currency: caseItem.labCurrency,
    workflow_json: {
      steps: serviceLine.processes.map((process) => ({
        id: process.workflow_step_id,
        process_id: process.process_id,
        dependsOn: process.dependsOnCaseProcessIds
          .map((dependencyId) =>
            serviceLine.processes.find(
              (candidate) => candidate.id === dependencyId,
            )?.workflow_step_id,
          )
          .filter((stepId): stepId is string => Boolean(stepId)),
      })),
    },
  }));
}
