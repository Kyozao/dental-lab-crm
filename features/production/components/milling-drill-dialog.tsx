"use client";

import * as React from "react";
import { Trash2 } from "lucide-react";

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
  MillingDrillInventoryRow,
  MillingMachineInventoryRow,
} from "@/features/production/production.types";
import {
  createMillingDrill,
  deleteMillingDrill,
  updateMillingDrill,
} from "@/features/production/services/production-api";
import { ApiError } from "@/lib/api";

type MillingDrillDialogProps = {
  drill: MillingDrillInventoryRow | null;
  machines: MillingMachineInventoryRow[];
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSaved: () => Promise<void>;
};

const defaultValue = {
  name: "",
  millingMachineId: "unassigned",
  status: "ACTIVE" as const,
  currentBlocksCount: "0",
  estimatedMaxBlocks: "",
  installedAt: "",
  removedAt: "",
  notes: "",
};

type DrillStatusValue = "ACTIVE" | "STORED" | "RETIRED" | "LOST";

export function MillingDrillDialog({
  drill,
  machines,
  open,
  onOpenChange,
  onSaved,
}: MillingDrillDialogProps) {
  const [name, setName] = React.useState(defaultValue.name);
  const [millingMachineId, setMillingMachineId] = React.useState(
    defaultValue.millingMachineId,
  );
  const [status, setStatus] = React.useState<DrillStatusValue>(
    defaultValue.status,
  );
  const [currentBlocksCount, setCurrentBlocksCount] = React.useState(
    defaultValue.currentBlocksCount,
  );
  const [estimatedMaxBlocks, setEstimatedMaxBlocks] = React.useState(
    defaultValue.estimatedMaxBlocks,
  );
  const [installedAt, setInstalledAt] = React.useState(
    defaultValue.installedAt,
  );
  const [removedAt, setRemovedAt] = React.useState(defaultValue.removedAt);
  const [notes, setNotes] = React.useState(defaultValue.notes);
  const [submitting, setSubmitting] = React.useState(false);
  const [deleting, setDeleting] = React.useState(false);
  const [confirmDeleteOpen, setConfirmDeleteOpen] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);
  const [fieldErrors, setFieldErrors] = React.useState<Record<
    string,
    string[]
  > | null>(null);

  React.useEffect(() => {
    const nextValue = drill
      ? {
          name: drill.name,
          millingMachineId: drill.millingMachineId ?? "unassigned",
          status: drill.status,
          currentBlocksCount: drill.currentBlocksCount.toString(),
          estimatedMaxBlocks: drill.estimatedMaxBlocks?.toString() ?? "",
          installedAt: toDateInput(drill.installedAt),
          removedAt: toDateInput(drill.removedAt),
          notes: drill.notes ?? "",
        }
      : defaultValue;

    setName(nextValue.name);
    setMillingMachineId(nextValue.millingMachineId);
    setStatus(nextValue.status);
    setCurrentBlocksCount(nextValue.currentBlocksCount);
    setEstimatedMaxBlocks(nextValue.estimatedMaxBlocks);
    setInstalledAt(nextValue.installedAt);
    setRemovedAt(nextValue.removedAt);
    setNotes(nextValue.notes);
    setSubmitting(false);
    setDeleting(false);
    setConfirmDeleteOpen(false);
    setError(null);
    setFieldErrors(null);
  }, [drill, open]);

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setSubmitting(true);
    setError(null);
    setFieldErrors(null);

    try {
      const payload = {
        name,
        millingMachineId:
          millingMachineId === "unassigned" ? "" : millingMachineId,
        status,
        currentBlocksCount: Number.parseInt(currentBlocksCount || "0", 10),
        estimatedMaxBlocks: estimatedMaxBlocks
          ? Number.parseInt(estimatedMaxBlocks, 10)
          : null,
        installedAt,
        removedAt,
        notes,
      };

      if (drill) {
        await updateMillingDrill(drill.id, payload);
      } else {
        await createMillingDrill(payload);
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
            : "Failed to save milling drill.",
        );
      }
    } finally {
      setSubmitting(false);
    }
  }

  async function handleDelete() {
    if (!drill) return;

    setDeleting(true);
    setError(null);

    try {
      await deleteMillingDrill(drill.id);
      setConfirmDeleteOpen(false);
      onOpenChange(false);
      await onSaved();
    } catch (deleteError) {
      setError(
        deleteError instanceof Error
          ? deleteError.message
          : "Failed to delete milling drill.",
      );
    } finally {
      setDeleting(false);
    }
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
            <DialogTitle>{drill ? "Edit drill" : "Add drill"}</DialogTitle>
            <DialogDescription>
              Manage drill lifecycle, wear, and machine assignment from the
              milling inventory tab.
            </DialogDescription>
          </DialogHeader>

          <form className="grid gap-4" onSubmit={handleSubmit}>
            <section className="grid gap-4 rounded-xl border border-border/60 bg-muted/20 p-4">
              <div>
                <h3 className="text-sm font-semibold">Drill details</h3>
                <p className="text-sm text-muted-foreground">
                  Basic inventory identity and current lifecycle status.
                </p>
              </div>

              <div className="grid gap-3 sm:grid-cols-2">
                <Field label="Name" field="name" errors={fieldErrors}>
                  <Input
                    value={name}
                    onChange={(event) => setName(event.target.value)}
                    placeholder="Diamond 1.0mm"
                    required
                  />
                </Field>

                <Field label="Status" field="status" errors={fieldErrors}>
                  <Select
                    value={status}
                    onValueChange={(value) =>
                      setStatus(value as DrillStatusValue)
                    }
                  >
                    <SelectTrigger className="w-full">
                      <SelectValue placeholder="Select status" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="ACTIVE">Active</SelectItem>
                      <SelectItem value="STORED">Stored</SelectItem>
                      <SelectItem value="RETIRED">Retired</SelectItem>
                      <SelectItem value="LOST">Lost</SelectItem>
                    </SelectContent>
                  </Select>
                </Field>
              </div>

              <Field
                label="Assigned machine"
                field="millingMachineId"
                errors={fieldErrors}
                hint="Keep this unassigned if the drill is spare stock."
              >
                <Select
                  value={millingMachineId}
                  onValueChange={setMillingMachineId}
                >
                  <SelectTrigger className="w-full">
                    <SelectValue placeholder="No machine assigned" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="unassigned">Unassigned</SelectItem>
                    {machines.map((machine) => (
                      <SelectItem key={machine.id} value={machine.id}>
                        {machine.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </Field>
            </section>

            <section className="grid gap-4 rounded-xl border border-border/60 bg-background p-4">
              <div>
                <h3 className="text-sm font-semibold">Wear tracking</h3>
                <p className="text-sm text-muted-foreground">
                  Track actual usage now and add an estimated limit only when
                  you have one.
                </p>
              </div>

              <div className="items-start grid gap-3 sm:grid-cols-2">
                <Field
                  label="Blocks used"
                  field="currentBlocksCount"
                  errors={fieldErrors}
                  className="sm:self-start"
                >
                  <Input
                    type="number"
                    min="0"
                    value={currentBlocksCount}
                    onChange={(event) =>
                      setCurrentBlocksCount(event.target.value)
                    }
                  />
                </Field>

                <Field
                  label="Estimated max blocks"
                  field="estimatedMaxBlocks"
                  errors={fieldErrors}
                  hint="Optional. Leave blank if you do not track a wear limit for this drill."
                  className="sm:self-start"
                >
                  <Input
                    type="number"
                    min="0"
                    value={estimatedMaxBlocks}
                    onChange={(event) =>
                      setEstimatedMaxBlocks(event.target.value)
                    }
                    placeholder="Optional"
                  />
                </Field>
              </div>
            </section>

            <section className="grid gap-4 rounded-xl border border-border/60 bg-muted/20 p-4">
              <div>
                <h3 className="text-sm font-semibold">Dates and notes</h3>
                <p className="text-sm text-muted-foreground">
                  Maintenance timeline and any handoff context for the next
                  operator.
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

              <Field label="Notes" field="notes" errors={fieldErrors}>
                <Textarea
                  rows={5}
                  value={notes}
                  onChange={(event) => setNotes(event.target.value)}
                  placeholder="Wear observations, replacement notes, or failure context."
                />
              </Field>
            </section>

            {error ? <p className="text-sm text-destructive">{error}</p> : null}

            <div className="flex items-center justify-between gap-3 pt-1">
              <div>
                {drill ? (
                  <Button
                    type="button"
                    variant="outline"
                    onClick={() => setConfirmDeleteOpen(true)}
                  >
                    <Trash2 className="h-4 w-4" />
                    Delete drill
                  </Button>
                ) : null}
              </div>
              <Button type="submit" disabled={submitting || deleting}>
                {submitting
                  ? "Saving..."
                  : drill
                    ? "Save changes"
                    : "Create drill"}
              </Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>

      <AlertDialog open={confirmDeleteOpen} onOpenChange={setConfirmDeleteOpen}>
        <AlertDialogContent size="sm">
          <AlertDialogHeader>
            <AlertDialogTitle>Delete drill</AlertDialogTitle>
            <AlertDialogDescription>
              This will delete {drill?.name ?? "this drill"} and clear its
              milling references where allowed.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={deleting}>Cancel</AlertDialogCancel>
            <AlertDialogAction
              variant="destructive"
              disabled={deleting}
              onClick={handleDelete}
            >
              {deleting ? "Deleting..." : "Delete drill"}
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
  className?: string;
  children: React.ReactNode;
}) {
  return (
    <div className={props.className ? `grid gap-2 ${props.className}` : "grid gap-2"}>
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
