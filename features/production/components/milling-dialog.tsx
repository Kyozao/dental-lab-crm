"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import { Pencil, Plus } from "lucide-react";

import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
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
import { createMilling, updateMilling } from "@/features/production/services/production-api";
import type {
  MillingDialogBlockType,
  MillingDialogCase,
  MillingDialogDrill,
  MillingMachineInventoryRow,
  MillingRecord,
} from "@/features/production/production.types";
import type { CreateMillingInput } from "@/features/production/schemas/production";

interface MillingDialogProps {
  blockTypes: MillingDialogBlockType[];
  millingDrills: MillingDialogDrill[];
  machines: MillingMachineInventoryRow[];
  cases: MillingDialogCase[];
  caseId?: string;
  milling?: MillingRecord;
  trigger?: React.ReactNode;
  onSubmitted?: () => void | Promise<void>;
}

type MillingFormData = {
  caseId: string;
  caseProcessId: string;
  blockTypeId: string;
  millingMachineId: string;
  selectedDrillSlots: Record<string, string>;
  teethMilledQty: string;
  blocksUsedQty: string;
  status: "SUCCESS" | "FAILED";
  failureReason: string;
  notes: string;
  milledAt: string;
};

function buildInitialFormData({
  cases,
  caseId,
  milling,
}: Pick<MillingDialogProps, "cases" | "caseId" | "milling">): MillingFormData {
  const targetCaseId = milling?.caseId ?? caseId;
  const selectedCase = targetCaseId
    ? cases.find((item) => item.id === targetCaseId) ?? null
    : cases[0] ?? null;

  return {
    caseId: milling?.caseId ?? caseId ?? selectedCase?.id ?? "",
    caseProcessId: selectedCase?.caseProcessId ?? "",
    blockTypeId: milling?.blockTypeId ?? "",
    millingMachineId: milling?.millingMachineId ?? "",
    selectedDrillSlots: Object.fromEntries(
      (milling?.selectedDrillSlots ?? []).flatMap((slot) =>
        slot.machineSlotId ? [[slot.machineSlotId, slot.drillId]] : [],
      ),
    ),
    teethMilledQty: milling?.teethMilledQty?.toString() ?? "0",
    blocksUsedQty: milling?.blocksUsedQty?.toString() ?? "1",
    status: milling?.status ?? "SUCCESS",
    failureReason: milling?.failureReason ?? "",
    notes: milling?.notes ?? "",
    milledAt: milling?.milledAt
      ? new Date(milling.milledAt).toISOString().slice(0, 16)
      : new Date().toISOString().slice(0, 16),
  };
}

export function MillingDialog({
  blockTypes,
  millingDrills,
  machines,
  cases,
  caseId,
  milling,
  trigger,
  onSubmitted,
}: MillingDialogProps) {
  const router = useRouter();
  const [open, setOpen] = React.useState(false);
  const [loading, setLoading] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);
  const [formData, setFormData] = React.useState<MillingFormData>(() =>
    buildInitialFormData({ cases, caseId, milling }),
  );

  React.useEffect(() => {
    if (!open) {
      setFormData(buildInitialFormData({ cases, caseId, milling }));
      setError(null);
    }
  }, [caseId, cases, milling, open]);

  const selectedCase = cases.find((item) => item.id === formData.caseId) ?? null;
  const selectedMachine =
    machines.find((item) => item.id === formData.millingMachineId) ?? null;
  const visibleSlots = selectedMachine?.slotPresets ?? [];
  const compatibleDrills = React.useMemo(
    () =>
      millingDrills.filter(
        (drill) =>
          !formData.millingMachineId ||
          drill.millingMachineId === null ||
          drill.millingMachineId === formData.millingMachineId,
      ),
    [formData.millingMachineId, millingDrills],
  );

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setLoading(true);

    if (!formData.millingMachineId) {
      setError("Select a milling machine.");
      setLoading(false);
      return;
    }

    const selectedDrillSlots = visibleSlots.map((slot) => ({
      machineSlotId: slot.id,
      drillId: formData.selectedDrillSlots[slot.id] ?? "",
    }));

    if (selectedDrillSlots.some((slot) => !slot.drillId)) {
      setError("Select a drill for every machine slot.");
      setLoading(false);
      return;
    }

    if (
      new Set(selectedDrillSlots.map((slot) => slot.drillId)).size !==
      selectedDrillSlots.length
    ) {
      setError("The same drill cannot fill multiple slots.");
      setLoading(false);
      return;
    }

    try {
      const payload: CreateMillingInput = {
        caseId: formData.caseId,
        caseProcessId: formData.caseProcessId || null,
        blockTypeId: formData.blockTypeId,
        millingMachineId: formData.millingMachineId,
        selectedDrillSlots,
        teethMilledQty: Number.parseInt(formData.teethMilledQty, 10) || 0,
        blocksUsedQty: Math.max(
          1,
          Number.parseInt(formData.blocksUsedQty, 10) || 1,
        ),
        status: formData.status,
        failureReason: formData.failureReason || null,
        notes: formData.notes || null,
        milledAt: new Date(formData.milledAt).toISOString(),
      };

      if (milling?.id) {
        await updateMilling(milling.id, payload);
      } else {
        await createMilling(payload);
      }
      setOpen(false);
      await onSubmitted?.();
      router.refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : "An error occurred");
    } finally {
      setLoading(false);
    }
  }

  function handleMachineChange(value: string) {
    const nextMachine = machines.find((item) => item.id === value) ?? null;
    setFormData((current) => {
      const nextSelections: Record<string, string> = {};
      for (const slot of nextMachine?.slotPresets ?? []) {
        const currentValue = current.selectedDrillSlots[slot.id];
        if (!currentValue) continue;

        const matchingDrill = millingDrills.find((drill) => drill.id === currentValue);
        if (
          matchingDrill &&
          (matchingDrill.millingMachineId === null ||
            matchingDrill.millingMachineId === value)
        ) {
          nextSelections[slot.id] = currentValue;
        }
      }

      return {
        ...current,
        millingMachineId: value,
        selectedDrillSlots: nextSelections,
      };
    });
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        {trigger ?? (
          <Button
            variant={milling ? "outline" : "default"}
            size={milling ? "sm" : "default"}
          >
            {milling ? (
              <>
                <Pencil className="mr-2 h-4 w-4" />
                Edit
              </>
            ) : (
              <>
                <Plus className="mr-2 h-4 w-4" />
                Add Milling Record
              </>
            )}
          </Button>
        )}
      </DialogTrigger>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>
            {milling ? "Edit Milling Record" : "New Milling Record"}
          </DialogTitle>
          <DialogDescription>
            Set block type, machine, machine-specific drills, quantity, and other
            production details.
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4">
          {error ? (
            <div className="rounded-md bg-red-50 p-3 text-sm text-red-800">
              {error}
            </div>
          ) : null}

          {!caseId && !milling?.id ? (
            <div className="space-y-2">
              <Label>Milling task</Label>
              <Select
                value={formData.caseId}
                onValueChange={(value) => {
                  const selected = cases.find((item) => item.id === value);
                  setFormData((p) => ({
                    ...p,
                    caseId: value,
                    caseProcessId: selected?.caseProcessId ?? "",
                  }));
                }}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select a milling task" />
                </SelectTrigger>
                <SelectContent>
                  {cases.map((c) => (
                    <SelectItem key={c.id} value={c.id}>
                      {c.code} - {c.patientName}
                      {c.restoration ? ` - ${c.restoration}` : ""}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          ) : null}

          {selectedCase ? (
            <div className="rounded-md border border-border/60 bg-muted/30 px-3 py-2 text-sm text-muted-foreground">
              {selectedCase.code} - {selectedCase.patientName}
              {selectedCase.customerName ? ` - ${selectedCase.customerName}` : ""}
            </div>
          ) : null}

          <div className="space-y-2">
            <Label>Block Type</Label>
            <Select
              value={formData.blockTypeId}
              onValueChange={(value) =>
                setFormData((p) => ({ ...p, blockTypeId: value }))
              }
            >
              <SelectTrigger>
                <SelectValue placeholder="Select block type" />
              </SelectTrigger>
              <SelectContent>
                {blockTypes.map((bt) => (
                  <SelectItem key={bt.id} value={bt.id}>
                    {bt.name}
                    {bt.shade && ` (${bt.shade})`}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <Label>Milling Machine</Label>
            <Select
              value={formData.millingMachineId}
              onValueChange={handleMachineChange}
            >
              <SelectTrigger>
                <SelectValue placeholder="Select milling machine" />
              </SelectTrigger>
              <SelectContent>
                {machines.map((machine) => (
                  <SelectItem key={machine.id} value={machine.id}>
                    {machine.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {selectedMachine ? (
            visibleSlots.length > 0 ? (
              <div className="space-y-3">
                {visibleSlots.map((slot) => (
                  <div key={slot.id} className="space-y-2">
                    <Label>{slot.label} Drill</Label>
                    <Select
                      value={formData.selectedDrillSlots[slot.id] ?? ""}
                      onValueChange={(value) =>
                        setFormData((current) => ({
                          ...current,
                          selectedDrillSlots: {
                            ...current.selectedDrillSlots,
                            [slot.id]: value,
                          },
                        }))
                      }
                    >
                      <SelectTrigger>
                        <SelectValue placeholder={`Select ${slot.label} drill`} />
                      </SelectTrigger>
                      <SelectContent>
                        {compatibleDrills.map((drill) => (
                          <SelectItem key={drill.id} value={drill.id}>
                            {drill.name}
                            {drill.millingMachineName
                              ? ` (${drill.millingMachineName})`
                              : ""}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                ))}
              </div>
            ) : (
              <div className="rounded-md border border-border/60 bg-muted/30 px-3 py-2 text-sm text-muted-foreground">
                This machine has no configured drill slots yet.
              </div>
            )
          ) : null}

          <div className="space-y-2">
            <Label>Teeth Milled Quantity</Label>
            <Input
              type="number"
              min="0"
              max="32"
              value={formData.teethMilledQty}
              onChange={(e) =>
                setFormData((p) => ({
                  ...p,
                  teethMilledQty: e.target.value,
                }))
              }
            />
          </div>

          <div className="space-y-2">
            <Label>Blocks Used</Label>
            <Input
              type="number"
              min="1"
              max="32"
              value={formData.blocksUsedQty}
              onChange={(e) =>
                setFormData((p) => ({
                  ...p,
                  blocksUsedQty: e.target.value,
                }))
              }
            />
          </div>

          <div className="space-y-2">
            <Label>Milling Date & Time</Label>
            <Input
              type="datetime-local"
              value={formData.milledAt}
              onChange={(e) =>
                setFormData((p) => ({
                  ...p,
                  milledAt: e.target.value,
                }))
              }
            />
          </div>

          <div className="space-y-2">
            <Label>Status</Label>
            <Select
              value={formData.status}
              onValueChange={(value) =>
                setFormData((p) => ({
                  ...p,
                  status: value as "SUCCESS" | "FAILED",
                  failureReason: value === "SUCCESS" ? "" : p.failureReason,
                }))
              }
            >
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="SUCCESS">Success</SelectItem>
                <SelectItem value="FAILED">Failed</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {formData.status === "FAILED" ? (
            <div className="space-y-2">
              <Label>Failure Reason</Label>
              <Textarea
                value={formData.failureReason}
                onChange={(e) =>
                  setFormData((p) => ({
                    ...p,
                    failureReason: e.target.value,
                  }))
                }
                placeholder="Describe what went wrong..."
              />
            </div>
          ) : null}

          <div className="space-y-2">
            <Label>Notes</Label>
            <Textarea
              value={formData.notes}
              onChange={(e) =>
                setFormData((p) => ({
                  ...p,
                  notes: e.target.value,
                }))
              }
              placeholder="Additional notes..."
              className="max-h-32"
            />
          </div>

          <div className="flex gap-2 pt-4">
            <Button type="submit" disabled={loading} className="flex-1">
              {loading ? "Saving..." : milling ? "Update" : "Create"}
            </Button>
            <Button
              type="button"
              variant="outline"
              onClick={() => setOpen(false)}
              className="flex-1"
            >
              Cancel
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
