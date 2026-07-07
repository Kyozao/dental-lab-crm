import assert from "node:assert/strict";
import test from "node:test";

import { resolveEffectiveLaborCost } from "@/app/api/employees/employees.labor-costs";

test("effective labor cost falls back to process default when override is missing", () => {
  assert.equal(
    resolveEffectiveLaborCost({
      defaultLaborCost: "15.00",
      laborCostOverride: null,
    }),
    "15.00",
  );
});

test("effective labor cost uses the employee override when present", () => {
  assert.equal(
    resolveEffectiveLaborCost({
      defaultLaborCost: "15.00",
      laborCostOverride: "22.50",
    }),
    "22.50",
  );
});
