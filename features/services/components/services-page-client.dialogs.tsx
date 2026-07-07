"use client";

import type { Dispatch, SetStateAction } from "react";

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
import { type ServiceTypeOption } from "@/features/cases/types";
import { formatCurrency } from "@/lib/currency";

import {
  type PriceTableEditorState,
  type ProcessEditorState,
  type ServiceEditorState,
} from "../services-api";

export function ServiceEditorDialog({
  currency,
  error,
  onOpenChange,
  onSave,
  open,
  saving,
  setState,
  state,
}: {
  currency: string;
  error: string | null;
  onOpenChange: (open: boolean) => void;
  onSave: () => void;
  open: boolean;
  saving: boolean;
  setState: Dispatch<SetStateAction<ServiceEditorState>>;
  state: ServiceEditorState;
}) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[92vh] overflow-y-auto sm:max-w-[960px]">
        <DialogHeader>
          <DialogTitle>{state.id ? "Edit service" : "Create service"}</DialogTitle>
        </DialogHeader>

        <div className="grid gap-6">
          <div className="grid gap-4 md:grid-cols-2">
            <div className="space-y-2">
              <Label htmlFor="service-name">Name</Label>
              <Input
                id="service-name"
                value={state.name}
                onChange={(event) =>
                  setState((current) => ({
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
                value={state.base_price}
                onChange={(event) =>
                  setState((current) => ({
                    ...current,
                    base_price: event.target.value,
                  }))
                }
              />
              <p className="text-xs text-muted-foreground">
                Saved in {currency} and used when no assigned customer price table
                overrides this service.
              </p>
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="service-notes">Notes</Label>
            <Textarea
              id="service-notes"
              value={state.notes}
              onChange={(event) =>
                setState((current) => ({
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
              checked={state.is_active}
              onChange={(event) =>
                setState((current) => ({
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
              onClick={onSave}
              disabled={saving}
            >
              {saving
                ? "Saving..."
                : state.id
                  ? "Save service"
                  : "Create service"}
            </Button>
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)} disabled={saving}>
              Cancel
            </Button>
          </div>

          {error ? <p className="text-sm text-destructive">{error}</p> : null}
        </div>
      </DialogContent>
    </Dialog>
  );
}

export function ProcessEditorDialog({
  error,
  onOpenChange,
  onSave,
  onUpdateNumberField,
  open,
  saving,
  setState,
  state,
}: {
  error: string | null;
  onOpenChange: (open: boolean) => void;
  onSave: () => void;
  onUpdateNumberField: (
    field: "default_fixed_minutes" | "default_expected_duration_days",
    value: string,
    minimum: number,
  ) => void;
  open: boolean;
  saving: boolean;
  setState: Dispatch<SetStateAction<ProcessEditorState>>;
  state: ProcessEditorState;
}) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-2xl">
        <DialogHeader>
          <DialogTitle>{state.id ? "Edit process" : "Add process"}</DialogTitle>
        </DialogHeader>

        <div className="grid gap-4 py-2">
          <div className="grid gap-2">
            <Label htmlFor="process-name">Name</Label>
            <Input
              id="process-name"
              value={state.name}
              onChange={(event) =>
                setState((current) => ({
                  ...current,
                  name: event.target.value,
                }))
              }
            />
          </div>

          <div className="grid gap-2">
            <Label htmlFor="process-description">Description</Label>
            <Textarea
              id="process-description"
              value={state.description}
              onChange={(event) =>
                setState((current) => ({
                  ...current,
                  description: event.target.value,
                }))
              }
            />
          </div>

          <div className="grid gap-4 sm:grid-cols-2">
            <div className="grid gap-2">
              <Label htmlFor="process-fixed-minutes">Default fixed minutes</Label>
              <Input
                id="process-fixed-minutes"
                type="number"
                min={0}
                step={1}
                value={state.default_fixed_minutes}
                onChange={(event) =>
                  onUpdateNumberField("default_fixed_minutes", event.target.value, 0)
                }
              />
            </div>

            <div className="grid gap-2">
              <Label htmlFor="process-duration-days">Default duration days</Label>
              <Input
                id="process-duration-days"
                type="number"
                min={1}
                step={1}
                value={state.default_expected_duration_days}
                onChange={(event) =>
                  onUpdateNumberField(
                    "default_expected_duration_days",
                    event.target.value,
                    1,
                  )
                }
              />
            </div>

            <div className="grid gap-2">
              <Label htmlFor="process-labor-cost">Default labor cost</Label>
              <Input
                id="process-labor-cost"
                inputMode="decimal"
                placeholder="0.00"
                value={state.default_labor_cost}
                onChange={(event) =>
                  setState((current) => ({
                    ...current,
                    default_labor_cost: event.target.value,
                  }))
                }
              />
            </div>
          </div>

          <div className="flex flex-col gap-3">
            <label className="flex items-center gap-2 text-sm">
              <input
                type="checkbox"
                checked={state.default_requires_milling_machine}
                onChange={(event) =>
                  setState((current) => ({
                    ...current,
                    default_requires_milling_machine: event.target.checked,
                  }))
                }
              />
              Default this process to require milling machine capacity
            </label>
            <label className="flex items-center gap-2 text-sm">
              <input
                type="checkbox"
                checked={state.is_active}
                onChange={(event) =>
                  setState((current) => ({
                    ...current,
                    is_active: event.target.checked,
                  }))
                }
              />
              Active process
            </label>
          </div>

          <div className="flex justify-end gap-2">
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
              Cancel
            </Button>
            <Button type="button" onClick={onSave} disabled={saving}>
              {saving ? "Saving..." : "Save process"}
            </Button>
          </div>

          {error ? <p className="text-sm text-destructive">{error}</p> : null}
        </div>
      </DialogContent>
    </Dialog>
  );
}

export function PriceTableEditorDialog({
  currency,
  error,
  getPriceTableServicePrice,
  loading,
  onOpenChange,
  onSave,
  onUpdatePrice,
  open,
  saving,
  services,
  setState,
  state,
}: {
  currency: string;
  error: string | null;
  getPriceTableServicePrice: (serviceTypeId: string) => string;
  loading: boolean;
  onOpenChange: (open: boolean) => void;
  onSave: () => void;
  onUpdatePrice: (serviceTypeId: string, price: string) => void;
  open: boolean;
  saving: boolean;
  services: ServiceTypeOption[];
  setState: Dispatch<SetStateAction<PriceTableEditorState>>;
  state: PriceTableEditorState;
}) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[92vh] overflow-y-auto sm:max-w-[960px]">
        <DialogHeader>
          <DialogTitle>
            {state.id ? "Edit price table" : "Create price table"}
          </DialogTitle>
        </DialogHeader>

        <div className="grid gap-6">
          <div className="grid gap-4 md:grid-cols-2">
            <div className="space-y-2">
              <Label htmlFor="price-table-name">Name</Label>
              <Input
                id="price-table-name"
                value={state.name}
                onChange={(event) =>
                  setState((current) => ({
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
                checked={state.is_active}
                onChange={(event) =>
                  setState((current) => ({
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
                  {services.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={3} className="py-8 text-center text-sm text-muted-foreground">
                        Add services before filling this table.
                      </TableCell>
                    </TableRow>
                  ) : (
                    services.map((service) => (
                      <TableRow key={service.id}>
                        <TableCell className="font-medium">{service.name}</TableCell>
                        <TableCell>{formatCurrency(service.base_price, currency)}</TableCell>
                        <TableCell>
                          <Input
                            type="number"
                            min={0}
                            step="0.01"
                            value={getPriceTableServicePrice(service.id)}
                            onChange={(event) => onUpdatePrice(service.id, event.target.value)}
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
              onClick={onSave}
              disabled={saving || loading}
            >
              {saving
                ? "Saving..."
                : state.id
                  ? "Save price table"
                  : "Create price table"}
            </Button>
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)} disabled={saving}>
              Cancel
            </Button>
          </div>

          {error ? <p className="text-sm text-destructive">{error}</p> : null}
        </div>
      </DialogContent>
    </Dialog>
  );
}

export function DeleteServiceDialog({
  archivingServiceId,
  onConfirm,
  onOpenChange,
  pendingDeleteService,
}: {
  archivingServiceId: string | null;
  onConfirm: () => void;
  onOpenChange: (open: boolean) => void;
  pendingDeleteService: ServiceTypeOption | null;
}) {
  return (
    <AlertDialog open={Boolean(pendingDeleteService)} onOpenChange={onOpenChange}>
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
          <AlertDialogCancel disabled={Boolean(archivingServiceId)}>Cancel</AlertDialogCancel>
          <AlertDialogAction
            variant="destructive"
            disabled={!pendingDeleteService || archivingServiceId === pendingDeleteService.id}
            onClick={onConfirm}
          >
            {pendingDeleteService && archivingServiceId === pendingDeleteService.id
              ? "Deleting..."
              : "Delete"}
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}

export function DeleteProcessDialog({
  onConfirm,
  onOpenChange,
  pendingDeleteProcess,
}: {
  onConfirm: () => void;
  onOpenChange: (open: boolean) => void;
  pendingDeleteProcess: { id: string; name: string } | null;
}) {
  return (
    <AlertDialog open={Boolean(pendingDeleteProcess)} onOpenChange={onOpenChange}>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>Delete process?</AlertDialogTitle>
          <AlertDialogDescription>
            {pendingDeleteProcess
              ? `Delete ${pendingDeleteProcess.name}? This archives the process so it can no longer be used in new workflow templates.`
              : "Delete this process?"}
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel>Cancel</AlertDialogCancel>
          <AlertDialogAction onClick={onConfirm}>Delete</AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}

export function DeletePriceTableDialog({
  archivingPriceTableId,
  onConfirm,
  onOpenChange,
  pendingDeletePriceTable,
}: {
  archivingPriceTableId: string | null;
  onConfirm: () => void;
  onOpenChange: (open: boolean) => void;
  pendingDeletePriceTable: { id: string; name: string } | null;
}) {
  return (
    <AlertDialog open={Boolean(pendingDeletePriceTable)} onOpenChange={onOpenChange}>
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
          <AlertDialogCancel disabled={Boolean(archivingPriceTableId)}>Cancel</AlertDialogCancel>
          <AlertDialogAction
            variant="destructive"
            disabled={
              !pendingDeletePriceTable ||
              archivingPriceTableId === pendingDeletePriceTable.id
            }
            onClick={onConfirm}
          >
            {pendingDeletePriceTable &&
            archivingPriceTableId === pendingDeletePriceTable.id
              ? "Deleting..."
              : "Delete"}
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}
