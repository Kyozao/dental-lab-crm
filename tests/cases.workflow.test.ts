import "dotenv/config";

import assert from "node:assert/strict";
import test from "node:test";

import type { Prisma } from "@/generated/prisma/client";
import { CaseProcessStatus } from "@/generated/prisma/enums";
import type { CreateCaseInput } from "@/app/api/cases/cases.schemas";
import { createCaseWithWorkflow } from "@/app/api/cases/cases.workflow";
import type { ServiceTypeWorkflow } from "@/app/api/service-types/service-types.schemas";

const baseInput: CreateCaseInput = {
  patient_name: "Ana Silva",
  customer_id: "customer-1",
  service_type_id: "service-type-1",
  dentist_id: "dentist-1",
  cad_designer_id: "designer-1",
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
