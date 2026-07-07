"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useQuery, useQueryClient } from "@tanstack/react-query";

import { Panel, PanelHeader } from "@/components/app/panel";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { useProcesses } from "@/features/cases/hooks/useProcesses";
import { serviceTypesQueryKey } from "@/features/cases/hooks/useServiceTypes";
import { WorkflowEditor } from "@/features/workflows/components/workflow-editor";

import {
  buildServiceEditorState,
  getCurrentLabSettingsApi,
  getServiceApi,
  processOptionsReady,
  updateServiceApi,
  type ServiceEditorState,
} from "../services-api";

type Props = {
  serviceId: string;
};

const labSettingsQueryKey = ["lab-settings"] as const;

export function ServiceDetailPageClient({ serviceId }: Props) {
  const router = useRouter();
  const queryClient = useQueryClient();
  const serviceQuery = useQuery({
    queryKey: ["service-type", serviceId],
    queryFn: () => getServiceApi(serviceId),
  });
  const processesQuery = useProcesses(true);
  const labSettingsQuery = useQuery({
    queryKey: labSettingsQueryKey,
    queryFn: getCurrentLabSettingsApi,
  });

  const [editorState, setEditorState] = useState<ServiceEditorState | null>(null);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!serviceQuery.data) return;
    setEditorState(buildServiceEditorState(serviceQuery.data));
  }, [serviceQuery.data]);

  const currency = labSettingsQuery.data?.currency ?? serviceQuery.data?.currency ?? "BRL";
  const processes = processOptionsReady(processesQuery.data);
  const loading =
    serviceQuery.isLoading ||
    processesQuery.isLoading ||
    labSettingsQuery.isLoading ||
    !editorState;

  async function handleSave() {
    if (!editorState) return;

    try {
      setSaving(true);
      setError(null);
      await updateServiceApi(serviceId, {
        name: editorState.name,
        base_price: editorState.base_price,
        notes: editorState.notes.trim() || null,
        is_active: editorState.is_active,
        workflow_json: editorState.workflow_json,
      });
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: ["service-type", serviceId] }),
        queryClient.invalidateQueries({ queryKey: serviceTypesQueryKey }),
      ]);
    } catch (saveError) {
      setError(saveError instanceof Error ? saveError.message : "Failed to save service.");
    } finally {
      setSaving(false);
    }
  }

  if (loading) {
    return (
      <Panel>
        <PanelHeader>
          <p className="text-sm text-muted-foreground">Loading service...</p>
        </PanelHeader>
      </Panel>
    );
  }

  if (!editorState) {
    return (
      <Panel>
        <PanelHeader>
          <p className="text-sm text-destructive">Service could not be loaded.</p>
        </PanelHeader>
      </Panel>
    );
  }

  return (
    <Panel>
      <PanelHeader>
        <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
          <div>
            <div className="flex flex-wrap gap-3 text-sm text-muted-foreground">
              <Link href="/services" className="hover:text-foreground">
                Services
              </Link>
              <span aria-hidden="true">/</span>
              <span className="text-foreground">Overview</span>
            </div>
            <h2 className="text-base font-semibold">{editorState.name || "Service"}</h2>
            <p className="mt-2 text-sm text-muted-foreground">
              Update the customer-facing service definition and workflow template here. Workflow timing and default step rules still come from the shared{" "}
              <Link
                href="/services/processes"
                className="underline-offset-4 hover:text-foreground hover:underline"
              >
                process catalog
              </Link>
              .
            </p>
          </div>
          <div className="flex flex-wrap gap-2">
            <Button type="button" variant="outline" onClick={() => router.push("/services")}>
              Close
            </Button>
            <Button type="button" onClick={() => void handleSave()} disabled={saving}>
              {saving ? "Saving..." : "Save"}
            </Button>
          </div>
        </div>
      </PanelHeader>

      <div className="grid gap-6 px-4 pb-4 sm:px-6 sm:pb-6">
        <div className="grid gap-6 sm:grid-cols-2">
          <div className="space-y-2">
            <Label htmlFor="service-name">Name</Label>
            <Input
              id="service-name"
              value={editorState.name}
              onChange={(event) =>
                setEditorState((current) =>
                  current ? { ...current, name: event.target.value } : current,
                )
              }
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="service-price">Unit price</Label>
            <Input
              id="service-price"
              type="number"
              min={0}
              step="0.01"
              value={editorState.base_price}
              onChange={(event) =>
                setEditorState((current) =>
                  current ? { ...current, base_price: event.target.value } : current,
                )
              }
            />
            <p className="text-xs text-muted-foreground">
              Saved in {currency}. Customer price tables can override this default per customer.
            </p>
          </div>
        </div>

        <div className="space-y-2">
          <Label htmlFor="service-notes">Notes</Label>
          <Textarea
            id="service-notes"
            value={editorState.notes}
            onChange={(event) =>
              setEditorState((current) =>
                current ? { ...current, notes: event.target.value } : current,
              )
            }
          />
        </div>

        <div className="flex items-center gap-2">
          <input
            id="service-active"
            type="checkbox"
            checked={editorState.is_active}
            onChange={(event) =>
              setEditorState((current) =>
                current ? { ...current, is_active: event.target.checked } : current,
              )
            }
            className="h-4 w-4"
          />
          <Label htmlFor="service-active">Active service</Label>
        </div>

        <div className="grid gap-3 border-t border-border/40 pt-6">
          <div>
            <h3 className="text-sm font-medium">Workflow template</h3>
            <p className="text-sm text-muted-foreground">
              Define the process graph copied into each new case service line. Process timing, duration, and milling defaults are pulled from the selected process definitions.
            </p>
          </div>

          <WorkflowEditor
            workflow={editorState.workflow_json}
            processes={processes}
            taskItems={[]}
            assigneeOptions={[]}
            description="Template changes here apply to future case service lines."
            disabled={false}
            statusDisabled
            assigneeDisabled
            timingDisabled
            timingDisabledMessage="Minutes and min days come from the selected process. Update them in the process catalog if the shared defaults need to change."
            onChange={(workflow) =>
              setEditorState((current) =>
                current ? { ...current, workflow_json: workflow } : current,
              )
            }
          />
        </div>
      </div>

      {error ? (
        <div className="border-t border-border/40 px-4 py-3 text-sm text-destructive sm:px-6">
          {error}
        </div>
      ) : null}
    </Panel>
  );
}
