"use client";

import * as React from "react";
import { Plus, Trash2 } from "lucide-react";

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
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import type {
  MillingMachineInventoryRow,
  MillingMachineSlotPreset,
} from "@/features/production/production.types";
import {
  createMillingMachine,
  deleteMillingMachine,
  updateMillingMachine,
} from "@/features/production/services/production-api";
import { ApiError } from "@/lib/api";

type MillingMachineDialogProps = {
  machine: MillingMachineInventoryRow | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSaved: () => Promise<void>;
};

const defaultValue = {
  name: "",
  serialNumber: "",
  model: "",
  status: "ACTIVE" as const,
  statusReason: "",
  installedAt: "",
  removedAt: "",
  lastMaintenanceAt: "",
  nextMaintenanceDueAt: "",
  notes: "",
  slotPresets: [
    { id: "default-slot-1", label: "1.0mm", sortOrder: 1 },
    { id: "default-slot-2", label: "2.5mm", sortOrder: 2 },
  ] satisfies MillingMachineSlotPreset[],
};

type MachineStatusValue = "ACTIVE" | "INACTIVE" | "MAINTENANCE";

export function MillingMachineDialog({
  machine,
  open,
  onOpenChange,
  onSaved,
}: MillingMachineDialogProps) {
  const [name, setName] = React.useState(defaultValue.name);
  const [serialNumber, setSerialNumber] = React.useState(
    defaultValue.serialNumber,
  );
  const [model, setModel] = React.useState(defaultValue.model);
  const [status, setStatus] = React.useState<MachineStatusValue>(
    defaultValue.status,
  );
  const [statusReason, setStatusReason] = React.useState(
    defaultValue.statusReason,
  );
  const [installedAt, setInstalledAt] = React.useState(
    defaultValue.installedAt,
  );
  const [removedAt, setRemovedAt] = React.useState(defaultValue.removedAt);
  const [lastMaintenanceAt, setLastMaintenanceAt] = React.useState(
    defaultValue.lastMaintenanceAt,
  );
  const [nextMaintenanceDueAt, setNextMaintenanceDueAt] = React.useState(
    defaultValue.nextMaintenanceDueAt,
  );
  const [notes, setNotes] = React.useState(defaultValue.notes);
  const [slotPresets, setSlotPresets] = React.useState(
    defaultValue.slotPresets,
  );
  const [submitting, setSubmitting] = React.useState(false);
  const [deleting, setDeleting] = React.useState(false);
  const [confirmDeleteOpen, setConfirmDeleteOpen] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);
  const [fieldErrors, setFieldErrors] = React.useState<Record<
    string,
    string[]
  > | null>(null);

  React.useEffect(() => {
    const nextValue = machine
      ? {
          name: machine.name,
          serialNumber: machine.serialNumber ?? "",
          model: machine.model ?? "",
          status: machine.status,
          statusReason: machine.statusReason ?? "",
          installedAt: toDateInput(machine.installedAt),
          removedAt: toDateInput(machine.removedAt),
          lastMaintenanceAt: toDateInput(machine.lastMaintenanceAt),
          nextMaintenanceDueAt: toDateInput(machine.nextMaintenanceDueAt),
          notes: machine.notes ?? "",
          slotPresets: machine.slotPresets,
        }
      : defaultValue;

    setName(nextValue.name);
    setSerialNumber(nextValue.serialNumber);
    setModel(nextValue.model);
    setStatus(nextValue.status);
    setStatusReason(nextValue.statusReason);
    setInstalledAt(nextValue.installedAt);
    setRemovedAt(nextValue.removedAt);
    setLastMaintenanceAt(nextValue.lastMaintenanceAt);
    setNextMaintenanceDueAt(nextValue.nextMaintenanceDueAt);
    setNotes(nextValue.notes);
    setSlotPresets(nextValue.slotPresets);
    setSubmitting(false);
    setDeleting(false);
    setConfirmDeleteOpen(false);
    setError(null);
    setFieldErrors(null);
  }, [machine, open]);

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setSubmitting(true);
    setError(null);
    setFieldErrors(null);

    try {
      const payload = {
        name,
        serialNumber,
        model,
        status,
        statusReason,
        installedAt,
        removedAt,
        lastMaintenanceAt,
        nextMaintenanceDueAt,
        notes,
        slotPresets: slotPresets.map((slot, index) => ({
          id: machine ? slot.id : undefined,
          label: slot.label,
          sortOrder: index + 1,
        })),
      };

      if (machine) {
        await updateMillingMachine(machine.id, payload);
      } else {
        await createMillingMachine(payload);
      }

      onOpenChange(false);
      await onSaved();
    } catch (submitError) {
      if (submitError instanceof ApiError) {
        setError(submitError.message);
        setFieldErrors(submitError.fields ?? null);
      } else {
        setError(
          submitError instanceof Error
            ? submitError.message
            : "Failed to save milling machine.",
        );
      }
    } finally {
      setSubmitting(false);
    }
  }

  async function handleDelete() {
    if (!machine) return;

    setDeleting(true);
    setError(null);

    try {
      await deleteMillingMachine(machine.id);
      setConfirmDeleteOpen(false);
      onOpenChange(false);
      await onSaved();
    } catch (deleteError) {
      setError(
        deleteError instanceof Error
          ? deleteError.message
          : "Failed to delete milling machine.",
      );
    } finally {
      setDeleting(false);
    }
  }

  function addSlot() {
    setSlotPresets((current) => [
      ...current,
      {
        id: `draft-slot-${current.length + 1}`,
        label: "",
        sortOrder: current.length + 1,
      },
    ]);
  }

  function updateSlot(
    index: number,
    nextValue: Partial<Pick<MillingMachineSlotPreset, "label">>,
  ) {
    setSlotPresets((current) =>
      current.map((slot, slotIndex) =>
        slotIndex === index ? { ...slot, ...nextValue } : slot,
      ),
    );
  }

  function removeSlot(index: number) {
    setSlotPresets((current) =>
      current.filter((_, slotIndex) => slotIndex !== index),
    );
  }

  return (
    <>
      <Dialog
        open={open}
        onOpenChange={(nextOpen) => {
          onOpenChange(nextOpen);
          if (!nextOpen) {
            setConfirmDeleteOpen(false);
          }
        }}
      >
        <DialogContent className="sm:max-w-3xl max-h-[85vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>
              {machine ? "Edit machine" : "Add machine"}
            </DialogTitle>
            <DialogDescription>
              Track milling machine status, maintenance dates, and the required
              drill slot preset for the department workspace.
            </DialogDescription>
          </DialogHeader>

          <form className="grid gap-4" onSubmit={handleSubmit}>
            <section className="grid gap-4 rounded-xl border border-border/60 bg-muted/20 p-4">
              <div>
                <h3 className="text-sm font-semibold">Machine details</h3>
                <p className="text-sm text-muted-foreground">
                  Core identity, availability, and operator-facing status for
                  this machine.
                </p>
              </div>

              <div className="grid gap-3 sm:grid-cols-2">
                <Field label="Name" field="name" errors={fieldErrors}>
                  <Input
                    value={name}
                    onChange={(event) => setName(event.target.value)}
                    placeholder="Roland DWX-52D"
                    required
                  />
                </Field>

                <Field label="Status" field="status" errors={fieldErrors}>
                  <Select
                    value={status}
                    onValueChange={(value) =>
                      setStatus(value as MachineStatusValue)
                    }
                  >
                    <SelectTrigger className="w-full">
                      <SelectValue placeholder="Select status" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="ACTIVE">Active</SelectItem>
                      <SelectItem value="MAINTENANCE">Maintenance</SelectItem>
                      <SelectItem value="INACTIVE">Inactive</SelectItem>
                    </SelectContent>
                  </Select>
                </Field>
              </div>

              <div className="grid gap-3 sm:grid-cols-2">
                <Field
                  label="Serial number"
                  field="serialNumber"
                  errors={fieldErrors}
                >
                  <Input
                    value={serialNumber}
                    onChange={(event) => setSerialNumber(event.target.value)}
                    placeholder="Optional"
                  />
                </Field>

                <Field label="Model" field="model" errors={fieldErrors}>
                  <Input
                    value={model}
                    onChange={(event) => setModel(event.target.value)}
                    placeholder="Optional"
                  />
                </Field>
              </div>

              <Field
                label="Status reason"
                field="statusReason"
                errors={fieldErrors}
                hint="Useful for downtime, maintenance context, or operator handoff notes."
              >
                <Input
                  value={statusReason}
                  onChange={(event) => setStatusReason(event.target.value)}
                  placeholder="Optional operator note"
                />
              </Field>
            </section>

            <section className="grid gap-4 rounded-xl border border-border/60 bg-background p-4">
              <div>
                <h3 className="text-sm font-semibold">Required drill slots</h3>
                <p className="text-sm text-muted-foreground">
                  These slots define exactly which drill fields appear when
                  recording a milling run.
                </p>
              </div>

              <Field
                label="Drill slots"
                field="slotPresets"
                errors={fieldErrors}
              >
                <div className="space-y-3 rounded-xl border border-border/60 bg-muted/20 p-3">
                  {slotPresets.map((slot, index) => (
                    <div
                      key={slot.id}
                      className="flex items-center gap-3 rounded-lg border border-border/60 bg-background p-3"
                    >
                      <div className="w-14 shrink-0 text-sm font-medium text-muted-foreground">
                        Slot {index + 1}
                      </div>
                      <Input
                        className="flex-1"
                        value={slot.label}
                        onChange={(event) =>
                          updateSlot(index, { label: event.target.value })
                        }
                        placeholder="e.g. 1.0mm or Finishing"
                      />
                      <Button
                        type="button"
                        variant="outline"
                        size="icon"
                        className="shrink-0"
                        onClick={() => removeSlot(index)}
                        disabled={slotPresets.length === 1}
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                  ))}
                  <Button type="button" variant="outline" onClick={addSlot}>
                    <Plus className="h-4 w-4" />
                    Add slot
                  </Button>
                </div>
              </Field>
            </section>

            <section className="grid gap-4 rounded-xl border border-border/60 bg-muted/20 p-4">
              <div>
                <h3 className="text-sm font-semibold">Maintenance timeline</h3>
                <p className="text-sm text-muted-foreground">
                  Track installation, maintenance cadence, and general notes
                  without crowding the main inputs.
                </p>
              </div>

              <div className="grid gap-3 sm:grid-cols-2">
                <Field
                  label="Installed at"
                  field="installedAt"
                  errors={fieldErrors}
                >
                  <Input
                    type="date"
                    value={installedAt}
                    onChange={(event) => setInstalledAt(event.target.value)}
                  />
                </Field>

                <Field
                  label="Removed at"
                  field="removedAt"
                  errors={fieldErrors}
                >
                  <Input
                    type="date"
                    value={removedAt}
                    onChange={(event) => setRemovedAt(event.target.value)}
                  />
                </Field>
              </div>

              <div className="grid gap-3 sm:grid-cols-2">
                <Field
                  label="Last maintenance"
                  field="lastMaintenanceAt"
                  errors={fieldErrors}
                >
                  <Input
                    type="date"
                    value={lastMaintenanceAt}
                    onChange={(event) =>
                      setLastMaintenanceAt(event.target.value)
                    }
                  />
                </Field>

                <Field
                  label="Next maintenance due"
                  field="nextMaintenanceDueAt"
                  errors={fieldErrors}
                >
                  <Input
                    type="date"
                    value={nextMaintenanceDueAt}
                    onChange={(event) =>
                      setNextMaintenanceDueAt(event.target.value)
                    }
                  />
                </Field>
              </div>

              <Field label="Notes" field="notes" errors={fieldErrors}>
                <Textarea
                  rows={5}
                  value={notes}
                  onChange={(event) => setNotes(event.target.value)}
                  placeholder="Maintenance history, quirks, or handoff notes."
                />
              </Field>
            </section>

            {error ? <p className="text-sm text-destructive">{error}</p> : null}

            <div className="flex items-center justify-between gap-3 pt-1">
              <div>
                {machine ? (
                  <Button
                    type="button"
                    variant="outline"
                    onClick={() => setConfirmDeleteOpen(true)}
                  >
                    <Trash2 className="h-4 w-4" />
                    Delete machine
                  </Button>
                ) : null}
              </div>
              <Button type="submit" disabled={submitting || deleting}>
                {submitting
                  ? "Saving..."
                  : machine
                    ? "Save changes"
                    : "Create machine"}
              </Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>

      <AlertDialog open={confirmDeleteOpen} onOpenChange={setConfirmDeleteOpen}>
        <AlertDialogContent size="sm">
          <AlertDialogHeader>
            <AlertDialogTitle>Delete machine</AlertDialogTitle>
            <AlertDialogDescription>
              This will delete {machine?.name ?? "this machine"} and clear its
              current drill and milling references where allowed.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={deleting}>Cancel</AlertDialogCancel>
            <AlertDialogAction
              variant="destructive"
              disabled={deleting}
              onClick={handleDelete}
            >
              {deleting ? "Deleting..." : "Delete machine"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}

function Field(props: {
  label: string;
  field: string;
  errors: Record<string, string[]> | null;
  hint?: string;
  children: React.ReactNode;
}) {
  return (
    <div className="grid gap-2">
      <Label>{props.label}</Label>
      {props.children}
      {props.hint ? (
        <p className="text-xs text-muted-foreground">{props.hint}</p>
      ) : null}
      {props.errors?.[props.field]?.map((fieldError) => (
        <p key={fieldError} className="text-sm text-destructive">
          {fieldError}
        </p>
      ))}
    </div>
  );
}

function toDateInput(value: string | null) {
  return value ? value.slice(0, 10) : "";
}
