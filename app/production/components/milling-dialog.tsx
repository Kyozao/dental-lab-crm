"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
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
import { Pencil, Plus } from "lucide-react";
import type { CaseMilling } from "@/app/generated/prisma/client";
import { createMilling, updateMilling } from "./production-api";

type DialogBlockType = {
  id: string;
  name: string;
  shade: string | null;
};

type DialogMillingDrill = {
  id: string;
  name: string;
  brand: string | null;
  type?: string | null;
};

type DialogCase = {
  id: string;
  code: string;
  patientName: string;
};

interface MillingDialogProps {
  blockTypes: DialogBlockType[];
  millingDrills: DialogMillingDrill[];
  cases: DialogCase[];
  caseId?: string;
  milling?: CaseMilling;
}

type MillingFormData = {
  caseId: string;
  blockTypeId: string;
  fineMillingDrillId: string;
  coarseMillingDrillId: string;
  teethMilledQty: string;
  status: "SUCCESS" | "FAILED";
  failureReason: string;
  notes: string;
  milledAt: string;
};

export function MillingDialog({
  blockTypes,
  millingDrills,
  cases,
  caseId,
  milling,
}: MillingDialogProps) {
  const router = useRouter();
  const [open, setOpen] = React.useState(false);
  const [loading, setLoading] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);

  const [formData, setFormData] = React.useState<MillingFormData>({
    caseId: milling?.caseId ?? caseId ?? (cases.length ? cases[0].id : ""),
    blockTypeId: milling?.blockTypeId ?? "",
    fineMillingDrillId:
      (milling as CaseMilling & { fineMillingDrillId?: string | null })
        ?.fineMillingDrillId ?? "",
    coarseMillingDrillId:
      (milling as CaseMilling & { coarseMillingDrillId?: string | null })
        ?.coarseMillingDrillId ?? "",
    teethMilledQty: milling?.teethMilledQty?.toString() ?? "0",
    status: (milling?.status ?? "SUCCESS") as "SUCCESS" | "FAILED",
    failureReason: milling?.failureReason ?? "",
    notes: milling?.notes ?? "",
    milledAt: milling?.milledAt
      ? new Date(milling.milledAt).toISOString().slice(0, 16)
      : new Date().toISOString().slice(0, 16),
  });

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setLoading(true);

    if (!formData.fineMillingDrillId || !formData.coarseMillingDrillId) {
      setError("Select both 1.0mm and 2.5mm drills.");
      setLoading(false);
      return;
    }

    if (formData.fineMillingDrillId === formData.coarseMillingDrillId) {
      setError("1.0mm and 2.5mm drills must be different tools.");
      setLoading(false);
      return;
    }

    try {
      if (milling?.id) {
        await updateMilling(milling.id, {
          ...formData,
          milledAt: new Date(formData.milledAt).toISOString(),
        });
      } else {
        await createMilling({
          ...formData,
          milledAt: new Date(formData.milledAt).toISOString(),
        });
      }
      setOpen(false);
      router.refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : "An error occurred");
    } finally {
      setLoading(false);
    }
  }

  const fineDrills = React.useMemo(
    () =>
      millingDrills.filter((drill) => {
        const label = `${drill.name} ${drill.type ?? ""}`.toLowerCase();
        return (
          label.includes("1mm") ||
          label.includes("1.0") ||
          label.includes("1.00")
        );
      }),
    [millingDrills],
  );

  const coarseDrills = React.useMemo(
    () =>
      millingDrills.filter((drill) => {
        const label = `${drill.name} ${drill.type ?? ""}`.toLowerCase();
        return (
          label.includes("2.5") ||
          label.includes("2,5") ||
          label.includes("2.5mm")
        );
      }),
    [millingDrills],
  );

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
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
      </DialogTrigger>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>
            {milling ? "Edit Milling Record" : "New Milling Record"}
          </DialogTitle>
          <DialogDescription>
            Set block type, milling drill, quantity, and other production
            details.
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4">
          {error && (
            <div className="rounded-md bg-red-50 p-3 text-sm text-red-800">
              {error}
            </div>
          )}

          {/* Case Selection */}
          {!caseId && !milling?.id && (
            <div className="space-y-2">
              <Label>Case</Label>
              <Select
                value={formData.caseId}
                onValueChange={(value) =>
                  setFormData((p) => ({ ...p, caseId: value }))
                }
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select a case" />
                </SelectTrigger>
                <SelectContent>
                  {cases.map((c) => (
                    <SelectItem key={c.id} value={c.id}>
                      {c.code} - {c.patientName}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          )}

          {/* Block Type */}
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
            <Label>1.0mm Drill</Label>
            <Select
              value={formData.fineMillingDrillId}
              onValueChange={(value) =>
                setFormData((p) => ({
                  ...p,
                  fineMillingDrillId: value,
                }))
              }
            >
              <SelectTrigger>
                <SelectValue placeholder="Select 1.0mm drill" />
              </SelectTrigger>
              <SelectContent>
                {(fineDrills.length ? fineDrills : millingDrills).map(
                  (drill) => (
                    <SelectItem key={drill.id} value={drill.id}>
                      {drill.name}
                      {drill.brand && ` (${drill.brand})`}
                    </SelectItem>
                  ),
                )}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <Label>2.5mm Drill</Label>
            <Select
              value={formData.coarseMillingDrillId}
              onValueChange={(value) =>
                setFormData((p) => ({
                  ...p,
                  coarseMillingDrillId: value,
                }))
              }
            >
              <SelectTrigger>
                <SelectValue placeholder="Select 2.5mm drill" />
              </SelectTrigger>
              <SelectContent>
                {(coarseDrills.length ? coarseDrills : millingDrills).map(
                  (drill) => (
                    <SelectItem key={drill.id} value={drill.id}>
                      {drill.name}
                      {drill.brand && ` (${drill.brand})`}
                    </SelectItem>
                  ),
                )}
              </SelectContent>
            </Select>
          </div>

          {/* Teeth Milled Qty */}
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

          {/* Milling Date */}
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

          {/* Status */}
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

          {/* Failure Reason (if failed) */}
          {formData.status === "FAILED" && (
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
          )}

          {/* Notes */}
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
