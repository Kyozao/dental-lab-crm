"use client";

import { useMemo, useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import Link from "next/link";

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
import { RefreshButton } from "@/components/ui/refresh-button";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Textarea } from "@/components/ui/textarea";
import { processesQueryKey } from "@/features/cases/hooks/useProcesses";
import type { ProcessOption } from "@/features/cases/types";
import { formatCurrency } from "@/lib/currency";

import {
  archiveProcessApi,
  buildDefaultProcessEditorState,
  buildProcessEditorState,
  createProcessApi,
  getCurrentLabSettingsApi,
  listProcessesApi,
  type ProcessEditorState,
  updateProcessApi,
} from "../services-api";

export function ProcessesPageClient() {
  const queryClient = useQueryClient();
  const processesQuery = useQuery({
    queryKey: processesQueryKey,
    queryFn: listProcessesApi,
  });
  const labSettingsQuery = useQuery({
    queryKey: ["lab-settings"],
    queryFn: getCurrentLabSettingsApi,
  });

  const [editorOpen, setEditorOpen] = useState(false);
  const [editorState, setEditorState] = useState<ProcessEditorState>(
    buildDefaultProcessEditorState(),
  );
  const [saving, setSaving] = useState(false);
  const [pendingDelete, setPendingDelete] = useState<ProcessOption | null>(null);
  const [archivingProcessId, setArchivingProcessId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const processes = useMemo(
    () => [...(processesQuery.data ?? [])].sort((a, b) => a.name.localeCompare(b.name)),
    [processesQuery.data],
  );
  const currency = labSettingsQuery.data?.currency ?? "BRL";

  function openCreateDialog() {
    setError(null);
    setEditorState(buildDefaultProcessEditorState());
    setEditorOpen(true);
  }

  function openEditDialog(process: ProcessOption) {
    setError(null);
    setEditorState(buildProcessEditorState(process));
    setEditorOpen(true);
  }

  async function refreshAll() {
    await processesQuery.refetch();
  }

  async function handleSave() {
    try {
      setSaving(true);
      setError(null);

      const payload = {
        name: editorState.name,
        description: editorState.description.trim() || null,
        default_fixed_minutes: editorState.default_fixed_minutes,
        default_expected_duration_days: editorState.default_expected_duration_days,
        default_requires_milling_machine: editorState.default_requires_milling_machine,
        default_labor_cost: editorState.default_labor_cost,
        is_active: editorState.is_active,
      };

      if (editorState.id) {
        await updateProcessApi(editorState.id, payload);
      } else {
        await createProcessApi(payload);
      }

      await queryClient.invalidateQueries({ queryKey: processesQueryKey });
      setEditorOpen(false);
    } catch (saveError) {
      setError(saveError instanceof Error ? saveError.message : "Failed to save process.");
    } finally {
      setSaving(false);
    }
  }

  async function handleArchive(processId: string) {
    try {
      setArchivingProcessId(processId);
      setError(null);
      await archiveProcessApi(processId);
      await queryClient.invalidateQueries({ queryKey: processesQueryKey });
      setPendingDelete(null);
    } catch (archiveError) {
      setError(
        archiveError instanceof Error ? archiveError.message : "Failed to archive process.",
      );
    } finally {
      setArchivingProcessId(null);
    }
  }

  function updateNumberField(
    field:
      | "default_fixed_minutes"
      | "default_expected_duration_days",
    value: string,
    minimum: number,
  ) {
    setEditorState((current) => ({
      ...current,
      [field]: Math.max(minimum, Number(value) || minimum),
    }));
  }

  return (
    <>
      <Panel>
        <PanelHeader>
          <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
            <div>
              <div className="flex flex-wrap gap-3 text-sm text-muted-foreground">
                <Link href="/services" className="hover:text-foreground">
                  Catalog overview
                </Link>
                <span aria-hidden="true">/</span>
                <span className="text-foreground">Processes</span>
              </div>
              <h2 className="text-base font-semibold">Process catalog</h2>
              <p className="text-sm text-muted-foreground">
                Processes are reusable internal production definitions. Service workflows reference them to inherit timing, labor, and milling defaults.
              </p>
            </div>
            <div className="flex flex-wrap gap-2">
              <RefreshButton
                onClick={() => void refreshAll()}
                disabled={processesQuery.isFetching}
                label="Refresh processes"
                spinning={processesQuery.isFetching}
              />
              <Button type="button" onClick={openCreateDialog}>
                Add process
              </Button>
            </div>
          </div>
        </PanelHeader>

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
                <TableHead className="w-[220px] text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {processesQuery.isLoading ? (
                <TableRow>
                  <TableCell colSpan={8} className="py-8 text-center text-sm text-muted-foreground">
                    Loading processes...
                  </TableCell>
                </TableRow>
              ) : null}

              {!processesQuery.isLoading && processes.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={8}>
                    <EmptyState
                      title="No processes configured yet"
                      description="Create reusable production defaults here, then reference them from service workflow templates."
                    />
                  </TableCell>
                </TableRow>
              ) : null}

              {!processesQuery.isLoading
                ? processes.map((process) => (
                    <TableRow key={process.id}>
                      <TableCell className="font-medium">{process.name}</TableCell>
                      <TableCell>
                        <Badge variant={process.is_active ? "success" : "secondary"}>
                          {process.is_active ? "Active" : "Inactive"}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        {process.default_fixed_minutes ?? 1}
                      </TableCell>
                      <TableCell>
                        {process.default_expected_duration_days ?? 1}d
                      </TableCell>
                      <TableCell>
                        {formatCurrency(process.default_labor_cost ?? "0.00", currency)}
                      </TableCell>
                      <TableCell>
                        <Badge
                          variant={
                            process.default_requires_milling_machine ? "warning" : "outline"
                          }
                        >
                          {process.default_requires_milling_machine ? "Required" : "Not required"}
                        </Badge>
                      </TableCell>
                      <TableCell className="max-w-[260px] truncate text-muted-foreground">
                        {process.description || "-"}
                      </TableCell>
                      <TableCell className="text-right">
                        <div className="flex justify-end gap-2">
                          <Button
                            type="button"
                            variant="outline"
                            size="sm"
                            onClick={() => openEditDialog(process)}
                          >
                            Edit
                          </Button>
                          <Button
                            type="button"
                            variant="destructive"
                            size="sm"
                            onClick={() => setPendingDelete(process)}
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

        {error ? (
          <div className="border-t border-border/40 px-4 py-3 text-sm text-destructive sm:px-6">
            {error}
          </div>
        ) : null}
      </Panel>

      <Dialog open={editorOpen} onOpenChange={setEditorOpen}>
        <DialogContent className="sm:max-w-2xl">
          <DialogHeader>
            <DialogTitle>{editorState.id ? "Edit process" : "Add process"}</DialogTitle>
          </DialogHeader>

          <div className="grid gap-4 py-2">
            <div className="grid gap-2">
              <Label htmlFor="process-name">Name</Label>
              <Input
                id="process-name"
                value={editorState.name}
                onChange={(event) =>
                  setEditorState((current) => ({ ...current, name: event.target.value }))
                }
              />
            </div>

            <div className="grid gap-2">
              <Label htmlFor="process-description">Description</Label>
              <Textarea
                id="process-description"
                value={editorState.description}
                onChange={(event) =>
                  setEditorState((current) => ({
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
                  value={editorState.default_fixed_minutes}
                  onChange={(event) =>
                    updateNumberField("default_fixed_minutes", event.target.value, 0)
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
                  value={editorState.default_expected_duration_days}
                  onChange={(event) =>
                    updateNumberField(
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
                  value={editorState.default_labor_cost}
                  onChange={(event) =>
                    setEditorState((current) => ({
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
                  checked={editorState.default_requires_milling_machine}
                  onChange={(event) =>
                    setEditorState((current) => ({
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
                  checked={editorState.is_active}
                  onChange={(event) =>
                    setEditorState((current) => ({
                      ...current,
                      is_active: event.target.checked,
                    }))
                  }
                />
                Active process
              </label>
            </div>

            <div className="flex justify-end gap-2">
              <Button type="button" variant="outline" onClick={() => setEditorOpen(false)}>
                Cancel
              </Button>
              <Button type="button" onClick={() => void handleSave()} disabled={saving}>
                {saving ? "Saving..." : "Save process"}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      <AlertDialog open={Boolean(pendingDelete)} onOpenChange={() => setPendingDelete(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete process</AlertDialogTitle>
            <AlertDialogDescription>
              {pendingDelete
                ? `Delete ${pendingDelete.name}? This archives the process so it can no longer be used in new workflow templates.`
                : "Delete this process?"}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => (pendingDelete ? void handleArchive(pendingDelete.id) : undefined)}
            >
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}
