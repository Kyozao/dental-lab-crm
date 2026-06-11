"use client";

import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import type { ProductionProcess } from "@/features/production/production.types";
import { Plus } from "lucide-react";
import * as React from "react";

type CreateProcessDialogProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onCreate: (process: ProductionProcess) => void;
};

type ProcessFormState = {
  name: string;
  owner: string;
  capacity: string;
  targetHours: string;
  description: string;
};

const initialForm: ProcessFormState = {
  name: "",
  owner: "",
  capacity: "8",
  targetHours: "8",
  description: "",
};

export function CreateProcessDialog({
  open,
  onOpenChange,
  onCreate,
}: CreateProcessDialogProps) {
  const [form, setForm] = React.useState<ProcessFormState>(initialForm);

  function updateField(field: keyof ProcessFormState, value: string) {
    setForm((current) => ({ ...current, [field]: value }));
  }

  function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();

    const name = form.name.trim();
    const owner = form.owner.trim();
    const description = form.description.trim();

    if (!name || !owner || !description) {
      return;
    }

    onCreate({
      id: `process-${Date.now()}`,
      name,
      owner,
      description,
      capacity: Math.max(1, Number(form.capacity) || 1),
      targetHours: Math.max(1, Number(form.targetHours) || 1),
      queue: [],
    });
    setForm(initialForm);
    onOpenChange(false);
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Create process</DialogTitle>
          <DialogDescription>
            Add a mock production step to this planning view.
          </DialogDescription>
        </DialogHeader>
        <form className="grid gap-4" onSubmit={handleSubmit}>
          <div className="grid gap-2">
            <Label htmlFor="process-name">Name</Label>
            <Input
              id="process-name"
              value={form.name}
              onChange={(event) => updateField("name", event.target.value)}
              placeholder="Quality control"
              required
            />
          </div>
          <div className="grid gap-2">
            <Label htmlFor="process-owner">Owner</Label>
            <Input
              id="process-owner"
              value={form.owner}
              onChange={(event) => updateField("owner", event.target.value)}
              placeholder="Finishing team"
              required
            />
          </div>
          <div className="grid gap-3 sm:grid-cols-2">
            <div className="grid gap-2">
              <Label htmlFor="process-capacity">Capacity</Label>
              <Input
                id="process-capacity"
                min={1}
                type="number"
                value={form.capacity}
                onChange={(event) => updateField("capacity", event.target.value)}
              />
            </div>
            <div className="grid gap-2">
              <Label htmlFor="process-target">Target hours</Label>
              <Input
                id="process-target"
                min={1}
                type="number"
                value={form.targetHours}
                onChange={(event) =>
                  updateField("targetHours", event.target.value)
                }
              />
            </div>
          </div>
          <div className="grid gap-2">
            <Label htmlFor="process-description">Description</Label>
            <Textarea
              id="process-description"
              value={form.description}
              onChange={(event) =>
                updateField("description", event.target.value)
              }
              placeholder="What this step owns in the production flow."
              required
            />
          </div>
          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
              Cancel
            </Button>
            <Button type="submit">
              <Plus className="h-4 w-4" />
              Create
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
