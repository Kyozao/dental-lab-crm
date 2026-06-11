"use client";

import { PageHeader } from "@/components/app/page-header";
import { PageShell } from "@/components/app/page-shell";
import { Panel, PanelHeader } from "@/components/app/panel";
import { Button } from "@/components/ui/button";
import type { ProductionProcess } from "@/features/production/production.types";
import { CreateProcessDialog } from "@/features/production/components/create-process-dialog";
import { MetricPills } from "@/features/production/components/metric-pills";
import { ProductionOverviewCard } from "@/features/production/components/production-overview-card";
import { ProductionProcessTable } from "@/features/production/components/production-process-table";
import { QueueDetailSection } from "@/features/production/components/queue-detail-section";
import { getProductionProcessesApi } from "@/features/production/services/production-api";
import { Plus } from "lucide-react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import * as React from "react";

export function ProductionPageClient() {
  const [processes, setProcesses] = React.useState<ProductionProcess[]>([]);
  const [isLoading, setIsLoading] = React.useState(true);
  const [error, setError] = React.useState<string | null>(null);
  const [createOpen, setCreateOpen] = React.useState(false);
  const pathname = usePathname();
  const router = useRouter();
  const searchParams = useSearchParams();

  const requestedProcessId = searchParams.get("process");
  const selectedProcess =
    processes.find((process) => process.id === requestedProcessId) ??
    processes[0] ??
    null;

  React.useEffect(() => {
    let active = true;

    async function loadProductionProcesses() {
      try {
        setIsLoading(true);
        setError(null);
        const data = await getProductionProcessesApi();
        if (active) setProcesses(data);
      } catch (loadError) {
        if (active) {
          setError(
            loadError instanceof Error
              ? loadError.message
              : "Could not load production queue.",
          );
        }
      } finally {
        if (active) setIsLoading(false);
      }
    }

    void loadProductionProcesses();

    return () => {
      active = false;
    };
  }, []);

  function selectProcess(processId: string) {
    const params = new URLSearchParams(searchParams.toString());
    params.set("process", processId);
    router.replace(`${pathname}?${params.toString()}`, { scroll: false });
  }

  function createProcess(process: ProductionProcess) {
    setProcesses((current) => [...current, process]);
    selectProcess(process.id);
  }

  const totalQueued = processes.reduce(
    (sum, process) => sum + process.queue.length,
    0,
  );
  const rushCases = processes.reduce(
    (sum, process) =>
      sum + process.queue.filter((item) => item.priority === "rush").length,
    0,
  );
  const totalCapacity = processes.reduce(
    (sum, process) => sum + process.capacity,
    0,
  );
  const loadPercent = totalCapacity
    ? Math.round((totalQueued / totalCapacity) * 100)
    : 0;

  return (
    <PageShell width="wide">
      <PageHeader
        title="Production"
        description="Mock production queue overview for coordinating non-milling process steps."
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
            <QueueDetailSection process={selectedProcess} />
          ) : null}
        </div>

        <ProductionOverviewCard processes={processes} />
      </div>

      <CreateProcessDialog
        open={createOpen}
        onOpenChange={setCreateOpen}
        onCreate={createProcess}
      />
    </PageShell>
  );
}
