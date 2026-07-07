"use client";

import { AlertTriangle, Boxes, ChevronDown, Cog, Plus, TableProperties } from "lucide-react";

import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { RefreshButton } from "@/components/ui/refresh-button";
import { cn } from "@/lib/utils";

type ServicesPageOverviewProps = {
  activePriceTableCount: number;
  activeProcessCount: number;
  activeServiceCount: number;
  loadingAny: boolean;
  missingWorkflowCount: number;
  onOpenCreatePriceTableDialog: () => void;
  onOpenCreateProcessDialog: () => void;
  onOpenCreateServiceDialog: () => void;
  onRefreshAll: () => void;
  onReviewMissingWorkflows: () => void;
  onShowPriceTables: () => void;
  onShowProcesses: () => void;
  onShowServices: () => void;
  priceTableCount: number;
  processCount: number;
  serviceCount: number;
};

export function ServicesPageOverview({
  activePriceTableCount,
  activeProcessCount,
  activeServiceCount,
  loadingAny,
  missingWorkflowCount,
  onOpenCreatePriceTableDialog,
  onOpenCreateProcessDialog,
  onOpenCreateServiceDialog,
  onRefreshAll,
  onReviewMissingWorkflows,
  onShowPriceTables,
  onShowProcesses,
  onShowServices,
  priceTableCount,
  processCount,
  serviceCount,
}: ServicesPageOverviewProps) {
  return (
    <section className="rounded-[24px] border border-border/50 bg-card p-5 sm:p-6">
      <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
        <div className="space-y-2">
          <p className="text-xs font-semibold uppercase tracking-[0.22em] text-[#07323b]">
            Services
          </p>
          <div className="space-y-1.5">
            <h1 className="text-3xl font-semibold tracking-tight text-foreground sm:text-[2rem]">
              Catalog management
            </h1>
            <p className="max-w-2xl text-sm text-muted-foreground sm:text-base">
              Organize services, process definitions, and pricing in one place.
            </p>
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-2.5">
          <RefreshButton
            label="Refresh services"
            spinning={loadingAny}
            className="border-white/70 bg-white/80 shadow-sm"
            onClick={onRefreshAll}
            disabled={loadingAny}
          />

          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button
                type="button"
                size="lg"
                className="px-4 text-sm font-medium"
              >
                <Plus className="mr-2 h-4 w-4" />
                Quick add
                <ChevronDown className="ml-2 h-4 w-4" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-56">
              <DropdownMenuLabel>Catalog actions</DropdownMenuLabel>
              <DropdownMenuSeparator />
              <DropdownMenuItem
                onClick={() => {
                  onShowServices();
                  onOpenCreateServiceDialog();
                }}
              >
                Add service
              </DropdownMenuItem>
              <DropdownMenuItem
                onClick={() => {
                  onShowProcesses();
                  onOpenCreateProcessDialog();
                }}
              >
                Add process
              </DropdownMenuItem>
              <DropdownMenuItem
                onClick={() => {
                  onShowPriceTables();
                  onOpenCreatePriceTableDialog();
                }}
              >
                Add price table
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </div>

      <div className="mt-5 grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        <OverviewCard
          icon={Boxes}
          title="Active services"
          value={activeServiceCount}
          description={`${serviceCount} total services`}
          ctaLabel="View all services"
          onClick={onShowServices}
        />
        <OverviewCard
          icon={Cog}
          title="Active processes"
          value={activeProcessCount}
          description={`${processCount} total processes`}
          ctaLabel="View all processes"
          onClick={onShowProcesses}
        />
        <OverviewCard
          icon={TableProperties}
          title="Price tables"
          value={priceTableCount}
          description={`${activePriceTableCount} active tables`}
          ctaLabel="View all tables"
          onClick={onShowPriceTables}
        />
        <OverviewCard
          icon={AlertTriangle}
          title="Needs workflow review"
          value={missingWorkflowCount}
          description="Services still missing workflow templates"
          ctaLabel="Review now"
          onClick={onReviewMissingWorkflows}
          tone="warning"
        />
      </div>
    </section>
  );
}

function OverviewCard({
  icon: Icon,
  title,
  value,
  description,
  ctaLabel,
  onClick,
  tone = "default",
}: {
  icon: typeof Boxes;
  title: string;
  value: number;
  description: string;
  ctaLabel: string;
  onClick: () => void;
  tone?: "default" | "warning";
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={cn(
        "group rounded-[20px] border border-border/60 bg-background p-4 text-left transition-colors hover:border-[#07323b]/20 hover:bg-accent/20",
        tone === "warning" && "hover:border-rose-200",
      )}
    >
      <div className="flex items-start gap-3">
        <div
          className={cn(
            "flex h-11 w-11 items-center justify-center rounded-2xl bg-[#edf5f6] text-[#07323b]",
            tone === "warning" && "bg-rose-50 text-rose-600",
          )}
        >
          <Icon className="h-5 w-5" />
        </div>
        <div className="space-y-1">
          <div className="text-2xl font-semibold tracking-tight text-foreground">
            {value}
          </div>
          <p className="text-sm font-medium text-foreground">{title}</p>
          <p className="text-xs text-muted-foreground">{description}</p>
        </div>
      </div>
      <div
        className={cn(
          "mt-4 text-xs font-medium text-[#07323b] transition group-hover:text-[#0a4652]",
          tone === "warning" && "text-rose-600 group-hover:text-rose-500",
        )}
      >
        {ctaLabel}
      </div>
    </button>
  );
}
