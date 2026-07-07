"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useQuery, useQueryClient } from "@tanstack/react-query";

import { Panel, PanelHeader } from "@/components/app/panel";
import { Button } from "@/components/ui/button";
import { useProcesses } from "@/features/cases/hooks/useProcesses";
import { serviceTypesQueryKey } from "@/features/cases/hooks/useServiceTypes";
import { WorkflowEditor } from "@/features/workflows/components/workflow-editor";

import {
  buildServiceEditorState,
  getServiceApi,
  processOptionsReady,
  updateServiceApi,
  type ServiceEditorState,
} from "../services-api";

type Props = {
  serviceId: string;
};

export function ServiceWorkflowPageClient({ serviceId }: Props) {
  const router = useRouter();
  const queryClient = useQueryClient();
  const serviceQuery = useQuery({
    queryKey: ["service-type", serviceId],
    queryFn: () => getServiceApi(serviceId),
  });
  const processesQuery = useProcesses(true);

  const [editorState, setEditorState] = useState<ServiceEditorState | null>(null);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!serviceQuery.data) return;
    setEditorState(buildServiceEditorState(serviceQuery.data));
  }, [serviceQuery.data]);

  const processes = processOptionsReady(processesQuery.data);
  const loading =
    serviceQuery.isLoading ||
    processesQuery.isLoading ||
    !editorState;

  async function handleSave() {
    if (!editorState) return;

    try {
      setSaving(true);
      setError(null);
      await updateServiceApi(serviceId, {
        workflow_json: editorState.workflow_json,
      });
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: ["service-type", serviceId] }),
        queryClient.invalidateQueries({ queryKey: serviceTypesQueryKey }),
      ]);
    } catch (saveError) {
      setError(
        saveError instanceof Error ? saveError.message : "Failed to save workflow.",
      );
    } finally {
      setSaving(false);
    }
  }

  if (loading) {
    return (
      <Panel>
        <PanelHeader>
          <p className="text-sm text-muted-foreground">Loading workflow...</p>
        </PanelHeader>
      </Panel>
    );
  }

  if (!editorState) {
    return (
      <Panel>
        <PanelHeader>
          <p className="text-sm text-destructive">Workflow could not be loaded.</p>
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
              <Link href={`/services/${serviceId}`} className="hover:text-foreground">
                {editorState.name || "Service"}
              </Link>
              <span aria-hidden="true">/</span>
              <span className="text-foreground">Workflow</span>
            </div>
            <h2 className="text-base font-semibold">
              {editorState.name || "Service"} workflow
            </h2>
            <p className="mt-2 text-sm text-muted-foreground">
              This workflow stays service-specific. Process definitions remain shared references in the{" "}
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
            <Button
              type="button"
              variant="outline"
              onClick={() => router.push(`/services/${serviceId}`)}
            >
              Overview
            </Button>
            <Button type="button" onClick={() => void handleSave()} disabled={saving}>
              {saving ? "Saving..." : "Save workflow"}
            </Button>
          </div>
        </div>
      </PanelHeader>

      <div className="grid gap-6 px-4 pb-4 sm:px-6 sm:pb-6">
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

      {error ? (
        <div className="border-t border-border/40 px-4 py-3 text-sm text-destructive sm:px-6">
          {error}
        </div>
      ) : null}
    </Panel>
  );
}
