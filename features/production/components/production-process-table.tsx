import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import type { ProductionProcess } from "@/features/production/production.types";
import { Eye } from "lucide-react";

type ProductionProcessTableProps = {
  processes: ProductionProcess[];
  selectedProcessId: string;
  onViewQueue: (processId: string) => void;
};

export function ProductionProcessTable({
  processes,
  selectedProcessId,
  onViewQueue,
}: ProductionProcessTableProps) {
  return (
    <div className="overflow-x-auto">
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead className="px-6 py-4">Process</TableHead>
            <TableHead className="px-6 py-4">Owner</TableHead>
            <TableHead className="px-6 py-4 text-center">Queue</TableHead>
            <TableHead className="px-6 py-4">Load</TableHead>
            <TableHead className="px-6 py-4 text-right">Action</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {processes.map((process) => {
            const loadPercent = Math.min(
              100,
              Math.round((process.queue.length / process.capacity) * 100),
            );
            const isSelected = selectedProcessId === process.id;

            return (
              <TableRow key={process.id} data-state={isSelected ? "selected" : undefined}>
                <TableCell className="px-6 py-4">
                  <p className="font-semibold">{process.name}</p>
                  <p className="mt-1 max-w-xl text-sm text-muted-foreground">
                    {process.description}
                  </p>
                </TableCell>
                <TableCell className="px-6 py-4">{process.owner}</TableCell>
                <TableCell className="px-6 py-4 text-center font-semibold">
                  {process.queue.length}
                </TableCell>
                <TableCell className="min-w-40 px-6 py-4">
                  <div className="flex items-center gap-3">
                    <Progress value={loadPercent} className="h-2" />
                    <span className="w-10 text-right text-sm text-muted-foreground">
                      {loadPercent}%
                    </span>
                  </div>
                </TableCell>
                <TableCell className="px-6 py-4 text-right">
                  <Button
                    type="button"
                    variant={isSelected ? "secondary" : "outline"}
                    size="sm"
                    onClick={() => onViewQueue(process.id)}
                  >
                    <Eye className="h-4 w-4" />
                    View Queue
                  </Button>
                </TableCell>
              </TableRow>
            );
          })}
        </TableBody>
      </Table>
    </div>
  );
}
