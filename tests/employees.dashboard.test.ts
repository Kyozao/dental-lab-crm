import assert from "node:assert/strict";
import test from "node:test";

import {
  buildEmployeeDashboardCapacity,
  buildEmployeeDashboardSummary,
  buildEmployeeRecentActivity,
} from "@/app/api/employees/employees.dashboard";
import {
  CaseProcessHistoryEventType,
  CaseProcessStatus,
  CaseStatus,
} from "@/generated/prisma/enums";

test("employee dashboard summary applies active, due-today, and delayed case rules exactly", () => {
  const today = new Date("2026-06-25T12:00:00.000Z");
  const capacity = buildEmployeeDashboardCapacity([
    {
      date: "2026-06-25T00:00:00.000Z",
      plannedMinutes: 360,
      availableMinutes: 480,
      remainingMinutes: 120,
      isOverbooked: false,
    },
  ]);

  const summary = buildEmployeeDashboardSummary({
    assignedProcesses: [
      {
        id: "cp-1",
        status: CaseProcessStatus.READY,
        process_id: "process-a",
        started_at: null,
        completed_at: null,
        processes: { id: "process-a", name: "Design" },
        cases: {
          id: "case-due",
          code: "101",
          patient_name: "Ana",
          due_date: new Date("2026-06-25T09:00:00.000Z"),
          priority: null,
          current_status: CaseStatus.IN_PRODUCTION,
          customers: { name: "Smile" },
        },
      },
      {
        id: "cp-2",
        status: CaseProcessStatus.IN_PROGRESS,
        process_id: "process-b",
        started_at: new Date("2026-06-24T10:00:00.000Z"),
        completed_at: null,
        processes: { id: "process-b", name: "Mill" },
        cases: {
          id: "case-late",
          code: "102",
          patient_name: "Bruno",
          due_date: new Date("2026-06-24T09:00:00.000Z"),
          priority: null,
          current_status: CaseStatus.IN_PRODUCTION,
          customers: { name: "Dental Pro" },
        },
      },
      {
        id: "cp-3",
        status: CaseProcessStatus.READY,
        process_id: "process-c",
        started_at: null,
        completed_at: null,
        processes: { id: "process-c", name: "Polish" },
        cases: {
          id: "case-done",
          code: "103",
          patient_name: "Clara",
          due_date: new Date("2026-06-24T09:00:00.000Z"),
          priority: null,
          current_status: CaseStatus.DONE,
          customers: { name: "Dental Pro" },
        },
      },
      {
        id: "cp-4",
        status: CaseProcessStatus.COMPLETED,
        process_id: "process-d",
        started_at: new Date("2026-06-20T09:00:00.000Z"),
        completed_at: new Date("2026-06-21T09:00:00.000Z"),
        processes: { id: "process-d", name: "Glaze" },
        cases: {
          id: "case-complete",
          code: "104",
          patient_name: "Diego",
          due_date: new Date("2026-06-25T09:00:00.000Z"),
          priority: null,
          current_status: CaseStatus.IN_PRODUCTION,
          customers: { name: "Lab One" },
        },
      },
    ],
    completedProcessesThisWeek: [{ id: "cp-4" }, { id: "cp-5" }],
    completedProcessesThisMonth: [
      {
        started_at: new Date("2026-06-20T09:00:00.000Z"),
        completed_at: new Date("2026-06-22T09:00:00.000Z"),
      },
      {
        started_at: new Date("2026-06-23T09:00:00.000Z"),
        completed_at: new Date("2026-06-24T21:00:00.000Z"),
      },
    ],
    capacity,
    today,
  });

  assert.deepEqual(summary, {
    activeAssignedCases: 3,
    dueTodayAssignedCases: 1,
    delayedAssignedCases: 1,
    completedAssignedProcessesThisWeek: 2,
    workloadPercentNext14Days: 75,
    avgTurnaroundDaysCompletedThisMonth: 1.8,
  });
});

test("employee dashboard summary safely omits turnaround and workload ratio without usable samples", () => {
  const summary = buildEmployeeDashboardSummary({
    assignedProcesses: [],
    completedProcessesThisWeek: [],
    completedProcessesThisMonth: [
      {
        started_at: null,
        completed_at: new Date("2026-06-24T00:00:00.000Z"),
      },
    ],
    capacity: buildEmployeeDashboardCapacity([
      {
        date: "2026-06-25T00:00:00.000Z",
        plannedMinutes: 0,
        availableMinutes: 0,
        remainingMinutes: 0,
        isOverbooked: false,
      },
    ]),
    today: new Date("2026-06-25T00:00:00.000Z"),
  });

  assert.equal(summary.workloadPercentNext14Days, null);
  assert.equal(summary.avgTurnaroundDaysCompletedThisMonth, null);
});

test("employee recent activity merges process history and comments newest first", () => {
  const activity = buildEmployeeRecentActivity({
    processEvents: [
      {
        id: "event-1",
        event_type: CaseProcessHistoryEventType.STARTED,
        created_at: new Date("2026-06-25T10:00:00.000Z"),
        caseProcess: {
          id: "cp-1",
          assigned_lab_member_id: "member-1",
          processes: { name: "Design" },
          cases: {
            id: "case-1",
            code: "001",
            patient_name: "Ana",
          },
        },
      },
      {
        id: "event-2",
        event_type: CaseProcessHistoryEventType.COMPLETED,
        created_at: new Date("2026-06-25T14:00:00.000Z"),
        caseProcess: {
          id: "cp-2",
          assigned_lab_member_id: "member-1",
          processes: { name: "Mill" },
          cases: {
            id: "case-2",
            code: "002",
            patient_name: "Bruno",
          },
        },
      },
    ],
    comments: [
      {
        id: "comment-1",
        body: "Need a new shade confirmation before delivery.",
        created_at: new Date("2026-06-25T12:00:00.000Z"),
        cases: {
          id: "case-3",
          code: "003",
          patient_name: "Clara",
        },
      },
    ],
  });

  assert.deepEqual(
    activity.map((item) => [item.id, item.type, item.createdAt]),
    [
      ["event-2", "process", "2026-06-25T14:00:00.000Z"],
      ["comment-1", "comment", "2026-06-25T12:00:00.000Z"],
      ["event-1", "process", "2026-06-25T10:00:00.000Z"],
    ],
  );
});
