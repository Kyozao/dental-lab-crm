"use client";

import { Download, Filter, Plus, Search } from "lucide-react";

import { EmptyState } from "@/components/app/empty-state";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { TabsContent } from "@/components/ui/tabs";
import { type ProcessOption, type ServiceTypeOption } from "@/features/cases/types";
import { formatCurrency } from "@/lib/currency";
import { cn } from "@/lib/utils";

import { type PriceTableListItem } from "../services-api";
import {
  type PriceTableStatusFilter,
  type ProcessStatusFilter,
  type ServiceStatusFilter,
  type WorkflowFilter,
} from "./services-page-client.types";
import { formatWorkflowDuration } from "./services-page-client.utils";

type ServicesTabSectionProps = {
  archivingServiceId: string | null;
  configuredWorkflowCount: number;
  currency: string;
  onClearServiceFilters: () => void;
  onCreateService: () => void;
  onDeleteService: (service: ServiceTypeOption) => void;
  onExport: () => void;
  onOpenService: (serviceId: string) => void;
  onServiceNotesFilterChange: (value: "all" | "with-notes" | "without-notes") => void;
  onServiceSearchChange: (value: string) => void;
  onServiceStatusFilterChange: (value: ServiceStatusFilter) => void;
  onServiceWorkflowFilterChange: (value: WorkflowFilter) => void;
  serviceError: string | null;
  serviceSearch: string;
  serviceStatusFilter: ServiceStatusFilter;
  serviceWorkflowFilter: WorkflowFilter;
  services: ServiceTypeOption[];
  servicesLoading: boolean;
  visibleServices: ServiceTypeOption[];
};

type ProcessesTabSectionProps = {
  activeProcessCount: number;
  archivingProcessId: string | null;
  currency: string;
  onCreateProcess: () => void;
  onDeleteProcess: (process: ProcessOption) => void;
  onEditProcess: (process: ProcessOption) => void;
  onExport: () => void;
  onOpenDedicatedProcessesPage: () => void;
  onProcessSearchChange: (value: string) => void;
  onProcessStatusFilterChange: (value: ProcessStatusFilter) => void;
  processError: string | null;
  processSearch: string;
  processStatusFilter: ProcessStatusFilter;
  processes: ProcessOption[];
  processesLoading: boolean;
  visibleProcesses: ProcessOption[];
};

type PriceTablesTabSectionProps = {
  archivingPriceTableId: string | null;
  loadingPriceTableEditor: boolean;
  onCreatePriceTable: () => void;
  onDeletePriceTable: (priceTable: PriceTableListItem) => void;
  onEditPriceTable: (priceTableId: string) => void;
  onExport: () => void;
  onPriceTableSearchChange: (value: string) => void;
  onPriceTableStatusFilterChange: (value: PriceTableStatusFilter) => void;
  priceTableError: string | null;
  priceTableSearch: string;
  priceTableStatusFilter: PriceTableStatusFilter;
  priceTables: PriceTableListItem[];
  priceTablesLoading: boolean;
  visiblePriceTables: PriceTableListItem[];
};

export function ServicesTabSection({
  archivingServiceId,
  configuredWorkflowCount,
  currency,
  onClearServiceFilters,
  onCreateService,
  onDeleteService,
  onExport,
  onOpenService,
  onServiceNotesFilterChange,
  onServiceSearchChange,
  onServiceStatusFilterChange,
  onServiceWorkflowFilterChange,
  serviceError,
  serviceSearch,
  serviceStatusFilter,
  serviceWorkflowFilter,
  services,
  servicesLoading,
  visibleServices,
}: ServicesTabSectionProps) {
  return (
    <TabsContent value="services" className="data-[state=inactive]:hidden">
      <div className="flex flex-col gap-4 border-b border-border/50 px-4 py-4 sm:px-6 lg:flex-row lg:items-center lg:justify-between">
        <div className="flex flex-1 flex-wrap gap-3">
          <SearchField
            value={serviceSearch}
            onChange={onServiceSearchChange}
            placeholder="Search services..."
            className="w-full min-w-[220px] lg:max-w-[280px]"
          />
          <Select
            value={serviceStatusFilter}
            onValueChange={(value) => onServiceStatusFilterChange(value as ServiceStatusFilter)}
          >
            <SelectTrigger className="min-w-[140px] bg-white">
              <SelectValue placeholder="All status" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All status</SelectItem>
              <SelectItem value="active">Active</SelectItem>
              <SelectItem value="inactive">Inactive</SelectItem>
            </SelectContent>
          </Select>
          <Select
            value={serviceWorkflowFilter}
            onValueChange={(value) => onServiceWorkflowFilterChange(value as WorkflowFilter)}
          >
            <SelectTrigger className="min-w-[160px] bg-white">
              <SelectValue placeholder="All workflows" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All workflows</SelectItem>
              <SelectItem value="configured">Configured</SelectItem>
              <SelectItem value="empty">Needs workflow</SelectItem>
            </SelectContent>
          </Select>
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button type="button" variant="outline" className="bg-white">
                <Filter className="mr-2 h-4 w-4" />
                Filters
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="start" className="w-56">
              <DropdownMenuLabel>More filters</DropdownMenuLabel>
              <DropdownMenuSeparator />
              <DropdownMenuItem onClick={() => onServiceNotesFilterChange("all")}>
                All notes
              </DropdownMenuItem>
              <DropdownMenuItem onClick={() => onServiceNotesFilterChange("with-notes")}>
                Only with notes
              </DropdownMenuItem>
              <DropdownMenuItem onClick={() => onServiceNotesFilterChange("without-notes")}>
                Without notes
              </DropdownMenuItem>
              <DropdownMenuSeparator />
              <DropdownMenuItem onClick={onClearServiceFilters}>
                Clear filters
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>

        <div className="flex flex-wrap gap-3">
          <Button type="button" variant="outline" className="bg-white" onClick={onExport}>
            <Download className="mr-2 h-4 w-4" />
            Export
          </Button>
          <Button type="button" onClick={onCreateService}>
            <Plus className="mr-2 h-4 w-4" />
            Add service
          </Button>
        </div>
      </div>

      <div className="overflow-x-auto">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Service</TableHead>
              <TableHead>Base price</TableHead>
              <TableHead>Status</TableHead>
              <TableHead>Workflow</TableHead>
              <TableHead>Avg. lab time</TableHead>
              <TableHead>Notes</TableHead>
              <TableHead className="w-[120px] text-right">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {servicesLoading ? (
              <TableRow>
                <TableCell colSpan={7} className="py-10 text-center text-sm text-muted-foreground">
                  Loading services...
                </TableCell>
              </TableRow>
            ) : null}

            {!servicesLoading && visibleServices.length === 0 ? (
              <TableRow>
                <TableCell colSpan={7}>
                  <EmptyState
                    title={
                      services.length === 0
                        ? "No services configured yet"
                        : "No services match these filters"
                    }
                    description={
                      services.length === 0
                        ? "Create the first service to define pricing and workflow defaults for new cases."
                        : "Adjust the search or filters to reveal matching services."
                    }
                  />
                </TableCell>
              </TableRow>
            ) : null}

            {!servicesLoading
              ? visibleServices.map((service) => (
                  <TableRow
                    key={service.id}
                    className="cursor-pointer"
                    onClick={() => onOpenService(service.id)}
                  >
                    <TableCell className="font-medium">{service.name}</TableCell>
                    <TableCell>{formatCurrency(service.base_price, currency)}</TableCell>
                    <TableCell>
                      <Badge variant={(service.is_active ?? true) ? "success" : "secondary"}>
                        {(service.is_active ?? true) ? "Active" : "Inactive"}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center gap-2">
                        <Badge variant={service.workflow_json?.steps.length ? "success" : "secondary"}>
                          {service.workflow_json?.steps.length ?? 0} steps
                        </Badge>
                      </div>
                    </TableCell>
                    <TableCell>{formatWorkflowDuration(service)}</TableCell>
                    <TableCell className="max-w-[280px] truncate text-muted-foreground">
                      {service.notes?.trim() || "-"}
                    </TableCell>
                    <TableCell className="text-right">
                      <div className="flex justify-end gap-2">
                        <Button
                          type="button"
                          variant="destructive"
                          size="sm"
                          onClick={(event) => {
                            event.stopPropagation();
                            onDeleteService(service);
                          }}
                          disabled={archivingServiceId === service.id}
                        >
                          {archivingServiceId === service.id ? "Deleting..." : "Delete"}
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                ))
              : null}
          </TableBody>
        </Table>
      </div>

      <div className="flex items-center justify-between px-4 py-4 text-sm text-muted-foreground sm:px-6">
        <span>
          Showing {visibleServices.length} of {services.length} services
        </span>
        <span>{configuredWorkflowCount} workflows configured</span>
      </div>

      {serviceError ? (
        <div className="border-t border-border/50 px-4 py-3 text-sm text-destructive sm:px-6">
          {serviceError}
        </div>
      ) : null}
    </TabsContent>
  );
}

export function ProcessesTabSection({
  activeProcessCount,
  archivingProcessId,
  currency,
  onCreateProcess,
  onDeleteProcess,
  onEditProcess,
  onExport,
  onOpenDedicatedProcessesPage,
  onProcessSearchChange,
  onProcessStatusFilterChange,
  processError,
  processSearch,
  processStatusFilter,
  processes,
  processesLoading,
  visibleProcesses,
}: ProcessesTabSectionProps) {
  return (
    <TabsContent value="processes" className="data-[state=inactive]:hidden">
      <div className="flex flex-col gap-4 border-b border-border/50 px-4 py-4 sm:px-6 lg:flex-row lg:items-center lg:justify-between">
        <div className="flex flex-1 flex-wrap gap-3">
          <SearchField
            value={processSearch}
            onChange={onProcessSearchChange}
            placeholder="Search processes..."
            className="w-full min-w-[220px] lg:max-w-[280px]"
          />
          <Select
            value={processStatusFilter}
            onValueChange={(value) => onProcessStatusFilterChange(value as ProcessStatusFilter)}
          >
            <SelectTrigger className="min-w-[140px] bg-white">
              <SelectValue placeholder="All status" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All status</SelectItem>
              <SelectItem value="active">Active</SelectItem>
              <SelectItem value="inactive">Inactive</SelectItem>
            </SelectContent>
          </Select>
        </div>

        <div className="flex flex-wrap gap-3">
          <Button type="button" variant="outline" className="bg-white" onClick={onExport}>
            <Download className="mr-2 h-4 w-4" />
            Export
          </Button>
          <Button type="button" variant="outline" onClick={onOpenDedicatedProcessesPage}>
            Dedicated page
          </Button>
          <Button type="button" onClick={onCreateProcess}>
            <Plus className="mr-2 h-4 w-4" />
            Add process
          </Button>
        </div>
      </div>

      <div className="overflow-x-auto">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Process</TableHead>
              <TableHead>Status</TableHead>
              <TableHead>Fixed minutes</TableHead>
              <TableHead>Duration</TableHead>
              <TableHead>Labor cost</TableHead>
              <TableHead>Milling</TableHead>
              <TableHead>Description</TableHead>
              <TableHead className="w-[180px] text-right">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {processesLoading ? (
              <TableRow>
                <TableCell colSpan={8} className="py-10 text-center text-sm text-muted-foreground">
                  Loading processes...
                </TableCell>
              </TableRow>
            ) : null}

            {!processesLoading && visibleProcesses.length === 0 ? (
              <TableRow>
                <TableCell colSpan={8}>
                  <EmptyState
                    title={
                      processes.length === 0
                        ? "No processes configured yet"
                        : "No processes match these filters"
                    }
                    description={
                      processes.length === 0
                        ? "Create reusable production defaults before assigning them to service workflows."
                        : "Adjust the search or status filter to reveal matching processes."
                    }
                  />
                </TableCell>
              </TableRow>
            ) : null}

            {!processesLoading
              ? visibleProcesses.map((process) => (
                  <TableRow key={process.id}>
                    <TableCell className="font-medium">{process.name}</TableCell>
                    <TableCell>
                      <Badge variant={(process.is_active ?? true) ? "success" : "secondary"}>
                        {(process.is_active ?? true) ? "Active" : "Inactive"}
                      </Badge>
                    </TableCell>
                    <TableCell>{process.default_fixed_minutes ?? 1}</TableCell>
                    <TableCell>{process.default_expected_duration_days ?? 1}d</TableCell>
                    <TableCell>
                      {formatCurrency(process.default_labor_cost ?? "0.00", currency)}
                    </TableCell>
                    <TableCell>
                      <Badge
                        variant={
                          process.default_requires_milling_machine ? "warning" : "outline"
                        }
                      >
                        {process.default_requires_milling_machine
                          ? "Required"
                          : "Not required"}
                      </Badge>
                    </TableCell>
                    <TableCell className="max-w-[280px] truncate text-muted-foreground">
                      {process.description?.trim() || "-"}
                    </TableCell>
                    <TableCell className="text-right">
                      <div className="flex justify-end gap-2">
                        <Button type="button" variant="outline" size="sm" onClick={() => onEditProcess(process)}>
                          Edit
                        </Button>
                        <Button
                          type="button"
                          variant="destructive"
                          size="sm"
                          onClick={() => onDeleteProcess(process)}
                          disabled={archivingProcessId === process.id}
                        >
                          {archivingProcessId === process.id ? "Deleting..." : "Delete"}
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                ))
              : null}
          </TableBody>
        </Table>
      </div>

      <div className="flex items-center justify-between px-4 py-4 text-sm text-muted-foreground sm:px-6">
        <span>
          Showing {visibleProcesses.length} of {processes.length} processes
        </span>
        <span>{activeProcessCount} active defaults</span>
      </div>

      {processError ? (
        <div className="border-t border-border/50 px-4 py-3 text-sm text-destructive sm:px-6">
          {processError}
        </div>
      ) : null}
    </TabsContent>
  );
}

export function PriceTablesTabSection({
  archivingPriceTableId,
  loadingPriceTableEditor,
  onCreatePriceTable,
  onDeletePriceTable,
  onEditPriceTable,
  onExport,
  onPriceTableSearchChange,
  onPriceTableStatusFilterChange,
  priceTableError,
  priceTableSearch,
  priceTableStatusFilter,
  priceTables,
  priceTablesLoading,
  visiblePriceTables,
}: PriceTablesTabSectionProps) {
  return (
    <TabsContent value="price-tables" className="data-[state=inactive]:hidden">
      <div className="flex flex-col gap-4 border-b border-border/50 px-4 py-4 sm:px-6 lg:flex-row lg:items-center lg:justify-between">
        <div className="flex flex-1 flex-wrap gap-3">
          <SearchField
            value={priceTableSearch}
            onChange={onPriceTableSearchChange}
            placeholder="Search price tables..."
            className="w-full min-w-[220px] lg:max-w-[280px]"
          />
          <Select
            value={priceTableStatusFilter}
            onValueChange={(value) =>
              onPriceTableStatusFilterChange(value as PriceTableStatusFilter)
            }
          >
            <SelectTrigger className="min-w-[140px] bg-white">
              <SelectValue placeholder="All status" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All status</SelectItem>
              <SelectItem value="active">Active</SelectItem>
              <SelectItem value="inactive">Inactive</SelectItem>
            </SelectContent>
          </Select>
        </div>

        <div className="flex flex-wrap gap-3">
          <Button type="button" variant="outline" className="bg-white" onClick={onExport}>
            <Download className="mr-2 h-4 w-4" />
            Export
          </Button>
          <Button
            type="button"
            onClick={onCreatePriceTable}
            disabled={loadingPriceTableEditor}
          >
            <Plus className="mr-2 h-4 w-4" />
            Add price table
          </Button>
        </div>
      </div>

      <div className="overflow-x-auto">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Name</TableHead>
              <TableHead>Service prices</TableHead>
              <TableHead>Assigned customers</TableHead>
              <TableHead>Status</TableHead>
              <TableHead className="w-[180px] text-right">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {priceTablesLoading ? (
              <TableRow>
                <TableCell colSpan={5} className="py-10 text-center text-sm text-muted-foreground">
                  Loading price tables...
                </TableCell>
              </TableRow>
            ) : null}

            {!priceTablesLoading && visiblePriceTables.length === 0 ? (
              <TableRow>
                <TableCell colSpan={5}>
                  <EmptyState
                    title={
                      priceTables.length === 0
                        ? "No price tables yet"
                        : "No price tables match these filters"
                    }
                    description={
                      priceTables.length === 0
                        ? "Create a reusable table when different customers need different default service pricing."
                        : "Adjust the search or status filter to reveal matching price tables."
                    }
                  />
                </TableCell>
              </TableRow>
            ) : null}

            {!priceTablesLoading
              ? visiblePriceTables.map((priceTable) => (
                  <TableRow key={priceTable.id}>
                    <TableCell className="font-medium">{priceTable.name}</TableCell>
                    <TableCell>{priceTable.service_price_count}</TableCell>
                    <TableCell>{priceTable.assigned_customer_count}</TableCell>
                    <TableCell>
                      <Badge variant={priceTable.is_active ? "success" : "secondary"}>
                        {priceTable.is_active ? "Active" : "Inactive"}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-right">
                      <div className="flex justify-end gap-2">
                        <Button
                          type="button"
                          variant="outline"
                          size="sm"
                          onClick={() => onEditPriceTable(priceTable.id)}
                          disabled={loadingPriceTableEditor}
                        >
                          Edit
                        </Button>
                        <Button
                          type="button"
                          variant="destructive"
                          size="sm"
                          onClick={() => onDeletePriceTable(priceTable)}
                          disabled={archivingPriceTableId === priceTable.id}
                        >
                          {archivingPriceTableId === priceTable.id ? "Deleting..." : "Delete"}
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                ))
              : null}
          </TableBody>
        </Table>
      </div>

      <div className="flex items-center justify-between px-4 py-4 text-sm text-muted-foreground sm:px-6">
        <span>
          Showing {visiblePriceTables.length} of {priceTables.length} price tables
        </span>
        <span>
          {priceTables.reduce(
            (total, priceTable) => total + priceTable.assigned_customer_count,
            0,
          )}{" "}
          customer assignments
        </span>
      </div>

      {priceTableError ? (
        <div className="border-t border-border/50 px-4 py-3 text-sm text-destructive sm:px-6">
          {priceTableError}
        </div>
      ) : null}
    </TabsContent>
  );
}

function SearchField({
  value,
  onChange,
  placeholder,
  className,
}: {
  value: string;
  onChange: (value: string) => void;
  placeholder: string;
  className?: string;
}) {
  return (
    <div className={cn("relative", className)}>
      <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
      <Input
        value={value}
        onChange={(event) => onChange(event.target.value)}
        placeholder={placeholder}
        className="h-10 rounded-xl border-border/60 bg-white pl-9 shadow-none"
      />
    </div>
  );
}
