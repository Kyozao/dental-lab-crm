import { prisma } from "@/lib/prisma";

import { activeReferenceWhere } from "../_shared/archive";
import type { ServiceTypeWorkflow } from "./service-types.schemas";

type ProcessTimingDefaults = {
  default_fixed_minutes: number;
  default_expected_duration_days: number;
};

export async function getActiveProcessTimingDefaults(
  lab_id: string,
  processIds: string[],
) {
  if (processIds.length === 0) {
    return new Map<string, ProcessTimingDefaults>();
  }

  const processes = await prisma.processes.findMany({
    where: {
      id: { in: processIds },
      lab_id,
      ...activeReferenceWhere,
    },
    select: {
      id: true,
      default_fixed_minutes: true,
      default_expected_duration_days: true,
    },
  });

  return new Map(
    processes.map((process) => [
      process.id,
      {
        default_fixed_minutes: process.default_fixed_minutes,
        default_expected_duration_days: process.default_expected_duration_days,
      },
    ]),
  );
}

export function applyProcessTimingDefaults(
  workflow: ServiceTypeWorkflow,
  defaultsByProcessId: Map<string, ProcessTimingDefaults>,
): ServiceTypeWorkflow {
  return {
    steps: workflow.steps.map((step) => {
      const defaults = defaultsByProcessId.get(step.process_id);

      return {
        ...step,
        fixed_minutes: defaults?.default_fixed_minutes ?? step.fixed_minutes ?? 1,
        expected_duration_days:
          defaults?.default_expected_duration_days ??
          step.expected_duration_days ??
          1,
      };
    }),
  };
}

export async function hydrateWorkflowWithProcessTimingDefaults(
  lab_id: string,
  workflow: ServiceTypeWorkflow,
) {
  const processIds = [...new Set(workflow.steps.map((step) => step.process_id))];
  const defaultsByProcessId = await getActiveProcessTimingDefaults(lab_id, processIds);
  return applyProcessTimingDefaults(workflow, defaultsByProcessId);
}
