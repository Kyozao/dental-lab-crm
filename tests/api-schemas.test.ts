import assert from "node:assert/strict";
import test from "node:test";

import { CaseProcessStatus, CaseStatus } from "@/generated/prisma/enums";
import {
  parseCreateCaseInput,
  parseListCasesInput,
  parseUpdateCaseInput,
} from "@/app/api/cases/cases.schemas";
import { parseUpdateCaseProcessInput } from "@/app/api/case-processes/case-processes.schemas";
import {
  parseCreateServiceTypeInput,
  parseUpdateServiceTypeInput,
} from "@/app/api/service-types/service-types.schemas";

test("case create validation protects required patient and numeric/date integrity", () => {
  const result = parseCreateCaseInput({
    patient_name: "   ",
    elements_qty: 0,
    due_date: "not-a-date",
    current_status: "NOT_A_STATUS",
  });

  assert.equal(result.success, false);
  assert.deepEqual(result.errors, {
    patient_name: ["Patient name is required."],
    current_status: ["Current status is invalid."],
    due_date: ["Due date must be a valid date."],
    elements_qty: ["Elements quantity must be a positive integer."],
  });
});

test("case update validation accepts explicit nulls without overwriting omitted fields", () => {
  const result = parseUpdateCaseInput({
    patient_name: " Maria ",
    due_date: null,
    service_type_id: "",
  });

  assert.deepEqual(result, {
    success: true,
    data: {
      patient_name: "Maria",
      due_date: undefined,
      service_type_id: null,
    },
  });
});

test("case list validation caps limit and accepts supported urgent aliases", () => {
  const result = parseListCasesInput(
    new URLSearchParams({
      limit: "999",
      urgent: "normal",
      search: "ana",
      status: CaseStatus.ENTRY,
    }),
  );

  assert.deepEqual(result, {
    success: true,
    data: {
      limit: 200,
      status: CaseStatus.ENTRY,
      customer_id: undefined,
      urgent: false,
      q: "ana",
    },
  });
});

test("service type workflow validation rejects missing dependencies and cycles", () => {
  const missingDependency = parseCreateServiceTypeInput({
    name: "Crown",
    workflow_json: {
      steps: [
        {
          id: "design",
          process_id: "process-design",
          dependsOn: ["unknown-step"],
        },
      ],
    },
  });
  const cycle = parseUpdateServiceTypeInput({
    workflow_json: {
      steps: [
        { id: "design", process_id: "process-design", dependsOn: ["mill"] },
        { id: "mill", process_id: "process-mill", dependsOn: ["design"] },
      ],
    },
  });

  assert.equal(missingDependency.success, false);
  assert.deepEqual(missingDependency.errors, {
    "workflow_json.steps.0.dependsOn": [
      'Dependency step "unknown-step" does not exist in this workflow.',
    ],
  });
  assert.equal(cycle.success, false);
  assert.deepEqual(cycle.errors, {
    "workflow_json.steps": ["Workflow dependencies cannot contain cycles."],
  });
});

test("service type workflow validation rejects legacy process arrays", () => {
  const result = parseCreateServiceTypeInput({
    name: "Crown",
    processes: ["design"],
  });

  assert.equal(result.success, false);
  assert.deepEqual(result.errors, {
    processes: ["Use workflow_json.steps instead of processes."],
  });
});

test("case process update validation only accepts production process statuses", () => {
  const invalid = parseUpdateCaseProcessInput({
    status: CaseStatus.ENTRY,
    assigned_to_id: 123,
  });
  const valid = parseUpdateCaseProcessInput({
    status: CaseProcessStatus.IN_PROGRESS,
    assigned_to_id: " user-1 ",
  });

  assert.equal(invalid.success, false);
  assert.deepEqual(invalid.errors, {
    status: ["Status is invalid."],
    assigned_to_id: ["Assigned user id is invalid."],
  });
  assert.deepEqual(valid, {
    success: true,
    data: {
      status: CaseProcessStatus.IN_PROGRESS,
      assigned_to_id: "user-1",
    },
  });
});
