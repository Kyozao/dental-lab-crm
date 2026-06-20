import assert from "node:assert/strict";
import test from "node:test";

import { CaseProcessStatus, CaseStatus, UserRole } from "@/generated/prisma/enums";
import {
  parseCreateCaseInput,
  parseListCasesInput,
  parseUpdateCaseInput,
} from "@/app/api/cases/cases.schemas";
import { getCaseStatusTransitionHistoryEntry } from "@/app/api/cases/cases.service";
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
  parseCreatePriceTableInput,
  parseUpdatePriceTableInput,
} from "@/app/api/price-tables/price-tables.schemas";
import { parseUpdateCustomerInput } from "@/app/api/customers/customers.schemas";
import {
  parseCreateEmployeeInput,
  parseUpdateEmployeeRoleInput,
  parseUpdateEmployeeProcessesInput,
} from "@/app/api/employees/employees.schemas";
import { parseUpdateLabCurrencyInput } from "@/app/api/labs/labs.schemas";
import { parseListMessageThreadsInput } from "@/app/api/messages/messages.schemas";
import {
  buildMessageThreadsWhere,
  canUseAllThreadScope,
  MESSAGE_THREAD_EXCLUDED_STATUSES,
  resolveRequestedThreadScope,
} from "@/app/api/messages/messages.service";
import {
  assertCanAssignEmployeeProcesses,
  assertCanManageEmployees,
  assertCanViewEmployees,
  assertUserHasNoLabMembership,
  canAssignEmployeeProcesses,
  canViewEmployees,
  EmployeeAuthorizationError,
  EmployeeConflictError,
} from "@/app/api/employees/employees.rules";
import {
  assertCanAccessBackoffice,
  canAccessBackoffice,
  RoleAuthorizationError,
} from "@/app/api/_shared/authorization";

test("case create validation protects required patient and numeric/date integrity", () => {
  const result = parseCreateCaseInput({
    patient_name: "   ",
    elements_qty: 0,
    due_date: "not-a-date",
    current_status: "NOT_A_STATUS",
    service_lines: [],
  });

  assert.equal(result.success, false);
  assert.deepEqual(result.errors, {
    patient_name: ["Patient name is required."],
    current_status: ["Current status is invalid."],
    due_date: ["Due date must be a valid date."],
    elements_qty: ["Elements quantity must be a positive integer."],
    service_lines: ["At least one service line is required."],
  });
});

test("case update validation accepts explicit nulls without overwriting omitted fields", () => {
  const result = parseUpdateCaseInput({
    patient_name: " Maria ",
    due_date: null,
    dentist_id: "",
  });

  assert.deepEqual(result, {
    success: true,
    data: {
      patient_name: "Maria",
      due_date: undefined,
      dentist_id: null,
    },
  });
});

test("case status validation requires a reason for standby and limits where status reasons are allowed", () => {
  const missingStandbyReason = parseUpdateCaseInput({
    current_status: CaseStatus.STANDBY,
  });
  const invalidProductionReason = parseUpdateCaseInput({
    current_status: CaseStatus.IN_PRODUCTION,
    status_reason: "Back on track",
  });
  const validCancelled = parseUpdateCaseInput({
    current_status: CaseStatus.CANCELLED,
    status_reason: "Patient cancelled treatment",
  });

  assert.equal(missingStandbyReason.success, false);
  assert.deepEqual(missingStandbyReason.errors, {
    status_reason: ["Status reason is required when moving a case to StandBy."],
  });
  assert.equal(invalidProductionReason.success, false);
  assert.deepEqual(invalidProductionReason.errors, {
    status_reason: ["Status reason is only allowed for StandBy or Cancelled."],
  });
  assert.deepEqual(validCancelled, {
    success: true,
    data: {
      current_status: CaseStatus.CANCELLED,
      status_reason: "Patient cancelled treatment",
    },
  });
});

test("case service-line validation requires a manual price when override is enabled", () => {
  const invalid = parseCreateCaseInput({
    patient_name: "Ana",
    service_lines: [
      {
        service_type_id: "service-1",
        quantity: 1,
        is_unit_price_overridden: true,
      },
    ],
  });
  const valid = parseUpdateCaseInput({
    service_lines: [
      {
        service_type_id: "service-1",
        quantity: 2,
        unit_price: "145",
        is_unit_price_overridden: true,
      },
    ],
  });

  assert.equal(invalid.success, false);
  assert.deepEqual(invalid.errors, {
    "service_lines.0.unit_price": [
      "Unit price is required when overriding the service price.",
    ],
  });
  assert.deepEqual(valid, {
    success: true,
    data: {
      service_lines: [
        {
          id: undefined,
          service_type_id: "service-1",
          quantity: 2,
          unit_price: "145.00",
          is_unit_price_overridden: true,
        },
      ],
    },
  });
});

test("case list validation caps limit and accepts supported urgent aliases", () => {
  const result = parseListCasesInput(
    new URLSearchParams({
      limit: "999",
      urgent: "normal",
      search: "ana",
      status: CaseStatus.IN_PRODUCTION,
      currentProcessId: "process-1",
    }),
  );

  assert.deepEqual(result, {
    success: true,
    data: {
      limit: 200,
      status: CaseStatus.IN_PRODUCTION,
      customer_id: undefined,
      urgent: false,
      q: "ana",
      current_process_ids: ["process-1"],
    },
  });
});

test("case list validation normalizes repeated current-process filters", () => {
  const result = parseListCasesInput(
    new URLSearchParams([
      ["currentProcessId", " process-1 "],
      ["currentProcessId", "process-2"],
      ["currentProcessId", "process-1"],
    ]),
  );

  assert.deepEqual(result, {
    success: true,
    data: {
      limit: 100,
      status: undefined,
      customer_id: undefined,
      urgent: undefined,
      q: undefined,
      current_process_ids: ["process-1", "process-2"],
    },
  });
});

test("message thread list validation defaults to assigned scope and trims search", () => {
  const result = parseListMessageThreadsInput(
    new URLSearchParams({
      q: "  maria  ",
    }),
  );

  assert.deepEqual(result, {
    success: true,
    data: {
      q: "maria",
      scope: "assigned",
    },
  });
});

test("message thread list validation rejects unsupported scope values", () => {
  const result = parseListMessageThreadsInput(
    new URLSearchParams({
      scope: "mine",
    }),
  );

  assert.equal(result.success, false);
  assert.deepEqual(result.errors, {
    scope: ["Scope must be assigned or all."],
  });
});

test("service type workflow validation rejects missing dependencies and cycles", () => {
  const missingDependency = parseCreateServiceTypeInput({
    name: "Crown",
    base_price: "100",
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
    base_price: "100",
    processes: ["design"],
  });

  assert.equal(result.success, false);
  assert.deepEqual(result.errors, {
    processes: ["Use workflow_json.steps instead of processes."],
  });
});

test("service type validation requires a valid base price", () => {
  const missing = parseCreateServiceTypeInput({
    name: "Crown",
  });
  const invalid = parseUpdateServiceTypeInput({
    base_price: "-10",
  });
  const valid = parseCreateServiceTypeInput({
    name: "Crown",
    base_price: "120.5",
  });

  assert.equal(missing.success, false);
  assert.deepEqual(missing.errors, {
    base_price: ["Price is required."],
  });
  assert.equal(invalid.success, false);
  assert.deepEqual(invalid.errors, {
    base_price: ["Price must be a valid amount with up to 2 decimals."],
  });
  assert.deepEqual(valid, {
    success: true,
    data: {
      name: "Crown",
      base_price: "120.50",
      notes: undefined,
      is_active: undefined,
      workflow_json: undefined,
    },
  });
});

test("price table validation normalizes rows and rejects duplicates", () => {
  const invalid = parseCreatePriceTableInput({
    name: "VIP",
    service_prices: [
      { service_type_id: "service-1", price: "90" },
      { service_type_id: "service-1", price: "95" },
    ],
  });
  const valid = parseUpdatePriceTableInput({
    name: " VIP 2 ",
    service_prices: [
      { service_type_id: " service-1 ", price: "145.5" },
      { service_type_id: "service-2", price: "0" },
    ],
  });

  assert.equal(invalid.success, false);
  assert.deepEqual(invalid.errors, {
    "service_prices.1.service_type_id": ["Service type is duplicated."],
  });
  assert.deepEqual(valid, {
    success: true,
    data: {
      name: "VIP 2",
      is_active: undefined,
      service_prices: [
        { service_type_id: "service-1", price: "145.50" },
        { service_type_id: "service-2", price: "0.00" },
      ],
    },
  });
});

test("customer update validation accepts clearing the assigned price table", () => {
  assert.deepEqual(
    parseUpdateCustomerInput({
      price_table_id: null,
    }),
    {
      success: true,
      data: {
        name: undefined,
        phone: undefined,
        email: undefined,
        notes: undefined,
        price_table_id: null,
        is_active: undefined,
      },
    },
  );
});

test("case process update validation only accepts production process statuses", () => {
  const invalid = parseUpdateCaseProcessInput({
    status: CaseStatus.IN_PRODUCTION,
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

test("case status transition history helper only emits entries for real status changes", () => {
  assert.equal(
    getCaseStatusTransitionHistoryEntry({
      previousStatus: CaseStatus.IN_PRODUCTION,
      nextStatus: undefined,
      statusReason: "ignored",
    }),
    null,
  );

  assert.equal(
    getCaseStatusTransitionHistoryEntry({
      previousStatus: CaseStatus.STANDBY,
      nextStatus: CaseStatus.STANDBY,
      statusReason: "Same state",
    }),
    null,
  );

  assert.deepEqual(
    getCaseStatusTransitionHistoryEntry({
      previousStatus: CaseStatus.IN_PRODUCTION,
      nextStatus: CaseStatus.STANDBY,
      statusReason: "Waiting for scan retry",
    }),
    {
      fromStatus: CaseStatus.IN_PRODUCTION,
      toStatus: CaseStatus.STANDBY,
      note: "Waiting for scan retry",
    },
  );

  assert.deepEqual(
    getCaseStatusTransitionHistoryEntry({
      previousStatus: CaseStatus.STANDBY,
      nextStatus: CaseStatus.CANCELLED,
    }),
    {
      fromStatus: CaseStatus.STANDBY,
      toStatus: CaseStatus.CANCELLED,
      note: null,
    },
  );
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

test("employee role update validation accepts assignable roles and rejects owner", () => {
  const valid = parseUpdateEmployeeRoleInput({
    role: "ADMIN",
  });
  const invalid = parseUpdateEmployeeRoleInput({
    role: "OWNER",
  });

  assert.deepEqual(valid, {
    success: true,
    data: {
      role: UserRole.ADMIN,
    },
  });
  assert.equal(invalid.success, false);
  assert.deepEqual(invalid.errors, {
    role: ["Role cannot be assigned to an employee."],
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
    () => assertCanManageEmployees(UserRole.PRODUCTION),
    EmployeeAuthorizationError,
  );
});

test("employee view and process assignment rules allow owners, admins, and managers", () => {
  for (const role of [UserRole.OWNER, UserRole.ADMIN, UserRole.MANAGER]) {
    assert.equal(canViewEmployees(role), true);
    assert.equal(canAssignEmployeeProcesses(role), true);
    assert.doesNotThrow(() => assertCanViewEmployees(role));
    assert.doesNotThrow(() => assertCanAssignEmployeeProcesses(role));
    assert.doesNotThrow(() => assertCanAssignCaseProcess(role));
  }

  assert.equal(canViewEmployees(UserRole.PRODUCTION), false);
  assert.equal(canAssignEmployeeProcesses(UserRole.PRODUCTION), false);
  assert.throws(
    () => assertCanViewEmployees(UserRole.PRODUCTION),
    EmployeeAuthorizationError,
  );
  assert.throws(
    () => assertCanAssignEmployeeProcesses(UserRole.PRODUCTION),
    EmployeeAuthorizationError,
  );
  assert.throws(
    () => assertCanAssignCaseProcess(UserRole.PRODUCTION),
    CaseProcessAuthorizationError,
  );
});

test("backoffice access excludes the production role", () => {
  for (const role of [UserRole.OWNER, UserRole.ADMIN, UserRole.MANAGER]) {
    assert.equal(canAccessBackoffice(role), true);
    assert.doesNotThrow(() => assertCanAccessBackoffice(role));
  }

  assert.equal(canAccessBackoffice(UserRole.PRODUCTION), false);
  assert.throws(
    () => assertCanAccessBackoffice(UserRole.PRODUCTION),
    RoleAuthorizationError,
  );
});

test("message thread scope only allows management roles to expand to all accessible cases", () => {
  assert.equal(canUseAllThreadScope(UserRole.OWNER), true);
  assert.equal(canUseAllThreadScope(UserRole.ADMIN), true);
  assert.equal(canUseAllThreadScope(UserRole.MANAGER), true);
  assert.equal(canUseAllThreadScope(UserRole.PRODUCTION), false);

  assert.equal(resolveRequestedThreadScope(UserRole.ADMIN, "all"), "all");
  assert.equal(
    resolveRequestedThreadScope(UserRole.PRODUCTION, "all"),
    "assigned",
  );
});

test("message thread query keeps production and assigned-only case scoping aligned", () => {
  assert.deepEqual(
    buildMessageThreadsWhere(
      {
        id: "lab-member-1",
        lab_id: "lab-1",
        role: UserRole.PRODUCTION,
      },
      {
        scope: "assigned",
      },
    ),
    {
      lab_id: "lab-1",
      current_status: {
        notIn: MESSAGE_THREAD_EXCLUDED_STATUSES,
      },
      case_processes: {
        some: {
          assigned_lab_member_id: "lab-member-1",
        },
      },
    },
  );

  assert.deepEqual(
    buildMessageThreadsWhere(
      {
        id: "lab-member-2",
        lab_id: "lab-1",
        role: UserRole.ADMIN,
      },
      {
        scope: "all",
        q: "bridge",
      },
    ),
    {
      lab_id: "lab-1",
      current_status: {
        notIn: MESSAGE_THREAD_EXCLUDED_STATUSES,
      },
      OR: [
        { code: { contains: "bridge", mode: "insensitive" } },
        { patient_name: { contains: "bridge", mode: "insensitive" } },
        {
          customers: {
            is: {
              name: { contains: "bridge", mode: "insensitive" },
            },
          },
        },
        {
          case_comments: {
            some: {
              deleted_at: null,
              body: { contains: "bridge", mode: "insensitive" },
            },
          },
        },
      ],
    },
  );
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

test("lab currency validation accepts three-letter codes and normalizes casing", () => {
  const valid = parseUpdateLabCurrencyInput({ currency: " brl " });
  const invalid = parseUpdateLabCurrencyInput({ currency: "real" });

  assert.deepEqual(valid, {
    success: true,
    data: { currency: "BRL" },
  });
  assert.equal(invalid.success, false);
  assert.deepEqual(invalid.errors, {
    currency: ["Currency must be a 3-letter ISO code."],
  });
});
