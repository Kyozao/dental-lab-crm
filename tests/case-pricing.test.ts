import assert from "node:assert/strict";
import test from "node:test";

import { resolveCasePricing } from "@/app/api/cases/cases.pricing";
import { resolveEffectiveServiceBasePrice } from "@/app/api/cases/cases.price-resolution";

test("case pricing snapshots the selected service price on create", () => {
  assert.deepEqual(
    resolveCasePricing({
      currentServiceTypeId: null,
      nextServiceTypeId: "service-1",
      currentServiceBasePriceSnapshot: null,
      currentCasePrice: null,
      currentIsPriceOverridden: false,
      requestedCasePrice: undefined,
      requestedIsPriceOverridden: false,
      selectedServiceBasePrice: "100.00",
    }),
    {
      service_base_price_snapshot: "100.00",
      case_price: "100.00",
      is_price_overridden: false,
    },
  );
});

test("case pricing preserves manual overrides across unrelated updates", () => {
  assert.deepEqual(
    resolveCasePricing({
      currentServiceTypeId: "service-1",
      currentServiceBasePriceSnapshot: "100.00",
      currentCasePrice: "145.00",
      currentIsPriceOverridden: true,
      requestedCasePrice: undefined,
      requestedIsPriceOverridden: undefined,
      selectedServiceBasePrice: "100.00",
    }),
    {
      service_base_price_snapshot: "100.00",
      case_price: "145.00",
      is_price_overridden: true,
    },
  );
});

test("case pricing refreshes from the new service when still following defaults", () => {
  assert.deepEqual(
    resolveCasePricing({
      currentServiceTypeId: "service-1",
      nextServiceTypeId: "service-2",
      currentServiceBasePriceSnapshot: "100.00",
      currentCasePrice: "100.00",
      currentIsPriceOverridden: false,
      requestedCasePrice: undefined,
      requestedIsPriceOverridden: false,
      selectedServiceBasePrice: "225.00",
    }),
    {
      service_base_price_snapshot: "225.00",
      case_price: "225.00",
      is_price_overridden: false,
    },
  );
});

test("case pricing keeps the override when the service changes", () => {
  assert.deepEqual(
    resolveCasePricing({
      currentServiceTypeId: "service-1",
      nextServiceTypeId: "service-2",
      currentServiceBasePriceSnapshot: "100.00",
      currentCasePrice: "145.00",
      currentIsPriceOverridden: true,
      requestedCasePrice: undefined,
      requestedIsPriceOverridden: undefined,
      selectedServiceBasePrice: "225.00",
    }),
    {
      service_base_price_snapshot: "225.00",
      case_price: "145.00",
      is_price_overridden: true,
    },
  );
});

test("service-line pricing uses the assigned customer price table when present", () => {
  assert.equal(
    resolveEffectiveServiceBasePrice({
      serviceTypeBasePrice: "100.00",
      customerPriceTablePrice: "82.50",
    }),
    "82.50",
  );
});

test("service-line pricing falls back to the service base price when no table row exists", () => {
  assert.equal(
    resolveEffectiveServiceBasePrice({
      serviceTypeBasePrice: "100.00",
      customerPriceTablePrice: null,
    }),
    "100.00",
  );
});
