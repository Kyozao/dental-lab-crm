"use client";

import { type FormEvent, useEffect, useMemo, useState } from "react";
import { Loader2, UserPlus } from "lucide-react";

import { EmptyState } from "@/components/app/empty-state";
import { Panel, PanelHeader } from "@/components/app/panel";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
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
import { UserRole } from "@/generated/prisma/enums";
import {
  createEmployeeApi,
  listEmployeesApi,
  updateEmployeeProcessesApi,
} from "@/features/employees/services/employees-api";
import type {
  Employee,
  EmployeeProcess,
  EmployeeRole,
} from "@/features/employees/types";

const assignableRoles: EmployeeRole[] = [
  UserRole.ADMIN,
  UserRole.MANAGER,
  UserRole.CAD_DESIGNER,
  UserRole.PRODUCTION,
];

const roleLabels: Record<UserRole, string> = {
  [UserRole.OWNER]: "Owner",
  [UserRole.ADMIN]: "Admin",
  [UserRole.MANAGER]: "Manager",
  [UserRole.CAD_DESIGNER]: "CAD Designer",
  [UserRole.PRODUCTION]: "Production",
};

function formatDate(value: string) {
  return new Intl.DateTimeFormat("en", {
    month: "short",
    day: "2-digit",
    year: "numeric",
  }).format(new Date(value));
}

function roleBadgeVariant(role: UserRole): "info" | "warning" | "neutral" {
  if (role === UserRole.OWNER || role === UserRole.ADMIN) return "info";
  if (role === UserRole.MANAGER) return "warning";
  return "neutral";
}

async function listProcessesApi() {
  const response = await fetch("/api/processes", {
    method: "GET",
    headers: { Accept: "application/json" },
  });

  if (!response.ok) {
    throw new Error("Failed to load processes.");
  }

  const body = (await response.json()) as {
    data: EmployeeProcess[];
  };
  return body.data;
}

export function EmployeesPageClient() {
  const [employees, setEmployees] = useState<Employee[]>([]);
  const [processes, setProcesses] = useState<EmployeeProcess[]>([]);
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [role, setRole] = useState<EmployeeRole>(UserRole.PRODUCTION);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [savingProcessEmployeeId, setSavingProcessEmployeeId] = useState<
    string | null
  >(null);
  const [canInviteEmployees, setCanInviteEmployees] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);

  const employeeCount = useMemo(() => employees.length, [employees]);

  async function refreshEmployees() {
    setLoading(true);
    setError(null);
    try {
      const [employeeResult, processResult] = await Promise.all([
        listEmployeesApi(),
        listProcessesApi(),
      ]);
      setEmployees(employeeResult.employees);
      setCanInviteEmployees(employeeResult.canInviteEmployees);
      setProcesses(processResult);
    } catch (loadError) {
      setError(
        loadError instanceof Error
          ? loadError.message
          : "Failed to load employees.",
      );
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    void refreshEmployees();
  }, []);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setSubmitting(true);
    setError(null);
    setNotice(null);

    try {
      await createEmployeeApi({ name, email, role });
      setName("");
      setEmail("");
      setRole(UserRole.PRODUCTION);
      setNotice("Invite sent.");
      await refreshEmployees();
    } catch (createError) {
      setError(
        createError instanceof Error
          ? createError.message
          : "Failed to invite employee.",
      );
    } finally {
      setSubmitting(false);
    }
  }

  async function handleProcessToggle(
    employee: Employee,
    processId: string,
    checked: boolean,
  ) {
    const previousEmployees = employees;
    const nextProcessIds = checked
      ? [...new Set([...employee.processes.map((process) => process.id), processId])]
      : employee.processes
          .map((process) => process.id)
          .filter((currentProcessId) => currentProcessId !== processId);
    const nextProcesses = processes.filter((process) =>
      nextProcessIds.includes(process.id),
    );

    setSavingProcessEmployeeId(employee.id);
    setError(null);
    setNotice(null);
    setEmployees((currentEmployees) =>
      currentEmployees.map((currentEmployee) =>
        currentEmployee.id === employee.id
          ? { ...currentEmployee, processes: nextProcesses }
          : currentEmployee,
      ),
    );

    try {
      const updatedEmployee = await updateEmployeeProcessesApi(
        employee.id,
        nextProcessIds,
      );
      setEmployees((currentEmployees) =>
        currentEmployees.map((currentEmployee) =>
          currentEmployee.id === employee.id ? updatedEmployee : currentEmployee,
        ),
      );
      setNotice("Process assignments updated.");
    } catch (updateError) {
      setEmployees(previousEmployees);
      setError(
        updateError instanceof Error
          ? updateError.message
          : "Failed to update process assignments.",
      );
    } finally {
      setSavingProcessEmployeeId(null);
    }
  }

  return (
    <div className="grid gap-4">
      {canInviteEmployees ? (
        <Panel>
          <PanelHeader>
            <div className="flex flex-col gap-1 sm:flex-row sm:items-center sm:justify-between">
              <div>
                <h2 className="text-base font-semibold">Invite Employee</h2>
                <p className="text-sm text-muted-foreground">
                  Send a login invite and add the employee to this lab.
                </p>
              </div>
              {notice ? (
                <Badge variant="success" className="self-start sm:self-center">
                  {notice}
                </Badge>
              ) : null}
            </div>
          </PanelHeader>
          <form
            onSubmit={handleSubmit}
            className="grid gap-4 p-4 sm:grid-cols-[1fr_1fr_180px_auto] sm:items-end sm:p-6"
          >
            <div className="grid gap-2">
              <Label htmlFor="employee-name">Name</Label>
              <Input
                id="employee-name"
                value={name}
                onChange={(event) => setName(event.target.value)}
                placeholder="Ana Silva"
                required
              />
            </div>
            <div className="grid gap-2">
              <Label htmlFor="employee-email">Email</Label>
              <Input
                id="employee-email"
                type="email"
                value={email}
                onChange={(event) => setEmail(event.target.value)}
                placeholder="ana@lab.com"
                required
              />
            </div>
            <div className="grid gap-2">
              <Label htmlFor="employee-role">Role</Label>
              <Select
                value={role}
                onValueChange={(value) => setRole(value as EmployeeRole)}
              >
                <SelectTrigger id="employee-role" className="w-full">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {assignableRoles.map((assignableRole) => (
                    <SelectItem key={assignableRole} value={assignableRole}>
                      {roleLabels[assignableRole]}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <Button type="submit" disabled={submitting}>
              <UserPlus className="h-4 w-4" />
              {submitting ? "Sending" : "Invite"}
            </Button>
          </form>
        </Panel>
      ) : notice ? (
        <Badge variant="success" className="justify-self-start">
          {notice}
        </Badge>
      ) : null}

      <Panel>
        <PanelHeader>
          <div className="flex items-center justify-between gap-3">
            <div>
              <h2 className="text-base font-semibold">Employees</h2>
              <p className="text-sm text-muted-foreground">
                {loading ? "Loading lab employees" : `${employeeCount} total`}
              </p>
            </div>
            <Button
              type="button"
              variant="outline"
              onClick={() => void refreshEmployees()}
              disabled={loading}
            >
              Refresh
            </Button>
          </div>
        </PanelHeader>

        {error ? (
          <div className="border-b border-border/40 bg-destructive/5 px-4 py-3 text-sm text-destructive sm:px-6">
            {error}
          </div>
        ) : null}

        <div className="overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Name</TableHead>
                <TableHead>Email</TableHead>
                <TableHead>Role</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Processes</TableHead>
                <TableHead>Added</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {loading ? (
                <TableRow>
                  <TableCell colSpan={6} className="py-8 text-center text-sm text-muted-foreground">
                    Loading employees...
                  </TableCell>
                </TableRow>
              ) : null}

              {!loading && employees.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={6}>
                    <EmptyState
                      title="No employees registered yet"
                      description="Invite the first employee to add them to this lab."
                    />
                  </TableCell>
                </TableRow>
              ) : null}

              {!loading
                ? employees.map((employee) => (
                    <TableRow key={employee.id}>
                      <TableCell className="font-medium">
                        {employee.name}
                      </TableCell>
                      <TableCell>{employee.email}</TableCell>
                      <TableCell>
                        <Badge variant={roleBadgeVariant(employee.role)}>
                          {roleLabels[employee.role]}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        <Badge
                          variant={employee.is_active ? "success" : "neutral"}
                        >
                          {employee.is_active ? "Active" : "Inactive"}
                        </Badge>
                      </TableCell>
                      <TableCell className="min-w-[280px]">
                        <div className="flex flex-wrap gap-2">
                          {processes.length === 0 ? (
                            <span className="text-sm text-muted-foreground">
                              No active processes
                            </span>
                          ) : (
                            processes.map((process) => {
                              const checked = employee.processes.some(
                                (assignedProcess) =>
                                  assignedProcess.id === process.id,
                              );
                              const saving =
                                savingProcessEmployeeId === employee.id;

                              return (
                                <label
                                  key={process.id}
                                  className="inline-flex items-center gap-2 rounded-md border px-2.5 py-1.5 text-xs"
                                >
                                  <input
                                    type="checkbox"
                                    checked={checked}
                                    disabled={saving || !employee.is_active}
                                    onChange={(event) =>
                                      void handleProcessToggle(
                                        employee,
                                        process.id,
                                        event.target.checked,
                                      )
                                    }
                                  />
                                  <span>{process.name}</span>
                                </label>
                              );
                            })
                          )}
                          {savingProcessEmployeeId === employee.id ? (
                            <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />
                          ) : null}
                        </div>
                      </TableCell>
                      <TableCell>{formatDate(employee.created_at)}</TableCell>
                    </TableRow>
                  ))
                : null}
            </TableBody>
          </Table>
        </div>
      </Panel>
    </div>
  );
}
