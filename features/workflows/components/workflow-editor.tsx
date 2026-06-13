"use client";

import * as React from "react";
import {
  Check,
  Play,
  Plus,
  RotateCcw,
  Trash2,
} from "lucide-react";

import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

export type WorkflowProcessOption = {
  id: string;
  name: string;
};

export type WorkflowStep = {
  id: string;
  process_id: string;
  dependsOn: string[];
};

export type WorkflowDefinition = {
  steps: WorkflowStep[];
};

export type WorkflowTaskItem = {
  id: string;
  workflow_step_id: string;
  process_id?: string;
  status: string;
  assigned_lab_member_id?: string | null;
  assignedToName?: string | null;
};

export type WorkflowAssigneeOption = {
  id: string;
  name: string;
  processIds: string[];
};

type Props = {
  workflow: WorkflowDefinition;
  processes: WorkflowProcessOption[];
  taskItems?: WorkflowTaskItem[];
  assigneeOptions?: WorkflowAssigneeOption[];
  disabled?: boolean;
  statusDisabled?: boolean;
  assigneeDisabled?: boolean;
  updatingProcessId?: string | null;
  statusError?: string | null;
  onStatusChange?: (taskItemId: string, status: string) => void;
  onAssigneeChange?: (taskItemId: string, assigneeId: string | null) => void;
  onChange: (workflow: WorkflowDefinition) => void;
};

type WorkflowGraphLayout = {
  levels: WorkflowStep[][];
  positions: Map<string, NodePosition>;
  width: number;
  height: number;
};

type NodePosition = {
  x: number;
  y: number;
};

const NODE_WIDTH = 260;
const NODE_HEIGHT = 112;
const CANVAS_PADDING = 72;
const LEVEL_GAP = 150;
const NODE_GAP = 96;
const MIN_CANVAS_WIDTH = 900;
const MIN_CANVAS_HEIGHT = 560;
const MIN_ZOOM = 0.45;
const MAX_ZOOM = 1.6;
const NO_ASSIGNEE_VALUE = "__none";

export function WorkflowEditor({
  workflow,
  processes,
  taskItems = [],
  assigneeOptions = [],
  disabled = false,
  statusDisabled = false,
  assigneeDisabled = false,
  updatingProcessId = null,
  statusError = null,
  onStatusChange,
  onAssigneeChange,
  onChange,
}: Props) {
  const [selectedStepId, setSelectedStepId] = React.useState<string | null>(
    workflow.steps[0]?.id ?? null,
  );
  const [isPanning, setIsPanning] = React.useState(false);
  const [viewportTransform, setViewportTransform] = React.useState({
    x: 0,
    y: 0,
    scale: 0.9,
  });
  const panStartRef = React.useRef<{
    pointerId: number;
    startX: number;
    startY: number;
    originX: number;
    originY: number;
  } | null>(null);

  const taskItemByStepId = React.useMemo(
    () =>
      new Map(
        taskItems.map((taskItem) => [taskItem.workflow_step_id, taskItem]),
      ),
    [taskItems],
  );
  const graphLayout = React.useMemo(
    () => buildWorkflowGraphLayout(workflow.steps),
    [workflow.steps],
  );
  const connectors = React.useMemo(
    () => buildConnectorLines(workflow.steps, graphLayout.positions),
    [graphLayout.positions, workflow.steps],
  );
  const selectedStep =
    workflow.steps.find((step) => step.id === selectedStepId) ??
    workflow.steps[0] ??
    null;

  React.useEffect(() => {
    if (workflow.steps.length === 0) {
      setSelectedStepId(null);
      return;
    }

    if (!selectedStepId || !workflow.steps.some((step) => step.id === selectedStepId)) {
      setSelectedStepId(workflow.steps[0]?.id ?? null);
    }
  }, [selectedStepId, workflow.steps]);

  function updateSteps(updater: (steps: WorkflowStep[]) => WorkflowStep[]) {
    onChange({ steps: updater(workflow.steps) });
  }

  function addStep() {
    const firstProcess = processes[0];
    if (!firstProcess) return;

    const stepId = `step-${Date.now()}-${workflow.steps.length + 1}`;
    updateSteps((steps) => [
      ...steps,
      {
        id: stepId,
        process_id: firstProcess.id,
        dependsOn: [],
      },
    ]);
    setSelectedStepId(stepId);
  }

  function removeStep(stepId: string) {
    updateSteps((steps) =>
      steps
        .filter((step) => step.id !== stepId)
        .map((step) => ({
          ...step,
          dependsOn: step.dependsOn.filter((dependencyId) => dependencyId !== stepId),
        })),
    );
  }

  function handleViewportWheel(event: React.WheelEvent<HTMLDivElement>) {
    event.preventDefault();

    const rect = event.currentTarget.getBoundingClientRect();
    const nextScale = clamp(
      viewportTransform.scale * (event.deltaY > 0 ? 0.92 : 1.08),
      MIN_ZOOM,
      MAX_ZOOM,
    );
    const cursorX = event.clientX - rect.left;
    const cursorY = event.clientY - rect.top;
    const contentX = (cursorX - viewportTransform.x) / viewportTransform.scale;
    const contentY = (cursorY - viewportTransform.y) / viewportTransform.scale;

    setViewportTransform({
      x: cursorX - contentX * nextScale,
      y: cursorY - contentY * nextScale,
      scale: nextScale,
    });
  }

  function handleViewportPointerDown(event: React.PointerEvent<HTMLDivElement>) {
    if (event.button !== 0) return;

    const target = event.target;
    if (
      target instanceof HTMLElement &&
      target.closest("[data-workflow-node], button, input, select, label")
    ) {
      return;
    }

    event.currentTarget.setPointerCapture(event.pointerId);
    panStartRef.current = {
      pointerId: event.pointerId,
      startX: event.clientX,
      startY: event.clientY,
      originX: viewportTransform.x,
      originY: viewportTransform.y,
    };
    setIsPanning(true);
  }

  function handleViewportPointerMove(event: React.PointerEvent<HTMLDivElement>) {
    const panStart = panStartRef.current;
    if (!panStart || panStart.pointerId !== event.pointerId) return;

    setViewportTransform((currentTransform) => ({
      ...currentTransform,
      x: panStart.originX + event.clientX - panStart.startX,
      y: panStart.originY + event.clientY - panStart.startY,
    }));
  }

  function handleViewportPointerUp(event: React.PointerEvent<HTMLDivElement>) {
    if (panStartRef.current?.pointerId !== event.pointerId) return;

    panStartRef.current = null;
    setIsPanning(false);
    event.currentTarget.releasePointerCapture(event.pointerId);
  }

  function updateProcess(stepId: string, processId: string) {
    updateSteps((steps) =>
      steps.map((step) =>
        step.id === stepId ? { ...step, process_id: processId } : step,
      ),
    );
  }

  function toggleDependency(stepId: string, dependencyId: string, checked: boolean) {
    updateSteps((steps) =>
      steps.map((step) => {
        if (step.id !== stepId) return step;

        return {
          ...step,
          dependsOn: checked
            ? [...new Set([...step.dependsOn, dependencyId])]
            : step.dependsOn.filter((id) => id !== dependencyId),
        };
      }),
    );
  }

  return (
    <section className="grid gap-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h3 className="font-medium">Workflow</h3>
          <p className="text-sm text-muted-foreground">
            Edits here apply only to this case.
          </p>
        </div>
        <Button
          type="button"
          variant="outline"
          size="sm"
          onClick={addStep}
          disabled={disabled || processes.length === 0}
        >
          <Plus className="size-4" />
          Add step
        </Button>
      </div>

      {statusError ? (
        <div className="rounded-md border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
          {statusError}
        </div>
      ) : null}

      {workflow.steps.length === 0 ? (
        <div className="rounded-md border border-dashed p-6 text-sm text-muted-foreground">
          No workflow steps.
        </div>
      ) : (
        <div className="grid gap-6 xl:grid-cols-[minmax(0,1fr)_340px]">
          <div
            className={cn(
              "relative h-[640px] overflow-hidden rounded-md border bg-muted/20",
              isPanning ? "cursor-grabbing" : "cursor-grab",
            )}
            onWheel={handleViewportWheel}
            onPointerDown={handleViewportPointerDown}
            onPointerMove={handleViewportPointerMove}
            onPointerUp={handleViewportPointerUp}
            onPointerCancel={handleViewportPointerUp}
          >
            <div
              className="absolute left-0 top-0 rounded-sm"
              style={{
                width: graphLayout.width,
                height: graphLayout.height,
                transform: `translate(${viewportTransform.x}px, ${viewportTransform.y}px) scale(${viewportTransform.scale})`,
                transformOrigin: "0 0",
                backgroundImage:
                  "linear-gradient(to right, hsl(var(--border) / 0.45) 1px, transparent 1px), linear-gradient(to bottom, hsl(var(--border) / 0.45) 1px, transparent 1px)",
                backgroundSize: "32px 32px",
              }}
            >
              <svg
                className="pointer-events-none absolute inset-0 z-0 size-full text-border"
                aria-hidden="true"
              >
                {connectors.map((connector) => (
                  <path
                    key={connector.id}
                    d={connector.path}
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="2"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  />
                ))}
              </svg>

              <div className="relative z-10">
                {workflow.steps.map((step) => {
                  const taskItem = taskItemByStepId.get(step.id);
                  const status = taskItem?.status ?? "New";
                  const isUpdating = updatingProcessId === taskItem?.id;
                  const processName = getProcessName(processes, step.process_id);
                  const isSelected = selectedStep?.id === step.id;
                  const position = graphLayout.positions.get(step.id) ?? {
                    x: CANVAS_PADDING,
                    y: CANVAS_PADDING,
                  };

                  return (
                    <WorkflowGraphNode
                      key={step.id}
                      step={step}
                      status={status}
                      processName={processName}
                      assigneeName={taskItem?.assignedToName ?? null}
                      dependencySummaryText={dependencySummary(
                        step,
                        workflow.steps,
                        processes,
                      )}
                      position={position}
                      taskItem={taskItem}
                      isSelected={isSelected}
                      isUpdating={isUpdating}
                      statusDisabled={statusDisabled}
                      onSelect={setSelectedStepId}
                      onStatusChange={onStatusChange}
                    />
                  );
                })}
              </div>
            </div>
          </div>

          <WorkflowStepInspector
            step={selectedStep}
            steps={workflow.steps}
            processes={processes}
            taskItem={selectedStep ? taskItemByStepId.get(selectedStep.id) : undefined}
            assigneeOptions={assigneeOptions}
            disabled={disabled}
            statusDisabled={statusDisabled}
            assigneeDisabled={assigneeDisabled}
            updatingProcessId={updatingProcessId}
            onProcessChange={updateProcess}
            onDependencyChange={toggleDependency}
            onRemove={removeStep}
            onStatusChange={onStatusChange}
            onAssigneeChange={onAssigneeChange}
          />
        </div>
      )}
    </section>
  );
}

function WorkflowGraphNode({
  step,
  status,
  processName,
  assigneeName,
  dependencySummaryText,
  position,
  taskItem,
  isSelected,
  isUpdating,
  statusDisabled,
  onSelect,
  onStatusChange,
}: {
  step: WorkflowStep;
  status: string;
  processName: string;
  assigneeName: string | null;
  dependencySummaryText: string;
  position: NodePosition;
  taskItem?: WorkflowTaskItem;
  isSelected: boolean;
  isUpdating: boolean;
  statusDisabled: boolean;
  onSelect: (stepId: string) => void;
  onStatusChange?: (taskItemId: string, status: string) => void;
}) {
  const style: React.CSSProperties = {
    left: position.x,
    top: position.y,
    width: NODE_WIDTH,
  };

  return (
    <div
      data-workflow-node
      className="absolute grid justify-items-center gap-3"
      style={style}
    >
      <button
        type="button"
        onClick={() => onSelect(step.id)}
        className={cn(
          "grid min-h-[100px] w-60 gap-2 rounded-md border bg-background px-3 py-3 text-left shadow-sm transition hover:border-foreground/30 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring/40",
          getNodeStateClassName(status),
          isSelected && "border-primary ring-2 ring-primary/20",
        )}
      >
        <div className="flex min-w-0 items-start justify-between gap-3">
          <span className="min-w-0 truncate text-sm font-medium">
            {processName}
          </span>
          <span
            className={cn(
              "shrink-0 rounded-md border px-2 py-1 text-xs",
              getStatusBadgeClassName(status),
            )}
          >
            {formatStatus(status)}
          </span>
        </div>
        <span className="line-clamp-2 text-xs text-muted-foreground">
          {dependencySummaryText}
        </span>
        <span className="truncate text-xs text-muted-foreground">
          {assigneeName ? `Assigned to ${assigneeName}` : "Unassigned"}
        </span>
      </button>

      {taskItem ? (
        <div className="flex flex-wrap justify-center gap-2">
          <TaskStatusActions
            taskItemId={taskItem.id}
            status={taskItem.status}
            disabled={statusDisabled || isUpdating || !onStatusChange}
            isUpdating={isUpdating}
            onStatusChange={onStatusChange}
          />
        </div>
      ) : null}
    </div>
  );
}

function WorkflowStepInspector({
  step,
  steps,
  processes,
  taskItem,
  assigneeOptions,
  disabled,
  statusDisabled,
  assigneeDisabled,
  updatingProcessId,
  onProcessChange,
  onDependencyChange,
  onRemove,
  onStatusChange,
  onAssigneeChange,
}: {
  step: WorkflowStep | null;
  steps: WorkflowStep[];
  processes: WorkflowProcessOption[];
  taskItem?: WorkflowTaskItem;
  assigneeOptions: WorkflowAssigneeOption[];
  disabled: boolean;
  statusDisabled: boolean;
  assigneeDisabled: boolean;
  updatingProcessId: string | null;
  onProcessChange: (stepId: string, processId: string) => void;
  onDependencyChange: (
    stepId: string,
    dependencyId: string,
    checked: boolean,
  ) => void;
  onRemove: (stepId: string) => void;
  onStatusChange?: (taskItemId: string, status: string) => void;
  onAssigneeChange?: (taskItemId: string, assigneeId: string | null) => void;
}) {
  if (!step) {
    return (
      <aside className="rounded-md border bg-background p-4 text-sm text-muted-foreground">
        Select a workflow step.
      </aside>
    );
  }

  const processName = getProcessName(processes, step.process_id);
  const dependencyOptions = steps.filter((candidate) => candidate.id !== step.id);
  const isUpdating = updatingProcessId === taskItem?.id;
  const eligibleAssignees = assigneeOptions.filter((employee) =>
    employee.processIds.includes(step.process_id),
  );

  return (
    <aside className="rounded-md border bg-background p-4 xl:sticky xl:top-4 xl:self-start">
      <div className="border-b pb-3">
        <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
          Selected step
        </p>
        <h4 className="mt-1 truncate font-medium">{processName}</h4>
      </div>

      <div className="mt-4 grid gap-4">
        <div className="grid gap-2">
          <label className="text-sm font-medium" htmlFor="workflow-step-process">
            Process
          </label>
          <select
            id="workflow-step-process"
            value={step.process_id}
            disabled={disabled}
            onChange={(event) => onProcessChange(step.id, event.target.value)}
            className="flex h-10 w-full rounded-md border bg-background px-3 py-2 text-sm disabled:opacity-60"
          >
            {processes.map((process) => (
              <option key={process.id} value={process.id}>
                {process.name}
              </option>
            ))}
          </select>
          {disabled ? (
            <p className="text-xs text-muted-foreground">
              Process editing is locked for this case or role.
            </p>
          ) : null}
        </div>

        <div className="grid gap-2">
          <p className="text-sm font-medium">Dependencies</p>
          {dependencyOptions.length === 0 ? (
            <p className="text-sm text-muted-foreground">
              No dependencies available.
            </p>
          ) : (
            <div className="grid gap-2">
              {dependencyOptions.map((dependency) => {
                const dependencyName = getProcessName(
                  processes,
                  dependency.process_id,
                );
                const checked = step.dependsOn.includes(dependency.id);
                const createsCycle =
                  !checked && wouldCreateCycle(steps, step.id, dependency.id);

                return (
                  <label
                    key={dependency.id}
                    className={cn(
                      "flex items-center gap-2 rounded-md border px-3 py-2 text-sm",
                      createsCycle && "opacity-50",
                    )}
                  >
                    <input
                      type="checkbox"
                      checked={checked}
                      disabled={disabled || createsCycle}
                      onChange={(event) =>
                        onDependencyChange(
                          step.id,
                          dependency.id,
                          event.target.checked,
                        )
                      }
                    />
                    <span className="min-w-0 truncate">{dependencyName}</span>
                  </label>
                );
              })}
            </div>
          )}
        </div>

        {taskItem ? (
          <div className="grid gap-2">
            <label className="text-sm font-medium" htmlFor="workflow-step-assignee">
              Assignee
            </label>
            <select
              id="workflow-step-assignee"
              value={taskItem.assigned_lab_member_id ?? NO_ASSIGNEE_VALUE}
              disabled={
                assigneeDisabled ||
                isUpdating ||
                !onAssigneeChange
              }
              onChange={(event) =>
                onAssigneeChange?.(
                  taskItem.id,
                  event.target.value === NO_ASSIGNEE_VALUE
                    ? null
                    : event.target.value,
                )
              }
              className="flex h-10 w-full rounded-md border bg-background px-3 py-2 text-sm disabled:opacity-60"
            >
              <option value={NO_ASSIGNEE_VALUE}>Unassigned</option>
              {eligibleAssignees.map((employee) => (
                <option key={employee.id} value={employee.id}>
                  {employee.name}
                </option>
              ))}
            </select>
            {eligibleAssignees.length === 0 ? (
              <p className="text-xs text-muted-foreground">
                No employees are assigned to this process type.
              </p>
            ) : null}
          </div>
        ) : null}

        {taskItem ? (
          <div className="grid gap-2">
            <p className="text-sm font-medium">Status</p>
            <div className="flex flex-wrap gap-2">
              <TaskStatusActions
                taskItemId={taskItem.id}
                status={taskItem.status}
                disabled={statusDisabled || isUpdating || !onStatusChange}
                isUpdating={isUpdating}
                onStatusChange={onStatusChange}
              />
            </div>
          </div>
        ) : null}

        <Button
          type="button"
          variant="outline"
          size="sm"
          onClick={() => onRemove(step.id)}
          disabled={disabled}
          className="justify-self-start"
        >
          <Trash2 className="size-4" />
          Remove step
        </Button>
      </div>
    </aside>
  );
}

function buildWorkflowGraphLayout(steps: WorkflowStep[]): WorkflowGraphLayout {
  const stepsById = new Map(steps.map((step) => [step.id, step]));
  const levelByStepId = new Map<string, number>();
  const visiting = new Set<string>();

  function getLevel(step: WorkflowStep): number {
    const existingLevel = levelByStepId.get(step.id);
    if (existingLevel !== undefined) return existingLevel;

    if (visiting.has(step.id)) {
      return 0;
    }

    visiting.add(step.id);
    const dependencyLevels = step.dependsOn
      .map((dependencyId) => stepsById.get(dependencyId))
      .filter((dependency): dependency is WorkflowStep => Boolean(dependency))
      .map((dependency) => getLevel(dependency));
    visiting.delete(step.id);

    const level =
      dependencyLevels.length === 0 ? 0 : Math.max(...dependencyLevels) + 1;
    levelByStepId.set(step.id, level);
    return level;
  }

  steps.forEach((step) => getLevel(step));

  const levels: WorkflowStep[][] = [];
  steps.forEach((step) => {
    const level = levelByStepId.get(step.id) ?? 0;
    levels[level] = [...(levels[level] ?? []), step];
  });

  const compactLevels = levels.filter(Boolean);
  const widestLevelWidth = compactLevels.reduce((widest, level) => {
    const levelWidth =
      level.length * NODE_WIDTH + Math.max(level.length - 1, 0) * NODE_GAP;
    return Math.max(widest, levelWidth);
  }, 0);
  const width = Math.max(
    MIN_CANVAS_WIDTH,
    widestLevelWidth + CANVAS_PADDING * 2,
  );
  const height = Math.max(
    MIN_CANVAS_HEIGHT,
    compactLevels.length * NODE_HEIGHT +
      Math.max(compactLevels.length - 1, 0) * LEVEL_GAP +
      CANVAS_PADDING * 2,
  );
  const positions = new Map<string, NodePosition>();

  compactLevels.forEach((level, levelIndex) => {
    const levelWidth =
      level.length * NODE_WIDTH + Math.max(level.length - 1, 0) * NODE_GAP;
    const startX = (width - levelWidth) / 2;
    const y = CANVAS_PADDING + levelIndex * (NODE_HEIGHT + LEVEL_GAP);

    level.forEach((step, stepIndex) => {
      positions.set(step.id, {
        x: startX + stepIndex * (NODE_WIDTH + NODE_GAP),
        y,
      });
    });
  });

  return {
    levels: compactLevels,
    positions,
    width,
    height,
  };
}

function buildConnectorLines(
  steps: WorkflowStep[],
  positions: Map<string, NodePosition>,
) {
  return steps.flatMap((step) => {
    const target = positions.get(step.id);
    if (!target) return [];

    const targetX = target.x + NODE_WIDTH / 2;
    const targetY = target.y;

    return step.dependsOn.flatMap((dependencyId) => {
      const source = positions.get(dependencyId);
      if (!source) return [];

      const sourceX = source.x + NODE_WIDTH / 2;
      const sourceY = source.y + NODE_HEIGHT;
      const midY = sourceY + Math.max((targetY - sourceY) / 2, 28);

      return [
        {
          id: `${dependencyId}-${step.id}`,
          path: `M ${sourceX} ${sourceY} L ${sourceX} ${midY} L ${targetX} ${midY} L ${targetX} ${targetY}`,
        },
      ];
    });
  });
}

function wouldCreateCycle(
  steps: WorkflowStep[],
  stepId: string,
  dependencyId: string,
) {
  const stepsById = new Map(steps.map((step) => [step.id, step]));
  const seen = new Set<string>();

  function dependencyCanReachStep(candidateId: string): boolean {
    if (candidateId === stepId) return true;
    if (seen.has(candidateId)) return false;

    seen.add(candidateId);
    const candidate = stepsById.get(candidateId);
    if (!candidate) return false;

    return candidate.dependsOn.some((id) => dependencyCanReachStep(id));
  }

  return dependencyCanReachStep(dependencyId);
}

function clamp(value: number, min: number, max: number) {
  return Math.min(Math.max(value, min), max);
}

function getProcessName(processes: WorkflowProcessOption[], processId: string) {
  return (
    processes.find((process) => process.id === processId)?.name ??
    "Unknown process"
  );
}

function dependencySummary(
  step: WorkflowStep,
  steps: WorkflowStep[],
  processes: WorkflowProcessOption[],
) {
  if (step.dependsOn.length === 0) {
    return "No dependencies";
  }

  const stepsById = new Map(steps.map((item) => [item.id, item]));
  const dependencyNames = step.dependsOn.map((dependencyId) => {
    const dependency = stepsById.get(dependencyId);
    return dependency
      ? getProcessName(processes, dependency.process_id)
      : "Missing dependency";
  });

  return `After ${dependencyNames.join(", ")}`;
}

function TaskStatusActions({
  taskItemId,
  status,
  disabled,
  isUpdating,
  onStatusChange,
}: {
  taskItemId: string;
  status: string;
  disabled: boolean;
  isUpdating: boolean;
  onStatusChange?: (taskItemId: string, status: string) => void;
}) {
  if (status === "LOCKED") {
    return (
      <Button type="button" variant="outline" size="sm" disabled>
        Locked
      </Button>
    );
  }

  if (status === "COMPLETED") {
    return (
      <Button
        type="button"
        variant="outline"
        size="sm"
        disabled={disabled}
        onClick={() => onStatusChange?.(taskItemId, "READY")}
      >
        <RotateCcw className="size-4" />
        {isUpdating ? "Updating..." : "Roll back"}
      </Button>
    );
  }

  if (status !== "READY" && status !== "IN_PROGRESS") {
    return null;
  }

  return (
    <>
      {status === "READY" ? (
        <Button
          type="button"
          variant="outline"
          size="sm"
          disabled={disabled}
          onClick={() => onStatusChange?.(taskItemId, "IN_PROGRESS")}
        >
          <Play className="size-4" />
          {isUpdating ? "Updating..." : "Start"}
        </Button>
      ) : null}
      <Button
        type="button"
        variant="outline"
        size="sm"
        disabled={disabled}
        onClick={() => onStatusChange?.(taskItemId, "COMPLETED")}
      >
        <Check className="size-4" />
        {isUpdating ? "Updating..." : "Complete"}
      </Button>
    </>
  );
}

function getNodeStateClassName(status: string) {
  if (status === "LOCKED") return "border-dashed bg-muted/50 text-muted-foreground";
  if (status === "IN_PROGRESS") return "border-blue-300 bg-blue-50/70";
  if (status === "COMPLETED") return "border-emerald-300 bg-emerald-50/70";
  if (status === "READY") return "border-amber-300 bg-amber-50/70";
  return "";
}

function getStatusBadgeClassName(status: string) {
  if (status === "LOCKED") return "bg-muted text-muted-foreground";
  if (status === "IN_PROGRESS") return "border-blue-200 bg-blue-100 text-blue-800";
  if (status === "COMPLETED") return "border-emerald-200 bg-emerald-100 text-emerald-800";
  if (status === "READY") return "border-amber-200 bg-amber-100 text-amber-800";
  return "bg-muted/40";
}

function formatStatus(status: string) {
  if (status === "IN_PROGRESS") return "In progress";
  return status.charAt(0) + status.slice(1).toLowerCase();
}
