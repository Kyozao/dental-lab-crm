import { redirect } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { getAuthenticatedAppUser } from "@/lib/auth/get-app-user";
import { EmptyState } from "@/components/app/empty-state";
import { PageHeader } from "@/components/app/page-header";
import { PageShell } from "@/components/app/page-shell";
import { Panel, PanelHeader } from "@/components/app/panel";
import { Badge } from "@/components/ui/badge";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { AlertTriangle, CheckCircle2 } from "lucide-react";
import { MillingDialog } from "./components/milling-dialog";
import { DeleteMillingButton } from "./components/delete-milling-button";

export default async function ProductionPage() {
  const appUser = await getAuthenticatedAppUser();

  if (!appUser) {
    redirect("/login");
  }

  if (appUser.role === "CAD_DESIGNER") {
    redirect("/kanban");
  }

  const [millings, blockTypes, millingDrills, readyCases] = await Promise.all([
    // Optimized: Only fetch recent millings, not all historical data
    prisma.caseMilling.findMany({
      take: 500, // Limit to last 500 records
      orderBy: { milledAt: "desc" },
      include: {
        case: {
          select: {
            id: true,
            code: true,
            patientName: true,
            clinic: { select: { name: true } },
          },
        },
        blockType: { select: { id: true, name: true, shade: true } },
        millingDrill: { select: { id: true, name: true } },
        fineMillingDrill: { select: { id: true, name: true, type: true } },
        coarseMillingDrill: { select: { id: true, name: true, type: true } },
      },
    }),
    prisma.blockType.findMany({
      where: { isActive: true },
      orderBy: { name: "asc" },
      select: {
        id: true,
        name: true,
        shade: true,
      },
    }),
    prisma.millingDrill.findMany({
      where: { isActive: true },
      orderBy: { name: "asc" },
      select: {
        id: true,
        name: true,
        brand: true,
        maxTeethRecommended: true,
      },
    }),
    prisma.case.findMany({
      where: { currentStatus: { in: ["DESIGN_READY", "MILLING_PRINTING"] } },
      orderBy: { code: "asc" },
      select: {
        id: true,
        code: true,
        patientName: true,
      },
    }),
  ]);

  const drillStats = millingDrills
    .map((drill) => {
      const usages = millings.filter(
        (m) =>
          m.fineMillingDrill?.id === drill.id ||
          m.coarseMillingDrill?.id === drill.id ||
          m.millingDrill?.id === drill.id,
      );
      const totalTeeth = usages.reduce((sum, m) => sum + m.teethMilledQty, 0);
      const lastUsedAt = usages.length > 0 ? usages[0].milledAt : null;
      const wearPercent = drill.maxTeethRecommended
        ? Math.min(
            100,
            Math.round((totalTeeth / drill.maxTeethRecommended) * 100),
          )
        : null;

      return {
        drill,
        totalTeeth,
        lastUsedAt,
        wearPercent,
      };
    })
    .sort((a, b) => b.totalTeeth - a.totalTeeth);

  return (
    <PageShell width="wide">
      <PageHeader
        title="Production & Milling"
        description="Track milling operations, block types, drills, and production details"
      />

      <section className="space-y-3">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-xl font-semibold">
              Cases ready for production
            </h2>
            <p className="text-sm text-muted-foreground">
              Use this section to start milling for cases already in
              design-ready state.
            </p>
          </div>
        </div>

        <Panel>
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow className="border-b border-border/40 bg-muted/50">
                  <TableHead className="px-4 py-3 text-left font-semibold">
                    Case
                  </TableHead>
                  <TableHead className="px-4 py-3 text-left font-semibold">
                    Patient
                  </TableHead>
                  <TableHead className="px-4 py-3 text-right font-semibold">
                    Action
                  </TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {readyCases.map((c) => (
                  <TableRow key={c.id} className="border-b border-border/40">
                    <TableCell className="px-4 py-3 font-medium">
                      {c.code}
                    </TableCell>
                    <TableCell className="px-4 py-3">
                      {c.patientName}
                    </TableCell>
                    <TableCell className="px-4 py-3 text-right">
                      <MillingDialog
                        blockTypes={blockTypes}
                        millingDrills={millingDrills}
                        cases={readyCases}
                        caseId={c.id}
                      />
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        </Panel>
      </section>

      <Panel>
        <div className="overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow className="border-b border-border/40 bg-muted/50">
                <TableHead className="px-6 py-4 text-left font-semibold">
                  Case
                </TableHead>
                <TableHead className="px-6 py-4 text-left font-semibold">
                  Patient
                </TableHead>
                <TableHead className="px-6 py-4 text-left font-semibold">
                  Clinic
                </TableHead>
                <TableHead className="px-6 py-4 text-left font-semibold">
                  Block Type
                </TableHead>
                <TableHead className="px-6 py-4 text-left font-semibold">
                  Drills Used
                </TableHead>
                <TableHead className="px-6 py-4 text-center font-semibold">
                  Teeth Milled
                </TableHead>
                <TableHead className="px-6 py-4 text-left font-semibold">
                  Status
                </TableHead>
                <TableHead className="px-6 py-4 text-left font-semibold">
                  Date
                </TableHead>
                <TableHead className="px-6 py-4 text-right font-semibold">
                  Actions
                </TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {millings.map((milling) => (
                <TableRow
                  key={milling.id}
                  className="border-b border-border/40 hover:bg-muted/50 transition-colors"
                >
                  <TableCell className="px-6 py-4 font-medium text-foreground">
                    {milling.case?.code}
                  </TableCell>
                  <TableCell className="px-6 py-4 text-muted-foreground">
                    {milling.case?.patientName}
                  </TableCell>
                  <TableCell className="px-6 py-4 text-muted-foreground">
                    {milling.case?.clinic?.name ?? "-"}
                  </TableCell>
                  <TableCell className="px-6 py-4 text-muted-foreground">
                    <div>
                      <p className="font-medium">{milling.blockType?.name}</p>
                      {milling.blockType?.shade && (
                        <p className="text-xs text-muted-foreground">
                          Shade: {milling.blockType.shade}
                        </p>
                      )}
                    </div>
                  </TableCell>
                  <TableCell className="px-6 py-4 text-muted-foreground">
                    {milling.fineMillingDrill?.name ||
                    milling.coarseMillingDrill?.name ? (
                      <div className="space-y-1">
                        <p className="text-xs">
                          1.0mm: {milling.fineMillingDrill?.name ?? "-"}
                        </p>
                        <p className="text-xs">
                          2.5mm: {milling.coarseMillingDrill?.name ?? "-"}
                        </p>
                      </div>
                    ) : (
                      (milling.millingDrill?.name ?? "-")
                    )}
                  </TableCell>
                  <TableCell className="px-6 py-4 text-center font-medium">
                    {milling.teethMilledQty}
                  </TableCell>
                  <TableCell className="px-6 py-4">
                    {milling.status === "SUCCESS" ? (
                      <Badge variant="success">
                        <CheckCircle2 className="h-3 w-3 mr-1" />
                        Success
                      </Badge>
                    ) : (
                      <Badge variant="danger">
                        <AlertTriangle className="h-3 w-3 mr-1" />
                        Failed
                      </Badge>
                    )}
                    {milling.failureReason && (
                      <p className="text-xs text-muted-foreground mt-1">
                        {milling.failureReason}
                      </p>
                    )}
                  </TableCell>
                  <TableCell className="px-6 py-4 text-muted-foreground text-sm">
                    {new Date(milling.milledAt).toLocaleDateString("pt-BR", {
                      month: "short",
                      day: "numeric",
                      hour: "2-digit",
                      minute: "2-digit",
                    })}
                  </TableCell>
                  <TableCell className="px-6 py-4 text-right space-x-2">
                    <MillingDialog
                      blockTypes={blockTypes}
                      millingDrills={millingDrills}
                      cases={readyCases}
                      milling={milling}
                    />
                    <DeleteMillingButton millingId={milling.id} />
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>

        {millings.length === 0 && (
          <EmptyState
            title="No milling records yet"
            description="Create one to get started."
          />
        )}
      </Panel>

      <Panel>
        <PanelHeader>
          <h2 className="text-xl font-semibold">Drill History</h2>
          <p className="text-sm text-muted-foreground">
            Track lifetime usage and break risk for each active drill.
          </p>
        </PanelHeader>
        <div className="overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow className="border-b border-border/40 bg-muted/50">
                <TableHead className="px-6 py-4 text-left font-semibold">
                  Drill
                </TableHead>
                <TableHead className="px-6 py-4 text-center font-semibold">
                  Teeth Milled
                </TableHead>
                <TableHead className="px-6 py-4 text-center font-semibold">
                  Max Recommended
                </TableHead>
                <TableHead className="px-6 py-4 text-center font-semibold">
                  Wear
                </TableHead>
                <TableHead className="px-6 py-4 text-left font-semibold">
                  Last Used
                </TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {drillStats.map(
                ({ drill, totalTeeth, lastUsedAt, wearPercent }) => (
                  <TableRow
                    key={drill.id}
                    className="border-b border-border/40"
                  >
                    <TableCell className="px-6 py-4">
                      <div>
                        <p className="font-medium">{drill.name}</p>
                        <p className="text-xs text-muted-foreground">
                          {drill.brand ?? "No brand"}
                        </p>
                      </div>
                    </TableCell>
                    <TableCell className="px-6 py-4 text-center font-medium">
                      {totalTeeth}
                    </TableCell>
                    <TableCell className="px-6 py-4 text-center text-muted-foreground">
                      {drill.maxTeethRecommended ?? "-"}
                    </TableCell>
                    <TableCell className="px-6 py-4 text-center">
                      {wearPercent === null ? (
                        <span className="text-muted-foreground">-</span>
                      ) : wearPercent >= 90 ? (
                        <Badge variant="danger">
                          {wearPercent}%
                        </Badge>
                      ) : wearPercent >= 70 ? (
                        <Badge variant="warning">
                          {wearPercent}%
                        </Badge>
                      ) : (
                        <Badge variant="success">
                          {wearPercent}%
                        </Badge>
                      )}
                    </TableCell>
                    <TableCell className="px-6 py-4 text-sm text-muted-foreground">
                      {lastUsedAt
                        ? new Date(lastUsedAt).toLocaleDateString("pt-BR", {
                            month: "short",
                            day: "numeric",
                            hour: "2-digit",
                            minute: "2-digit",
                          })
                        : "-"}
                    </TableCell>
                  </TableRow>
                ),
              )}

              {drillStats.length === 0 && (
                <TableRow>
                  <TableCell
                    colSpan={5}
                    className="px-6 py-8 text-center text-muted-foreground"
                  >
                    No active drills found.
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </div>
      </Panel>

      <Panel className="p-4 sm:p-6">
        <h2 className="font-semibold mb-3">Quick Stats</h2>
        <div className="grid gap-4 md:grid-cols-3">
          <div>
            <p className="text-sm text-muted-foreground">Total Records</p>
            <p className="text-2xl font-bold">{millings.length}</p>
          </div>
          <div>
            <p className="text-sm text-muted-foreground">Successful</p>
            <p className="text-2xl font-bold text-green-600">
              {millings.filter((m) => m.status === "SUCCESS").length}
            </p>
          </div>
          <div>
            <p className="text-sm text-muted-foreground">Failed</p>
            <p className="text-2xl font-bold text-red-600">
              {millings.filter((m) => m.status === "FAILED").length}
            </p>
          </div>
        </div>
      </Panel>
    </PageShell>
  );
}
