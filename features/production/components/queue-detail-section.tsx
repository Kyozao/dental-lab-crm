import { EmptyState } from "@/components/app/empty-state";
import { Panel, PanelHeader } from "@/components/app/panel";
import { Badge } from "@/components/ui/badge";
import type { ProductionProcess } from "@/features/production/production.types";
import { CalendarDays, UserRound } from "lucide-react";

type QueueDetailSectionProps = {
  process: ProductionProcess;
};

export function QueueDetailSection({ process }: QueueDetailSectionProps) {
  return (
    <Panel>
      <PanelHeader>
        <div className="flex flex-col gap-2 sm:flex-row sm:items-start sm:justify-between">
          <div>
            <h2 className="text-xl font-semibold">{process.name} queue</h2>
            <p className="text-sm text-muted-foreground">
              Target turnaround: {process.targetHours} hours
            </p>
          </div>
          <Badge variant="neutral">{process.queue.length} active</Badge>
        </div>
      </PanelHeader>

      {process.queue.length === 0 ? (
        <EmptyState title="No cases queued for this process" />
      ) : (
        <div className="grid gap-3 p-4 sm:p-6">
          {process.queue.map((item) => (
            <article
              key={item.id}
              className="rounded-md border border-border/50 p-4"
            >
              <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                <div>
                  <div className="flex flex-wrap items-center gap-2">
                    <h3 className="font-semibold">{item.caseCode}</h3>
                    <Badge
                      variant={item.priority === "rush" ? "warning" : "neutral"}
                    >
                      {item.priority === "rush" ? "Rush" : "Standard"}
                    </Badge>
                  </div>
                  <p className="mt-1 text-sm text-muted-foreground">
                    {item.patientName} · {item.customerName}
                  </p>
                  <p className="mt-2 text-sm">{item.restoration}</p>
                </div>
                <div className="grid gap-2 text-sm text-muted-foreground sm:text-right">
                  <span className="inline-flex items-center gap-2 sm:justify-end">
                    <CalendarDays className="h-4 w-4" />
                    {item.dueDate
                      ? new Date(item.dueDate).toLocaleDateString("pt-BR")
                      : "No due date"}
                  </span>
                  <span className="inline-flex items-center gap-2 sm:justify-end">
                    <UserRound className="h-4 w-4" />
                    {item.assignee}
                  </span>
                </div>
              </div>
              {item.notes ? (
                <p className="mt-3 rounded-md bg-muted px-3 py-2 text-sm text-muted-foreground">
                  {item.notes}
                </p>
              ) : null}
            </article>
          ))}
        </div>
      )}
    </Panel>
  );
}
