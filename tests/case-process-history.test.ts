import assert from "node:assert/strict";
import test from "node:test";

import { getCaseProcessHistoryEventType } from "@/app/api/case-processes/case-processes.service";
import { buildCaseTimelineItems } from "@/features/cases/components/case-summary-sections";
import { CaseProcessStatus, CaseStatus } from "@/generated/prisma/enums";

test("process history helper only emits entries for tracked status transitions", () => {
  assert.equal(
    getCaseProcessHistoryEventType({
      previousStatus: CaseProcessStatus.READY,
      nextStatus: CaseProcessStatus.IN_PROGRESS,
    }),
    "STARTED",
  );

  assert.equal(
    getCaseProcessHistoryEventType({
      previousStatus: CaseProcessStatus.IN_PROGRESS,
      nextStatus: CaseProcessStatus.COMPLETED,
    }),
    "COMPLETED",
  );

  assert.equal(
    getCaseProcessHistoryEventType({
      previousStatus: CaseProcessStatus.COMPLETED,
      nextStatus: CaseProcessStatus.READY,
    }),
    null,
  );

  assert.equal(
    getCaseProcessHistoryEventType({
      previousStatus: CaseProcessStatus.IN_PROGRESS,
      nextStatus: CaseProcessStatus.IN_PROGRESS,
    }),
    null,
  );

  assert.equal(
    getCaseProcessHistoryEventType({
      previousStatus: CaseProcessStatus.READY,
    }),
    null,
  );
});

test("case timeline merges status and process entries newest first without collapsing repeated process events", () => {
  const timeline = buildCaseTimelineItems({
    statusHistory: [
      {
        id: "status-1",
        fromStatus: CaseStatus.IN_PRODUCTION,
        toStatus: CaseStatus.STANDBY,
        note: "Waiting on scan",
        changedAt: "2026-06-21T10:00:00.000Z",
      },
    ],
    processHistory: [
      {
        id: "process-1",
        caseProcessId: "cp-1",
        processId: "design",
        processName: "Design",
        eventType: "STARTED",
        actorUserId: "user-1",
        actorName: "Ana",
        createdAt: "2026-06-21T11:00:00.000Z",
      },
      {
        id: "process-2",
        caseProcessId: "cp-1",
        processId: "design",
        processName: "Design",
        eventType: "COMPLETED",
        actorUserId: "user-1",
        actorName: "Ana",
        createdAt: "2026-06-21T12:00:00.000Z",
      },
      {
        id: "process-3",
        caseProcessId: "cp-1",
        processId: "design",
        processName: "Design",
        eventType: "STARTED",
        actorUserId: "user-2",
        actorName: "Leo",
        createdAt: "2026-06-21T13:00:00.000Z",
      },
    ],
  });

  assert.deepEqual(
    timeline.map((item) => [item.kind, item.changedAt]),
    [
      ["process", "2026-06-21T13:00:00.000Z"],
      ["process", "2026-06-21T12:00:00.000Z"],
      ["process", "2026-06-21T11:00:00.000Z"],
      ["status", "2026-06-21T10:00:00.000Z"],
    ],
  );
});
