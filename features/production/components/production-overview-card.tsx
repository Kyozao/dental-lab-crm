import { Panel, PanelHeader } from "@/components/app/panel";
import type { ProductionProcess } from "@/features/production/production.types";

type ProductionOverviewCardProps = {
  processes: ProductionProcess[];
};

export function ProductionOverviewCard({ processes }: ProductionOverviewCardProps) {
  const totalQueued = processes.reduce(
    (sum, process) => sum + process.queue.length,
    0,
  );
  const totalCapacity = processes.reduce(
    (sum, process) => sum + process.capacity,
    0,
  );
  const rushCases = processes.reduce(
    (sum, process) =>
      sum + process.queue.filter((item) => item.priority === "urgent").length,
    0,
  );
  const busiestProcess = [...processes].sort(
    (a, b) => b.queue.length / b.capacity - a.queue.length / a.capacity,
  )[0];

  return (
    <Panel>
      <PanelHeader>
        <h2 className="text-lg font-semibold">Overview</h2>
      </PanelHeader>
      <div className="grid gap-4 p-4 sm:p-6">
        <OverviewStat label="Queued cases" value={totalQueued} />
        <OverviewStat label="Daily capacity" value={totalCapacity} />
        <OverviewStat label="Rush cases" value={rushCases} />
        <div className="rounded-md border border-border/50 p-3">
          <p className="text-sm text-muted-foreground">Highest load</p>
          <p className="mt-1 font-semibold">{busiestProcess?.name ?? "-"}</p>
        </div>
      </div>
    </Panel>
  );
}

function OverviewStat({
  label,
  value,
}: {
  label: string;
  value: string | number;
}) {
  return (
    <div>
      <p className="text-sm text-muted-foreground">{label}</p>
      <p className="mt-1 text-2xl font-semibold">{value}</p>
    </div>
  );
}
