import assert from "node:assert/strict";
import test from "node:test";

import {
  buildDashboardPayload,
  countCaseTeeth,
} from "@/app/api/dashboard/dashboard.metrics";
import {
  CasePriority,
  CaseProcessStatus,
  CaseStatus,
} from "@/generated/prisma/enums";

test("dashboard payload returns zeroed summary and empty collections for an empty lab", () => {
  const dashboard = buildDashboardPayload({
    employees: [],
    assignedProcesses: [],
    visibleCases: [],
    today: new Date("2026-07-05T12:00:00.000Z"),
  });

  assert.deepEqual(dashboard, {
    summary: {
      totalEmployees: 0,
      totalAssignedCases: 0,
      totalTeethTracked: 0,
      openCases: 0,
      openTeeth: 0,
      completedThisMonth: 0,
      urgentOpenCases: 0,
      avgTurnaroundDays: null,
    },
    employeeStats: [],
    statusData: [],
  });
});

test("countCaseTeeth prefers elements_qty and falls back to parsing teeth", () => {
  assert.equal(
    countCaseTeeth({
      elements_qty: 4,
      teeth: "11, 12",
    }),
    4,
  );

  assert.equal(
    countCaseTeeth({
      elements_qty: null,
      teeth: "11, 12;13 / 14",
    }),
    4,
  );

  assert.equal(
    countCaseTeeth({
      elements_qty: null,
      teeth: null,
    }),
    0,
  );
});

test("dashboard employee aggregates deduplicate cases, split open versus terminal cases, and expose only renamed fields", () => {
  const dashboard = buildDashboardPayload({
    employees: [
      { id: "member-a", name: "Alice" },
      { id: "member-b", name: "Bruno" },
    ],
    assignedProcesses: [
      {
        id: "cp-1",
        assigned_lab_member_id: "member-a",
        status: CaseProcessStatus.READY,
        started_at: null,
        completed_at: null,
        cases: {
          id: "case-open",
          created_at: new Date("2026-07-01T09:00:00.000Z"),
          current_status: CaseStatus.IN_PRODUCTION,
          due_date: new Date("2026-07-04T12:00:00.000Z"),
          priority: null,
          is_urgent: true,
          teeth: "11, 12",
          elements_qty: 2,
        },
      },
      {
        id: "cp-2",
        assigned_lab_member_id: "member-a",
        status: CaseProcessStatus.IN_PROGRESS,
        started_at: new Date("2026-07-03T09:00:00.000Z"),
        completed_at: null,
        cases: {
          id: "case-open",
          created_at: new Date("2026-07-01T09:00:00.000Z"),
          current_status: CaseStatus.IN_PRODUCTION,
          due_date: new Date("2026-07-04T12:00:00.000Z"),
          priority: null,
          is_urgent: true,
          teeth: "11, 12",
          elements_qty: 2,
        },
      },
      {
        id: "cp-3",
        assigned_lab_member_id: "member-a",
        status: CaseProcessStatus.COMPLETED,
        started_at: new Date("2026-07-01T08:00:00.000Z"),
        completed_at: new Date("2026-07-03T08:00:00.000Z"),
        cases: {
          id: "case-done",
          created_at: new Date("2026-06-28T08:00:00.000Z"),
          current_status: CaseStatus.DONE,
          due_date: new Date("2026-07-02T12:00:00.000Z"),
          priority: CasePriority.NORMAL,
          is_urgent: false,
          teeth: "21, 22, 23",
          elements_qty: null,
        },
      },
      {
        id: "cp-4",
        assigned_lab_member_id: "member-b",
        status: CaseProcessStatus.CANCELLED,
        started_at: null,
        completed_at: null,
        cases: {
          id: "case-cancelled",
          created_at: new Date("2026-06-29T10:00:00.000Z"),
          current_status: CaseStatus.CANCELLED,
          due_date: null,
          priority: CasePriority.HIGH,
          is_urgent: false,
          teeth: null,
          elements_qty: 1,
        },
      },
    ],
    visibleCases: [
      {
        id: "case-open",
        created_at: new Date("2026-07-01T09:00:00.000Z"),
        current_status: CaseStatus.IN_PRODUCTION,
        due_date: new Date("2026-07-04T12:00:00.000Z"),
        priority: null,
        is_urgent: true,
        teeth: "11, 12",
        elements_qty: 2,
        case_processes: [
          { completed_at: null },
          { completed_at: null },
        ],
      },
      {
        id: "case-done",
        created_at: new Date("2026-06-28T08:00:00.000Z"),
        current_status: CaseStatus.DONE,
        due_date: new Date("2026-07-02T12:00:00.000Z"),
        priority: CasePriority.NORMAL,
        is_urgent: false,
        teeth: "21, 22, 23",
        elements_qty: null,
        case_processes: [
          { completed_at: new Date("2026-07-02T08:00:00.000Z") },
          { completed_at: new Date("2026-07-03T08:00:00.000Z") },
        ],
      },
      {
        id: "case-cancelled",
        created_at: new Date("2026-06-29T10:00:00.000Z"),
        current_status: CaseStatus.CANCELLED,
        due_date: null,
        priority: CasePriority.HIGH,
        is_urgent: false,
        teeth: null,
        elements_qty: 1,
        case_processes: [{ completed_at: null }],
      },
    ],
    today: new Date("2026-07-05T12:00:00.000Z"),
  });

  assert.deepEqual(dashboard.summary, {
    totalEmployees: 2,
    totalAssignedCases: 3,
    totalTeethTracked: 6,
    openCases: 1,
    openTeeth: 2,
    completedThisMonth: 1,
    urgentOpenCases: 1,
    avgTurnaroundDays: 5,
  });
  assert.equal(dashboard.employeeStats[0]?.id, "member-a");
  assert.deepEqual(dashboard.employeeStats[0], {
    id: "member-a",
    name: "Alice",
    totalCases: 2,
    totalTeethTracked: 5,
    openCases: 1,
    openTeeth: 2,
    closedCases: 1,
    closedTeeth: 3,
    completedProcessesThisWeek: 1,
    completedProcessesThisMonth: 1,
    urgentOpenCases: 1,
    overdueCases: 1,
    avgTurnaroundDays: 2,
    completionRate: 50,
  });
  assert.deepEqual(dashboard.employeeStats[1], {
    id: "member-b",
    name: "Bruno",
    totalCases: 1,
    totalTeethTracked: 1,
    openCases: 0,
    openTeeth: 0,
    closedCases: 1,
    closedTeeth: 1,
    completedProcessesThisWeek: 0,
    completedProcessesThisMonth: 0,
    urgentOpenCases: 0,
    overdueCases: 0,
    avgTurnaroundDays: null,
    completionRate: 100,
  });
  assert.deepEqual(dashboard.statusData, [
    { status: CaseStatus.IN_PRODUCTION, label: "Production", value: 1, fill: "#2563eb" },
    { status: CaseStatus.DONE, label: "Done", value: 1, fill: "#14b8a6" },
    { status: CaseStatus.CANCELLED, label: "Cancelled", value: 1, fill: "#ef4444" },
  ]);
  assert.equal("designerStats" in dashboard, false);
  assert.equal("totalDesigners" in dashboard.summary, false);
  assert.equal("totalTeethDesigned" in dashboard.summary, false);
});

test("dashboard urgent, overdue, and turnaround rules stay defensive when samples are missing", () => {
  const dashboard = buildDashboardPayload({
    employees: [{ id: "member-a", name: "Alice" }],
    assignedProcesses: [
      {
        id: "cp-1",
        assigned_lab_member_id: "member-a",
        status: CaseProcessStatus.IN_PROGRESS,
        started_at: null,
        completed_at: null,
        cases: {
          id: "case-high",
          created_at: new Date("2026-07-02T12:00:00.000Z"),
          current_status: CaseStatus.IN_PRODUCTION,
          due_date: new Date("2026-07-06T10:00:00.000Z"),
          priority: CasePriority.URGENT,
          is_urgent: false,
          teeth: "14",
          elements_qty: null,
        },
      },
      {
        id: "cp-2",
        assigned_lab_member_id: "member-a",
        status: CaseProcessStatus.COMPLETED,
        started_at: null,
        completed_at: new Date("2026-07-03T10:00:00.000Z"),
        cases: {
          id: "case-done-no-start",
          created_at: new Date("2026-06-30T12:00:00.000Z"),
          current_status: CaseStatus.DONE,
          due_date: null,
          priority: CasePriority.NORMAL,
          is_urgent: false,
          teeth: "16",
          elements_qty: null,
        },
      },
    ],
    visibleCases: [
      {
        id: "case-high",
        created_at: new Date("2026-07-02T12:00:00.000Z"),
        current_status: CaseStatus.IN_PRODUCTION,
        due_date: new Date("2026-07-06T10:00:00.000Z"),
        priority: CasePriority.URGENT,
        is_urgent: false,
        teeth: "14",
        elements_qty: null,
        case_processes: [{ completed_at: null }],
      },
      {
        id: "case-done-no-start",
        created_at: new Date("2026-06-30T12:00:00.000Z"),
        current_status: CaseStatus.DONE,
        due_date: null,
        priority: CasePriority.NORMAL,
        is_urgent: false,
        teeth: "16",
        elements_qty: null,
        case_processes: [{ completed_at: null }],
      },
      {
        id: "case-standby",
        created_at: new Date("2026-07-01T12:00:00.000Z"),
        current_status: CaseStatus.STANDBY,
        due_date: null,
        priority: CasePriority.NORMAL,
        is_urgent: false,
        teeth: "17",
        elements_qty: null,
        case_processes: [{ completed_at: null }],
      },
    ],
    today: new Date("2026-07-05T12:00:00.000Z"),
  });

  assert.equal(dashboard.summary.urgentOpenCases, 1);
  assert.equal(dashboard.summary.avgTurnaroundDays, null);
  assert.equal(dashboard.employeeStats[0]?.urgentOpenCases, 1);
  assert.equal(dashboard.employeeStats[0]?.overdueCases, 0);
  assert.equal(dashboard.employeeStats[0]?.avgTurnaroundDays, null);
  assert.deepEqual(dashboard.statusData, [
    { status: CaseStatus.IN_PRODUCTION, label: "Production", value: 1, fill: "#2563eb" },
    { status: CaseStatus.STANDBY, label: "Standby", value: 1, fill: "#eab308" },
    { status: CaseStatus.DONE, label: "Done", value: 1, fill: "#14b8a6" },
  ]);
});
