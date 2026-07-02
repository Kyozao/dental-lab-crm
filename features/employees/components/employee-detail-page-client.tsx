"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { Loader2 } from "lucide-react";

import { EmptyState } from "@/components/app/empty-state";
import { Panel, PanelHeader } from "@/components/app/panel";
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { RefreshButton } from "@/components/ui/refresh-button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { UserRole } from "@/generated/prisma/enums";
import {
  assignableRoles,
  formatEmployeeDate,
  formatEmployeeDateShort,
  formatMinutesAsHours,
  roleBadgeVariant,
  roleLabels,
  weekdayLabels,
} from "@/features/employees/employee-ui";
import {
  getEmployeeApi,
  listEmployeeProcessesApi,
  updateEmployeeAvailabilityApi,
  updateEmployeeProcessesApi,
  updateEmployeeRoleApi,
} from "@/features/employees/services/employees-api";
import type {
  Employee,
  EmployeeDashboard,
  EmployeeProcess,
  EmployeeRole,
  EmployeeScheduleProfile,
} from "@/features/employees/types";

type EmployeeDetailPageClientProps = {
  employeeId: string;
};

type DraftWeekdayCapacity = {
  clientId: string;
  id?: string;
  dayOfWeek: number;
  availableMinutes: number;
};

type DraftScheduleException = {
  clientId: string;
  id?: string;
  exceptionDate: string;
  availableMinutes: number;
  reason: string;
};

const weekdayDisplayOrder = [1, 2, 3, 4, 5, 6, 0];
const defaultWeekdayMinutes = 8 * 60;

function buildWeekdayCapacityDraft(profile: EmployeeScheduleProfile | null) {
  const capacitiesByDay = new Map(
    (profile?.weekdayCapacities ?? []).map((capacity) => [
      capacity.dayOfWeek,
      capacity,
    ]),
  );

  return weekdayDisplayOrder.map((dayOfWeek) => {
    const capacity = capacitiesByDay.get(dayOfWeek);

    return {
      clientId: capacity?.id ?? `weekday-${dayOfWeek}`,
      id: capacity?.id,
      dayOfWeek,
      availableMinutes: capacity?.availableMinutes ?? 0,
    };
  });
}

function buildExceptionDraft(profile: EmployeeScheduleProfile | null) {
  return (profile?.exceptions ?? []).map((exception) => ({
    clientId: exception.id,
    id: exception.id,
    exceptionDate: exception.exceptionDate.slice(0, 10),
    availableMinutes: exception.availableMinutes,
    reason: exception.reason ?? "",
  }));
}

function normalizeWeekdayCapacitySnapshot(capacities: DraftWeekdayCapacity[]) {
  return JSON.stringify(
    [...capacities]
      .sort(
        (left, right) =>
          left.dayOfWeek - right.dayOfWeek ||
          left.clientId.localeCompare(right.clientId),
      )
      .map((capacity) => ({
        id: capacity.id ?? null,
        dayOfWeek: capacity.dayOfWeek,
        availableMinutes: capacity.availableMinutes,
      })),
  );
}

function normalizeExceptionSnapshot(exceptions: DraftScheduleException[]) {
  return JSON.stringify(
    [...exceptions]
      .sort(
        (left, right) =>
          left.exceptionDate.localeCompare(right.exceptionDate) ||
          left.clientId.localeCompare(right.clientId),
      )
      .map((exception) => ({
        id: exception.id ?? null,
        exceptionDate: exception.exceptionDate,
        availableMinutes: exception.availableMinutes,
        reason: exception.reason.trim(),
      })),
  );
}

function createDraftId(prefix: string) {
  return `${prefix}-${Math.random().toString(36).slice(2, 10)}`;
}

function formatMetricNumber(value: number | null) {
  if (value === null) {
    return "N/A";
  }

  return value.toFixed(1);
}

function processStatusLabel(status: string) {
  switch (status) {
    case "READY":
      return "Ready";
    case "IN_PROGRESS":
      return "In progress";
    case "COMPLETED":
      return "Completed";
    case "LOCKED":
      return "Locked";
    case "SKIPPED":
      return "Skipped";
    case "CANCELLED":
      return "Cancelled";
    default:
      return status;
  }
}

function processStatusVariant(status: string) {
  if (status === "IN_PROGRESS") return "info" as const;
  if (status === "READY") return "warning" as const;
  if (status === "COMPLETED") return "success" as const;
  return "neutral" as const;
}

function priorityLabel(priority: string | null) {
  if (!priority) return "Normal";
  return priority.toLowerCase().replace("_", " ");
}

function initialsForEmployee(name: string) {
  const parts = name.trim().split(/\s+/).slice(0, 2);
  return parts.map((part) => part[0]?.toUpperCase() ?? "").join("") || "E";
}

function MetricCard(props: {
  label: string;
  value: string;
  note: string;
}) {
  return (
    <Card size="sm">
      <CardHeader className="pb-0">
        <CardDescription>{props.label}</CardDescription>
        <CardTitle className="text-2xl">{props.value}</CardTitle>
      </CardHeader>
      <CardContent>
        <p className="text-sm text-muted-foreground">{props.note}</p>
      </CardContent>
    </Card>
  );
}

function LoadingEmployeeProfile() {
  return (
    <div className="grid gap-5">
      <Panel>
        <PanelHeader>
          <div className="space-y-2">
            <div className="h-4 w-32 animate-pulse rounded bg-muted" />
            <div className="h-6 w-56 animate-pulse rounded bg-muted" />
            <div className="h-4 w-72 animate-pulse rounded bg-muted" />
          </div>
        </PanelHeader>
        <div className="grid gap-4 px-4 pb-4 sm:grid-cols-2 xl:grid-cols-6 sm:px-6 sm:pb-6">
          {Array.from({ length: 6 }, (_, index) => (
            <div key={index} className="h-28 animate-pulse rounded-xl bg-muted" />
          ))}
        </div>
      </Panel>
      <div className="grid gap-5 xl:grid-cols-[minmax(0,1.5fr)_360px]">
        <div className="grid gap-5">
          {Array.from({ length: 2 }, (_, index) => (
            <div key={index} className="h-72 animate-pulse rounded-xl bg-muted" />
          ))}
        </div>
        <div className="grid gap-5">
          {Array.from({ length: 3 }, (_, index) => (
            <div key={index} className="h-48 animate-pulse rounded-xl bg-muted" />
          ))}
        </div>
      </div>
    </div>
  );
}

export function EmployeeDetailPageClient({
  employeeId,
}: EmployeeDetailPageClientProps) {
  const [employee, setEmployee] = useState<Employee | null>(null);
  const [scheduleProfile, setScheduleProfile] =
    useState<EmployeeScheduleProfile | null>(null);
  const [dashboard, setDashboard] = useState<EmployeeDashboard | null>(null);
  const [processes, setProcesses] = useState<EmployeeProcess[]>([]);
  const [draftProcessIds, setDraftProcessIds] = useState<string[]>([]);
  const [draftWeekdayCapacities, setDraftWeekdayCapacities] = useState<
    DraftWeekdayCapacity[]
  >(
    [],
  );
  const [draftExceptions, setDraftExceptions] = useState<
    DraftScheduleException[]
  >([]);
  const [hydrated, setHydrated] = useState(false);
  const [loading, setLoading] = useState(true);
  const [savingAssignments, setSavingAssignments] = useState(false);
  const [savingRole, setSavingRole] = useState(false);
  const [savingAvailability, setSavingAvailability] = useState(false);
  const [canAssignProcesses, setCanAssignProcesses] = useState(false);
  const [canEditRole, setCanEditRole] = useState(false);
  const [canManageCapacity, setCanManageCapacity] = useState(false);
  const [draftRole, setDraftRole] = useState<EmployeeRole | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);

  const refreshEmployee = useCallback(async () => {
    setLoading(true);
    setError(null);

    try {
      const [employeeResult, processResult] = await Promise.all([
        getEmployeeApi(employeeId),
        listEmployeeProcessesApi(),
      ]);

      setEmployee(employeeResult.employee);
      setScheduleProfile(employeeResult.scheduleProfile);
      setDashboard(employeeResult.dashboard);
      setDraftProcessIds(
        employeeResult.employee.processes.map((process) => process.id),
      );
      setDraftWeekdayCapacities(
        buildWeekdayCapacityDraft(employeeResult.scheduleProfile),
      );
      setDraftExceptions(buildExceptionDraft(employeeResult.scheduleProfile));
      setCanAssignProcesses(employeeResult.canAssignProcesses);
      setCanEditRole(employeeResult.canEditRole);
      setCanManageCapacity(employeeResult.canManageCapacity);
      setDraftRole(
        employeeResult.employee.role === UserRole.OWNER
          ? null
          : (employeeResult.employee.role as EmployeeRole),
      );
      setProcesses(processResult);
    } catch (loadError) {
      setError(
        loadError instanceof Error
          ? loadError.message
          : "Failed to load employee.",
      );
    } finally {
      setLoading(false);
    }
  }, [employeeId]);

  useEffect(() => {
    setHydrated(true);
    void refreshEmployee();
  }, [refreshEmployee]);

  function resetDraftAssignments() {
    if (!employee) return;
    setError(null);
    setNotice(null);
    setDraftProcessIds(employee.processes.map((process) => process.id));
  }

  async function saveDraftAssignments() {
    if (!employee?.lab_member_id) return;

    setSavingAssignments(true);
    setError(null);
    setNotice(null);

    try {
      await updateEmployeeProcessesApi(employee.lab_member_id, draftProcessIds);
      await refreshEmployee();
      setNotice("Process ownership updated.");
    } catch (updateError) {
      setError(
        updateError instanceof Error
          ? updateError.message
          : "Failed to update process ownership.",
      );
    } finally {
      setSavingAssignments(false);
    }
  }

  async function saveDraftRole() {
    if (!employee?.lab_member_id || !draftRole || draftRole === employee.role) {
      return;
    }

    setSavingRole(true);
    setError(null);
    setNotice(null);

    try {
      await updateEmployeeRoleApi(employee.lab_member_id, draftRole);
      await refreshEmployee();
      setNotice("Role updated.");
    } catch (updateError) {
      setError(
        updateError instanceof Error
          ? updateError.message
          : "Failed to update employee role.",
      );
    } finally {
      setSavingRole(false);
    }
  }

  function resetAvailabilityDraft() {
    setError(null);
    setNotice(null);
    setDraftWeekdayCapacities(buildWeekdayCapacityDraft(scheduleProfile));
    setDraftExceptions(buildExceptionDraft(scheduleProfile));
  }

  async function saveAvailabilityDraft() {
    if (!employee?.lab_member_id) return;

    setSavingAvailability(true);
    setError(null);
    setNotice(null);

    try {
      await updateEmployeeAvailabilityApi(employee.lab_member_id, {
        weekday_capacities: draftWeekdayCapacities.map((capacity) => ({
          id: capacity.id,
          day_of_week: capacity.dayOfWeek,
          available_minutes: capacity.availableMinutes,
        })),
        exceptions: draftExceptions.map((exception) => ({
          id: exception.id,
          exception_date: exception.exceptionDate,
          available_minutes: exception.availableMinutes,
          reason: exception.reason.trim() || null,
        })),
      });
      await refreshEmployee();
      setNotice("Availability updated.");
    } catch (updateError) {
      setError(
        updateError instanceof Error
          ? updateError.message
          : "Failed to update availability.",
      );
    } finally {
      setSavingAvailability(false);
    }
  }

  const canEditAssignments =
    Boolean(employee?.is_active) && canAssignProcesses && !savingAssignments;
  const canSubmitRoleChange =
    employee !== null &&
    Boolean(draftRole) &&
    canEditRole &&
    !savingRole &&
    employee.role !== UserRole.OWNER;
  const canEditCapacity =
    Boolean(employee?.is_active) &&
    canManageCapacity &&
    !savingAvailability;

  const hasUnsavedAssignments = employee
    ? draftProcessIds.length !== employee.processes.length ||
      draftProcessIds.some(
        (processId) =>
          !employee.processes.some((process) => process.id === processId),
      )
    : false;
  const hasUnsavedRoleChange =
    employee !== null && Boolean(draftRole) && employee.role !== draftRole;
  const hasUnsavedAvailability =
    normalizeWeekdayCapacitySnapshot(draftWeekdayCapacities) !==
      normalizeWeekdayCapacitySnapshot(
        buildWeekdayCapacityDraft(scheduleProfile),
      ) ||
    normalizeExceptionSnapshot(draftExceptions) !==
      normalizeExceptionSnapshot(buildExceptionDraft(scheduleProfile));

  if (loading) {
    return <LoadingEmployeeProfile />;
  }

  if (!employee) {
    return (
      <Panel>
        <PanelHeader>
          <EmptyState
            title="Employee not found"
            description="This employee is not available in the current lab."
          />
        </PanelHeader>
      </Panel>
    );
  }

  const workloadSummary =
    dashboard?.capacity.workloadSummary ?? scheduleProfile?.workloadSummary ?? [];
  const activeCapacities =
    scheduleProfile?.weekdayCapacities.filter(
      (capacity) => capacity.availableMinutes > 0,
    ) ?? [];

  return (
    <div className="grid gap-5">
      <Panel>
        <PanelHeader>
          <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
            <div className="space-y-4">
              <div className="flex flex-wrap items-center gap-2">
                <Button variant="outline" size="sm" asChild>
                  <Link href="/employees">Back to roster</Link>
                </Button>
                <Badge variant={roleBadgeVariant(employee.role)}>
                  {roleLabels[employee.role]}
                </Badge>
                <Badge variant={employee.is_active ? "success" : "neutral"}>
                  {employee.is_active ? "Active" : "Inactive"}
                </Badge>
              </div>

              <div className="flex items-start gap-4">
                <div className="flex h-14 w-14 items-center justify-center rounded-full bg-foreground text-base font-semibold text-background">
                  {initialsForEmployee(employee.name)}
                </div>
                <div className="space-y-1">
                  <h2 className="text-base font-semibold">{employee.name}</h2>
                  <p className="text-sm text-muted-foreground">{employee.email}</p>
                  <p className="max-w-2xl text-sm text-muted-foreground">
                    Assigned work, upcoming capacity, and employee settings in one operational view.
                  </p>
                </div>
              </div>
            </div>

            <div className="flex flex-wrap gap-2">
              <RefreshButton
                onClick={() => void refreshEmployee()}
                disabled={!hydrated || loading}
                label="Refresh profile"
                spinning={loading}
              />
            </div>
          </div>
        </PanelHeader>

        <div className="grid gap-4 px-4 pb-4 sm:grid-cols-2 xl:grid-cols-6 sm:px-6 sm:pb-6">
          <MetricCard
            label="Active cases"
            value={`${dashboard?.summary.activeAssignedCases ?? 0}`}
            note="Unique cases with ready or in-progress assigned work."
          />
          <MetricCard
            label="Due today"
            value={`${dashboard?.summary.dueTodayAssignedCases ?? 0}`}
            note="Assigned cases with a due date landing today."
          />
          <MetricCard
            label="Delayed"
            value={`${dashboard?.summary.delayedAssignedCases ?? 0}`}
            note="Past-due assigned cases still operationally open."
          />
          <MetricCard
            label="Completed this week"
            value={`${dashboard?.summary.completedAssignedProcessesThisWeek ?? 0}`}
            note="Assigned processes finished in the current week."
          />
          <MetricCard
            label="14-day load"
            value={
              dashboard?.summary.workloadPercentNext14Days === null ||
              dashboard?.summary.workloadPercentNext14Days === undefined
                ? "N/A"
                : `${dashboard.summary.workloadPercentNext14Days.toFixed(0)}%`
            }
            note="Scheduled minutes versus available minutes."
          />
          <MetricCard
            label="Avg turnaround"
            value={
              dashboard?.summary.avgTurnaroundDaysCompletedThisMonth === null ||
              dashboard?.summary.avgTurnaroundDaysCompletedThisMonth === undefined
                ? "N/A"
                : `${formatMetricNumber(
                    dashboard.summary.avgTurnaroundDaysCompletedThisMonth,
                  )}d`
            }
            note="Assigned-process average for work completed this month."
          />
        </div>
      </Panel>

      {error ? (
        <div className="rounded-lg border border-destructive/20 bg-destructive/5 px-4 py-3 text-sm text-destructive">
          {error}
        </div>
      ) : null}

      {notice ? (
        <div className="rounded-lg border border-emerald-300/30 bg-emerald-500/10 px-4 py-3 text-sm text-emerald-900">
          {notice}
        </div>
      ) : null}

      <Tabs defaultValue="overview" className="gap-4">
        <TabsList variant="line" className="w-full justify-start overflow-x-auto">
          <TabsTrigger value="overview">Overview</TabsTrigger>
          <TabsTrigger value="capacity">Capacity</TabsTrigger>
          <TabsTrigger value="settings">Settings</TabsTrigger>
        </TabsList>

        <TabsContent
          value="overview"
          className="grid gap-5 xl:grid-cols-[minmax(0,1.5fr)_360px]"
        >
          <div className="grid gap-5">
            <Panel>
              <PanelHeader>
                <div>
                  <h3 className="text-base font-semibold">Assigned work</h3>
                  <p className="text-sm text-muted-foreground">
                    Ready and in-progress case processes currently owned by this employee.
                  </p>
                </div>
              </PanelHeader>

              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Case</TableHead>
                    <TableHead>Patient</TableHead>
                    <TableHead>Process</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Due</TableHead>
                    <TableHead>Priority</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {dashboard && dashboard.assignedCases.length > 0 ? (
                    dashboard.assignedCases.map((item) => (
                      <TableRow key={`${item.caseId}-${item.processId}`}>
                        <TableCell className="font-medium">
                          #{item.caseCode}
                        </TableCell>
                        <TableCell>
                          <div className="space-y-1">
                            <div>{item.patientName}</div>
                            <div className="text-sm text-muted-foreground">
                              {item.customerName ?? "No customer"}
                            </div>
                          </div>
                        </TableCell>
                        <TableCell>{item.processName}</TableCell>
                        <TableCell>
                          <Badge variant={processStatusVariant(item.status)}>
                            {processStatusLabel(item.status)}
                          </Badge>
                        </TableCell>
                        <TableCell>
                          {item.dueDate ? formatEmployeeDate(item.dueDate) : "No due date"}
                        </TableCell>
                        <TableCell className="capitalize">
                          {priorityLabel(item.priority)}
                        </TableCell>
                      </TableRow>
                    ))
                  ) : (
                    <TableRow>
                      <TableCell colSpan={6}>
                        <EmptyState
                          title="No assigned work"
                          description="There are no ready or in-progress case processes assigned to this employee."
                        />
                      </TableCell>
                    </TableRow>
                  )}
                </TableBody>
              </Table>
            </Panel>

            <Panel>
              <PanelHeader>
                <div>
                  <h3 className="text-base font-semibold">Planned slices</h3>
                  <p className="text-sm text-muted-foreground">
                    Today and next scheduled work slices derived from process minutes and daily capacity.
                  </p>
                </div>
              </PanelHeader>

              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Date</TableHead>
                    <TableHead>Case</TableHead>
                    <TableHead>Process</TableHead>
                    <TableHead>Planned time</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {dashboard && dashboard.todaySchedule.length > 0 ? (
                    dashboard.todaySchedule.map((item) => (
                      <TableRow key={`${item.caseProcessId}-${item.date}`}>
                        <TableCell>{formatEmployeeDateShort(item.date)}</TableCell>
                        <TableCell>
                          <div className="space-y-1">
                            <div className="font-medium">#{item.caseCode}</div>
                            <div className="text-sm text-muted-foreground">
                              {item.patientName}
                            </div>
                          </div>
                        </TableCell>
                        <TableCell>{item.processName}</TableCell>
                        <TableCell>{formatMinutesAsHours(item.plannedMinutes)}</TableCell>
                      </TableRow>
                    ))
                  ) : (
                    <TableRow>
                      <TableCell colSpan={4}>
                        <EmptyState
                          title="No planned slices"
                          description="No planned schedule slices are available for today or the next few days."
                        />
                      </TableCell>
                    </TableRow>
                  )}
                </TableBody>
              </Table>
            </Panel>
          </div>

          <div className="grid gap-5">
            <Card>
              <CardHeader>
                <CardTitle>Employee summary</CardTitle>
                <CardDescription>
                  Basic employee profile data and assignment coverage.
                </CardDescription>
              </CardHeader>
              <CardContent className="grid gap-3">
                <div className="flex items-center justify-between gap-3 rounded-lg border px-4 py-3">
                  <span className="text-sm text-muted-foreground">Status</span>
                  <Badge variant={employee.is_active ? "success" : "neutral"}>
                    {employee.is_active ? "Active" : "Inactive"}
                  </Badge>
                </div>
                <div className="flex items-center justify-between gap-3 rounded-lg border px-4 py-3">
                  <span className="text-sm text-muted-foreground">Role</span>
                  <Badge variant={roleBadgeVariant(employee.role)}>
                    {roleLabels[employee.role]}
                  </Badge>
                </div>
                <div className="flex items-center justify-between gap-3 rounded-lg border px-4 py-3">
                  <span className="text-sm text-muted-foreground">Profile state</span>
                  <span className="text-sm font-medium text-foreground">
                    {employee.lab_member_id ? "Ready" : "Waiting signup"}
                  </span>
                </div>
                <div className="flex items-center justify-between gap-3 rounded-lg border px-4 py-3">
                  <span className="text-sm text-muted-foreground">Processes</span>
                  <span className="text-sm font-medium text-foreground">
                    {employee.processes.length}
                  </span>
                </div>
                <div className="flex items-center justify-between gap-3 rounded-lg border px-4 py-3">
                  <span className="text-sm text-muted-foreground">Added</span>
                  <span className="text-sm font-medium text-foreground">
                    {formatEmployeeDate(employee.created_at)}
                  </span>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Allowed processes</CardTitle>
                <CardDescription>
                  Current process permissions that determine which work can be assigned.
                </CardDescription>
              </CardHeader>
              <CardContent className="grid gap-3">
                {dashboard && dashboard.processPermissions.length > 0 ? (
                  dashboard.processPermissions.map((permission) => (
                    <div
                      key={permission.processId}
                      className="flex items-start justify-between gap-3 rounded-lg border px-4 py-3"
                    >
                      <div className="space-y-1">
                        <div className="font-medium">{permission.processName}</div>
                        <div className="text-sm text-muted-foreground">
                          Allowed for minute-based scheduling.
                        </div>
                      </div>
                      <div className="flex flex-wrap justify-end gap-2">
                        <Badge variant={permission.isAllowed ? "success" : "neutral"}>
                          Allowed
                        </Badge>
                      </div>
                    </div>
                  ))
                ) : (
                  <EmptyState
                    title="No process permissions"
                    description="No process permissions are configured yet."
                  />
                )}
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Recent activity</CardTitle>
                <CardDescription>
                  The newest employee-related process and comment events.
                </CardDescription>
              </CardHeader>
              <CardContent className="grid gap-3">
                {dashboard && dashboard.recentActivity.length > 0 ? (
                  dashboard.recentActivity.map((item) => (
                    <div
                      key={item.id}
                      className="flex items-start justify-between gap-3 rounded-lg border px-4 py-3"
                    >
                      <div className="space-y-1">
                        <div className="flex flex-wrap items-center gap-2">
                          <Badge variant={item.type === "process" ? "info" : "neutral"}>
                            {item.type === "process"
                              ? item.eventType === "COMPLETED"
                                ? "Process completed"
                                : "Process started"
                              : "Comment"}
                          </Badge>
                          <span className="text-sm text-muted-foreground">
                            Case #{item.caseCode}
                          </span>
                        </div>
                        <div className="font-medium">{item.patientName}</div>
                        <div className="text-sm text-muted-foreground">
                          {item.type === "process"
                            ? item.processName
                            : item.commentPreview}
                        </div>
                      </div>
                      <span className="text-sm text-muted-foreground">
                        {formatEmployeeDateShort(item.createdAt)}
                      </span>
                    </div>
                  ))
                ) : (
                  <EmptyState
                    title="No recent activity"
                    description="No recent activity is available for this employee yet."
                  />
                )}
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        <TabsContent value="capacity" className="grid gap-5 lg:grid-cols-2">
          <Panel>
            <PanelHeader>
              <div>
                <h3 className="text-base font-semibold">14-day capacity summary</h3>
                <p className="text-sm text-muted-foreground">
                  Scheduled versus available time, based on weekday minute capacity and exceptions.
                </p>
              </div>
            </PanelHeader>

            <div className="grid gap-4 px-4 pb-4 sm:grid-cols-2 sm:px-6 sm:pb-6">
              <MetricCard
                label="Scheduled"
                value={formatMinutesAsHours(dashboard?.capacity.scheduledMinutes ?? 0)}
                note="Planned time already committed."
              />
              <MetricCard
                label="Available"
                value={formatMinutesAsHours(dashboard?.capacity.availableMinutes ?? 0)}
                note="Capacity windows available across the next 14 days."
              />
              <MetricCard
                label="Remaining"
                value={formatMinutesAsHours(dashboard?.capacity.remainingMinutes ?? 0)}
                note="Capacity still open after planned work."
              />
              <MetricCard
                label="Overbooked days"
                value={`${dashboard?.capacity.overbookedDayCount ?? 0}`}
                note="Days where planned work exceeds available time."
              />
            </div>
          </Panel>

          <Card>
            <CardHeader>
              <CardTitle>Weekday capacity</CardTitle>
              <CardDescription>
                Recurring available minutes for each weekday in the capacity model.
              </CardDescription>
            </CardHeader>
            <CardContent className="grid gap-3">
              {activeCapacities.length > 0 ? (
                activeCapacities
                  .slice()
                  .sort((left, right) => left.dayOfWeek - right.dayOfWeek)
                  .map((capacity) => (
                    <div
                      key={capacity.id}
                      className="flex items-center justify-between gap-3 rounded-lg border px-4 py-3"
                    >
                      <div className="font-medium">
                        {weekdayLabels[capacity.dayOfWeek]}
                      </div>
                      <div className="text-sm text-muted-foreground">
                        {formatMinutesAsHours(capacity.availableMinutes)}
                      </div>
                    </div>
                  ))
              ) : (
                <EmptyState
                  title="No weekday capacity"
                  description="No recurring weekday minutes are configured yet."
                />
              )}
            </CardContent>
          </Card>

          <Panel>
            <PanelHeader>
              <div>
                <h3 className="text-base font-semibold">Workload by day</h3>
                <p className="text-sm text-muted-foreground">
                  The next 14-day workload picture used to flag overbooked periods.
                </p>
              </div>
            </PanelHeader>

            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Date</TableHead>
                  <TableHead>Planned</TableHead>
                  <TableHead>Available</TableHead>
                  <TableHead>Remaining</TableHead>
                  <TableHead>Status</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {workloadSummary.length > 0 ? (
                  workloadSummary.map((day) => (
                    <TableRow key={day.date}>
                      <TableCell>{formatEmployeeDateShort(day.date)}</TableCell>
                      <TableCell>{formatMinutesAsHours(day.plannedMinutes)}</TableCell>
                      <TableCell>{formatMinutesAsHours(day.availableMinutes)}</TableCell>
                      <TableCell>{formatMinutesAsHours(day.remainingMinutes)}</TableCell>
                      <TableCell>
                        <Badge variant={day.isOverbooked ? "warning" : "neutral"}>
                          {day.isOverbooked ? "Overbooked" : "Within capacity"}
                        </Badge>
                      </TableCell>
                    </TableRow>
                  ))
                ) : (
                  <TableRow>
                    <TableCell colSpan={5}>
                      <EmptyState
                        title="No workload summary"
                        description="Workload details will appear after capacity and planning data is available."
                      />
                    </TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
          </Panel>

          <Card>
            <CardHeader>
              <CardTitle>Upcoming exceptions</CardTitle>
              <CardDescription>
                One-off day-level capacity overrides configured for this employee.
              </CardDescription>
            </CardHeader>
            <CardContent className="grid gap-3">
              {scheduleProfile?.exceptions.length ? (
                scheduleProfile.exceptions
                  .slice()
                  .sort((left, right) =>
                    left.exceptionDate.localeCompare(right.exceptionDate),
                  )
                  .map((exception) => (
                    <div
                      key={exception.id}
                      className="rounded-lg border px-4 py-3"
                    >
                      <div className="flex items-center justify-between gap-3">
                        <div className="font-medium">
                          {formatEmployeeDateShort(exception.exceptionDate)}
                        </div>
                        <Badge
                          variant={exception.availableMinutes > 0 ? "info" : "neutral"}
                        >
                          {exception.availableMinutes > 0 ? "Override" : "Unavailable"}
                        </Badge>
                      </div>
                      <div className="mt-1 text-sm text-muted-foreground">
                        {exception.availableMinutes > 0
                          ? formatMinutesAsHours(exception.availableMinutes)
                          : "Full-day unavailable"}
                      </div>
                      <div className="mt-1 text-sm text-muted-foreground">
                        {exception.reason?.trim() || "No reason provided"}
                      </div>
                    </div>
                  ))
              ) : (
                <EmptyState
                  title="No exceptions"
                  description="No date exceptions are configured for this employee."
                />
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="settings" className="grid gap-5">
          <Panel>
            <PanelHeader>
              <div>
                <h3 className="text-base font-semibold">Role and process ownership</h3>
                <p className="text-sm text-muted-foreground">
                  Management-level controls for employee role and allowed processes.
                </p>
              </div>
            </PanelHeader>

            <div className="grid gap-5 px-4 pb-4 lg:grid-cols-[280px_minmax(0,1fr)] sm:px-6 sm:pb-6">
              <Card>
                <CardHeader>
                  <CardTitle>Role</CardTitle>
                  <CardDescription>
                    Update the employee role when permissions or department scope changes.
                  </CardDescription>
                </CardHeader>
                <CardContent className="grid gap-4">
                  {employee.role === UserRole.OWNER ? (
                    <div className="rounded-lg border bg-muted/30 px-4 py-3 text-sm text-muted-foreground">
                      Owner role is fixed and cannot be changed here.
                    </div>
                  ) : (
                    <>
                      <div className="grid gap-2">
                        <Label htmlFor="employee-role">Role</Label>
                        <Select
                          value={draftRole ?? undefined}
                          onValueChange={(value) => setDraftRole(value as EmployeeRole)}
                          disabled={!canEditRole || savingRole}
                        >
                          <SelectTrigger id="employee-role">
                            <SelectValue placeholder="Select role" />
                          </SelectTrigger>
                          <SelectContent>
                            {assignableRoles.map((role) => (
                              <SelectItem key={role} value={role}>
                                {roleLabels[role]}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>

                      <div className="flex flex-wrap gap-2">
                        <Button
                          type="button"
                          onClick={() => void saveDraftRole()}
                          disabled={!hasUnsavedRoleChange || !canSubmitRoleChange}
                        >
                          {savingRole ? (
                            <>
                              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                              Saving
                            </>
                          ) : (
                            "Save role"
                          )}
                        </Button>
                        <Button
                          type="button"
                          variant="outline"
                          onClick={() =>
                            setDraftRole(
                              employee.role === UserRole.OWNER
                                ? null
                                : (employee.role as EmployeeRole),
                            )
                          }
                          disabled={!hasUnsavedRoleChange || savingRole}
                        >
                          Reset
                        </Button>
                      </div>
                    </>
                  )}
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle>Allowed processes</CardTitle>
                  <CardDescription>
                    Select which processes this employee may own and receive in assignment flows.
                  </CardDescription>
                </CardHeader>
                <CardContent className="grid gap-3">
                  {processes.length > 0 ? (
                    processes.map((process) => {
                      const checked = draftProcessIds.includes(process.id);

                      return (
                        <label
                          key={process.id}
                          className="flex items-center justify-between gap-3 rounded-lg border px-4 py-3"
                        >
                          <div className="space-y-1">
                            <div className="font-medium">{process.name}</div>
                            <div className="text-sm text-muted-foreground">
                              {checked ? "Currently allowed" : "Not allowed"}
                            </div>
                          </div>
                          <Checkbox
                            checked={checked}
                            disabled={!canEditAssignments}
                            onCheckedChange={(nextChecked) =>
                              setDraftProcessIds((current) =>
                                nextChecked === true
                                  ? current.includes(process.id)
                                    ? current
                                    : [...current, process.id]
                                  : current.filter((id) => id !== process.id),
                              )
                            }
                          />
                        </label>
                      );
                    })
                  ) : (
                    <EmptyState
                      title="No processes available"
                      description="Create processes before assigning them to employees."
                    />
                  )}

                  <div className="flex flex-wrap gap-2">
                    <Button
                      type="button"
                      onClick={() => void saveDraftAssignments()}
                      disabled={!hasUnsavedAssignments || !canEditAssignments}
                    >
                      {savingAssignments ? (
                        <>
                          <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                          Saving
                        </>
                      ) : (
                        "Save processes"
                      )}
                    </Button>
                    <Button
                      type="button"
                      variant="outline"
                      onClick={resetDraftAssignments}
                      disabled={!hasUnsavedAssignments || savingAssignments}
                    >
                      Reset
                    </Button>
                  </div>
                </CardContent>
              </Card>
            </div>
          </Panel>

          <Panel>
            <PanelHeader>
              <div>
                <h3 className="text-base font-semibold">Capacity controls</h3>
                <p className="text-sm text-muted-foreground">
                  Weekday minutes and date-specific overrides that drive planned schedules.
                </p>
              </div>
            </PanelHeader>

            <div className="px-4 pb-4 sm:px-6 sm:pb-6">
              <Accordion type="multiple" className="w-full">
                <AccordionItem value="weekday-capacity">
                  <AccordionTrigger className="text-base font-semibold hover:no-underline">
                    Weekday capacity
                  </AccordionTrigger>
                  <AccordionContent className="pt-2">
                    <div className="grid gap-4">
                      <p className="text-sm text-muted-foreground">
                        Define recurring available minutes for each weekday.
                      </p>
                      <div className="grid gap-3">
                        {[...draftWeekdayCapacities]
                          .sort((left, right) => left.dayOfWeek - right.dayOfWeek)
                          .map((capacity) => (
                            <Card key={capacity.clientId} size="sm">
                              <CardContent className="grid gap-4 pt-4 sm:grid-cols-[180px_minmax(0,220px)]">
                                <div className="grid gap-2">
                                  <Label>Day</Label>
                                  <div className="flex h-10 items-center rounded-md border px-3 text-sm">
                                    {weekdayLabels[capacity.dayOfWeek]}
                                  </div>
                                </div>
                                <div className="grid gap-2">
                                  <Label htmlFor={`capacity-${capacity.dayOfWeek}`}>
                                    Available minutes
                                  </Label>
                                  <Input
                                    id={`capacity-${capacity.dayOfWeek}`}
                                    type="number"
                                    min={0}
                                    max={1440}
                                    step={15}
                                    value={capacity.availableMinutes}
                                    disabled={!canEditCapacity}
                                    onChange={(event) =>
                                      setDraftWeekdayCapacities((current) =>
                                        current.map((item) =>
                                          item.dayOfWeek === capacity.dayOfWeek
                                            ? {
                                                ...item,
                                                availableMinutes: Math.max(
                                                  0,
                                                  Number(event.target.value) || 0,
                                                ),
                                              }
                                            : item,
                                        ),
                                      )
                                    }
                                  />
                                </div>
                              </CardContent>
                            </Card>
                          ))}
                      </div>

                      <div className="flex flex-wrap gap-2">
                        <Button
                          type="button"
                          onClick={() => void saveAvailabilityDraft()}
                          disabled={!hasUnsavedAvailability || !canEditCapacity}
                        >
                          {savingAvailability ? (
                            <>
                              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                              Saving
                            </>
                          ) : (
                            "Save weekday capacity"
                          )}
                        </Button>
                        <Button
                          type="button"
                          variant="outline"
                          onClick={resetAvailabilityDraft}
                          disabled={!hasUnsavedAvailability || savingAvailability}
                        >
                          Reset
                        </Button>
                      </div>
                    </div>
                  </AccordionContent>
                </AccordionItem>

                <AccordionItem value="exceptions">
                  <AccordionTrigger className="text-base font-semibold hover:no-underline">
                    Exceptions
                  </AccordionTrigger>
                  <AccordionContent className="pt-2">
                    <div className="grid gap-4">
                      <div className="flex flex-wrap justify-between gap-2">
                        <p className="text-sm text-muted-foreground">
                          Apply one-off day capacity overrides for a specific date.
                        </p>
                        <Button
                          type="button"
                          variant="outline"
                          size="sm"
                          onClick={() =>
                            setDraftExceptions((current) => [
                              ...current,
                              {
                                clientId: createDraftId("exception"),
                                exceptionDate: new Date().toISOString().slice(0, 10),
                                availableMinutes: defaultWeekdayMinutes,
                                reason: "",
                              },
                            ])
                          }
                          disabled={!canEditCapacity}
                        >
                          Add exception
                        </Button>
                      </div>

                      {draftExceptions.length === 0 ? (
                        <div className="rounded-lg border border-dashed px-4 py-5 text-sm text-muted-foreground">
                          No date exceptions configured.
                        </div>
                      ) : (
                        <div className="grid gap-3">
                          {[...draftExceptions]
                            .sort((left, right) =>
                              left.exceptionDate.localeCompare(right.exceptionDate),
                            )
                            .map((exception) => (
                              <Card key={exception.clientId} size="sm">
                                <CardContent className="grid gap-4 pt-4">
                                  <div className="grid gap-4 lg:grid-cols-[180px_220px_minmax(0,1fr)_auto]">
                                    <div className="grid gap-2">
                                      <Label>Date</Label>
                                      <Input
                                        type="date"
                                        value={exception.exceptionDate}
                                        disabled={!canEditCapacity}
                                        onChange={(event) =>
                                          setDraftExceptions((current) =>
                                            current.map((item) =>
                                              item.clientId === exception.clientId
                                                ? {
                                                    ...item,
                                                    exceptionDate: event.target.value,
                                                  }
                                                : item,
                                            ),
                                          )
                                        }
                                      />
                                    </div>

                                    <div className="grid gap-2">
                                      <Label htmlFor={`exception-${exception.clientId}`}>
                                        Available minutes
                                      </Label>
                                      <Input
                                        id={`exception-${exception.clientId}`}
                                        type="number"
                                        min={0}
                                        max={1440}
                                        step={15}
                                        value={exception.availableMinutes}
                                        disabled={!canEditCapacity}
                                        onChange={(event) =>
                                          setDraftExceptions((current) =>
                                            current.map((item) =>
                                              item.clientId === exception.clientId
                                                ? {
                                                    ...item,
                                                    availableMinutes: Math.max(
                                                      0,
                                                      Number(event.target.value) || 0,
                                                    ),
                                                  }
                                                : item,
                                            ),
                                          )
                                        }
                                      />
                                    </div>

                                    <div className="grid gap-2">
                                      <Label>Reason</Label>
                                      <Input
                                        value={exception.reason}
                                        placeholder="Vacation, overtime, outage"
                                        disabled={!canEditCapacity}
                                        onChange={(event) =>
                                          setDraftExceptions((current) =>
                                            current.map((item) =>
                                              item.clientId === exception.clientId
                                                ? {
                                                    ...item,
                                                    reason: event.target.value,
                                                  }
                                                : item,
                                            ),
                                          )
                                        }
                                      />
                                    </div>

                                    <div className="flex items-end justify-end">
                                      <Button
                                        type="button"
                                        variant="outline"
                                        size="sm"
                                        onClick={() =>
                                          setDraftExceptions((current) =>
                                            current.filter(
                                              (item) =>
                                                item.clientId !== exception.clientId,
                                            ),
                                          )
                                        }
                                        disabled={!canEditCapacity}
                                      >
                                        Remove
                                      </Button>
                                    </div>
                                  </div>

                                  <p className="text-sm text-muted-foreground">
                                    Use `0` to mark the full day unavailable.
                                  </p>
                                </CardContent>
                              </Card>
                            ))}
                        </div>
                      )}

                      <div className="flex flex-wrap gap-2">
                        <Button
                          type="button"
                          onClick={() => void saveAvailabilityDraft()}
                          disabled={!hasUnsavedAvailability || !canEditCapacity}
                        >
                          {savingAvailability ? (
                            <>
                              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                              Saving
                            </>
                          ) : (
                            "Save exceptions"
                          )}
                        </Button>
                        <Button
                          type="button"
                          variant="outline"
                          onClick={resetAvailabilityDraft}
                          disabled={!hasUnsavedAvailability || savingAvailability}
                        >
                          Reset
                        </Button>
                      </div>
                    </div>
                  </AccordionContent>
                </AccordionItem>
              </Accordion>
            </div>
          </Panel>
        </TabsContent>
      </Tabs>
    </div>
  );
}
