"use client";

import { useCallback, useEffect, useState } from "react";
import { Loader2 } from "lucide-react";
import Link from "next/link";

import { EmptyState } from "@/components/app/empty-state";
import { Panel, PanelHeader } from "@/components/app/panel";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { PageHeader } from "@/components/app/page-header";
import {
  assignableRoles,
  formatEmployeeDate,
  roleBadgeVariant,
  roleLabels,
} from "@/features/employees/employee-ui";
import {
  getEmployeeApi,
  listEmployeeProcessesApi,
  updateEmployeeRoleApi,
  updateEmployeeProcessesApi,
} from "@/features/employees/services/employees-api";
import type {
  Employee,
  EmployeeProcess,
  EmployeeRole,
} from "@/features/employees/types";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { UserRole } from "@/generated/prisma/enums";

type EmployeeDetailPageClientProps = {
  employeeId: string;
};

export function EmployeeDetailPageClient({
  employeeId,
}: EmployeeDetailPageClientProps) {
  const [employee, setEmployee] = useState<Employee | null>(null);
  const [processes, setProcesses] = useState<EmployeeProcess[]>([]);
  const [draftProcessIds, setDraftProcessIds] = useState<string[]>([]);
  const [hydrated, setHydrated] = useState(false);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [savingRole, setSavingRole] = useState(false);
  const [canAssignProcesses, setCanAssignProcesses] = useState(false);
  const [canEditRole, setCanEditRole] = useState(false);
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
      setDraftProcessIds(
        employeeResult.employee.processes.map((process) => process.id),
      );
      setCanAssignProcesses(employeeResult.canAssignProcesses);
      setCanEditRole(employeeResult.canEditRole);
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

  function handleProcessToggle(processId: string, checked: boolean) {
    setNotice(null);
    setDraftProcessIds((currentProcessIds) =>
      checked
        ? [...new Set([...currentProcessIds, processId])]
        : currentProcessIds.filter(
            (currentProcessId) => currentProcessId !== processId,
          ),
    );
  }

  function resetDraftAssignments() {
    if (!employee) return;
    setError(null);
    setNotice(null);
    setDraftProcessIds(employee.processes.map((process) => process.id));
  }

  async function saveDraftAssignments() {
    if (!employee) return;

    setSaving(true);
    setError(null);
    setNotice(null);

    try {
      const updatedEmployee = await updateEmployeeProcessesApi(
        employee.lab_member_id,
        draftProcessIds,
      );
      setEmployee(updatedEmployee);
      setDraftProcessIds(updatedEmployee.processes.map((process) => process.id));
      setNotice("Process assignments updated.");
    } catch (updateError) {
      setError(
        updateError instanceof Error
          ? updateError.message
          : "Failed to update process assignments.",
      );
    } finally {
      setSaving(false);
    }
  }

  async function saveDraftRole() {
    if (!employee || !draftRole || draftRole === employee.role) return;

    setSavingRole(true);
    setError(null);
    setNotice(null);

    try {
      const updatedEmployee = await updateEmployeeRoleApi(
        employee.lab_member_id,
        draftRole,
      );
      setEmployee(updatedEmployee);
      setDraftRole(
        updatedEmployee.role === UserRole.OWNER
          ? null
          : (updatedEmployee.role as EmployeeRole),
      );
      setNotice("Employee role updated.");
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

  const canEditAssignments =
    Boolean(employee?.is_active) && canAssignProcesses && !saving;
  const canSubmitRoleChange =
    employee !== null &&
    Boolean(draftRole) &&
    canEditRole &&
    !savingRole &&
    employee.role !== UserRole.OWNER;
  const hasUnsavedRoleChange =
    Boolean(employee) && Boolean(draftRole) && employee?.role !== draftRole;
  const hasUnsavedChanges = employee
    ? draftProcessIds.length !== employee.processes.length ||
      draftProcessIds.some(
        (processId) =>
          !employee.processes.some((process) => process.id === processId),
      )
    : false;

  return (
    <div className="grid gap-4">
      <PageHeader
        title={employee?.name ?? "Employee"}
        description={
          employee
            ? "Review employee access and process ownership for this lab."
            : "Review employee access and process ownership for this lab."
        }
        actions={
          <div className="flex items-center gap-2">
            {notice ? <Badge variant="success">{notice}</Badge> : null}
            <Button variant="outline" asChild>
              <Link href="/employees">Back to directory</Link>
            </Button>
            <Button
              type="button"
              variant="outline"
              onClick={() => void refreshEmployee()}
              disabled={!hydrated || loading}
            >
              Refresh
            </Button>
          </div>
        }
      />

      {error ? (
        <div className="rounded-lg border border-destructive/20 bg-destructive/5 px-4 py-3 text-sm text-destructive">
          {error}
        </div>
      ) : null}

      {loading ? (
        <Panel>
          <div className="flex items-center justify-center gap-2 px-6 py-12 text-sm text-muted-foreground">
            <Loader2 className="h-4 w-4 animate-spin" />
            Loading employee...
          </div>
        </Panel>
      ) : null}

      {!loading && !employee ? (
        <Panel>
          <EmptyState
            title="Employee not found"
            description="This employee could not be found in the current lab."
          />
        </Panel>
      ) : null}

      {!loading && employee ? (
        <div className="grid gap-4 xl:grid-cols-[minmax(0,2fr)_minmax(280px,1fr)]">
          <div className="grid gap-4">
            <Panel>
              <PanelHeader>
                <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                  <div>
                    <h2 className="text-base font-semibold">Profile</h2>
                    <p className="text-sm text-muted-foreground">
                      Identity, access level, and lab membership details.
                    </p>
                  </div>
                  <div className="flex flex-wrap gap-2">
                    <Badge variant={roleBadgeVariant(employee.role)}>
                      {roleLabels[employee.role]}
                    </Badge>
                    <Badge variant={employee.is_active ? "success" : "neutral"}>
                      {employee.is_active ? "Active" : "Inactive"}
                    </Badge>
                  </div>
                </div>
              </PanelHeader>
              <dl className="grid gap-4 px-4 py-4 text-sm sm:grid-cols-2 sm:px-6">
                <div>
                  <dt className="text-muted-foreground">Name</dt>
                  <dd className="mt-1 font-medium">{employee.name}</dd>
                </div>
                <div>
                  <dt className="text-muted-foreground">Email</dt>
                  <dd className="mt-1 font-medium">{employee.email}</dd>
                </div>
                <div>
                  <dt className="text-muted-foreground">Lab role</dt>
                  <dd className="mt-2 grid gap-3">
                    <div className="font-medium">{roleLabels[employee.role]}</div>
                    <div className="flex flex-col gap-2 sm:max-w-xs">
                      <Select
                        value={draftRole ?? undefined}
                        onValueChange={(value) => setDraftRole(value as EmployeeRole)}
                        disabled={!canEditRole || employee.role === "OWNER" || savingRole}
                      >
                        <SelectTrigger>
                          <SelectValue placeholder="Select a role" />
                        </SelectTrigger>
                        <SelectContent>
                          {assignableRoles.map((assignableRole) => (
                            <SelectItem key={assignableRole} value={assignableRole}>
                              {roleLabels[assignableRole]}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                      <div className="flex items-center gap-2">
                        <Button
                          type="button"
                          size="sm"
                          onClick={() => void saveDraftRole()}
                          disabled={!hasUnsavedRoleChange || !canSubmitRoleChange}
                        >
                          {savingRole ? (
                            <>
                              <Loader2 className="h-4 w-4 animate-spin" />
                              Saving...
                            </>
                          ) : (
                            "Save role"
                          )}
                        </Button>
                        {hasUnsavedRoleChange ? (
                          <Badge variant="warning">Unsaved role</Badge>
                        ) : null}
                      </div>
                      {!canEditRole ? (
                        <p className="text-sm text-muted-foreground">
                          Only owners and admins can change employee roles.
                        </p>
                      ) : null}
                      {employee.role === "OWNER" ? (
                        <p className="text-sm text-muted-foreground">
                          Owner role changes are not handled from this screen.
                        </p>
                      ) : null}
                    </div>
                  </dd>
                </div>
                <div>
                  <dt className="text-muted-foreground">Added</dt>
                  <dd className="mt-1 font-medium">
                    {formatEmployeeDate(employee.created_at)}
                  </dd>
                </div>
              </dl>
            </Panel>

            <Panel>
              <PanelHeader>
                <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                  <div className="flex flex-col gap-1">
                    <h2 className="text-base font-semibold">Process ownership</h2>
                    <p className="text-sm text-muted-foreground">
                      Assign the production processes this employee owns in the lab.
                    </p>
                  </div>
                  <div className="flex items-center gap-2">
                    {hasUnsavedChanges ? (
                      <Badge variant="warning">Unsaved changes</Badge>
                    ) : null}
                    <Button
                      type="button"
                      variant="outline"
                      onClick={resetDraftAssignments}
                      disabled={!hydrated || !hasUnsavedChanges || saving}
                    >
                      Reset
                    </Button>
                    <Button
                      type="button"
                      onClick={() => void saveDraftAssignments()}
                      disabled={
                        !hydrated || !hasUnsavedChanges || !canEditAssignments
                      }
                    >
                      {saving ? (
                        <>
                          <Loader2 className="h-4 w-4 animate-spin" />
                          Saving...
                        </>
                      ) : (
                        "Save changes"
                      )}
                    </Button>
                  </div>
                </div>
              </PanelHeader>

              {!employee.is_active ? (
                <div className="border-b border-border/40 bg-muted/30 px-4 py-3 text-sm text-muted-foreground sm:px-6">
                  Inactive employees cannot be assigned to processes.
                </div>
              ) : null}

              {employee.is_active && !canAssignProcesses ? (
                <div className="border-b border-border/40 bg-muted/30 px-4 py-3 text-sm text-muted-foreground sm:px-6">
                  Only owners, admins, and managers can edit process ownership.
                </div>
              ) : null}

              <div className="px-4 py-4 sm:px-6">
                {processes.length === 0 ? (
                  <EmptyState
                    title="No active processes"
                    description="Create a process first, then assign ownership here."
                  />
                ) : (
                  <div className="flex flex-wrap gap-2">
                    {processes.map((process) => {
                      const checked = draftProcessIds.includes(process.id);

                      return (
                        <label
                          key={process.id}
                          className="inline-flex items-center gap-2 rounded-md border px-3 py-2 text-sm"
                        >
                          <input
                            type="checkbox"
                            checked={checked}
                            disabled={!canEditAssignments}
                            onChange={(event) =>
                              void handleProcessToggle(
                                process.id,
                                event.target.checked,
                              )
                            }
                          />
                          <span>{process.name}</span>
                        </label>
                      );
                    })}
                  </div>
                )}
              </div>
            </Panel>
          </div>

          <Panel className="h-fit">
            <PanelHeader>
              <div className="flex flex-col gap-1">
                <h2 className="text-base font-semibold">Stats</h2>
                <p className="text-sm text-muted-foreground">
                  Reserved for future employee metrics and workload summaries.
                </p>
              </div>
            </PanelHeader>
            <div className="px-6 py-10 text-sm text-muted-foreground">
              Stats are not part of this first pass, but the detail route now has
              dedicated space for them.
            </div>
          </Panel>
        </div>
      ) : null}
    </div>
  );
}
