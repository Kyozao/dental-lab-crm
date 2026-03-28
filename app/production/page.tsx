import { redirect } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { getAuthenticatedAppUser } from "@/lib/auth/get-app-user";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Trash2, AlertTriangle, CheckCircle2 } from "lucide-react";
import { MillingDialog } from "./components/milling-dialog";
import { deleteMillingAction } from "./actions";

export default async function ProductionPage() {
  const appUser = await getAuthenticatedAppUser();

  if (!appUser) {
    redirect("/login");
  }

  if (appUser.role === "CAD_DESIGNER") {
    redirect("/kanban");
  }

  const [millings, blockTypes, millingDrills, readyCases] = await Promise.all([
    prisma.caseMilling.findMany({
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
        changedAt: true,
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
      const usages = millings.filter((m) => m.millingDrill?.id === drill.id);
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
    <main className="mx-auto w-full max-w-7xl space-y-6 px-4 py-6 sm:px-6 sm:py-8">
      <div className="space-y-2">
        <h1 className="text-3xl font-bold">Production & Milling</h1>
        <p className="text-muted-foreground">
          Track milling operations, block types, drills, and production details
        </p>
      </div>

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

        <div className="overflow-x-auto rounded-lg border border-border/40 bg-card">
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
                  <TableCell className="px-4 py-3">{c.patientName}</TableCell>
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
      </section>

      <section className="rounded-lg border border-border/40 bg-card shadow-sm overflow-hidden">
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
                  Drill Used
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
                    {milling.millingDrill?.name ?? "-"}
                  </TableCell>
                  <TableCell className="px-6 py-4 text-center font-medium">
                    {milling.teethMilledQty}
                  </TableCell>
                  <TableCell className="px-6 py-4">
                    {milling.status === "SUCCESS" ? (
                      <Badge
                        variant="outline"
                        className="bg-green-50 text-green-700 border-green-200"
                      >
                        <CheckCircle2 className="h-3 w-3 mr-1" />
                        Success
                      </Badge>
                    ) : (
                      <Badge
                        variant="destructive"
                        className="bg-red-50 text-red-700 border-red-200"
                      >
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
                    <form
                      action={async () => {
                        "use server";
                        await deleteMillingAction(milling.id);
                      }}
                      style={{ display: "inline" }}
                    >
                      <Button
                        variant="outline"
                        size="sm"
                        type="submit"
                        className="text-destructive hover:text-destructive"
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </form>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>

        {millings.length === 0 && (
          <div className="px-6 py-12 text-center">
            <p className="text-muted-foreground">
              No milling records yet. Create one to get started.
            </p>
          </div>
        )}
      </section>

      <section className="rounded-lg border border-border/40 bg-card shadow-sm overflow-hidden">
        <div className="border-b border-border/40 px-4 py-4 sm:px-6">
          <h2 className="text-xl font-semibold">Drill History</h2>
          <p className="text-sm text-muted-foreground">
            Track lifetime usage and last replacement date for each active
            drill.
          </p>
        </div>
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
                <TableHead className="px-6 py-4 text-left font-semibold">
                  Changed At
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
                        <Badge
                          variant="destructive"
                          className="bg-red-50 text-red-700 border-red-200"
                        >
                          {wearPercent}%
                        </Badge>
                      ) : wearPercent >= 70 ? (
                        <Badge className="bg-amber-100 text-amber-800 hover:bg-amber-100">
                          {wearPercent}%
                        </Badge>
                      ) : (
                        <Badge
                          variant="outline"
                          className="bg-green-50 text-green-700 border-green-200"
                        >
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
                    <TableCell className="px-6 py-4 text-sm text-muted-foreground">
                      {drill.changedAt
                        ? new Date(drill.changedAt).toLocaleDateString(
                            "pt-BR",
                            {
                              month: "short",
                              day: "numeric",
                              year: "numeric",
                            },
                          )
                        : "Never"}
                    </TableCell>
                  </TableRow>
                ),
              )}

              {drillStats.length === 0 && (
                <TableRow>
                  <TableCell
                    colSpan={6}
                    className="px-6 py-8 text-center text-muted-foreground"
                  >
                    No active drills found.
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </div>
      </section>

      {/* Notes Section */}
      <div className="rounded-lg border border-border/40 bg-card p-4 sm:p-6">
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
      </div>
    </main>
  );
}
