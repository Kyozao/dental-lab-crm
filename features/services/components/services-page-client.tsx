"use client";

import { useMemo, useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { Boxes, Cog, TableProperties } from "lucide-react";
import { useRouter } from "next/navigation";

import { Panel } from "@/components/app/panel";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { processesQueryKey } from "@/features/cases/hooks/useProcesses";
import { serviceTypesQueryKey, useServiceTypes } from "@/features/cases/hooks/useServiceTypes";
import { type ProcessOption, type ServiceTypeOption } from "@/features/cases/types";

import {
  archivePriceTableApi,
  archiveProcessApi,
  archiveServiceApi,
  buildDefaultPriceTableEditorState,
  buildDefaultProcessEditorState,
  buildDefaultServiceEditorState,
  buildPriceTableEditorState,
  buildProcessEditorState,
  createPriceTableApi,
  createProcessApi,
  createServiceApi,
  getCurrentLabSettingsApi,
  getPriceTableApi,
  listProcessesApi,
  listPriceTablesApi,
  serviceHasWorkflow,
  type PriceTableEditorState,
  type ProcessEditorState,
  type ServiceEditorState,
  updateProcessApi,
  updatePriceTableApi,
  updateServiceApi,
} from "../services-api";
import {
  DeletePriceTableDialog,
  DeleteProcessDialog,
  DeleteServiceDialog,
  PriceTableEditorDialog,
  ProcessEditorDialog,
  ServiceEditorDialog,
} from "./services-page-client.dialogs";
import { ServicesPageOverview } from "./services-page-client.overview";
import {
  PriceTablesTabSection,
  ProcessesTabSection,
  ServicesTabSection,
} from "./services-page-client.sections";
import {
  type CatalogTab,
  type PriceTableStatusFilter,
  type ProcessStatusFilter,
  type ServiceNotesFilter,
  type ServiceStatusFilter,
  type WorkflowFilter,
} from "./services-page-client.types";
import {
  buildPriceTablesCsvRows,
  buildProcessesCsvRows,
  buildServicesCsvRows,
  downloadCsv,
} from "./services-page-client.utils";

const labSettingsQueryKey = ["lab-settings"] as const;
const priceTablesQueryKey = ["price-tables"] as const;

export function ServicesPageClient() {
  const router = useRouter();
  const queryClient = useQueryClient();
  const servicesQuery = useServiceTypes(true);
  const labSettingsQuery = useQuery({
    queryKey: labSettingsQueryKey,
    queryFn: getCurrentLabSettingsApi,
  });
  const processesQuery = useQuery({
    queryKey: processesQueryKey,
    queryFn: listProcessesApi,
  });
  const priceTablesQuery = useQuery({
    queryKey: priceTablesQueryKey,
    queryFn: listPriceTablesApi,
  });

  const [activeTab, setActiveTab] = useState<CatalogTab>("services");

  const [serviceSearch, setServiceSearch] = useState("");
  const [serviceStatusFilter, setServiceStatusFilter] =
    useState<ServiceStatusFilter>("all");
  const [serviceWorkflowFilter, setServiceWorkflowFilter] =
    useState<WorkflowFilter>("all");
  const [serviceNotesFilter, setServiceNotesFilter] =
    useState<ServiceNotesFilter>("all");

  const [processSearch, setProcessSearch] = useState("");
  const [processStatusFilter, setProcessStatusFilter] =
    useState<ProcessStatusFilter>("all");

  const [priceTableSearch, setPriceTableSearch] = useState("");
  const [priceTableStatusFilter, setPriceTableStatusFilter] =
    useState<PriceTableStatusFilter>("all");

  const [serviceEditorOpen, setServiceEditorOpen] = useState(false);
  const [serviceEditorState, setServiceEditorState] = useState<ServiceEditorState>(
    buildDefaultServiceEditorState(),
  );
  const [savingService, setSavingService] = useState(false);
  const [archivingServiceId, setArchivingServiceId] = useState<string | null>(null);
  const [pendingDeleteService, setPendingDeleteService] =
    useState<ServiceTypeOption | null>(null);
  const [serviceError, setServiceError] = useState<string | null>(null);

  const [processEditorOpen, setProcessEditorOpen] = useState(false);
  const [processEditorState, setProcessEditorState] = useState<ProcessEditorState>(
    buildDefaultProcessEditorState(),
  );
  const [savingProcess, setSavingProcess] = useState(false);
  const [archivingProcessId, setArchivingProcessId] = useState<string | null>(null);
  const [pendingDeleteProcess, setPendingDeleteProcess] =
    useState<ProcessOption | null>(null);
  const [processError, setProcessError] = useState<string | null>(null);

  const [priceTableEditorOpen, setPriceTableEditorOpen] = useState(false);
  const [priceTableEditorState, setPriceTableEditorState] =
    useState<PriceTableEditorState>(buildDefaultPriceTableEditorState());
  const [loadingPriceTableEditor, setLoadingPriceTableEditor] = useState(false);
  const [savingPriceTable, setSavingPriceTable] = useState(false);
  const [archivingPriceTableId, setArchivingPriceTableId] = useState<string | null>(
    null,
  );
  const [pendingDeletePriceTable, setPendingDeletePriceTable] = useState<{
    id: string;
    name: string;
  } | null>(null);
  const [priceTableError, setPriceTableError] = useState<string | null>(null);

  const services = useMemo(
    () => [...(servicesQuery.data ?? [])].sort((a, b) => a.name.localeCompare(b.name)),
    [servicesQuery.data],
  );
  const processes = useMemo(
    () => [...(processesQuery.data ?? [])].sort((a, b) => a.name.localeCompare(b.name)),
    [processesQuery.data],
  );
  const priceTables = useMemo(
    () =>
      [...(priceTablesQuery.data ?? [])].sort((a, b) => a.name.localeCompare(b.name)),
    [priceTablesQuery.data],
  );

  const currency = labSettingsQuery.data?.currency ?? services[0]?.currency ?? "BRL";

  const activeServiceCount = useMemo(
    () => services.filter((service) => service.is_active ?? true).length,
    [services],
  );
  const activeProcessCount = useMemo(
    () => processes.filter((process) => process.is_active ?? true).length,
    [processes],
  );
  const configuredWorkflowCount = useMemo(
    () => services.filter((service) => serviceHasWorkflow(service)).length,
    [services],
  );
  const missingWorkflowCount = services.length - configuredWorkflowCount;
  const activePriceTableCount = useMemo(
    () => priceTables.filter((priceTable) => priceTable.is_active).length,
    [priceTables],
  );

  const visibleServices = useMemo(
    () =>
      services.filter((service) => {
        const matchesSearch =
          !serviceSearch.trim() ||
          service.name.toLowerCase().includes(serviceSearch.trim().toLowerCase()) ||
          (service.notes ?? "").toLowerCase().includes(serviceSearch.trim().toLowerCase());
        const isActive = service.is_active ?? true;
        const matchesStatus =
          serviceStatusFilter === "all" ||
          (serviceStatusFilter === "active" && isActive) ||
          (serviceStatusFilter === "inactive" && !isActive);
        const hasWorkflow = serviceHasWorkflow(service);
        const matchesWorkflow =
          serviceWorkflowFilter === "all" ||
          (serviceWorkflowFilter === "configured" && hasWorkflow) ||
          (serviceWorkflowFilter === "empty" && !hasWorkflow);
        const hasNotes = Boolean(service.notes?.trim());
        const matchesNotes =
          serviceNotesFilter === "all" ||
          (serviceNotesFilter === "with-notes" && hasNotes) ||
          (serviceNotesFilter === "without-notes" && !hasNotes);
        return matchesSearch && matchesStatus && matchesWorkflow && matchesNotes;
      }),
    [services, serviceNotesFilter, serviceSearch, serviceStatusFilter, serviceWorkflowFilter],
  );

  const visibleProcesses = useMemo(
    () =>
      processes.filter((process) => {
        const query = processSearch.trim().toLowerCase();
        const matchesSearch =
          !query ||
          process.name.toLowerCase().includes(query) ||
          (process.description ?? "").toLowerCase().includes(query);
        const isActive = process.is_active ?? true;
        const matchesStatus =
          processStatusFilter === "all" ||
          (processStatusFilter === "active" && isActive) ||
          (processStatusFilter === "inactive" && !isActive);
        return matchesSearch && matchesStatus;
      }),
    [processSearch, processStatusFilter, processes],
  );

  const visiblePriceTables = useMemo(
    () =>
      priceTables.filter((priceTable) => {
        const matchesSearch =
          !priceTableSearch.trim() ||
          priceTable.name.toLowerCase().includes(priceTableSearch.trim().toLowerCase());
        const matchesStatus =
          priceTableStatusFilter === "all" ||
          (priceTableStatusFilter === "active" && priceTable.is_active) ||
          (priceTableStatusFilter === "inactive" && !priceTable.is_active);
        return matchesSearch && matchesStatus;
      }),
    [priceTableSearch, priceTableStatusFilter, priceTables],
  );

  function openCreateServiceDialog() {
    setServiceError(null);
    setServiceEditorState(buildDefaultServiceEditorState());
    setServiceEditorOpen(true);
  }

  function openCreateProcessDialog() {
    setProcessError(null);
    setProcessEditorState(buildDefaultProcessEditorState());
    setProcessEditorOpen(true);
  }

  function openEditProcessDialog(process: ProcessOption) {
    setProcessError(null);
    setProcessEditorState(buildProcessEditorState(process));
    setProcessEditorOpen(true);
  }

  function openCreatePriceTableDialog() {
    setPriceTableError(null);
    setPriceTableEditorState(buildDefaultPriceTableEditorState());
    setPriceTableEditorOpen(true);
  }

  async function openEditPriceTableDialog(priceTableId: string) {
    try {
      setLoadingPriceTableEditor(true);
      setPriceTableError(null);
      const priceTable = await getPriceTableApi(priceTableId);
      setPriceTableEditorState(buildPriceTableEditorState(priceTable));
      setPriceTableEditorOpen(true);
    } catch (error) {
      setPriceTableError(
        error instanceof Error ? error.message : "Failed to load price table.",
      );
    } finally {
      setLoadingPriceTableEditor(false);
    }
  }

  async function refreshAll() {
    await Promise.all([
      servicesQuery.refetch(),
      processesQuery.refetch(),
      priceTablesQuery.refetch(),
      labSettingsQuery.refetch(),
    ]);
  }

  async function handleSaveService() {
    try {
      setSavingService(true);
      setServiceError(null);

      const payload = {
        name: serviceEditorState.name,
        base_price: serviceEditorState.base_price,
        notes: serviceEditorState.notes.trim() || null,
        is_active: serviceEditorState.is_active,
        workflow_json: serviceEditorState.workflow_json,
      };

      if (serviceEditorState.id) {
        await updateServiceApi(serviceEditorState.id, payload);
      } else {
        await createServiceApi(payload);
      }

      await Promise.all([
        queryClient.invalidateQueries({ queryKey: serviceTypesQueryKey }),
        queryClient.invalidateQueries({ queryKey: labSettingsQueryKey }),
      ]);
      setServiceEditorOpen(false);
    } catch (saveError) {
      setServiceError(
        saveError instanceof Error ? saveError.message : "Failed to save service.",
      );
    } finally {
      setSavingService(false);
    }
  }

  async function handleArchiveService(serviceId: string) {
    try {
      setArchivingServiceId(serviceId);
      setServiceError(null);
      await archiveServiceApi(serviceId);
      await queryClient.invalidateQueries({ queryKey: serviceTypesQueryKey });
      setPendingDeleteService(null);
    } catch (archiveError) {
      setServiceError(
        archiveError instanceof Error
          ? archiveError.message
          : "Failed to archive service.",
      );
    } finally {
      setArchivingServiceId(null);
    }
  }

  async function handleSaveProcess() {
    try {
      setSavingProcess(true);
      setProcessError(null);

      const payload = {
        name: processEditorState.name,
        description: processEditorState.description.trim() || null,
        default_fixed_minutes: processEditorState.default_fixed_minutes,
        default_expected_duration_days:
          processEditorState.default_expected_duration_days,
        default_requires_milling_machine:
          processEditorState.default_requires_milling_machine,
        default_labor_cost: processEditorState.default_labor_cost,
        is_active: processEditorState.is_active,
      };

      if (processEditorState.id) {
        await updateProcessApi(processEditorState.id, payload);
      } else {
        await createProcessApi(payload);
      }

      await queryClient.invalidateQueries({ queryKey: processesQueryKey });
      setProcessEditorOpen(false);
    } catch (saveError) {
      setProcessError(
        saveError instanceof Error ? saveError.message : "Failed to save process.",
      );
    } finally {
      setSavingProcess(false);
    }
  }

  async function handleArchiveProcess(processId: string) {
    try {
      setArchivingProcessId(processId);
      setProcessError(null);
      await archiveProcessApi(processId);
      await queryClient.invalidateQueries({ queryKey: processesQueryKey });
      setPendingDeleteProcess(null);
    } catch (archiveError) {
      setProcessError(
        archiveError instanceof Error
          ? archiveError.message
          : "Failed to archive process.",
      );
    } finally {
      setArchivingProcessId(null);
    }
  }

  async function handleSavePriceTable() {
    try {
      setSavingPriceTable(true);
      setPriceTableError(null);

      const payload = {
        name: priceTableEditorState.name,
        is_active: priceTableEditorState.is_active,
        service_prices: priceTableEditorState.service_prices
          .filter((row) => row.price.trim())
          .map((row) => ({
            service_type_id: row.service_type_id,
            price: row.price,
          })),
      };

      if (priceTableEditorState.id) {
        await updatePriceTableApi(priceTableEditorState.id, payload);
      } else {
        await createPriceTableApi(payload);
      }

      await queryClient.invalidateQueries({ queryKey: priceTablesQueryKey });
      setPriceTableEditorOpen(false);
    } catch (saveError) {
      setPriceTableError(
        saveError instanceof Error
          ? saveError.message
          : "Failed to save price table.",
      );
    } finally {
      setSavingPriceTable(false);
    }
  }

  async function handleArchivePriceTable(priceTableId: string) {
    try {
      setArchivingPriceTableId(priceTableId);
      setPriceTableError(null);
      await archivePriceTableApi(priceTableId);
      await queryClient.invalidateQueries({ queryKey: priceTablesQueryKey });
      setPendingDeletePriceTable(null);
    } catch (archiveError) {
      setPriceTableError(
        archiveError instanceof Error
          ? archiveError.message
          : "Failed to archive price table.",
      );
    } finally {
      setArchivingPriceTableId(null);
    }
  }

  function updateProcessNumberField(
    field: "default_fixed_minutes" | "default_expected_duration_days",
    value: string,
    minimum: number,
  ) {
    setProcessEditorState((current) => ({
      ...current,
      [field]: Math.max(minimum, Number(value) || minimum),
    }));
  }

  function updatePriceTableServicePrice(serviceTypeId: string, price: string) {
    setPriceTableEditorState((current) => {
      const existingRow = current.service_prices.find(
        (row) => row.service_type_id === serviceTypeId,
      );

      if (!price.trim()) {
        return {
          ...current,
          service_prices: current.service_prices.filter(
            (row) => row.service_type_id !== serviceTypeId,
          ),
        };
      }

      if (!existingRow) {
        return {
          ...current,
          service_prices: [
            ...current.service_prices,
            { service_type_id: serviceTypeId, price },
          ],
        };
      }

      return {
        ...current,
        service_prices: current.service_prices.map((row) =>
          row.service_type_id === serviceTypeId ? { ...row, price } : row,
        ),
      };
    });
  }

  function getPriceTableServicePrice(serviceTypeId: string) {
    return (
      priceTableEditorState.service_prices.find(
        (row) => row.service_type_id === serviceTypeId,
      )?.price ?? ""
    );
  }

  function clearServiceFilters() {
    setServiceSearch("");
    setServiceStatusFilter("all");
    setServiceWorkflowFilter("all");
    setServiceNotesFilter("all");
  }

  function exportCurrentView() {
    if (activeTab === "services") {
      downloadCsv(
        "services.csv",
        buildServicesCsvRows(visibleServices, currency),
      );
      return;
    }

    if (activeTab === "processes") {
      downloadCsv(
        "processes.csv",
        buildProcessesCsvRows(visibleProcesses, currency),
      );
      return;
    }

    downloadCsv("price-tables.csv", buildPriceTablesCsvRows(visiblePriceTables));
  }

  const loadingAny =
    servicesQuery.isLoading ||
    processesQuery.isLoading ||
    priceTablesQuery.isLoading ||
    labSettingsQuery.isLoading;

  return (
    <>
      <div className="grid gap-5">
        <ServicesPageOverview
          activePriceTableCount={activePriceTableCount}
          activeProcessCount={activeProcessCount}
          activeServiceCount={activeServiceCount}
          loadingAny={loadingAny}
          missingWorkflowCount={missingWorkflowCount}
          onOpenCreatePriceTableDialog={openCreatePriceTableDialog}
          onOpenCreateProcessDialog={openCreateProcessDialog}
          onOpenCreateServiceDialog={openCreateServiceDialog}
          onRefreshAll={() => void refreshAll()}
          onReviewMissingWorkflows={() => {
            setActiveTab("services");
            setServiceWorkflowFilter("empty");
          }}
          onShowPriceTables={() => setActiveTab("price-tables")}
          onShowProcesses={() => setActiveTab("processes")}
          onShowServices={() => setActiveTab("services")}
          priceTableCount={priceTables.length}
          processCount={processes.length}
          serviceCount={services.length}
        />

        <Panel className="rounded-[28px] border border-border/60 bg-background/95">
          <Tabs
            value={activeTab}
            onValueChange={(value) => setActiveTab(value as CatalogTab)}
            className="gap-0"
          >
            <div className="border-b border-border/50 px-4 pt-4 sm:px-6 sm:pt-6">
              <TabsList
                variant="line"
                className="h-auto w-full justify-start gap-4 overflow-x-auto pb-2"
              >
                <TabsTrigger value="services" className="gap-2 px-1.5 pb-3 pt-0 text-base">
                  <Boxes className="h-4 w-4" />
                  Services
                </TabsTrigger>
                <TabsTrigger value="processes" className="gap-2 px-1.5 pb-3 pt-0 text-base">
                  <Cog className="h-4 w-4" />
                  Processes
                </TabsTrigger>
                <TabsTrigger value="price-tables" className="gap-2 px-1.5 pb-3 pt-0 text-base">
                  <TableProperties className="h-4 w-4" />
                  Price tables
                </TabsTrigger>
              </TabsList>
            </div>

            <ServicesTabSection
              archivingServiceId={archivingServiceId}
              configuredWorkflowCount={configuredWorkflowCount}
              currency={currency}
              onClearServiceFilters={clearServiceFilters}
              onCreateService={openCreateServiceDialog}
              onDeleteService={setPendingDeleteService}
              onExport={exportCurrentView}
              onOpenService={(serviceId) => router.push(`/services/${serviceId}`)}
              onServiceNotesFilterChange={setServiceNotesFilter}
              onServiceSearchChange={setServiceSearch}
              onServiceStatusFilterChange={setServiceStatusFilter}
              onServiceWorkflowFilterChange={setServiceWorkflowFilter}
              serviceError={serviceError}
              serviceSearch={serviceSearch}
              serviceStatusFilter={serviceStatusFilter}
              serviceWorkflowFilter={serviceWorkflowFilter}
              services={services}
              servicesLoading={servicesQuery.isLoading}
              visibleServices={visibleServices}
            />

            <ProcessesTabSection
              activeProcessCount={activeProcessCount}
              archivingProcessId={archivingProcessId}
              currency={currency}
              onCreateProcess={openCreateProcessDialog}
              onDeleteProcess={setPendingDeleteProcess}
              onEditProcess={openEditProcessDialog}
              onExport={exportCurrentView}
              onOpenDedicatedProcessesPage={() => router.push("/services/processes")}
              onProcessSearchChange={setProcessSearch}
              onProcessStatusFilterChange={setProcessStatusFilter}
              processError={processError}
              processSearch={processSearch}
              processStatusFilter={processStatusFilter}
              processes={processes}
              processesLoading={processesQuery.isLoading}
              visibleProcesses={visibleProcesses}
            />

            <PriceTablesTabSection
              archivingPriceTableId={archivingPriceTableId}
              loadingPriceTableEditor={loadingPriceTableEditor}
              onCreatePriceTable={openCreatePriceTableDialog}
              onDeletePriceTable={(priceTable) =>
                setPendingDeletePriceTable({
                  id: priceTable.id,
                  name: priceTable.name,
                })
              }
              onEditPriceTable={(priceTableId) => void openEditPriceTableDialog(priceTableId)}
              onExport={exportCurrentView}
              onPriceTableSearchChange={setPriceTableSearch}
              onPriceTableStatusFilterChange={setPriceTableStatusFilter}
              priceTableError={priceTableError}
              priceTableSearch={priceTableSearch}
              priceTableStatusFilter={priceTableStatusFilter}
              priceTables={priceTables}
              priceTablesLoading={priceTablesQuery.isLoading}
              visiblePriceTables={visiblePriceTables}
            />
          </Tabs>
        </Panel>
      </div>

      <ServiceEditorDialog
        currency={currency}
        error={serviceError}
        onOpenChange={setServiceEditorOpen}
        onSave={() => void handleSaveService()}
        open={serviceEditorOpen}
        saving={savingService}
        setState={setServiceEditorState}
        state={serviceEditorState}
      />

      <ProcessEditorDialog
        error={processError}
        onOpenChange={setProcessEditorOpen}
        onSave={() => void handleSaveProcess()}
        onUpdateNumberField={updateProcessNumberField}
        open={processEditorOpen}
        saving={savingProcess}
        setState={setProcessEditorState}
        state={processEditorState}
      />

      <PriceTableEditorDialog
        currency={currency}
        error={priceTableError}
        getPriceTableServicePrice={getPriceTableServicePrice}
        loading={loadingPriceTableEditor}
        onOpenChange={setPriceTableEditorOpen}
        onSave={() => void handleSavePriceTable()}
        onUpdatePrice={updatePriceTableServicePrice}
        open={priceTableEditorOpen}
        saving={savingPriceTable}
        services={services}
        setState={setPriceTableEditorState}
        state={priceTableEditorState}
      />

      <DeleteServiceDialog
        archivingServiceId={archivingServiceId}
        onConfirm={() => {
          if (!pendingDeleteService) return;
          void handleArchiveService(pendingDeleteService.id);
        }}
        onOpenChange={(open) => {
          if (!open) setPendingDeleteService(null);
        }}
        pendingDeleteService={pendingDeleteService}
      />

      <DeleteProcessDialog
        onConfirm={() => {
          if (!pendingDeleteProcess) return;
          void handleArchiveProcess(pendingDeleteProcess.id);
        }}
        onOpenChange={(open) => {
          if (!open) setPendingDeleteProcess(null);
        }}
        pendingDeleteProcess={pendingDeleteProcess}
      />

      <DeletePriceTableDialog
        archivingPriceTableId={archivingPriceTableId}
        onConfirm={() => {
          if (!pendingDeletePriceTable) return;
          void handleArchivePriceTable(pendingDeletePriceTable.id);
        }}
        onOpenChange={(open) => {
          if (!open) setPendingDeletePriceTable(null);
        }}
        pendingDeletePriceTable={pendingDeletePriceTable}
      />
    </>
  );
}
