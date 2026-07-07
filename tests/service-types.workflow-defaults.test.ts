import "dotenv/config";

import assert from "node:assert/strict";
import test from "node:test";

import { applyProcessTimingDefaults } from "@/app/api/service-types/service-types.workflow-defaults";
import type { ServiceTypeWorkflow } from "@/app/api/service-types/service-types.schemas";

test("applyProcessTimingDefaults replaces saved service timing with current process defaults", () => {
  const workflow: ServiceTypeWorkflow = {
    steps: [
      {
        id: "design",
        process_id: "process-design",
        dependsOn: [],
        fixed_minutes: 99,
        expected_duration_days: 9,
        requires_milling_machine: false,
      },
      {
        id: "finish",
        process_id: "process-finish",
        dependsOn: ["design"],
        fixed_minutes: 88,
        expected_duration_days: 8,
        requires_milling_machine: true,
      },
    ],
  };

  const hydrated = applyProcessTimingDefaults(
    workflow,
    new Map([
      [
        "process-design",
        {
          default_fixed_minutes: 12,
          default_expected_duration_days: 2,
        },
      ],
      [
        "process-finish",
        {
          default_fixed_minutes: 24,
          default_expected_duration_days: 4,
        },
      ],
    ]),
  );

  assert.deepEqual(hydrated, {
    steps: [
      {
        id: "design",
        process_id: "process-design",
        dependsOn: [],
        fixed_minutes: 12,
        expected_duration_days: 2,
        requires_milling_machine: false,
      },
      {
        id: "finish",
        process_id: "process-finish",
        dependsOn: ["design"],
        fixed_minutes: 24,
        expected_duration_days: 4,
        requires_milling_machine: true,
      },
    ],
  });
});
