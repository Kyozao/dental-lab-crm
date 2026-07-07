"use client";

import { useEffect, useMemo, useState, type ReactNode } from "react";
import { CalendarClock, ChevronDown, Loader2, RefreshCw, TriangleAlert, Users } from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { cn } from "@/lib/utils";

type SchedulingStatus = "SCHEDULED" | "AT_RISK" | "UNSCHEDULED";

type ScheduleReviewCase = {
  caseId: string;
  caseCode: string;
  patientName: string;
  customerName: string;
  dueDate: string | null;
  priority: "urgent" | "high" | "normal" | "low";
  proposalStatus: SchedulingStatus;
  riskCount: number;
  activeProcessCount: number;
  processes: Array<{
    caseProcessId: string;
    workflowStepId: string;
    processName: string;
    status: string;
    editable: boolean;
    assignedLabMemberId: string | null;
    assignedLabMemberName: string | null;
    plannedStartDate: string | null;
    plannedEndDate: string | null;
    schedulingStatus: SchedulingStatus;
    riskReason: string | null;
    assigneeOptions: Array<{
      labMemberId: string;
      labMemberName: string;
    }>;
  }>;
};

type ScheduleOverview = {
  timezone: string;
  scheduleRevision: number;
  canManage: boolean;
  activeCaseCount: number;
  activeProcessCount: number;
  activeCases: ScheduleReviewCase[];
  employees: Array<{
    id: string;
    name: string;
    role: string;
    processes: Array<{
      processId: string;
    }>;
    shiftsConfigured: boolean;
  }>;
  machines: Array<{
    id: string;
    name: string;
    productivityPointsPerHour: number;
    shiftsConfigured: boolean;
  }>;
  proposals: Array<{
    id: string;
    status: string;
    sourceRevision: number;
    createdAt: string;
    decidedAt: string | null;
    summary: {
      scheduledCount?: number;
      atRiskCount?: number;
      unscheduledCount?: number;
      riskCount?: number;
    };
  }>;
};

type ScheduleProposal = {
  id: string;
  status: string;
  sourceRevision: number;
  createdAt: string;
  decidedAt?: string | null;
  summary: {
    scheduledCount: number;
    atRiskCount: number;
    unscheduledCount: number;
    riskCount: number;
  };
  changes: Array<{
    caseProcessId: string;
    assignedLabMemberId: string;
    originalAssignedLabMemberId: string;
    plannedMillingMachineId: string | null;
    plannedStartDate: string | null;
    plannedEndDate: string | null;
    schedulingStatus: SchedulingStatus;
    allocations: Array<{
      date: string;
      plannedMinutes: number;
      millingMachineId: string | null;
    }>;
  }>;
  employeeWorkloads: Array<{
    labMemberId: string;
    labMemberName: string;
    shiftsConfigured: boolean;
    scheduledMinutes: number;
    availableMinutes: number;
    remainingMinutes: number;
    overbookedDayCount: number;
    days: Array<{
      date: string;
      plannedMinutes: number;
      availableMinutes: number;
      remainingMinutes: number;
      isOverbooked: boolean;
    }>;
  }>;
  risks: Array<{
    caseProcessId: string;
    caseCode: string;
    processName: string;
    reason: string;
  }>;
  reviewCases: ScheduleReviewCase[];
};

type DraftWorkload = ScheduleProposal["employeeWorkloads"][number];

function cloneWorkload(workload: DraftWorkload): DraftWorkload {
  return {
    ...workload,
    days: workload.days.map((day) => ({ ...day })),
  };
}

function adjustWorkloadMinutes(
  workload: DraftWorkload | undefined,
  allocationDate: string,
  deltaMinutes: number,
) {
  if (!workload || deltaMinutes === 0) {
    return;
  }

  const day = workload.days.find((item) => item.date === allocationDate);
  if (!day) {
    return;
  }

  day.plannedMinutes += deltaMinutes;
  day.remainingMinutes -= deltaMinutes;
  day.isOverbooked = day.plannedMinutes > day.availableMinutes;
}

function finalizeWorkload(workload: DraftWorkload) {
  workload.scheduledMinutes = workload.days.reduce((total, day) => total + day.plannedMinutes, 0);
  workload.availableMinutes = workload.days.reduce((total, day) => total + day.availableMinutes, 0);
  workload.remainingMinutes = workload.days.reduce((total, day) => total + day.remainingMinutes, 0);
  workload.overbookedDayCount = workload.days.filter((day) => day.isOverbooked).length;
  return workload;
}

function buildDraftWorkloads(proposal: ScheduleProposal | null) {
  if (!proposal) {
    return new Map<string, DraftWorkload>();
  }

  const workloads = new Map(
    proposal.employeeWorkloads.map((workload) => [workload.labMemberId, cloneWorkload(workload)]),
  );

  for (const change of proposal.changes) {
    if (change.assignedLabMemberId === change.originalAssignedLabMemberId) {
      continue;
    }

    for (const allocation of change.allocations) {
      if (change.originalAssignedLabMemberId) {
        adjustWorkloadMinutes(
          workloads.get(change.originalAssignedLabMemberId),
          allocation.date,
          -allocation.plannedMinutes,
        );
      }

      if (change.assignedLabMemberId) {
        adjustWorkloadMinutes(
          workloads.get(change.assignedLabMemberId),
          allocation.date,
          allocation.plannedMinutes,
        );
      }
    }
  }

  for (const [labMemberId, workload] of workloads) {
    workloads.set(labMemberId, finalizeWorkload(workload));
  }

  return workloads;
}

export function SchedulePageClient({
  currentUserRole,
}: {
  currentUserRole: string;
}) {
  const [schedule, setSchedule] = useState<ScheduleOverview | null>(null);
  const [proposal, setProposal] = useState<ScheduleProposal | null>(null);
  const [expandedCaseIds, setExpandedCaseIds] = useState<string[]>([]);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function loadSchedule() {
    try {
      setLoading(true);
      setError(null);
      const response = await fetch("/api/schedule", { cache: "no-store" });
      const payload = (await response.json()) as {
        data?: ScheduleOverview;
        error?: string;
      };

      if (!response.ok || !payload.data) {
        throw new Error(payload.error ?? "Failed to load schedule.");
      }

      setSchedule(payload.data);
    } catch (loadError) {
      setError(loadError instanceof Error ? loadError.message : "Failed to load schedule.");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    void loadSchedule();
  }, []);

  async function createProposal() {
    try {
      setSubmitting(true);
      setError(null);
      const response = await fetch("/api/schedule/proposals", { method: "POST" });
      const payload = (await response.json()) as {
        data?: ScheduleProposal;
        error?: string;
      };

      if (!response.ok || !payload.data) {
        throw new Error(payload.error ?? "Failed to create proposal.");
      }

      setProposal(payload.data);
      setExpandedCaseIds([]);
      await loadSchedule();
    } catch (proposalError) {
      setError(
        proposalError instanceof Error
          ? proposalError.message
          : "Failed to create proposal.",
      );
    } finally {
      setSubmitting(false);
    }
  }

  async function decideProposal(action: "approve" | "reject") {
    if (!proposal) return;

    try {
      setSubmitting(true);
      setError(null);
      const response = await fetch(
        `/api/schedule/proposals/${proposal.id}/${action}`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body:
            action === "approve"
              ? JSON.stringify({
                  changes: proposal.changes.map((change) => ({
                    caseProcessId: change.caseProcessId,
                    assignedLabMemberId: change.assignedLabMemberId || null,
                  })),
                })
              : undefined,
        },
      );
      const payload = (await response.json()) as { error?: string };

      if (!response.ok) {
        throw new Error(payload.error ?? `Failed to ${action} proposal.`);
      }

      setProposal(null);
      setExpandedCaseIds([]);
      await loadSchedule();
    } catch (decisionError) {
      setError(
        decisionError instanceof Error
          ? decisionError.message
          : `Failed to ${action} proposal.`,
      );
    } finally {
      setSubmitting(false);
    }
  }

  function toggleCase(caseId: string) {
    setExpandedCaseIds((current) =>
      current.includes(caseId)
        ? current.filter((value) => value !== caseId)
        : [...current, caseId],
    );
  }

  function updateDraftAssignee(caseProcessId: string, assignedLabMemberId: string) {
    setProposal((current) => {
      if (!current) return current;

      const nextAssigneeId = assignedLabMemberId === "__unassigned__" ? "" : assignedLabMemberId;

      return {
        ...current,
        changes: current.changes.map((change) =>
          change.caseProcessId === caseProcessId
            ? { ...change, assignedLabMemberId: nextAssigneeId }
            : change,
        ),
        reviewCases: current.reviewCases.map((reviewCase) => ({
          ...reviewCase,
          processes: reviewCase.processes.map((process) => {
            if (process.caseProcessId !== caseProcessId) {
              return process;
            }

            const nextAssigneeName =
              process.assigneeOptions.find(
                (option) => option.labMemberId === nextAssigneeId,
              )?.labMemberName ?? null;

            return {
              ...process,
              assignedLabMemberId: nextAssigneeId || null,
              assignedLabMemberName: nextAssigneeName,
            };
          }),
        })),
      };
    });
  }

  const draftReviewCases = useMemo(
    () => proposal?.reviewCases ?? [],
    [proposal],
  );
  const draftWorkloads = useMemo(() => buildDraftWorkloads(proposal), [proposal]);
  const baselineWorkloads = useMemo(
    () =>
      new Map(
        (proposal?.employeeWorkloads ?? []).map((workload) => [workload.labMemberId, workload]),
      ),
    [proposal],
  );
  const changeByProcessId = useMemo(
    () =>
      new Map(
        (proposal?.changes ?? []).map((change) => [change.caseProcessId, change]),
      ),
    [proposal],
  );

  if (loading) {
    return (
      <div className="flex min-h-[280px] items-center justify-center rounded-2xl border bg-card">
        <Loader2 className="size-5 animate-spin text-muted-foreground" />
      </div>
    );
  }

  if (!schedule) {
    return (
      <div className="rounded-2xl border border-red-200 bg-red-50 p-6 text-sm text-red-700">
        {error ?? "Schedule data is unavailable."}
      </div>
    );
  }

  const activeRiskCases = schedule.activeCases.filter((reviewCase) => reviewCase.riskCount > 0);

  return (
    <section className="grid gap-6">
      <div className="grid gap-4 lg:grid-cols-[1.2fr_0.8fr]">
        <div className="rounded-3xl border bg-[radial-gradient(circle_at_top_left,hsl(var(--primary)/0.18),transparent_45%),linear-gradient(135deg,hsl(var(--background)),hsl(var(--muted)/0.65))] p-6 shadow-sm">
          <div className="flex flex-wrap items-start justify-between gap-4">
            <div className="space-y-2">
              <p className="text-xs uppercase tracking-[0.2em] text-muted-foreground">
                Manager review
              </p>
              <h2 className="text-2xl font-semibold">
                Revision {schedule.scheduleRevision}
              </h2>
              <p className="max-w-2xl text-sm text-muted-foreground">
                Review proposal drafts for {schedule.activeCaseCount} active production case
                {schedule.activeCaseCount === 1 ? "" : "s"} across {schedule.activeProcessCount} active
                {" "}processes before committing schedule changes.
              </p>
            </div>

            <div className="flex flex-wrap gap-2">
              <Button type="button" variant="outline" onClick={() => void loadSchedule()}>
                <RefreshCw className="size-4" />
                Refresh
              </Button>
              {schedule.canManage ? (
                <Button
                  type="button"
                  onClick={() => void createProposal()}
                  disabled={submitting}
                >
                  {submitting ? <Loader2 className="size-4 animate-spin" /> : null}
                  Generate proposal
                </Button>
              ) : null}
            </div>
          </div>

          <div className="mt-6 grid gap-3 sm:grid-cols-3">
            <MetricCard label="Active cases" value={String(schedule.activeCaseCount)} />
            <MetricCard label="Risk cases" value={String(activeRiskCases.length)} />
            <MetricCard
              label="Draft proposals"
              value={String(schedule.proposals.filter((item) => item.status === "DRAFT").length)}
            />
          </div>
        </div>

        <div className="rounded-3xl border bg-card p-6 shadow-sm">
          <p className="text-xs uppercase tracking-[0.2em] text-muted-foreground">
            Review scope
          </p>
          <div className="mt-4 grid gap-3">
            <ScopeCard
              icon={<CalendarClock className="size-4" />}
              title="Incomplete workflow review"
              description="The review list includes locked, ready, and in-progress workflow steps for active production cases."
            />
            <ScopeCard
              icon={<Users className="size-4" />}
              title="Assignee edits only"
              description="Managers can reassign eligible employees, but dates and allocations stay proposal-generated."
            />
            <ScopeCard
              icon={<TriangleAlert className="size-4" />}
              title="Approval writes live schedule"
              description="Rejecting a draft leaves current case_process assignments and plans unchanged."
            />
          </div>
        </div>
      </div>

      {error ? (
        <div className="rounded-2xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
          {error}
        </div>
      ) : null}

      <div className="rounded-3xl border bg-card p-6 shadow-sm">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div>
            <p className="text-xs uppercase tracking-[0.2em] text-muted-foreground">
              Draft review
            </p>
            <h2 className="mt-2 text-xl font-semibold">
              {proposal ? "Case proposal review" : "Generate a proposal to review cases"}
            </h2>
            <p className="mt-2 max-w-2xl text-sm text-muted-foreground">
              {proposal
                ? `${proposal.summary.scheduledCount} scheduled, ${proposal.summary.atRiskCount} at risk, ${proposal.summary.unscheduledCount} unscheduled.`
                : "No draft is loaded yet. Generate a proposal to review grouped case assignments before approval."}
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <Badge variant={schedule.canManage ? "info" : "neutral"}>
              {currentUserRole === "PRODUCTION" ? "Read only" : "Proposal based"}
            </Badge>
            {proposal && schedule.canManage ? (
              <>
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => void decideProposal("reject")}
                  disabled={submitting}
                >
                  Reject
                </Button>
                <Button
                  type="button"
                  onClick={() => void decideProposal("approve")}
                  disabled={submitting}
                >
                  {submitting ? <Loader2 className="size-4 animate-spin" /> : null}
                  Approve
                </Button>
              </>
            ) : null}
          </div>
        </div>

        {!proposal ? (
          <div className="mt-6 rounded-2xl border border-dashed bg-muted/20 px-5 py-10 text-center">
            <p className="text-sm font-medium">
              {schedule.activeCaseCount} active case{schedule.activeCaseCount === 1 ? "" : "s"} ready for review
            </p>
            <p className="mt-2 text-sm text-muted-foreground">
              Draft generation stays manual so managers can review one proposal at a time.
            </p>
          </div>
        ) : (
          <div className="mt-6 grid gap-4">
            {draftReviewCases.map((reviewCase) => {
              const expanded = expandedCaseIds.includes(reviewCase.caseId);

              return (
                <div key={reviewCase.caseId} className="overflow-hidden rounded-2xl border">
                  <button
                    type="button"
                    className="flex w-full flex-col gap-4 bg-background px-5 py-4 text-left transition hover:bg-muted/20"
                    onClick={() => toggleCase(reviewCase.caseId)}
                  >
                    <div className="flex flex-wrap items-start justify-between gap-3">
                      <div className="space-y-2">
                        <div className="flex flex-wrap items-center gap-2">
                          <span className="text-lg font-semibold">{reviewCase.caseCode}</span>
                          <StatusBadge status={reviewCase.proposalStatus} />
                          <PriorityBadge priority={reviewCase.priority} />
                        </div>
                        <p className="text-sm text-muted-foreground">
                          {reviewCase.patientName} · {reviewCase.customerName}
                        </p>
                      </div>

                      <ChevronDown
                        className={cn(
                          "size-5 text-muted-foreground transition-transform",
                          expanded ? "rotate-180" : "rotate-0",
                        )}
                      />
                    </div>

                    <div className="grid gap-3 text-sm text-muted-foreground sm:grid-cols-4">
                      <ReviewMeta
                        label="Due"
                        value={reviewCase.dueDate ? longDate(reviewCase.dueDate) : "No due date"}
                      />
                      <ReviewMeta
                        label="Processes"
                        value={String(reviewCase.activeProcessCount)}
                      />
                      <ReviewMeta
                        label="Risks"
                        value={String(reviewCase.riskCount)}
                      />
                      <ReviewMeta
                        label="Source revision"
                        value={String(proposal.sourceRevision)}
                      />
                    </div>
                  </button>

                  {expanded ? (
                    <div className="border-t bg-muted/15 px-5 py-4">
                      <div className="grid gap-3">
                        {reviewCase.processes.map((process) => {
                          const change = changeByProcessId.get(process.caseProcessId);
                          const processMinutes = change
                            ? change.allocations.reduce(
                                (total, allocation) => total + allocation.plannedMinutes,
                                0,
                              )
                            : 0;
                          const selectedWorkload = process.assignedLabMemberId
                            ? draftWorkloads.get(process.assignedLabMemberId) ?? null
                            : null;
                          const baselineWorkload = process.assignedLabMemberId
                            ? baselineWorkloads.get(process.assignedLabMemberId) ?? null
                            : null;
                          const workloadDeltaMinutes =
                            selectedWorkload && baselineWorkload
                              ? selectedWorkload.scheduledMinutes - baselineWorkload.scheduledMinutes
                              : null;

                          return (
                            <div
                              key={process.caseProcessId}
                              className="rounded-2xl border bg-background px-4 py-4"
                            >
                              <div className="grid gap-4 xl:grid-cols-[minmax(0,1fr)_minmax(320px,420px)] xl:items-start">
                                <div className="space-y-3">
                                  <div className="flex flex-wrap items-center gap-2">
                                    <p className="font-medium">{process.processName}</p>
                                    <Badge variant="outline">{process.status.toLowerCase()}</Badge>
                                    <StatusBadge status={process.schedulingStatus} />
                                  </div>
                                  <p className="text-xs text-muted-foreground">
                                    {process.plannedStartDate
                                      ? `${shortDate(process.plannedStartDate)} to ${shortDate(process.plannedEndDate ?? process.plannedStartDate)}`
                                      : "No plan window generated"}
                                  </p>
                                  <div className="grid gap-3 sm:grid-cols-3">
                                    <ProcessMetaCard
                                      label="Workflow"
                                      value={formatProcessStatus(process.status)}
                                    />
                                    <ProcessMetaCard
                                      label="Window"
                                      value={
                                        process.plannedStartDate
                                          ? `${shortDate(process.plannedStartDate)} to ${shortDate(process.plannedEndDate ?? process.plannedStartDate)}`
                                          : "Not scheduled"
                                      }
                                    />
                                    <ProcessMetaCard
                                      label="Assignee"
                                      value={process.assignedLabMemberName ?? "Unassigned"}
                                    />
                                  </div>
                                </div>

                                {process.editable && schedule.canManage ? (
                                  <div className="space-y-3 xl:justify-self-stretch">
                                    <div className="rounded-xl border bg-muted/10 px-3 py-3">
                                      <p className="mb-2 text-xs uppercase tracking-[0.16em] text-muted-foreground">
                                        Proposed assignee
                                      </p>
                                      <Select
                                        value={process.assignedLabMemberId ?? "__unassigned__"}
                                        onValueChange={(value) =>
                                          updateDraftAssignee(process.caseProcessId, value)
                                        }
                                      >
                                        <SelectTrigger className="w-full bg-background">
                                          <SelectValue placeholder="Select employee" />
                                        </SelectTrigger>
                                        <SelectContent>
                                          {process.assigneeOptions.length === 0 ? (
                                            <SelectItem value="__unassigned__">
                                              No eligible employee
                                            </SelectItem>
                                          ) : (
                                            process.assigneeOptions.map((option) => (
                                              <SelectItem
                                                key={option.labMemberId}
                                                value={option.labMemberId}
                                              >
                                                {option.labMemberName}
                                              </SelectItem>
                                            ))
                                          )}
                                        </SelectContent>
                                      </Select>
                                      <p className="mt-2 text-xs text-muted-foreground">
                                        Reassign this workflow step without opening the inspector.
                                      </p>
                                    </div>
                                    <LiveWorkloadCard
                                      workload={selectedWorkload}
                                      workloadDeltaMinutes={workloadDeltaMinutes}
                                      processMinutes={processMinutes}
                                      emptyLabel="No capacity data"
                                    />
                                  </div>
                                ) : (
                                  <div className="space-y-3 xl:justify-self-stretch">
                                    <div className="rounded-xl border bg-muted/20 px-3 py-3 text-sm">
                                      <p className="text-xs uppercase tracking-[0.16em] text-muted-foreground">
                                        Assignee
                                      </p>
                                      <p className="mt-1 font-medium">
                                        {process.assignedLabMemberName ?? "Unassigned"}
                                      </p>
                                      <p className="mt-1 text-xs text-muted-foreground">
                                        {process.editable ? "Read only for your role" : "Locked by process progress"}
                                      </p>
                                    </div>
                                    <LiveWorkloadCard
                                      workload={selectedWorkload}
                                      workloadDeltaMinutes={workloadDeltaMinutes}
                                      processMinutes={processMinutes}
                                      emptyLabel={
                                        process.assignedLabMemberId
                                          ? "No capacity data"
                                          : "Unassigned in draft"
                                      }
                                    />
                                  </div>
                                )}
                              </div>

                              {process.riskReason ? (
                                <div className="mt-3 rounded-xl border border-amber-200 bg-amber-50 px-3 py-2 text-sm text-amber-900">
                                  {process.riskReason}
                                </div>
                              ) : null}
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  ) : null}
                </div>
              );
            })}
          </div>
        )}
      </div>
    </section>
  );
}

function MetricCard({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-2xl border bg-background/85 px-4 py-4 shadow-sm">
      <p className="text-xs uppercase tracking-[0.16em] text-muted-foreground">
        {label}
      </p>
      <p className="mt-2 text-2xl font-semibold">{value}</p>
    </div>
  );
}

function ProcessMetaCard({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-xl border bg-muted/10 px-3 py-3">
      <p className="text-[11px] uppercase tracking-[0.16em] text-muted-foreground">
        {label}
      </p>
      <p className="mt-1 text-sm font-medium">{value}</p>
    </div>
  );
}

function LiveWorkloadCard({
  workload,
  workloadDeltaMinutes,
  processMinutes,
  emptyLabel,
}: {
  workload: DraftWorkload | null;
  workloadDeltaMinutes: number | null;
  processMinutes: number;
  emptyLabel: string;
}) {
  if (!workload || (!workload.shiftsConfigured && workload.availableMinutes <= 0)) {
    return (
      <div className="rounded-xl border border-dashed bg-muted/10 px-3 py-3 text-sm text-muted-foreground">
        {emptyLabel}
      </div>
    );
  }

  const capacityRatio =
    workload.availableMinutes > 0
      ? workload.scheduledMinutes / workload.availableMinutes
      : 0;
  const cappedCapacityPercent = Math.max(0, Math.min(capacityRatio, 1)) * 100;
  const overflowPercent =
    workload.availableMinutes > 0 && capacityRatio > 1
      ? Math.min((capacityRatio - 1) * 100, 100)
      : 0;

  return (
    <div className="rounded-xl border bg-muted/10 px-3 py-3 text-sm">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <p className="font-medium">{workload.labMemberName}</p>
        <Badge variant={workload.overbookedDayCount > 0 ? "warning" : "success"}>
          {workload.overbookedDayCount > 0 ? "Overbooked risk" : "Within capacity"}
        </Badge>
      </div>
      <div className="mt-2 grid gap-2 sm:grid-cols-2">
        <div>
          <p className="text-xs uppercase tracking-[0.16em] text-muted-foreground">
            14-day load
          </p>
          <p className="mt-1 font-medium">
            {formatMinutesAsHours(workload.scheduledMinutes)} / {formatMinutesAsHours(workload.availableMinutes)}
          </p>
        </div>
        <div>
          <p className="text-xs uppercase tracking-[0.16em] text-muted-foreground">
            Remaining
          </p>
          <p className="mt-1 font-medium">{formatMinutesAsHours(workload.remainingMinutes)}</p>
        </div>
      </div>
      <div className="mt-3">
        <div className="flex items-center justify-between gap-3 text-xs text-muted-foreground">
          <span>Employee workload</span>
          <span>{Math.round(capacityRatio * 100)}%</span>
        </div>
        <div className="mt-2 h-3 overflow-hidden rounded-full bg-muted">
          <div
            className={cn(
              "h-full rounded-full transition-[width] duration-200",
              workload.overbookedDayCount > 0 ? "bg-amber-500" : "bg-emerald-500",
            )}
            style={{ width: `${cappedCapacityPercent}%` }}
          />
        </div>
        {overflowPercent > 0 ? (
          <div className="mt-2 h-2 overflow-hidden rounded-full bg-red-100">
            <div
              className="h-full rounded-full bg-red-500 transition-[width] duration-200"
              style={{ width: `${overflowPercent}%` }}
            />
          </div>
        ) : null}
      </div>
      <div className="mt-3 flex flex-wrap gap-2 text-xs">
        <Badge variant="outline">This step {formatSignedMinutes(processMinutes)}</Badge>
        <Badge variant="outline">
          Draft delta {formatSignedMinutes(workloadDeltaMinutes ?? 0)}
        </Badge>
      </div>
    </div>
  );
}

function ScopeCard({
  icon,
  title,
  description,
}: {
  icon: ReactNode;
  title: string;
  description: string;
}) {
  return (
    <div className="rounded-2xl border bg-muted/20 px-4 py-3">
      <div className="flex items-start gap-3">
        <span className="mt-0.5 text-muted-foreground">{icon}</span>
        <div>
          <p className="font-medium">{title}</p>
          <p className="text-sm text-muted-foreground">{description}</p>
        </div>
      </div>
    </div>
  );
}

function ReviewMeta({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <p className="text-xs uppercase tracking-[0.16em] text-muted-foreground">
        {label}
      </p>
      <p className="mt-1 font-medium text-foreground">{value}</p>
    </div>
  );
}

function StatusBadge({ status }: { status: SchedulingStatus }) {
  const variant =
    status === "SCHEDULED"
      ? "success"
      : status === "AT_RISK"
        ? "warning"
        : "neutral";

  return (
    <Badge variant={variant} className="uppercase">
      {status === "AT_RISK" ? "At risk" : status.toLowerCase()}
    </Badge>
  );
}

function PriorityBadge({
  priority,
}: {
  priority: "urgent" | "high" | "normal" | "low";
}) {
  const variant =
    priority === "urgent"
      ? "danger"
      : priority === "high"
        ? "warning"
        : priority === "low"
          ? "neutral"
          : "outline";

  return (
    <Badge variant={variant} className="uppercase">
      {priority}
    </Badge>
  );
}

function shortDate(value: string) {
  return new Intl.DateTimeFormat(undefined, {
    month: "short",
    day: "numeric",
  }).format(new Date(value));
}

function longDate(value: string) {
  return new Intl.DateTimeFormat(undefined, {
    month: "short",
    day: "numeric",
    year: "numeric",
  }).format(new Date(value));
}

function formatMinutesAsHours(minutes: number) {
  const sign = minutes < 0 ? "-" : "";
  return `${sign}${(Math.abs(minutes) / 60).toFixed(1)}h`;
}

function formatSignedMinutes(minutes: number) {
  if (minutes === 0) {
    return "0.0h";
  }

  return `${minutes > 0 ? "+" : "-"}${(Math.abs(minutes) / 60).toFixed(1)}h`;
}

function formatProcessStatus(status: string) {
  return status
    .toLowerCase()
    .split("_")
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(" ");
}
