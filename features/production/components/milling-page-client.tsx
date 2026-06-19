"use client";

import * as React from "react";
import {
  AlertTriangle,
  CheckCircle2,
  Drill,
  History,
  Loader2,
  RefreshCw,
  TriangleAlert,
  Wrench,
} from "lucide-react";
import Link from "next/link";

import { EmptyState } from "@/components/app/empty-state";
import { PageHeader } from "@/components/app/page-header";
import { PageShell } from "@/components/app/page-shell";
import { Panel, PanelHeader } from "@/components/app/panel";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
} from "@/components/ui/tabs";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { MillingDialog } from "@/features/production/components/milling-dialog";
import { MillingDrillDialog } from "@/features/production/components/milling-drill-dialog";
import { MillingMachineDialog } from "@/features/production/components/milling-machine-dialog";
import type {
  MillingDrillInventoryRow,
  MillingMachineInventoryRow,
  MillingWorkspace,
} from "@/features/production/production.types";
import { getMillingWorkspaceApi } from "@/features/production/services/production-api";

type ActiveTab = "overview" | "tasks" | "inventory";

export function MillingPageClient() {
  const [workspace, setWorkspace] = React.useState<MillingWorkspace | null>(null);
  const [activeTab, setActiveTab] = React.useState<ActiveTab>("overview");
  const [isLoading, setIsLoading] = React.useState(true);
  const [error, setError] = React.useState<string | null>(null);
  const [machineDialogOpen, setMachineDialogOpen] = React.useState(false);
  const [editingMachine, setEditingMachine] =
    React.useState<MillingMachineInventoryRow | null>(null);
  const [drillDialogOpen, setDrillDialogOpen] = React.useState(false);
  const [editingDrill, setEditingDrill] =
    React.useState<MillingDrillInventoryRow | null>(null);

  const loadWorkspace = React.useCallback(async () => {
    setIsLoading(true);
    setError(null);

    try {
      const data = await getMillingWorkspaceApi();
      setWorkspace(data);
    } catch (loadError) {
      setError(
        loadError instanceof Error
          ? loadError.message
          : "Could not load milling workspace.",
      );
    } finally {
      setIsLoading(false);
    }
  }, []);

  React.useEffect(() => {
    void loadWorkspace();
  }, [loadWorkspace]);

  return (
    <PageShell width="wide">
      <PageHeader
        title="Milling"
        description="Run the milling department from one workspace: monitor exceptions, complete queued work, and manage machines and drills."
        actions={
          <Button
            type="button"
            variant="outline"
            onClick={() => void loadWorkspace()}
            disabled={isLoading}
          >
            <RefreshCw className={isLoading ? "h-4 w-4 animate-spin" : "h-4 w-4"} />
            Refresh
          </Button>
        }
      />

      <MillingMachineDialog
        machine={editingMachine}
        open={machineDialogOpen}
        onOpenChange={(open) => {
          setMachineDialogOpen(open);
          if (!open) setEditingMachine(null);
        }}
        onSaved={loadWorkspace}
      />

      <MillingDrillDialog
        drill={editingDrill}
        machines={workspace?.machines ?? []}
        open={drillDialogOpen}
        onOpenChange={(open) => {
          setDrillDialogOpen(open);
          if (!open) setEditingDrill(null);
        }}
        onSaved={loadWorkspace}
      />

      {error ? (
        <Panel>
          <div className="p-4 text-sm text-red-600 sm:p-6">{error}</div>
        </Panel>
      ) : null}

      <Tabs
        value={activeTab}
        onValueChange={(value) => setActiveTab(value as ActiveTab)}
        className="gap-4"
      >
        <TabsList variant="line" className="w-full justify-start">
          <TabsTrigger value="overview">Overview</TabsTrigger>
          <TabsTrigger value="tasks">Tasks</TabsTrigger>
          <TabsTrigger value="inventory">Inventory</TabsTrigger>
        </TabsList>

        <TabsContent value="overview" className="space-y-4">
          <OverviewTab workspace={workspace} isLoading={isLoading} />
        </TabsContent>

        <TabsContent value="tasks" className="space-y-4">
          <TasksTab workspace={workspace} isLoading={isLoading} onRefresh={loadWorkspace} />
        </TabsContent>

        <TabsContent value="inventory" className="space-y-4">
          <InventoryTab
            workspace={workspace}
            isLoading={isLoading}
            onAddMachine={() => {
              setEditingMachine(null);
              setMachineDialogOpen(true);
            }}
            onEditMachine={(machine) => {
              setEditingMachine(machine);
              setMachineDialogOpen(true);
            }}
            onAddDrill={() => {
              setEditingDrill(null);
              setDrillDialogOpen(true);
            }}
            onEditDrill={(drill) => {
              setEditingDrill(drill);
              setDrillDialogOpen(true);
            }}
          />
        </TabsContent>
      </Tabs>
    </PageShell>
  );
}

function OverviewTab({
  workspace,
  isLoading,
}: {
  workspace: MillingWorkspace | null;
  isLoading: boolean;
}) {
  const summary = workspace?.overview.summary;

  return (
    <>
      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-5">
        <SummaryCard
          title="Queued tasks"
          value={summary?.queuedTasks}
          icon={History}
          loading={isLoading}
        />
        <SummaryCard
          title="Active machines"
          value={summary?.activeMachines}
          icon={Wrench}
          loading={isLoading}
        />
        <SummaryCard
          title="Drills nearing limit"
          value={summary?.nearLimitDrills}
          icon={Drill}
          loading={isLoading}
        />
        <SummaryCard
          title="Failures in 7 days"
          value={summary?.failedMillingsLast7Days}
          icon={TriangleAlert}
          loading={isLoading}
        />
        <SummaryCard
          title="Throughput in 7 days"
          value={summary?.throughputLast7Days}
          icon={CheckCircle2}
          loading={isLoading}
        />
      </div>

      <div className="grid gap-4 xl:grid-cols-[1.2fr_1fr]">
        <Panel>
          <PanelHeader>
            <div>
              <h2 className="text-xl font-semibold">Machine status snapshot</h2>
              <p className="text-sm text-muted-foreground">
                Current machine availability and maintenance timing.
              </p>
            </div>
          </PanelHeader>
          <OverviewMachineTable workspace={workspace} isLoading={isLoading} />
        </Panel>

        <Panel>
          <PanelHeader>
            <div>
              <h2 className="text-xl font-semibold">Drill wear alerts</h2>
              <p className="text-sm text-muted-foreground">
                Highest-wear drills and replacements that need attention.
              </p>
            </div>
          </PanelHeader>
          <OverviewDrillAlerts workspace={workspace} isLoading={isLoading} />
        </Panel>
      </div>

      <Panel>
        <PanelHeader>
          <div>
            <h2 className="text-xl font-semibold">Recent failures and redo signals</h2>
            <p className="text-sm text-muted-foreground">
              Latest milling issues to investigate before they repeat.
            </p>
          </div>
        </PanelHeader>
        <OverviewIncidents workspace={workspace} isLoading={isLoading} />
      </Panel>
    </>
  );
}

function TasksTab({
  workspace,
  isLoading,
  onRefresh,
}: {
  workspace: MillingWorkspace | null;
  isLoading: boolean;
  onRefresh: () => Promise<void>;
}) {
  return (
    <>
      <Panel>
        <PanelHeader>
          <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
            <div>
              <h2 className="text-xl font-semibold">Pending milling tasks</h2>
              <p className="text-sm text-muted-foreground">
                Complete milling directly here or jump to the production queue.
              </p>
            </div>
            <div className="flex flex-wrap gap-2">
              {workspace ? (
                <MillingDialog
                  blockTypes={workspace.blockTypes}
                  millingDrills={workspace.millingDrills}
                  machines={workspace.machines}
                  cases={workspace.readyCases}
                  onSubmitted={onRefresh}
                />
              ) : null}
              <Button asChild type="button" variant="outline" size="sm">
                <Link href="/production">
                  <History className="h-4 w-4" />
                  Open production queue
                </Link>
              </Button>
            </div>
          </div>
        </PanelHeader>

        {isLoading ? (
          <LoadingRow label="Loading milling tasks." />
        ) : workspace?.readyCases.length ? (
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="px-6 py-4">Case</TableHead>
                  <TableHead className="px-6 py-4">Patient</TableHead>
                  <TableHead className="px-6 py-4">Customer</TableHead>
                  <TableHead className="px-6 py-4">Service</TableHead>
                  <TableHead className="px-6 py-4">Due date</TableHead>
                  <TableHead className="px-6 py-4">Action</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {workspace.readyCases.map((item) => (
                  <TableRow key={item.caseProcessId ?? `${item.id}-${item.code}`}>
                    <TableCell className="px-6 py-4 font-semibold">
                      {item.code}
                    </TableCell>
                    <TableCell className="px-6 py-4">{item.patientName}</TableCell>
                    <TableCell className="px-6 py-4">
                      {item.customerName ?? "-"}
                    </TableCell>
                    <TableCell className="px-6 py-4">
                      {item.restoration ?? "-"}
                    </TableCell>
                    <TableCell className="px-6 py-4 text-sm text-muted-foreground">
                      {formatDate(item.dueDate)}
                    </TableCell>
                    <TableCell className="px-6 py-4">
                      <MillingDialog
                        blockTypes={workspace.blockTypes}
                        millingDrills={workspace.millingDrills}
                        machines={workspace.machines}
                        cases={workspace.readyCases}
                        caseId={item.id}
                        trigger={
                          <Button type="button" size="sm">
                            Complete milling
                          </Button>
                        }
                        onSubmitted={onRefresh}
                      />
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        ) : (
          <EmptyState title="No milling tasks are queued right now" />
        )}
      </Panel>

      <Panel>
        <PanelHeader>
          <h2 className="text-xl font-semibold">Milling history</h2>
        </PanelHeader>
        {isLoading ? (
          <LoadingRow label="Loading milling history." />
        ) : workspace?.millings.length ? (
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="px-6 py-4">Case</TableHead>
                  <TableHead className="px-6 py-4">Patient</TableHead>
                  <TableHead className="px-6 py-4">Block</TableHead>
                  <TableHead className="px-6 py-4">Machine</TableHead>
                  <TableHead className="px-6 py-4">Drills</TableHead>
                  <TableHead className="px-6 py-4 text-center">Blocks</TableHead>
                  <TableHead className="px-6 py-4 text-center">Teeth</TableHead>
                  <TableHead className="px-6 py-4">Status</TableHead>
                  <TableHead className="px-6 py-4">Date</TableHead>
                  <TableHead className="px-6 py-4">Action</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {workspace.millings.map((milling) => (
                  <TableRow key={milling.id}>
                    <TableCell className="px-6 py-4 font-semibold">
                      {milling.caseCode}
                    </TableCell>
                    <TableCell className="px-6 py-4">{milling.patientName}</TableCell>
                    <TableCell className="px-6 py-4">
                      {milling.blockTypeName}
                      {milling.blockTypeShade ? ` (${milling.blockTypeShade})` : ""}
                    </TableCell>
                    <TableCell className="px-6 py-4">
                      {milling.millingMachineName ?? "-"}
                    </TableCell>
                    <TableCell className="px-6 py-4 text-sm">
                      {milling.selectedDrillSlots.length ? (
                        <div className="space-y-1">
                          {milling.selectedDrillSlots.map((slot) => (
                            <div key={slot.id}>
                              {slot.label}: {slot.drillName}
                            </div>
                          ))}
                        </div>
                      ) : (
                        "-"
                      )}
                    </TableCell>
                    <TableCell className="px-6 py-4 text-center">
                      {milling.blocksUsedQty}
                    </TableCell>
                    <TableCell className="px-6 py-4 text-center">
                      {milling.teethMilledQty}
                    </TableCell>
                    <TableCell className="px-6 py-4">
                      {milling.status === "SUCCESS" ? (
                        <Badge variant="success">
                          <CheckCircle2 className="mr-1 h-3 w-3" />
                          Success
                        </Badge>
                      ) : (
                        <Badge variant="danger">
                          <AlertTriangle className="mr-1 h-3 w-3" />
                          Failed
                        </Badge>
                      )}
                    </TableCell>
                    <TableCell className="px-6 py-4 text-sm text-muted-foreground">
                      {formatDateTime(milling.milledAt)}
                    </TableCell>
                    <TableCell className="px-6 py-4">
                      <MillingDialog
                        blockTypes={workspace.blockTypes}
                        millingDrills={workspace.millingDrills}
                        machines={workspace.machines}
                        cases={workspace.readyCases}
                        milling={milling}
                        onSubmitted={onRefresh}
                      />
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        ) : (
          <EmptyState title="No milling records yet" />
        )}
      </Panel>

      <Panel>
        <PanelHeader>
          <h2 className="text-xl font-semibold">Drill history</h2>
        </PanelHeader>
        {isLoading ? (
          <LoadingRow label="Loading drill history." />
        ) : workspace?.inventoryDrills.length ? (
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="px-6 py-4">Drill</TableHead>
                  <TableHead className="px-6 py-4">Machine</TableHead>
                  <TableHead className="px-6 py-4 text-center">Blocks used</TableHead>
                  <TableHead className="px-6 py-4 text-center">Estimated max</TableHead>
                  <TableHead className="px-6 py-4 text-center">Wear</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {workspace.inventoryDrills.map((drill) => (
                  <TableRow key={drill.id}>
                    <TableCell className="px-6 py-4">
                      <p className="font-medium">{drill.name}</p>
                      <p className="text-xs text-muted-foreground">
                        {drill.status.replace(/_/g, " ")}
                      </p>
                    </TableCell>
                    <TableCell className="px-6 py-4">
                      {drill.millingMachineName ?? "-"}
                    </TableCell>
                    <TableCell className="px-6 py-4 text-center">
                      {drill.currentBlocksCount}
                    </TableCell>
                    <TableCell className="px-6 py-4 text-center">
                      {drill.estimatedMaxBlocks ?? "-"}
                    </TableCell>
                    <TableCell className="px-6 py-4 text-center">
                      {renderWear(drill.wearPercent)}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        ) : (
          <EmptyState title="No drills registered yet" />
        )}
      </Panel>
    </>
  );
}

function InventoryTab({
  workspace,
  isLoading,
  onAddMachine,
  onEditMachine,
  onAddDrill,
  onEditDrill,
}: {
  workspace: MillingWorkspace | null;
  isLoading: boolean;
  onAddMachine: () => void;
  onEditMachine: (machine: MillingMachineInventoryRow) => void;
  onAddDrill: () => void;
  onEditDrill: (drill: MillingDrillInventoryRow) => void;
}) {
  return (
    <>
      <Panel>
        <PanelHeader>
          <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
            <div>
              <h2 className="text-xl font-semibold">Machines</h2>
              <p className="text-sm text-muted-foreground">
                Manage machine availability, serials, and maintenance dates.
              </p>
            </div>
            <Button type="button" onClick={onAddMachine}>
              Add machine
            </Button>
          </div>
        </PanelHeader>

        {isLoading ? (
          <LoadingRow label="Loading machines." />
        ) : workspace?.machines.length ? (
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="px-6 py-4">Machine</TableHead>
                  <TableHead className="px-6 py-4">Status</TableHead>
                  <TableHead className="px-6 py-4">Serial</TableHead>
                  <TableHead className="px-6 py-4">Model</TableHead>
                  <TableHead className="px-6 py-4">Next maintenance</TableHead>
                  <TableHead className="px-6 py-4 text-center">Assigned drills</TableHead>
                  <TableHead className="px-6 py-4 text-right">Manage</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {workspace.machines.map((machine) => (
                  <TableRow key={machine.id}>
                    <TableCell className="px-6 py-4">
                      <div className="font-medium">{machine.name}</div>
                      <div className="text-xs text-muted-foreground">
                        {machine.statusReason ?? "No status note"}
                      </div>
                    </TableCell>
                    <TableCell className="px-6 py-4">
                      <Badge variant={machineStatusVariant(machine.status)}>
                        {machine.status.replace(/_/g, " ")}
                      </Badge>
                    </TableCell>
                    <TableCell className="px-6 py-4">
                      {machine.serialNumber ?? "-"}
                    </TableCell>
                    <TableCell className="px-6 py-4">{machine.model ?? "-"}</TableCell>
                    <TableCell className="px-6 py-4">
                      {formatDate(machine.nextMaintenanceDueAt)}
                    </TableCell>
                    <TableCell className="px-6 py-4 text-center">
                      {machine.assignedDrillCount}
                    </TableCell>
                    <TableCell className="px-6 py-4 text-right">
                      <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        onClick={() => onEditMachine(machine)}
                      >
                        Manage
                      </Button>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        ) : (
          <EmptyState
            title="No machines registered yet"
            description="Add the first milling machine to start tracking maintenance and drill assignments."
          />
        )}
      </Panel>

      <Panel>
        <PanelHeader>
          <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
            <div>
              <h2 className="text-xl font-semibold">Drills</h2>
              <p className="text-sm text-muted-foreground">
                Track drill wear, machine assignment, and replacement history.
              </p>
            </div>
            <Button type="button" onClick={onAddDrill}>
              Add drill
            </Button>
          </div>
        </PanelHeader>

        {isLoading ? (
          <LoadingRow label="Loading drills." />
        ) : workspace?.inventoryDrills.length ? (
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="px-6 py-4">Drill</TableHead>
                  <TableHead className="px-6 py-4">Status</TableHead>
                  <TableHead className="px-6 py-4">Machine</TableHead>
                  <TableHead className="px-6 py-4 text-center">Blocks used</TableHead>
                  <TableHead className="px-6 py-4 text-center">Estimated max</TableHead>
                  <TableHead className="px-6 py-4 text-center">Wear</TableHead>
                  <TableHead className="px-6 py-4 text-right">Manage</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {workspace.inventoryDrills.map((drill) => (
                  <TableRow key={drill.id}>
                    <TableCell className="px-6 py-4">
                      <div className="font-medium">{drill.name}</div>
                      <div className="text-xs text-muted-foreground">
                        Installed {formatDate(drill.installedAt)}
                      </div>
                    </TableCell>
                    <TableCell className="px-6 py-4">
                      <Badge variant={drillStatusVariant(drill.status)}>
                        {drill.status.replace(/_/g, " ")}
                      </Badge>
                    </TableCell>
                    <TableCell className="px-6 py-4">
                      {drill.millingMachineName ?? "-"}
                    </TableCell>
                    <TableCell className="px-6 py-4 text-center">
                      {drill.currentBlocksCount}
                    </TableCell>
                    <TableCell className="px-6 py-4 text-center">
                      {drill.estimatedMaxBlocks ?? "-"}
                    </TableCell>
                    <TableCell className="px-6 py-4 text-center">
                      {renderWear(drill.wearPercent)}
                    </TableCell>
                    <TableCell className="px-6 py-4 text-right">
                      <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        onClick={() => onEditDrill(drill)}
                      >
                        Manage
                      </Button>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        ) : (
          <EmptyState
            title="No drills registered yet"
            description="Add active or stored drills here and assign them to machines as needed."
          />
        )}
      </Panel>
    </>
  );
}

function SummaryCard({
  title,
  value,
  icon: Icon,
  loading,
}: {
  title: string;
  value: number | undefined;
  icon: React.ComponentType<{ className?: string }>;
  loading: boolean;
}) {
  return (
    <Panel>
      <div className="flex items-start justify-between p-4 sm:p-5">
        <div>
          <p className="text-sm text-muted-foreground">{title}</p>
          <p className="mt-2 text-3xl font-semibold">
            {loading ? "-" : value ?? 0}
          </p>
        </div>
        <div className="rounded-full bg-muted p-2 text-muted-foreground">
          <Icon className="h-5 w-5" />
        </div>
      </div>
    </Panel>
  );
}

function OverviewMachineTable({
  workspace,
  isLoading,
}: {
  workspace: MillingWorkspace | null;
  isLoading: boolean;
}) {
  if (isLoading) return <LoadingRow label="Loading machine status." />;
  if (!workspace?.overview.machineSnapshot.length) {
    return <EmptyState title="No machine inventory yet" />;
  }

  return (
    <div className="overflow-x-auto">
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead className="px-6 py-4">Machine</TableHead>
            <TableHead className="px-6 py-4">Status</TableHead>
            <TableHead className="px-6 py-4">Maintenance due</TableHead>
            <TableHead className="px-6 py-4 text-center">Drills</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {workspace.overview.machineSnapshot.map((machine) => (
            <TableRow key={machine.id}>
              <TableCell className="px-6 py-4">
                <div className="font-medium">{machine.name}</div>
                <div className="text-xs text-muted-foreground">
                  {machine.model ?? machine.serialNumber ?? "No model or serial"}
                </div>
              </TableCell>
              <TableCell className="px-6 py-4">
                <Badge variant={machineStatusVariant(machine.status)}>
                  {machine.status.replace(/_/g, " ")}
                </Badge>
              </TableCell>
              <TableCell className="px-6 py-4">
                {formatDate(machine.nextMaintenanceDueAt)}
              </TableCell>
              <TableCell className="px-6 py-4 text-center">
                {machine.assignedDrillCount}
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </div>
  );
}

function OverviewDrillAlerts({
  workspace,
  isLoading,
}: {
  workspace: MillingWorkspace | null;
  isLoading: boolean;
}) {
  if (isLoading) return <LoadingRow label="Loading drill alerts." />;
  if (!workspace?.overview.drillAlerts.length) {
    return (
      <EmptyState
        title="No high-wear drills right now"
        description="Active drills are below the alert threshold."
      />
    );
  }

  return (
    <div className="divide-y divide-border/40">
      {workspace.overview.drillAlerts.map((drill) => (
        <div
          key={drill.id}
          className="flex items-center justify-between gap-4 px-4 py-3 sm:px-6"
        >
          <div>
            <p className="font-medium">{drill.name}</p>
            <p className="text-xs text-muted-foreground">
              {drill.millingMachineName ?? "Unassigned"} • {drill.currentBlocksCount}
              {drill.estimatedMaxBlocks ? ` / ${drill.estimatedMaxBlocks}` : ""} blocks
            </p>
          </div>
          {renderWear(drill.wearPercent)}
        </div>
      ))}
    </div>
  );
}

function OverviewIncidents({
  workspace,
  isLoading,
}: {
  workspace: MillingWorkspace | null;
  isLoading: boolean;
}) {
  if (isLoading) return <LoadingRow label="Loading incident feed." />;
  if (!workspace?.overview.recentIncidents.length) {
    return (
      <EmptyState
        title="No recent failures or redo signals"
        description="The last milling records did not surface active exceptions."
      />
    );
  }

  return (
    <div className="divide-y divide-border/40">
      {workspace.overview.recentIncidents.map((incident) => (
        <div
          key={incident.id}
          className="flex flex-col gap-2 px-4 py-4 sm:flex-row sm:items-center sm:justify-between sm:px-6"
        >
          <div>
            <div className="flex flex-wrap items-center gap-2">
              <p className="font-medium">
                {incident.caseCode} • {incident.patientName}
              </p>
              <Badge variant={incident.status === "FAILED" ? "danger" : "warning"}>
                {incident.status === "FAILED" ? "Failed" : "Redo"}
              </Badge>
            </div>
            <p className="text-sm text-muted-foreground">{incident.detail}</p>
          </div>
          <p className="text-sm text-muted-foreground">
            {formatDateTime(incident.milledAt)}
          </p>
        </div>
      ))}
    </div>
  );
}

function LoadingRow({ label }: { label: string }) {
  return (
    <div className="flex items-center gap-2 p-4 text-sm text-muted-foreground sm:p-6">
      <Loader2 className="h-4 w-4 animate-spin" />
      {label}
    </div>
  );
}

function renderWear(wearPercent: number | null) {
  if (wearPercent === null) {
    return <span className="text-muted-foreground">-</span>;
  }

  if (wearPercent >= 100) {
    return <Badge variant="danger">Replace now • {wearPercent}%</Badge>;
  }

  if (wearPercent >= 80) {
    return <Badge variant="warning">Near limit • {wearPercent}%</Badge>;
  }

  return <Badge variant="neutral">{wearPercent}%</Badge>;
}

function formatDate(value: string | null | undefined) {
  if (!value) return "-";

  return new Intl.DateTimeFormat("pt-BR", {
    dateStyle: "short",
  }).format(new Date(value));
}

function formatDateTime(value: string | null | undefined) {
  if (!value) return "-";

  return new Intl.DateTimeFormat("pt-BR", {
    dateStyle: "short",
    timeStyle: "short",
  }).format(new Date(value));
}

function machineStatusVariant(status: MillingMachineInventoryRow["status"]) {
  switch (status) {
    case "ACTIVE":
      return "success" as const;
    case "MAINTENANCE":
      return "warning" as const;
    default:
      return "neutral" as const;
  }
}

function drillStatusVariant(status: MillingDrillInventoryRow["status"]) {
  switch (status) {
    case "ACTIVE":
      return "success" as const;
    case "STORED":
      return "neutral" as const;
    case "RETIRED":
      return "warning" as const;
    case "LOST":
      return "danger" as const;
    default:
      return "neutral" as const;
  }
}
