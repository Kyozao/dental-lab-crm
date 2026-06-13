import assert from "node:assert/strict";
import test from "node:test";

import { CaseProcessStatus, CaseStatus, UserRole } from "@/generated/prisma/enums";
import {
  parseCreateCaseInput,
  parseListCasesInput,
  parseUpdateCaseInput,
} from "@/app/api/cases/cases.schemas";
import { parseUpdateCaseProcessInput } from "@/app/api/case-processes/case-processes.schemas";
import {
  assertCanAssignCaseProcess,
  buildCaseProcessAssigneeEligibilityWhere,
  CaseProcessAuthorizationError,
} from "@/app/api/case-processes/case-processes.rules";
import {
  parseCreateServiceTypeInput,
  parseUpdateServiceTypeInput,
} from "@/app/api/service-types/service-types.schemas";
import {
  parseCreateEmployeeInput,
  parseUpdateEmployeeProcessesInput,
} from "@/app/api/employees/employees.schemas";
import {
  assertCanAssignEmployeeProcesses,
  assertCanManageEmployees,
  assertCanViewEmployees,
  assertUserHasNoLabMembership,
  EmployeeAuthorizationError,
  EmployeeConflictError,
} from "@/app/api/employees/employees.rules";

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
    assigned_lab_member_id: 123,
  });
  const valid = parseUpdateCaseProcessInput({
    status: CaseProcessStatus.IN_PROGRESS,
    assigned_lab_member_id: " lab-member-1 ",
  });
  const clearAssignee = parseUpdateCaseProcessInput({
    assigned_lab_member_id: null,
  });

  assert.equal(invalid.success, false);
  assert.deepEqual(invalid.errors, {
    status: ["Status is invalid."],
    assigned_lab_member_id: ["Assigned lab member id is invalid."],
  });
  assert.deepEqual(valid, {
    success: true,
    data: {
      status: CaseProcessStatus.IN_PROGRESS,
      assigned_lab_member_id: "lab-member-1",
    },
  });
  assert.deepEqual(clearAssignee, {
    success: true,
    data: {
      status: undefined,
      assigned_lab_member_id: null,
    },
  });
});

test("employee create validation rejects missing identity and invalid role", () => {
  const missing = parseCreateEmployeeInput({});
  const result = parseCreateEmployeeInput({
    name: " ",
    email: "not-an-email",
    role: "OWNER",
  });

  assert.equal(missing.success, false);
  assert.deepEqual(missing.errors, {
    name: ["Name is required."],
    email: ["Email is required."],
    role: ["Role is required."],
  });
  assert.equal(result.success, false);
  assert.deepEqual(result.errors, {
    name: ["Name is required."],
    email: ["Email must be valid."],
    role: ["Role cannot be assigned to an employee."],
  });
});

test("employee create validation normalizes valid invite payloads", () => {
  const result = parseCreateEmployeeInput({
    name: "  Maria Souza  ",
    email: "  MARIA@LAB.COM ",
    role: "MANAGER",
  });

  assert.deepEqual(result, {
    success: true,
    data: {
      name: "Maria Souza",
      email: "maria@lab.com",
      role: UserRole.MANAGER,
    },
  });
});

test("employee management rules allow only owners and admins", () => {
  assert.doesNotThrow(() => assertCanManageEmployees(UserRole.OWNER));
  assert.doesNotThrow(() => assertCanManageEmployees(UserRole.ADMIN));
  assert.throws(
    () => assertCanManageEmployees(UserRole.MANAGER),
    EmployeeAuthorizationError,
  );
  assert.throws(
    () => assertCanManageEmployees(UserRole.CAD_DESIGNER),
    EmployeeAuthorizationError,
  );
  assert.throws(
    () => assertCanManageEmployees(UserRole.PRODUCTION),
    EmployeeAuthorizationError,
  );
});

test("employee view and process assignment rules allow owners, admins, and managers", () => {
  for (const role of [UserRole.OWNER, UserRole.ADMIN, UserRole.MANAGER]) {
    assert.doesNotThrow(() => assertCanViewEmployees(role));
    assert.doesNotThrow(() => assertCanAssignEmployeeProcesses(role));
    assert.doesNotThrow(() => assertCanAssignCaseProcess(role));
  }

  for (const role of [UserRole.CAD_DESIGNER, UserRole.PRODUCTION]) {
    assert.throws(
      () => assertCanViewEmployees(role),
      EmployeeAuthorizationError,
    );
    assert.throws(
      () => assertCanAssignEmployeeProcesses(role),
      EmployeeAuthorizationError,
    );
    assert.throws(
      () => assertCanAssignCaseProcess(role),
      CaseProcessAuthorizationError,
    );
  }
});

test("case process assignee eligibility is scoped to lab member, lab, process, and active user", () => {
  assert.deepEqual(
    buildCaseProcessAssigneeEligibilityWhere({
      lab_id: "lab-1",
      process_id: "process-1",
      assigned_lab_member_id: "lab-member-1",
    }),
    {
      id: "lab-member-1",
      lab_id: "lab-1",
      users: {
        is_active: true,
        deleted_at: null,
      },
      processOwnerships: {
        some: {
          lab_id: "lab-1",
          process_id: "process-1",
        },
      },
    },
  );
});

test("employee process assignment validation requires an array of process ids", () => {
  const missing = parseUpdateEmployeeProcessesInput({});
  const invalid = parseUpdateEmployeeProcessesInput({
    process_ids: ["process-1", 123, " "],
  });

  assert.equal(missing.success, false);
  assert.deepEqual(missing.errors, {
    process_ids: ["Process ids must be an array."],
  });
  assert.equal(invalid.success, false);
  assert.deepEqual(invalid.errors, {
    process_ids: ["Every process id must be a non-empty string."],
  });
});

test("employee process assignment validation allows empty arrays and normalizes duplicates", () => {
  const empty = parseUpdateEmployeeProcessesInput({ process_ids: [] });
  const duplicates = parseUpdateEmployeeProcessesInput({
    process_ids: [" process-1 ", "process-2", "process-1"],
  });

  assert.deepEqual(empty, {
    success: true,
    data: { process_ids: [] },
  });
  assert.deepEqual(duplicates, {
    success: true,
    data: { process_ids: ["process-1", "process-2"] },
  });
});

test("employee invite rules reject users who already belong to a lab", () => {
  assert.doesNotThrow(() => assertUserHasNoLabMembership(0));
  assert.throws(
    () => assertUserHasNoLabMembership(1),
    EmployeeConflictError,
  );
});
