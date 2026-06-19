"use client";

import { useMemo, useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useRouter } from "next/navigation";
import { Settings2 } from "lucide-react";

import { EmptyState } from "@/components/app/empty-state";
import { Panel, PanelHeader } from "@/components/app/panel";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Textarea } from "@/components/ui/textarea";
import { serviceTypesQueryKey, useServiceTypes } from "@/features/cases/hooks/useServiceTypes";
import { type ServiceTypeOption } from "@/features/cases/types";
import { formatCurrency } from "@/lib/currency";

import {
  archivePriceTableApi,
  archiveServiceApi,
  buildDefaultPriceTableEditorState,
  buildDefaultServiceEditorState,
  buildPriceTableEditorState,
  createPriceTableApi,
  createServiceApi,
  getCurrentLabSettingsApi,
  getPriceTableApi,
  listPriceTablesApi,
  serviceHasWorkflow,
  type PriceTableEditorState,
  type ServiceEditorState,
  updatePriceTableApi,
  updateServiceApi,
} from "../services-api";

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
  const priceTablesQuery = useQuery({
    queryKey: priceTablesQueryKey,
    queryFn: listPriceTablesApi,
  });

  const [editorOpen, setEditorOpen] = useState(false);
  const [editorState, setEditorState] = useState<ServiceEditorState>(
    buildDefaultServiceEditorState(),
  );
  const [savingService, setSavingService] = useState(false);
  const [archivingServiceId, setArchivingServiceId] = useState<string | null>(null);
  const [pendingDeleteService, setPendingDeleteService] =
    useState<ServiceTypeOption | null>(null);
  const [serviceError, setServiceError] = useState<string | null>(null);

  const [priceTableEditorOpen, setPriceTableEditorOpen] = useState(false);
  const [priceTableEditorState, setPriceTableEditorState] =
    useState<PriceTableEditorState>(buildDefaultPriceTableEditorState());
  const [loadingPriceTableEditor, setLoadingPriceTableEditor] = useState(false);
  const [savingPriceTable, setSavingPriceTable] = useState(false);
  const [archivingPriceTableId, setArchivingPriceTableId] = useState<string | null>(null);
  const [pendingDeletePriceTable, setPendingDeletePriceTable] = useState<{
    id: string;
    name: string;
  } | null>(null);
  const [priceTableError, setPriceTableError] = useState<string | null>(null);

  const services = useMemo(() => servicesQuery.data ?? [], [servicesQuery.data]);
  const priceTables = useMemo(
    () => priceTablesQuery.data ?? [],
    [priceTablesQuery.data],
  );
  const currency = labSettingsQuery.data?.currency ?? services[0]?.currency ?? "BRL";
  const loading =
    servicesQuery.isLoading ||
    servicesQuery.isFetching ||
    labSettingsQuery.isLoading;
  const loadingPriceTables = priceTablesQuery.isLoading || priceTablesQuery.isFetching;

  const sortedServices = useMemo(
    () => [...services].sort((a, b) => a.name.localeCompare(b.name)),
    [services],
  );

  function openCreateDialog() {
    setServiceError(null);
    setEditorState(buildDefaultServiceEditorState());
    setEditorOpen(true);
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
      labSettingsQuery.refetch(),
      priceTablesQuery.refetch(),
    ]);
  }

  async function handleSaveService() {
    try {
      setSavingService(true);
      setServiceError(null);

      const payload = {
        name: editorState.name,
        base_price: editorState.base_price,
        notes: editorState.notes.trim() || null,
        is_active: editorState.is_active,
        workflow_json: editorState.workflow_json,
      };

      if (editorState.id) {
        await updateServiceApi(editorState.id, payload);
      } else {
        await createServiceApi(payload);
      }

      await Promise.all([
        queryClient.invalidateQueries({ queryKey: serviceTypesQueryKey }),
        queryClient.invalidateQueries({ queryKey: labSettingsQueryKey }),
      ]);
      setEditorOpen(false);
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

  return (
    <>
      <div className="grid gap-5">
        <Panel>
          <PanelHeader>
            <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
              <div>
                <h2 className="text-base font-semibold">Service catalog</h2>
                <p className="text-sm text-muted-foreground">
                  Manage service names, pricing, and workflow templates.
                </p>
              </div>
              <div className="flex flex-wrap gap-2">
                <Button type="button" variant="outline" onClick={() => void refreshAll()} disabled={loading || loadingPriceTables}>
                  Refresh
                </Button>
                <Button type="button" onClick={openCreateDialog}>
                  Add service
                </Button>
              </div>
            </div>
          </PanelHeader>

          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Service</TableHead>
                  <TableHead>Base price</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Workflow</TableHead>
                  <TableHead>Notes</TableHead>
                  <TableHead className="w-[220px] text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {loading ? (
                  <TableRow>
                    <TableCell colSpan={6} className="py-8 text-center text-sm text-muted-foreground">
                      Loading services...
                    </TableCell>
                  </TableRow>
                ) : null}

                {!loading && sortedServices.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={6}>
                      <EmptyState
                        title="No services configured yet"
                        description="Create the first service to define pricing and workflow defaults for new cases."
                      />
                    </TableCell>
                  </TableRow>
                ) : null}

                {!loading
                  ? sortedServices.map((service) => (
                      <TableRow
                        key={service.id}
                        className="cursor-pointer"
                        onClick={() => router.push(`/services/${service.id}`)}
                      >
                        <TableCell className="font-medium">{service.name}</TableCell>
                        <TableCell>{formatCurrency(service.base_price, currency)}</TableCell>
                        <TableCell>
                          <Badge variant={service.is_active ? "success" : "secondary"}>
                            {service.is_active ? "Active" : "Inactive"}
                          </Badge>
                        </TableCell>
                        <TableCell>
                          <Badge variant={serviceHasWorkflow(service) ? "success" : "secondary"}>
                            {serviceHasWorkflow(service) ? "Configured" : "Empty"}
                          </Badge>
                        </TableCell>
                        <TableCell className="max-w-[260px] truncate text-muted-foreground">
                          {service.notes || "-"}
                        </TableCell>
                        <TableCell className="text-right">
                          <div className="flex justify-end gap-2">
                            <Button
                              type="button"
                              variant="outline"
                              size="sm"
                              onClick={(event) => {
                                event.stopPropagation();
                                router.push(`/services/${service.id}`);
                              }}
                            >
                              Open
                            </Button>
                            <Button
                              type="button"
                              variant="outline"
                              size="icon"
                              aria-label={`Open workflow settings for ${service.name}`}
                              onClick={(event) => {
                                event.stopPropagation();
                                router.push(`/services/${service.id}/workflow`);
                              }}
                            >
                              <Settings2 className="h-4 w-4" />
                            </Button>
                            <Button
                              type="button"
                              variant="destructive"
                              size="sm"
                              onClick={(event) => {
                                event.stopPropagation();
                                setPendingDeleteService(service);
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
          {serviceError ? (
            <div className="border-t border-border/40 px-4 py-3 text-sm text-destructive sm:px-6">
              {serviceError}
            </div>
          ) : null}
        </Panel>

        <Panel>
          <PanelHeader>
            <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
              <div>
                <h2 className="text-base font-semibold">Customer price tables</h2>
                <p className="text-sm text-muted-foreground">
                  Create reusable pricing sets that customers can inherit before the service base-price fallback.
                </p>
              </div>
              <Button type="button" onClick={openCreatePriceTableDialog} disabled={loadingPriceTableEditor}>
                Add price table
              </Button>
            </div>
          </PanelHeader>

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
                {loadingPriceTables ? (
                  <TableRow>
                    <TableCell colSpan={5} className="py-8 text-center text-sm text-muted-foreground">
                      Loading price tables...
                    </TableCell>
                  </TableRow>
                ) : null}

                {!loadingPriceTables && priceTables.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={5}>
                      <EmptyState
                        title="No price tables yet"
                        description="Create a reusable table when different customers need different default service pricing."
                      />
                    </TableCell>
                  </TableRow>
                ) : null}

                {!loadingPriceTables
                  ? priceTables.map((priceTable) => (
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
                              onClick={() => void openEditPriceTableDialog(priceTable.id)}
                              disabled={loadingPriceTableEditor}
                            >
                              Edit
                            </Button>
                            <Button
                              type="button"
                              variant="destructive"
                              size="sm"
                              onClick={() =>
                                setPendingDeletePriceTable({
                                  id: priceTable.id,
                                  name: priceTable.name,
                                })
                              }
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
          {priceTableError ? (
            <div className="border-t border-border/40 px-4 py-3 text-sm text-destructive sm:px-6">
              {priceTableError}
            </div>
          ) : null}
        </Panel>
      </div>

      <Dialog open={editorOpen} onOpenChange={setEditorOpen}>
        <DialogContent className="max-h-[92vh] overflow-y-auto sm:max-w-[960px]">
          <DialogHeader>
            <DialogTitle>{editorState.id ? "Edit service" : "Create service"}</DialogTitle>
          </DialogHeader>

          <div className="grid gap-6">
            <div className="grid gap-4 md:grid-cols-2">
              <div className="space-y-2">
                <Label htmlFor="service-name">Name</Label>
                <Input
                  id="service-name"
                  value={editorState.name}
                  onChange={(event) =>
                    setEditorState((current) => ({
                      ...current,
                      name: event.target.value,
                    }))
                  }
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="service-price">Base price</Label>
                <Input
                  id="service-price"
                  type="number"
                  min={0}
                  step="0.01"
                  value={editorState.base_price}
                  onChange={(event) =>
                    setEditorState((current) => ({
                      ...current,
                      base_price: event.target.value,
                    }))
                  }
                />
                <p className="text-xs text-muted-foreground">
                  Saved in {currency} and used when no assigned customer price table overrides this service.
                </p>
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="service-notes">Notes</Label>
              <Textarea
                id="service-notes"
                value={editorState.notes}
                onChange={(event) =>
                  setEditorState((current) => ({
                    ...current,
                    notes: event.target.value,
                  }))
                }
                placeholder="Internal notes for the service template"
              />
            </div>

            <div className="flex items-center gap-2">
              <input
                id="service-active"
                type="checkbox"
                checked={editorState.is_active}
                onChange={(event) =>
                  setEditorState((current) => ({
                    ...current,
                    is_active: event.target.checked,
                  }))
                }
                className="h-4 w-4"
              />
              <Label htmlFor="service-active">Active service</Label>
            </div>

            <div className="flex gap-3">
              <Button
                type="button"
                onClick={() => void handleSaveService()}
                disabled={savingService}
              >
                {savingService ? "Saving..." : editorState.id ? "Save service" : "Create service"}
              </Button>
              <Button
                type="button"
                variant="outline"
                onClick={() => setEditorOpen(false)}
                disabled={savingService}
              >
                Cancel
              </Button>
            </div>

            {serviceError ? <p className="text-sm text-destructive">{serviceError}</p> : null}
          </div>
        </DialogContent>
      </Dialog>

      <Dialog open={priceTableEditorOpen} onOpenChange={setPriceTableEditorOpen}>
        <DialogContent className="max-h-[92vh] overflow-y-auto sm:max-w-[960px]">
          <DialogHeader>
            <DialogTitle>
              {priceTableEditorState.id ? "Edit price table" : "Create price table"}
            </DialogTitle>
          </DialogHeader>

          <div className="grid gap-6">
            <div className="grid gap-4 md:grid-cols-2">
              <div className="space-y-2">
                <Label htmlFor="price-table-name">Name</Label>
                <Input
                  id="price-table-name"
                  value={priceTableEditorState.name}
                  onChange={(event) =>
                    setPriceTableEditorState((current) => ({
                      ...current,
                      name: event.target.value,
                    }))
                  }
                />
              </div>

              <div className="flex items-center gap-2 pt-7">
                <input
                  id="price-table-active"
                  type="checkbox"
                  checked={priceTableEditorState.is_active}
                  onChange={(event) =>
                    setPriceTableEditorState((current) => ({
                      ...current,
                      is_active: event.target.checked,
                    }))
                  }
                  className="h-4 w-4"
                />
                <Label htmlFor="price-table-active">Active price table</Label>
              </div>
            </div>

            <div className="space-y-3">
              <div>
                <h3 className="text-sm font-medium">Per-service prices</h3>
                <p className="text-sm text-muted-foreground">
                  Leave a service blank to fall back to its base price.
                </p>
              </div>

              <div className="overflow-x-auto rounded-lg border">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Service</TableHead>
                      <TableHead>Base price</TableHead>
                      <TableHead>Table price</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {sortedServices.length === 0 ? (
                      <TableRow>
                        <TableCell colSpan={3} className="py-8 text-center text-sm text-muted-foreground">
                          Add services before filling this table.
                        </TableCell>
                      </TableRow>
                    ) : (
                      sortedServices.map((service) => (
                        <TableRow key={service.id}>
                          <TableCell className="font-medium">{service.name}</TableCell>
                          <TableCell>{formatCurrency(service.base_price, currency)}</TableCell>
                          <TableCell>
                            <Input
                              type="number"
                              min={0}
                              step="0.01"
                              value={getPriceTableServicePrice(service.id)}
                              onChange={(event) =>
                                updatePriceTableServicePrice(service.id, event.target.value)
                              }
                              placeholder={service.base_price}
                            />
                          </TableCell>
                        </TableRow>
                      ))
                    )}
                  </TableBody>
                </Table>
              </div>
            </div>

            <div className="flex gap-3">
              <Button
                type="button"
                onClick={() => void handleSavePriceTable()}
                disabled={savingPriceTable || loadingPriceTableEditor}
              >
                {savingPriceTable
                  ? "Saving..."
                  : priceTableEditorState.id
                    ? "Save price table"
                    : "Create price table"}
              </Button>
              <Button
                type="button"
                variant="outline"
                onClick={() => setPriceTableEditorOpen(false)}
                disabled={savingPriceTable}
              >
                Cancel
              </Button>
            </div>

            {priceTableError ? <p className="text-sm text-destructive">{priceTableError}</p> : null}
          </div>
        </DialogContent>
      </Dialog>

      <AlertDialog
        open={Boolean(pendingDeleteService)}
        onOpenChange={(open) => {
          if (!open) setPendingDeleteService(null);
        }}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete service?</AlertDialogTitle>
            <AlertDialogDescription>
              {pendingDeleteService
                ? `Delete service "${pendingDeleteService.name}"? This will remove it from the active catalog.`
                : "Delete this service?"}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={Boolean(archivingServiceId)}>
              Cancel
            </AlertDialogCancel>
            <AlertDialogAction
              variant="destructive"
              disabled={
                !pendingDeleteService ||
                archivingServiceId === pendingDeleteService.id
              }
              onClick={() => {
                if (!pendingDeleteService) return;
                void handleArchiveService(pendingDeleteService.id);
              }}
            >
              {pendingDeleteService &&
              archivingServiceId === pendingDeleteService.id
                ? "Deleting..."
                : "Delete"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <AlertDialog
        open={Boolean(pendingDeletePriceTable)}
        onOpenChange={(open) => {
          if (!open) setPendingDeletePriceTable(null);
        }}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete price table?</AlertDialogTitle>
            <AlertDialogDescription>
              {pendingDeletePriceTable
                ? `Delete price table "${pendingDeletePriceTable.name}"? Assigned customers will fall back to service base prices.`
                : "Delete this price table?"}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={Boolean(archivingPriceTableId)}>
              Cancel
            </AlertDialogCancel>
            <AlertDialogAction
              variant="destructive"
              disabled={
                !pendingDeletePriceTable ||
                archivingPriceTableId === pendingDeletePriceTable.id
              }
              onClick={() => {
                if (!pendingDeletePriceTable) return;
                void handleArchivePriceTable(pendingDeletePriceTable.id);
              }}
            >
              {pendingDeletePriceTable &&
              archivingPriceTableId === pendingDeletePriceTable.id
                ? "Deleting..."
                : "Delete"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}
