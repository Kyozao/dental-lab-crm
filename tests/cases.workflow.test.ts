import "dotenv/config";

import assert from "node:assert/strict";
import test from "node:test";

import type { Prisma } from "@/generated/prisma/client";
import { CaseProcessStatus } from "@/generated/prisma/enums";
import type { CreateCaseInput } from "@/app/api/cases/cases.schemas";
import {
  createWorkflowForExistingCase,
  createCaseWithWorkflow,
  MissingServiceTypeWorkflowError,
  replaceWorkflowForExistingCase,
} from "@/app/api/cases/cases.workflow";
import type { ServiceTypeWorkflow } from "@/app/api/service-types/service-types.schemas";

const baseInput: CreateCaseInput = {
  patient_name: "Ana Silva",
  customer_id: "customer-1",
  service_type_id: "service-type-1",
  dentist_id: "dentist-1",
  teeth: "11",
  elements_qty: 1,
  shade: "A2",
  due_date: new Date("2026-07-01T00:00:00.000Z"),
  is_urgent: true,
  observations: "Rush case",
  pending_note: "Need approval",
};

const workflow: ServiceTypeWorkflow = {
  steps: [
    { id: "design", process_id: "process-design", dependsOn: [] },
    { id: "mill", process_id: "process-mill", dependsOn: ["design"] },
    { id: "finish", process_id: "process-finish", dependsOn: ["mill"] },
  ],
};

type CaseProcessCreateRow = {
  process_id: string;
  workflow_step_id: string;
  status: string;
};

type DependencyCreateRow = {
  case_process_id: string;
  depends_on_case_process_id: string;
};

function createTransactionStub(options?: {
  persistedWorkflowStepIds?: string[];
  existingCaseProcessId?: string;
}) {
  const persistedWorkflowStepIds =
    options?.persistedWorkflowStepIds ?? workflow.steps.map((step) => step.id);
  const createdCases: unknown[] = [];
  const createdDependencies: DependencyCreateRow[][] = [];
  const caseProcessRows: CaseProcessCreateRow[] = [];

  const tx = {
    cases: {
      create: async ({ data }: { data: { case_processes?: { create: CaseProcessCreateRow[] } } }) => {
        createdCases.push(data);
        caseProcessRows.push(...(data.case_processes?.create ?? []));
        return { id: "case-1" };
      },
      findUniqueOrThrow: async () => ({ id: "case-1" }),
    },
    case_processes: {
      findMany: async () =>
        persistedWorkflowStepIds.map((workflow_step_id) => ({
          id: `case-process-${workflow_step_id}`,
          workflow_step_id,
        })),
      findFirst: async () =>
        options?.existingCaseProcessId
          ? { id: options.existingCaseProcessId }
          : null,
      createMany: async ({ data }: { data: Array<CaseProcessCreateRow & { case_id: string }> }) => {
        caseProcessRows.push(...data);
        return { count: data.length };
      },
    },
    case_process_dependencies: {
      createMany: async ({ data }: { data: DependencyCreateRow[] }) => {
        createdDependencies.push(data);
        return { count: data.length };
      },
    },
  };

  return {
    tx: tx as unknown as Prisma.TransactionClient,
    createdCases,
    createdDependencies,
    caseProcessRows,
  };
}

test("createCaseWithWorkflow persists workflow step statuses and dependencies", async () => {
  const stub = createTransactionStub();

  const createdCase = await createCaseWithWorkflow(
    stub.tx,
    "user-1",
    "lab-1",
    baseInput,
    "CASE-001",
    workflow,
  );

  assert.deepEqual(createdCase, { id: "case-1" });
  assert.equal(stub.createdCases.length, 1);
  assert.deepEqual(stub.caseProcessRows, [
    {
      process_id: "process-design",
      workflow_step_id: "design",
      status: CaseProcessStatus.READY,
    },
    {
      process_id: "process-mill",
      workflow_step_id: "mill",
      status: CaseProcessStatus.LOCKED,
    },
    {
      process_id: "process-finish",
      workflow_step_id: "finish",
      status: CaseProcessStatus.LOCKED,
    },
  ]);
  assert.deepEqual(stub.createdDependencies, [
    [
      {
        case_process_id: "case-process-mill",
        depends_on_case_process_id: "case-process-design",
      },
      {
        case_process_id: "case-process-finish",
        depends_on_case_process_id: "case-process-mill",
      },
    ],
  ]);
});

test("createCaseWithWorkflow fails when persisted workflow rows are missing", async () => {
  const stub = createTransactionStub({
    persistedWorkflowStepIds: ["design", "mill"],
  });

  await assert.rejects(
    createCaseWithWorkflow(
      stub.tx,
      "user-1",
      "lab-1",
      baseInput,
      "CASE-001",
      workflow,
    ),
    /Failed to persist all case workflow steps/,
  );
});

test("createCaseWithWorkflow rejects selected service types without workflow steps", async () => {
  const stub = createTransactionStub();

  await assert.rejects(
    createCaseWithWorkflow(
      stub.tx,
      "user-1",
      "lab-1",
      baseInput,
      "CASE-001",
      { steps: [] },
    ),
    MissingServiceTypeWorkflowError,
  );

  assert.equal(stub.createdCases.length, 0);
});

test("createWorkflowForExistingCase backfills workflow rows only when missing", async () => {
  const stub = createTransactionStub();

  const repaired = await createWorkflowForExistingCase(
    stub.tx,
    "case-1",
    "service-type-1",
    workflow,
  );

  assert.equal(repaired, true);
  assert.deepEqual(stub.caseProcessRows, [
    {
      case_id: "case-1",
      process_id: "process-design",
      workflow_step_id: "design",
      status: CaseProcessStatus.READY,
    },
    {
      case_id: "case-1",
      process_id: "process-mill",
      workflow_step_id: "mill",
      status: CaseProcessStatus.LOCKED,
    },
    {
      case_id: "case-1",
      process_id: "process-finish",
      workflow_step_id: "finish",
      status: CaseProcessStatus.LOCKED,
    },
  ]);
});

test("createWorkflowForExistingCase skips cases that already have process rows", async () => {
  const stub = createTransactionStub({ existingCaseProcessId: "case-process-1" });

  const repaired = await createWorkflowForExistingCase(
    stub.tx,
    "case-1",
    "service-type-1",
    workflow,
  );

  assert.equal(repaired, false);
  assert.equal(stub.caseProcessRows.length, 0);
});

test("replaceWorkflowForExistingCase preserves stable statuses and rebuilds dependencies", async () => {
  const deletedProcessIds: string[] = [];
  const updatedProcesses: Array<{
    id: string;
    process_id: string;
    status: CaseProcessStatus;
  }> = [];
  const createdProcesses: Array<{
    case_id: string;
    process_id: string;
    workflow_step_id: string;
    status: CaseProcessStatus;
  }> = [];
  const dependencyDeletes: unknown[] = [];
  const dependencyCreates: DependencyCreateRow[][] = [];
  const rows: Array<{
    id: string;
    workflow_step_id: string;
    status: CaseProcessStatus;
  }> = [
    {
      id: "case-process-design",
      workflow_step_id: "design",
      status: CaseProcessStatus.COMPLETED,
    },
    {
      id: "case-process-mill",
      workflow_step_id: "mill",
      status: CaseProcessStatus.IN_PROGRESS,
    },
    {
      id: "case-process-finish",
      workflow_step_id: "finish",
      status: CaseProcessStatus.LOCKED,
    },
  ];

  const tx = {
    case_processes: {
      findMany: async () => rows,
      deleteMany: async ({ where }: { where: { id: { in: string[] } } }) => {
        deletedProcessIds.push(...where.id.in);
        for (const id of where.id.in) {
          const index = rows.findIndex((row) => row.id === id);
          if (index !== -1) rows.splice(index, 1);
        }
        return { count: where.id.in.length };
      },
      update: async ({
        where,
        data,
      }: {
        where: { id: string };
        data: { process_id: string; status: CaseProcessStatus };
      }) => {
        updatedProcesses.push({ id: where.id, ...data });
        return { id: where.id };
      },
      create: async ({
        data,
      }: {
        data: {
          case_id: string;
          process_id: string;
          workflow_step_id: string;
          status: CaseProcessStatus;
        };
      }) => {
        createdProcesses.push(data);
        rows.push({
          id: `case-process-${data.workflow_step_id}`,
          workflow_step_id: data.workflow_step_id,
          status: data.status,
        });
        return { id: `case-process-${data.workflow_step_id}` };
      },
    },
    case_process_dependencies: {
      deleteMany: async ({ where }: { where: unknown }) => {
        dependencyDeletes.push(where);
        return { count: 2 };
      },
      createMany: async ({ data }: { data: DependencyCreateRow[] }) => {
        dependencyCreates.push(data);
        return { count: data.length };
      },
    },
  } as unknown as Prisma.TransactionClient;

  await replaceWorkflowForExistingCase(tx, "case-1", {
    steps: [
      { id: "design", process_id: "process-design-v2", dependsOn: [] },
      { id: "quality", process_id: "process-quality", dependsOn: ["design"] },
      { id: "pack", process_id: "process-pack", dependsOn: [] },
    ],
  });

  assert.deepEqual(deletedProcessIds, ["case-process-mill", "case-process-finish"]);
  assert.deepEqual(updatedProcesses, [
    {
      id: "case-process-design",
      process_id: "process-design-v2",
      status: CaseProcessStatus.COMPLETED,
    },
  ]);
  assert.deepEqual(createdProcesses, [
    {
      case_id: "case-1",
      process_id: "process-quality",
      workflow_step_id: "quality",
      status: CaseProcessStatus.READY,
    },
    {
      case_id: "case-1",
      process_id: "process-pack",
      workflow_step_id: "pack",
      status: CaseProcessStatus.READY,
    },
  ]);
  assert.equal(dependencyDeletes.length, 1);
  assert.deepEqual(dependencyCreates, [
    [
      {
        case_process_id: "case-process-quality",
        depends_on_case_process_id: "case-process-design",
      },
    ],
  ]);
});
