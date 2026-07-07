import { prisma } from "@/lib/prisma";

import { getSingleLabMembership } from "../_shared/membership";
import {
  buildDashboardPayload,
  type DashboardAssignedProcessRecord,
  type DashboardCaseRecord,
  type DashboardEmployeeRecord,
} from "./dashboard.metrics";

function buildDashboardEmployeeSelect() {
  return {
    id: true,
    users: {
      select: {
        name: true,
      },
    },
  } as const;
}

export async function getDashboardForLoggedLab(user_id: string) {
  const membership = await getSingleLabMembership(user_id);

  const [employees, assignedProcesses, visibleCases] = await Promise.all([
    prisma.lab_members.findMany({
      where: {
        lab_id: membership.lab_id,
        users: {
          is_active: true,
          deleted_at: null,
        },
      },
      select: buildDashboardEmployeeSelect(),
      orderBy: [{ role: "asc" }, { created_at: "asc" }],
    }),
    prisma.case_processes.findMany({
      where: {
        assigned_lab_member_id: {
          not: null,
        },
        cases: {
          lab_id: membership.lab_id,
        },
      },
      select: {
        id: true,
        assigned_lab_member_id: true,
        status: true,
        started_at: true,
        completed_at: true,
        cases: {
          select: {
            id: true,
            created_at: true,
            current_status: true,
            due_date: true,
            priority: true,
            is_urgent: true,
            teeth: true,
            elements_qty: true,
          },
        },
      },
    }),
    prisma.cases.findMany({
      where: {
        lab_id: membership.lab_id,
      },
      select: {
        id: true,
        created_at: true,
        current_status: true,
        due_date: true,
        priority: true,
        is_urgent: true,
        teeth: true,
        elements_qty: true,
        case_processes: {
          select: {
            completed_at: true,
          },
        },
      },
    }),
  ]);

  return buildDashboardPayload({
    employees: employees.map<DashboardEmployeeRecord>((employee) => ({
      id: employee.id,
      name: employee.users.name,
    })),
    assignedProcesses: assignedProcesses as DashboardAssignedProcessRecord[],
    visibleCases: visibleCases as DashboardCaseRecord[],
  });
}
