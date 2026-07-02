import assert from "node:assert/strict";
import test from "node:test";

import { CaseProcessStatus } from "@/generated/prisma/enums";
import { buildHorizonDates } from "@/app/api/_shared/schedule-capacity";
import { parseApproveScheduleProposalInput } from "@/app/api/schedule/schedule.schemas";
import {
  applyEditedProposalChanges,
  buildCaseGroupedScheduleReview,
  buildProposalEmployeeWorkloads,
  ScheduleProposalValidationError,
} from "@/app/api/schedule/schedule.service";

test("schedule approval validation rejects malformed and duplicate edits", () => {
  const invalid = parseApproveScheduleProposalInput({
    changes: [
      {
        caseProcessId: " process-1 ",
        assignedLabMemberId: "member-1",
      },
      {
        caseProcessId: "process-1",
        assignedLabMemberId: 123,
      },
    ],
  });

  assert.equal(invalid.success, false);
  assert.deepEqual(invalid.errors, {
    "changes.1.caseProcessId": ["Case process id is duplicated."],
    "changes.1.assignedLabMemberId": ["Assigned lab member id is invalid."],
  });
});

test("case-grouped schedule review only includes READY and IN_PROGRESS processes", () => {
  const reviewCases = buildCaseGroupedScheduleReview({
    processes: [
      {
        caseId: "case-1",
        caseCode: "C-001",
        patientName: "Maria",
        customerName: "Studio A",
        dueDate: "2026-06-27T00:00:00.000Z",
        priority: "high",
        caseProcessId: "process-ready",
        workflowStepId: "ready",
        processName: "Design",
        status: CaseProcessStatus.READY,
        editable: true,
        assignedLabMemberId: "member-1",
        assignedLabMemberName: "Ana",
        plannedStartDate: null,
        plannedEndDate: null,
        schedulingStatus: "UNSCHEDULED",
        assigneeOptions: [{ labMemberId: "member-1", labMemberName: "Ana" }],
      },
      {
        caseId: "case-1",
        caseCode: "C-001",
        patientName: "Maria",
        customerName: "Studio A",
        dueDate: "2026-06-27T00:00:00.000Z",
        priority: "high",
        caseProcessId: "process-progress",
        workflowStepId: "progress",
        processName: "Milling",
        status: CaseProcessStatus.IN_PROGRESS,
        editable: false,
        assignedLabMemberId: "member-2",
        assignedLabMemberName: "Bia",
        plannedStartDate: "2026-06-27",
        plannedEndDate: "2026-06-28",
        schedulingStatus: "SCHEDULED",
        assigneeOptions: [{ labMemberId: "member-2", labMemberName: "Bia" }],
      },
      {
        caseId: "case-1",
        caseCode: "C-001",
        patientName: "Maria",
        customerName: "Studio A",
        dueDate: "2026-06-27T00:00:00.000Z",
        priority: "high",
        caseProcessId: "process-locked",
        workflowStepId: "locked",
        processName: "Polish",
        status: CaseProcessStatus.LOCKED,
        editable: false,
        assignedLabMemberId: null,
        assignedLabMemberName: null,
        plannedStartDate: null,
        plannedEndDate: null,
        schedulingStatus: "UNSCHEDULED",
        assigneeOptions: [],
      },
    ],
  });

  assert.equal(reviewCases.length, 1);
  assert.equal(reviewCases[0]?.processes.length, 2);
  assert.deepEqual(
    reviewCases[0]?.processes.map((process) => process.caseProcessId),
    ["process-ready", "process-progress"],
  );
});

test("edited schedule approvals reject assignees outside the eligible review options", () => {
  assert.throws(
    () =>
      applyEditedProposalChanges(
        {
          summary: {
            scheduledCount: 1,
            atRiskCount: 0,
            unscheduledCount: 0,
            riskCount: 0,
          },
          changes: [
            {
              caseProcessId: "process-1",
              assignedLabMemberId: "member-1",
              originalAssignedLabMemberId: "member-1",
              plannedMillingMachineId: null,
              plannedStartDate: "2026-06-27",
              plannedEndDate: "2026-06-27",
              schedulingStatus: "SCHEDULED",
              allocations: [],
            },
          ],
          risks: [],
          employeeWorkloads: [],
          reviewCases: [
            {
              caseId: "case-1",
              caseCode: "C-001",
              patientName: "Maria",
              customerName: "Studio A",
              dueDate: null,
              priority: "normal",
              proposalStatus: "SCHEDULED",
              riskCount: 0,
              activeProcessCount: 1,
              processes: [
                {
                  caseProcessId: "process-1",
                  workflowStepId: "step-1",
                  processName: "Design",
                  status: CaseProcessStatus.READY,
                  editable: true,
                  assignedLabMemberId: "member-1",
                  assignedLabMemberName: "Ana",
                  plannedStartDate: "2026-06-27",
                  plannedEndDate: "2026-06-27",
                  schedulingStatus: "SCHEDULED",
                  riskReason: null,
                  assigneeOptions: [
                    {
                      labMemberId: "member-1",
                      labMemberName: "Ana",
                    },
                  ],
                },
              ],
            },
          ],
        },
        [
          {
            caseProcessId: "process-1",
            assignedLabMemberId: "member-2",
          },
        ],
      ),
    ScheduleProposalValidationError,
  );
});

test("proposal employee workloads summarize 14-day planned versus available minutes", () => {
  const [firstDay, secondDay] = buildHorizonDates();
  const workloads = buildProposalEmployeeWorkloads({
    employees: [
      {
        id: "member-1",
        users: { name: "Ana" },
        scheduleShifts: [
          { day_of_week: 1, available_minutes: 480 },
          { day_of_week: 2, available_minutes: 480 },
          { day_of_week: 3, available_minutes: 480 },
          { day_of_week: 4, available_minutes: 480 },
          { day_of_week: 5, available_minutes: 480 },
        ],
        scheduleExceptions: [],
      },
    ],
    changes: [
      {
        caseProcessId: "process-1",
        assignedLabMemberId: "member-1",
        originalAssignedLabMemberId: "member-1",
        plannedMillingMachineId: null,
        plannedStartDate: firstDay ?? null,
        plannedEndDate: secondDay ?? firstDay ?? null,
        schedulingStatus: "SCHEDULED",
        allocations: [
          {
            date: firstDay as string,
            plannedMinutes: 120,
            millingMachineId: null,
          },
          {
            date: secondDay as string,
            plannedMinutes: 90,
            millingMachineId: null,
          },
        ],
      },
    ],
  });

  assert.equal(workloads.length, 1);
  assert.equal(workloads[0]?.labMemberId, "member-1");
  assert.equal(workloads[0]?.scheduledMinutes, 210);
  assert.equal(
    workloads[0]?.days.find((day) => day.date === firstDay)?.plannedMinutes,
    120,
  );
  assert.equal(
    workloads[0]?.days.find((day) => day.date === secondDay)?.plannedMinutes,
    90,
  );
});
