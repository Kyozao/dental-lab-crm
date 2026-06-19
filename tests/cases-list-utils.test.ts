import assert from "node:assert/strict";
import test from "node:test";

import { CaseProcessStatus } from "@/generated/prisma/enums";
import {
  buildCasePatientDetail,
  computeCaseProgress,
  resolveCasePriority,
  selectCurrentCaseProcess,
} from "@/app/api/cases/cases.list-utils";

test("selectCurrentCaseProcess prioritizes in-progress steps before ready steps", () => {
  const currentProcess = selectCurrentCaseProcess({
    case_services: [
      {
        id: "service-1",
        service_type_id: "service-type-1",
        service_name_snapshot: "Crown",
        service_base_price_snapshot: { toString: () => "100.00" },
        unit_price: { toString: () => "100.00" },
        is_unit_price_overridden: false,
        quantity: 1,
        case_processes: [
          {
            id: "case-process-ready",
            process_id: "process-design",
            workflow_step_id: "design",
            status: CaseProcessStatus.READY,
            created_at: new Date("2026-06-18T10:00:00.000Z"),
            processes: {
              name: "Design",
            },
            assignedLabMember: null,
          },
        ],
      },
      {
        id: "service-2",
        service_type_id: "service-type-2",
        service_name_snapshot: "Bridge",
        service_base_price_snapshot: { toString: () => "200.00" },
        unit_price: { toString: () => "200.00" },
        is_unit_price_overridden: false,
        quantity: 1,
        case_processes: [
          {
            id: "case-process-mill",
            process_id: "process-milling",
            workflow_step_id: "milling",
            status: CaseProcessStatus.IN_PROGRESS,
            created_at: new Date("2026-06-18T11:00:00.000Z"),
            processes: {
              name: "Milling",
            },
            assignedLabMember: {
              id: "lab-member-1",
              users: {
                name: "Ana",
              },
            },
          },
          {
            id: "case-process-finish",
            process_id: "process-finish",
            workflow_step_id: "finish",
            status: CaseProcessStatus.LOCKED,
            created_at: new Date("2026-06-18T12:00:00.000Z"),
            processes: {
              name: "Finish",
            },
            assignedLabMember: null,
          },
        ],
      },
    ],
  });

  assert.deepEqual(currentProcess, {
    caseProcessId: "case-process-mill",
    processId: "process-milling",
    workflowStepId: "milling",
    processName: "Milling",
    status: CaseProcessStatus.IN_PROGRESS,
    assignedLabMemberId: "lab-member-1",
    assignedLabMemberName: "Ana",
    serviceLabel: "Bridge",
    progressPercent: 25,
    completedSteps: 0,
    totalSteps: 2,
  });
});

test("computeCaseProgress handles ready and partially completed workflows", () => {
  assert.deepEqual(
    computeCaseProgress(
      [CaseProcessStatus.READY, CaseProcessStatus.LOCKED],
      CaseProcessStatus.READY,
    ),
    {
      completedSteps: 0,
      totalSteps: 2,
      progressPercent: 0,
    },
  );

  assert.deepEqual(
    computeCaseProgress(
      [
        CaseProcessStatus.COMPLETED,
        CaseProcessStatus.IN_PROGRESS,
        CaseProcessStatus.LOCKED,
      ],
      CaseProcessStatus.IN_PROGRESS,
    ),
    {
      completedSteps: 1,
      totalSteps: 3,
      progressPercent: 50,
    },
  );
});

test("buildCasePatientDetail combines tooth and shade context", () => {
  assert.equal(
    buildCasePatientDetail({
      teeth: "11, 12",
      elements_qty: 2,
      shade: "A2",
    }),
    "11, 12 • Shade A2",
  );

  assert.equal(
    buildCasePatientDetail({
      teeth: null,
      elements_qty: 3,
      shade: null,
    }),
    "3 elements",
  );
});

test("resolveCasePriority matches urgent and due-date urgency rules", () => {
  assert.equal(resolveCasePriority(true, null), "urgent");
  assert.equal(
    resolveCasePriority(false, new Date(Date.now() + 24 * 60 * 60 * 1000)),
    "high",
  );
  assert.equal(
    resolveCasePriority(false, new Date(Date.now() + 7 * 24 * 60 * 60 * 1000)),
    "low",
  );
});
