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
import {
  mockCases,
  mockMillings,
  mockMillingDrills,
} from "@/lib/mock-data/pages";

export default function MillingPage() {
  const readyCases = mockCases.filter((caseItem) =>
    ["DESIGN_READY", "MILLING_PRINTING"].includes(caseItem.currentStatus),
  );
  const drillStats = mockMillingDrills.map((drill) => {
    const usages = mockMillings.filter(
      (milling) =>
        milling.fineMillingDrillName === drill.name ||
        milling.coarseMillingDrillName === drill.name,
    );
    const totalTeeth = usages.reduce(
      (sum, milling) => sum + milling.teethMilledQty,
      0,
    );
    const wearPercent = drill.maxTeethRecommended
      ? Math.min(100, Math.round((totalTeeth / drill.maxTeethRecommended) * 100))
      : null;

    return { drill, totalTeeth, wearPercent };
  });

  return (
    <PageShell width="wide">
      <PageHeader
        title="Milling"
        description="Read-only mock milling data. API-backed create/edit/delete is disabled for now."
      />

      <Panel>
        <PanelHeader>
          <h2 className="text-xl font-semibold">Cases ready for production</h2>
          <p className="text-sm text-muted-foreground">
            Static mock cases in design-ready or milling state.
          </p>
        </PanelHeader>
        <div className="overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="px-6 py-4">Case</TableHead>
                <TableHead className="px-6 py-4">Patient</TableHead>
                <TableHead className="px-6 py-4">customer</TableHead>
                <TableHead className="px-6 py-4">Status</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {readyCases.map((caseItem) => (
                <TableRow key={caseItem.id}>
                  <TableCell className="px-6 py-4 font-semibold">
                    {caseItem.code}
                  </TableCell>
                  <TableCell className="px-6 py-4">
                    {caseItem.patientName}
                  </TableCell>
                  <TableCell className="px-6 py-4">
                    {caseItem.customerName}
                  </TableCell>
                  <TableCell className="px-6 py-4">
                    {caseItem.currentStatus.replace(/_/g, " ")}
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      </Panel>

      <Panel>
        <PanelHeader>
          <h2 className="text-xl font-semibold">Milling records</h2>
        </PanelHeader>
        <div className="overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="px-6 py-4">Case</TableHead>
                <TableHead className="px-6 py-4">Patient</TableHead>
                <TableHead className="px-6 py-4">Block</TableHead>
                <TableHead className="px-6 py-4">Drills</TableHead>
                <TableHead className="px-6 py-4 text-center">Teeth</TableHead>
                <TableHead className="px-6 py-4">Status</TableHead>
                <TableHead className="px-6 py-4">Date</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {mockMillings.map((milling) => (
                <TableRow key={milling.id}>
                  <TableCell className="px-6 py-4 font-semibold">
                    {milling.caseCode}
                  </TableCell>
                  <TableCell className="px-6 py-4">
                    {milling.patientName}
                  </TableCell>
                  <TableCell className="px-6 py-4">
                    {milling.blockTypeName}
                    {milling.blockTypeShade ? ` (${milling.blockTypeShade})` : ""}
                  </TableCell>
                  <TableCell className="px-6 py-4 text-sm">
                    <div>1.0mm: {milling.fineMillingDrillName}</div>
                    <div>2.5mm: {milling.coarseMillingDrillName}</div>
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
                    {new Date(milling.milledAt).toLocaleDateString("pt-BR")}
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>

        {mockMillings.length === 0 ? (
          <EmptyState title="No milling records yet" />
        ) : null}
      </Panel>

      <Panel>
        <PanelHeader>
          <h2 className="text-xl font-semibold">Drill history</h2>
        </PanelHeader>
        <div className="overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="px-6 py-4">Drill</TableHead>
                <TableHead className="px-6 py-4 text-center">Teeth</TableHead>
                <TableHead className="px-6 py-4 text-center">
                  Max recommended
                </TableHead>
                <TableHead className="px-6 py-4 text-center">Wear</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {drillStats.map(({ drill, totalTeeth, wearPercent }) => (
                <TableRow key={drill.id}>
                  <TableCell className="px-6 py-4">
                    <p className="font-medium">{drill.name}</p>
                    <p className="text-xs text-muted-foreground">
                      {drill.brand ?? "No brand"}
                    </p>
                  </TableCell>
                  <TableCell className="px-6 py-4 text-center">
                    {totalTeeth}
                  </TableCell>
                  <TableCell className="px-6 py-4 text-center">
                    {drill.maxTeethRecommended ?? "-"}
                  </TableCell>
                  <TableCell className="px-6 py-4 text-center">
                    {wearPercent === null ? "-" : `${wearPercent}%`}
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      </Panel>
    </PageShell>
  );
}
