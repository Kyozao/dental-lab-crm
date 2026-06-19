import assert from "node:assert/strict";
import test from "node:test";

import { CaseStatus } from "@/generated/prisma/enums";
import { buildCustomerDashboard } from "@/app/api/customers/customers.dashboard";
import {
  parseCreateDentistInput,
  parseDentistListQuery,
  parseUpdateDentistInput,
} from "@/app/api/dentists/dentists.schemas";

test("dentist create validation requires customer and name, while update stays partial", () => {
  const missing = parseCreateDentistInput({});
  const validCreate = parseCreateDentistInput({
    customer_id: " customer-1 ",
    name: " Dr. Ana ",
    phone: " 123 ",
  });
  const validUpdate = parseUpdateDentistInput({
    email: " dentist@customer.com ",
    is_active: false,
  });

  assert.equal(missing.success, false);
  assert.deepEqual(missing.errors, {
    customer_id: ["Customer is required."],
    name: ["This field is required."],
  });
  assert.deepEqual(validCreate, {
    success: true,
    data: {
      customer_id: "customer-1",
      name: "Dr. Ana",
      phone: "123",
      email: undefined,
      notes: undefined,
      is_active: undefined,
    },
  });
  assert.deepEqual(validUpdate, {
    success: true,
    data: {
      customer_id: undefined,
      name: undefined,
      phone: undefined,
      email: "dentist@customer.com",
      notes: undefined,
      is_active: false,
    },
  });
});

test("dentist list query normalizes optional customer filter", () => {
  assert.deepEqual(parseDentistListQuery(new URLSearchParams()), {
    customer_id: undefined,
  });
  assert.deepEqual(
    parseDentistListQuery(new URLSearchParams({ customer_id: " customer-1 " })),
    {
      customer_id: "customer-1",
    },
  );
});

test("customer dashboard handles empty and mixed case states with snapshot totals", () => {
  const emptyDashboard = buildCustomerDashboard([], {
    dentistCount: 0,
    currency: "USD",
    now: new Date("2026-06-18T12:00:00.000Z"),
  });

  assert.deepEqual(emptyDashboard, {
    summary: {
      dentistCount: 0,
      totalCases: 0,
      openCases: 0,
      overdueCases: 0,
      dueSoonCases: 0,
      totalSnapshotValue: "0.00",
      currency: "USD",
    },
    statusBreakdown: [],
    serviceMix: [],
    recentCases: [],
  });

  const dashboard = buildCustomerDashboard(
    [
      {
        id: "case-1",
        code: "C-001",
        patient_name: "Maria",
        current_status: CaseStatus.IN_PRODUCTION,
        due_date: new Date("2026-06-16T12:00:00.000Z"),
        updated_at: new Date("2026-06-18T09:00:00.000Z"),
        case_price: "150.00",
        case_services: [
          {
            service_name_snapshot: "Crown",
            quantity: 2,
            unit_price: "75.00",
          },
        ],
        service_types: { name: "Legacy Crown" },
      },
      {
        id: "case-2",
        code: "C-002",
        patient_name: "Joao",
        current_status: CaseStatus.CANCELLED,
        due_date: new Date("2026-06-20T12:00:00.000Z"),
        updated_at: new Date("2026-06-18T08:00:00.000Z"),
        case_price: "99.00",
        case_services: [],
        service_types: { name: "Aligner" },
      },
      {
        id: "case-3",
        code: "C-003",
        patient_name: "Paula",
        current_status: CaseStatus.DONE,
        due_date: new Date("2026-06-22T12:00:00.000Z"),
        updated_at: new Date("2026-06-18T10:00:00.000Z"),
        case_price: "180.00",
        case_services: [
          {
            service_name_snapshot: "Bridge",
            quantity: 1,
            unit_price: "120.00",
          },
          {
            service_name_snapshot: "Crown",
            quantity: 1,
            unit_price: "60.00",
          },
        ],
        service_types: null,
      },
    ],
    {
      dentistCount: 3,
      currency: "USD",
      now: new Date("2026-06-18T12:00:00.000Z"),
    },
  );

  assert.deepEqual(dashboard.summary, {
    dentistCount: 3,
    totalCases: 3,
    openCases: 1,
    overdueCases: 1,
    dueSoonCases: 0,
    totalSnapshotValue: "429.00",
    currency: "USD",
  });
  assert.deepEqual(dashboard.statusBreakdown, [
    { key: "IN_PRODUCTION", label: "IN_PRODUCTION", count: 1 },
    { key: "CANCELLED", label: "CANCELLED", count: 1 },
    { key: "DONE", label: "DONE", count: 1 },
  ]);
  assert.deepEqual(dashboard.serviceMix, [
    { key: "Crown", label: "Crown", count: 3 },
    { key: "Aligner", label: "Aligner", count: 1 },
    { key: "Bridge", label: "Bridge", count: 1 },
  ]);
  assert.deepEqual(
    dashboard.recentCases.map((item) => item.id),
    ["case-3", "case-1", "case-2"],
  );
  assert.deepEqual(dashboard.recentCases[0], {
    id: "case-3",
    code: "C-003",
    patientName: "Paula",
    currentStatus: CaseStatus.DONE,
    dueDate: "2026-06-22T12:00:00.000Z",
    updatedAt: "2026-06-18T10:00:00.000Z",
    snapshotValue: "180.00",
    serviceSummary: "Bridge, Crown",
  });
});
