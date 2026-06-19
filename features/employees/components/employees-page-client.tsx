"use client";

import { useEffect, useState } from "react";
import { ChevronRight } from "lucide-react";
import { useRouter } from "next/navigation";

import { EmptyState } from "@/components/app/empty-state";
import { Panel, PanelHeader } from "@/components/app/panel";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
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

import {
  AddEmployeeButton,
  AddEmployeeDialog,
} from "./add-employee-dialog";

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

  function openEmployee(employeeId: string) {
    router.push(`/employees/${employeeId}`);
  }

  return (
    <>
      <AddEmployeeDialog
        open={inviteDialogOpen}
        onOpenChange={setInviteDialogOpen}
        onCreated={async () => {
          setNotice("Invite sent.");
          await refreshEmployees();
        }}
      />

      <Panel>
        <PanelHeader>
          <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
            <div>
              <h2 className="text-base font-semibold">Employee directory</h2>
              <p className="text-sm text-muted-foreground">
                {loading
                  ? "Loading lab employees"
                  : `${employees.length} ${employees.length === 1 ? "employee" : "employees"}`}
              </p>
            </div>
            <div className="flex flex-wrap items-center gap-2">
              {notice ? <Badge variant="success">{notice}</Badge> : null}
              <Button
                type="button"
                variant="outline"
                onClick={() => void refreshEmployees()}
                disabled={!hydrated || loading}
              >
                Refresh
              </Button>
              {canInviteEmployees ? (
                <AddEmployeeButton
                  disabled={!hydrated || loading}
                  onClick={() => setInviteDialogOpen(true)}
                />
              ) : null}
            </div>
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
                <TableHead>Added</TableHead>
                <TableHead className="w-[72px] text-right">Open</TableHead>
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
                      description={
                        canInviteEmployees
                          ? "Invite the first employee to start building your lab directory."
                          : "Owners and admins can add employees to this lab."
                      }
                    />
                  </TableCell>
                </TableRow>
              ) : null}

              {!loading
                ? employees.map((employee) => (
                    <TableRow
                      key={employee.id}
                      tabIndex={0}
                      className="cursor-pointer"
                      onClick={() => openEmployee(employee.lab_member_id)}
                      onKeyDown={(event) => {
                        if (event.key !== "Enter" && event.key !== " ") return;
                        event.preventDefault();
                        openEmployee(employee.lab_member_id);
                      }}
                    >
                      <TableCell className="font-medium">{employee.name}</TableCell>
                      <TableCell>{employee.email}</TableCell>
                      <TableCell>
                        <Badge variant={roleBadgeVariant(employee.role)}>
                          {roleLabels[employee.role]}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        <Badge variant={employee.is_active ? "success" : "neutral"}>
                          {employee.is_active ? "Active" : "Inactive"}
                        </Badge>
                      </TableCell>
                      <TableCell>{formatEmployeeDate(employee.created_at)}</TableCell>
                      <TableCell className="text-right text-muted-foreground">
                        <ChevronRight className="ml-auto h-4 w-4" />
                      </TableCell>
                    </TableRow>
                  ))
                : null}
            </TableBody>
          </Table>
        </div>
      </Panel>
    </>
  );
}
