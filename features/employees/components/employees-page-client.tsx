"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";

import { EmptyState } from "@/components/app/empty-state";
import { Panel, PanelHeader } from "@/components/app/panel";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { RefreshButton } from "@/components/ui/refresh-button";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  formatEmployeeDate,
  roleBadgeVariant,
  roleLabels,
} from "@/features/employees/employee-ui";
import { listEmployeesApi } from "@/features/employees/services/employees-api";
import type { Employee } from "@/features/employees/types";

import { AddEmployeeButton, AddEmployeeDialog } from "./add-employee-dialog";

function employeeStatusLabel(employee: Employee) {
  if (employee.status === "PENDING") {
    return "Pending invite";
  }

  return employee.is_active ? "Active" : "Inactive";
}

function employeeStatusVariant(employee: Employee) {
  if (employee.status === "PENDING") {
    return "warning" as const;
  }

  return employee.is_active ? "success" : "neutral";
}

function SummaryCard(props: {
  title: string;
  value: string;
  description: string;
}) {
  return (
    <Card size="sm">
      <CardHeader className="pb-0">
        <CardDescription>{props.title}</CardDescription>
        <CardTitle className="text-2xl">{props.value}</CardTitle>
      </CardHeader>
      <CardContent>
        <p className="text-sm text-muted-foreground">{props.description}</p>
      </CardContent>
    </Card>
  );
}

export function EmployeesPageClient() {
  const router = useRouter();
  const [employees, setEmployees] = useState<Employee[]>([]);
  const [hydrated, setHydrated] = useState(false);
  const [loading, setLoading] = useState(true);
  const [canInviteEmployees, setCanInviteEmployees] = useState(false);
  const [inviteDialogOpen, setInviteDialogOpen] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);

  async function refreshEmployees() {
    setLoading(true);
    setError(null);

    try {
      const result = await listEmployeesApi();
      setEmployees(result.employees);
      setCanInviteEmployees(result.canInviteEmployees);
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
    setHydrated(true);
    void refreshEmployees();
  }, []);

  const activeEmployees = employees.filter(
    (employee) => employee.status === "ACTIVE" && employee.is_active,
  );
  const pendingInvites = employees.filter(
    (employee) => employee.status === "PENDING",
  );
  const assignedProcessCount = activeEmployees.reduce(
    (total, employee) => total + employee.processes.length,
    0,
  );

  return (
    <>
      <AddEmployeeDialog
        open={inviteDialogOpen}
        onOpenChange={setInviteDialogOpen}
        onCreated={async () => {
          setNotice(
            "Invite sent. The employee will stay visible here until signup is complete.",
          );
          await refreshEmployees();
        }}
      />

      <div className="grid gap-5">
        <Panel>
          <PanelHeader>
            <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
              <div>
                <h2 className="text-base font-semibold">Employee roster</h2>
                <p className="text-sm text-muted-foreground">
                  Review active employees, pending invites, and open each employee profile.
                </p>
              </div>
              <div className="flex flex-wrap gap-2">
                <RefreshButton
                  onClick={() => void refreshEmployees()}
                  disabled={!hydrated || loading}
                  label="Refresh employees"
                  spinning={loading}
                />
                {canInviteEmployees ? (
                  <AddEmployeeButton
                    disabled={!hydrated || loading}
                    onClick={() => setInviteDialogOpen(true)}
                  />
                ) : null}
              </div>
            </div>
          </PanelHeader>

          <div className="grid gap-4 px-4 pb-4 sm:grid-cols-3 sm:px-6 sm:pb-6">
            <SummaryCard
              title="Active employees"
              value={loading ? "..." : String(activeEmployees.length)}
              description="Employees who can currently receive assignments."
            />
            <SummaryCard
              title="Pending invites"
              value={loading ? "..." : String(pendingInvites.length)}
              description="Invites sent but not yet converted into active profiles."
            />
            <SummaryCard
              title="Assigned processes"
              value={loading ? "..." : String(assignedProcessCount)}
              description="Total allowed process assignments across active employees."
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

        <Panel>
          <PanelHeader>
            <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
              <div>
                <h2 className="text-base font-semibold">Directory</h2>
                <p className="text-sm text-muted-foreground">
                  Lightweight roster management following the same resource pattern as the rest of the app.
                </p>
              </div>
              {!canInviteEmployees ? (
                <p className="max-w-sm text-sm text-muted-foreground">
                  This account can review staffing, but only owners and admins can send invites.
                </p>
              ) : null}
            </div>
          </PanelHeader>

          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Employee</TableHead>
                <TableHead>Role</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Processes</TableHead>
                <TableHead>Added</TableHead>
                <TableHead>Profile</TableHead>
                <TableHead className="w-[120px] text-right">Open</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {loading ? (
                <TableRow>
                  <TableCell colSpan={7} className="py-8 text-center text-sm text-muted-foreground">
                    Loading employees...
                  </TableCell>
                </TableRow>
              ) : null}

              {!loading && employees.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={7}>
                    <EmptyState
                      title="No employees yet"
                      description={
                        canInviteEmployees
                          ? "Invite the first employee to start building the roster."
                          : "Owners and admins can invite the first employee."
                      }
                    />
                  </TableCell>
                </TableRow>
              ) : null}

              {!loading
                ? employees.map((employee) => {
                    const canOpenProfile = Boolean(employee.lab_member_id);

                    return (
                      <TableRow key={employee.id}>
                        <TableCell>
                          <div className="space-y-1">
                            <div className="font-medium">{employee.name}</div>
                            <div className="text-sm text-muted-foreground">
                              {employee.email}
                            </div>
                          </div>
                        </TableCell>
                        <TableCell>
                          <Badge variant={roleBadgeVariant(employee.role)}>
                            {roleLabels[employee.role]}
                          </Badge>
                        </TableCell>
                        <TableCell>
                          <Badge variant={employeeStatusVariant(employee)}>
                            {employeeStatusLabel(employee)}
                          </Badge>
                        </TableCell>
                        <TableCell>{employee.processes.length}</TableCell>
                        <TableCell>{formatEmployeeDate(employee.created_at)}</TableCell>
                        <TableCell>
                          {canOpenProfile ? "Ready" : "Waiting signup"}
                        </TableCell>
                        <TableCell className="text-right">
                          {canOpenProfile ? (
                            <Button
                              type="button"
                              variant="outline"
                              size="sm"
                              onClick={() =>
                                router.push(`/employees/${employee.lab_member_id}`)
                              }
                            >
                              Open
                            </Button>
                          ) : (
                            <span className="text-sm text-muted-foreground">
                              Invite sent
                            </span>
                          )}
                        </TableCell>
                      </TableRow>
                    );
                  })
                : null}
            </TableBody>
          </Table>
        </Panel>
      </div>
    </>
  );
}
