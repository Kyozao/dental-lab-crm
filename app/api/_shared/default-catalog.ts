import type { PrismaClient } from "@/generated/prisma/client";

import type { ServiceTypeWorkflow } from "../service-types/service-types.schemas";

type PrismaClientLike = Pick<PrismaClient, "processes" | "service_types">;

type DefaultProcessDefinition = {
  stepId: string;
  name: string;
  description: string;
};

type DefaultServiceDefinition = {
  name: string;
  oldSeedName?: string;
  steps: Array<{
    id: string;
    processStepId: string;
    dependsOn: string[];
  }>;
};

const DEFAULT_PROCESSES = [
  {
    stepId: "design",
    name: "Design",
    description: "CAD design and restoration planning.",
  },
  {
    stepId: "approval",
    name: "Approval",
    description: "Design review and approval before production.",
  },
  {
    stepId: "milling",
    name: "Milling",
    description: "CAM milling work.",
  },
  {
    stepId: "printing",
    name: "3D Printing",
    description: "3D printing and model production.",
  },
  {
    stepId: "sintering",
    name: "Sintering",
    description: "Sintering cycle for zirconia restorations.",
  },
  {
    stepId: "stain_glaze",
    name: "Stain & Glaze",
    description: "Ceramic staining, glazing, and characterization.",
  },
  {
    stepId: "finishing",
    name: "Finishing",
    description: "Final contouring, polishing, and fit adjustments.",
  },
  {
    stepId: "quality_control",
    name: "Quality Control",
    description: "Final quality check before delivery.",
  },
  {
    stepId: "packing",
    name: "Packing",
    description: "Packaging and shipping preparation.",
  },
] satisfies DefaultProcessDefinition[];

const DEFAULT_SERVICES = [
  {
    name: "Crown",
    oldSeedName: "Coroa",
    steps: [
      { id: "design", processStepId: "design", dependsOn: [] },
      { id: "approval", processStepId: "approval", dependsOn: ["design"] },
      { id: "milling", processStepId: "milling", dependsOn: ["approval"] },
      { id: "sintering", processStepId: "sintering", dependsOn: ["milling"] },
      {
        id: "stain_glaze",
        processStepId: "stain_glaze",
        dependsOn: ["sintering"],
      },
      {
        id: "quality_control",
        processStepId: "quality_control",
        dependsOn: ["stain_glaze"],
      },
      {
        id: "packing",
        processStepId: "packing",
        dependsOn: ["quality_control"],
      },
    ],
  },
  {
    name: "Implant Crown",
    oldSeedName: "Implante Unitario",
    steps: [
      { id: "design", processStepId: "design", dependsOn: [] },
      { id: "approval", processStepId: "approval", dependsOn: ["design"] },
      { id: "milling", processStepId: "milling", dependsOn: ["approval"] },
      { id: "printing", processStepId: "printing", dependsOn: ["approval"] },
      {
        id: "sintering",
        processStepId: "sintering",
        dependsOn: ["milling", "printing"],
      },
      {
        id: "stain_glaze",
        processStepId: "stain_glaze",
        dependsOn: ["sintering"],
      },
      {
        id: "quality_control",
        processStepId: "quality_control",
        dependsOn: ["stain_glaze"],
      },
      {
        id: "packing",
        processStepId: "packing",
        dependsOn: ["quality_control"],
      },
    ],
  },
  {
    name: "Veneer",
    oldSeedName: "Lente",
    steps: [
      { id: "design", processStepId: "design", dependsOn: [] },
      { id: "approval", processStepId: "approval", dependsOn: ["design"] },
      { id: "milling", processStepId: "milling", dependsOn: ["approval"] },
      {
        id: "stain_glaze",
        processStepId: "stain_glaze",
        dependsOn: ["milling"],
      },
      {
        id: "quality_control",
        processStepId: "quality_control",
        dependsOn: ["stain_glaze"],
      },
      {
        id: "packing",
        processStepId: "packing",
        dependsOn: ["quality_control"],
      },
    ],
  },
  {
    name: "Bridge",
    steps: [
      { id: "design", processStepId: "design", dependsOn: [] },
      { id: "approval", processStepId: "approval", dependsOn: ["design"] },
      { id: "milling", processStepId: "milling", dependsOn: ["approval"] },
      { id: "sintering", processStepId: "sintering", dependsOn: ["milling"] },
      {
        id: "stain_glaze",
        processStepId: "stain_glaze",
        dependsOn: ["sintering"],
      },
      {
        id: "quality_control",
        processStepId: "quality_control",
        dependsOn: ["stain_glaze"],
      },
      {
        id: "packing",
        processStepId: "packing",
        dependsOn: ["quality_control"],
      },
    ],
  },
  {
    name: "Inlay / Onlay",
    steps: [
      { id: "design", processStepId: "design", dependsOn: [] },
      { id: "approval", processStepId: "approval", dependsOn: ["design"] },
      { id: "milling", processStepId: "milling", dependsOn: ["approval"] },
      {
        id: "stain_glaze",
        processStepId: "stain_glaze",
        dependsOn: ["milling"],
      },
      {
        id: "quality_control",
        processStepId: "quality_control",
        dependsOn: ["stain_glaze"],
      },
      {
        id: "packing",
        processStepId: "packing",
        dependsOn: ["quality_control"],
      },
    ],
  },
  {
    name: "Full Arch / Protocol",
    oldSeedName: "Protocolo",
    steps: [
      { id: "design", processStepId: "design", dependsOn: [] },
      { id: "approval", processStepId: "approval", dependsOn: ["design"] },
      { id: "milling", processStepId: "milling", dependsOn: ["approval"] },
      { id: "printing", processStepId: "printing", dependsOn: ["approval"] },
      {
        id: "finishing",
        processStepId: "finishing",
        dependsOn: ["milling", "printing"],
      },
      {
        id: "quality_control",
        processStepId: "quality_control",
        dependsOn: ["finishing"],
      },
      {
        id: "packing",
        processStepId: "packing",
        dependsOn: ["quality_control"],
      },
    ],
  },
  {
    name: "Surgical Guide",
    steps: [
      { id: "design", processStepId: "design", dependsOn: [] },
      { id: "approval", processStepId: "approval", dependsOn: ["design"] },
      { id: "printing", processStepId: "printing", dependsOn: ["approval"] },
      {
        id: "finishing",
        processStepId: "finishing",
        dependsOn: ["printing"],
      },
      {
        id: "quality_control",
        processStepId: "quality_control",
        dependsOn: ["finishing"],
      },
      {
        id: "packing",
        processStepId: "packing",
        dependsOn: ["quality_control"],
      },
    ],
  },
  {
    name: "Night Guard",
    steps: [
      { id: "design", processStepId: "design", dependsOn: [] },
      { id: "approval", processStepId: "approval", dependsOn: ["design"] },
      { id: "printing", processStepId: "printing", dependsOn: ["approval"] },
      {
        id: "finishing",
        processStepId: "finishing",
        dependsOn: ["printing"],
      },
      {
        id: "quality_control",
        processStepId: "quality_control",
        dependsOn: ["finishing"],
      },
      {
        id: "packing",
        processStepId: "packing",
        dependsOn: ["quality_control"],
      },
    ],
  },
] satisfies DefaultServiceDefinition[];

const OLD_LINEAR_WORKFLOW_STEP_SHAPE = [
  { id: "design", dependsOn: [] },
  { id: "approval", dependsOn: ["design"] },
  { id: "milling", dependsOn: ["approval"] },
  { id: "finishing", dependsOn: ["milling"] },
];

const OLD_PARALLEL_WORKFLOW_STEP_SHAPE = [
  { id: "design", dependsOn: [] },
  { id: "approval", dependsOn: ["design"] },
  { id: "milling", dependsOn: ["approval"] },
  { id: "printing", dependsOn: ["approval"] },
  { id: "finishing", dependsOn: ["milling", "printing"] },
];

const OLD_SEED_WORKFLOW_SHAPES_BY_NAME = new Map([
  ["Coroa", OLD_LINEAR_WORKFLOW_STEP_SHAPE],
  ["Lente", OLD_LINEAR_WORKFLOW_STEP_SHAPE],
  ["Protocolo", OLD_PARALLEL_WORKFLOW_STEP_SHAPE],
  ["Implante Unitario", OLD_PARALLEL_WORKFLOW_STEP_SHAPE],
]);

function getWorkflowStepShape(workflow_json: unknown) {
  if (!workflow_json || typeof workflow_json !== "object") return [];

  const steps = (workflow_json as { steps?: unknown }).steps;
  if (!Array.isArray(steps)) return [];

  return steps
    .filter((step): step is { id: unknown; dependsOn?: unknown } => {
      return Boolean(step && typeof step === "object" && "id" in step);
    })
    .map((step) => ({
      id: String(step.id),
      dependsOn: Array.isArray(step.dependsOn)
        ? step.dependsOn.map(String).sort()
        : [],
    }));
}

function workflowShapeEquals(
  actual: ReturnType<typeof getWorkflowStepShape>,
  expected: Array<{ id: string; dependsOn: string[] }>,
) {
  if (actual.length !== expected.length) return false;

  return expected.every((expectedStep, index) => {
    const actualStep = actual[index];
    if (actualStep.id !== expectedStep.id) return false;

    const expectedDependencies = [...expectedStep.dependsOn].sort();
    if (actualStep.dependsOn.length !== expectedDependencies.length) {
      return false;
    }

    return expectedDependencies.every(
      (dependencyId, dependencyIndex) =>
        actualStep.dependsOn[dependencyIndex] === dependencyId,
    );
  });
}

function isOldSeedServiceWorkflow(name: string, workflow_json: unknown) {
  const expectedShape = OLD_SEED_WORKFLOW_SHAPES_BY_NAME.get(name);
  if (!expectedShape) return false;

  return workflowShapeEquals(getWorkflowStepShape(workflow_json), expectedShape);
}

function buildWorkflow(
  service: DefaultServiceDefinition,
  processIdByStepId: Map<string, string>,
): ServiceTypeWorkflow {
  return {
    steps: service.steps.map((step) => {
      const process_id = processIdByStepId.get(step.processStepId);
      if (!process_id) {
        throw new Error(`Missing default process for step "${step.id}".`);
      }

      return {
        id: step.id,
        process_id,
        dependsOn: step.dependsOn,
      };
    }),
  };
}

export async function ensureDefaultCatalogForLab(
  prisma: PrismaClientLike,
  lab_id: string,
) {
  const processes = await Promise.all(
    DEFAULT_PROCESSES.map((process) =>
      prisma.processes.upsert({
        where: {
          lab_id_name: { lab_id, name: process.name },
        },
        update: { is_active: true, deleted_at: null },
        create: {
          lab_id,
          name: process.name,
          description: process.description,
          is_active: true,
        },
      }),
    ),
  );

  const processIdByStepId = new Map(
    DEFAULT_PROCESSES.map((process, index) => [
      process.stepId,
      processes[index].id,
    ]),
  );

  const services = [];
  const workflowByServiceName = new Map<string, ServiceTypeWorkflow>();

  for (const service of DEFAULT_SERVICES) {
    const workflow_json = buildWorkflow(service, processIdByStepId);
    workflowByServiceName.set(service.name, workflow_json);

    const existing = await prisma.service_types.findUnique({
      where: { lab_id_name: { lab_id, name: service.name } },
    });

    if (existing) {
      services.push(
        await prisma.service_types.update({
          where: { id: existing.id },
          data: { is_active: true, deleted_at: null },
        }),
      );
      continue;
    }

    const oldSeedService = service.oldSeedName
      ? await prisma.service_types.findUnique({
          where: {
            lab_id_name: {
              lab_id,
              name: service.oldSeedName,
            },
          },
        })
      : null;

    if (
      oldSeedService &&
      isOldSeedServiceWorkflow(oldSeedService.name, oldSeedService.workflow_json)
    ) {
      services.push(
        await prisma.service_types.update({
          where: { id: oldSeedService.id },
          data: {
            name: service.name,
            is_active: true,
            deleted_at: null,
            workflow_json,
          },
        }),
      );
      continue;
    }

    services.push(
      await prisma.service_types.create({
        data: {
          lab_id,
          name: service.name,
          is_active: true,
          workflow_json,
        },
      }),
    );
  }

  return {
    processes,
    services,
    serviceByName: new Map(services.map((service) => [service.name, service])),
    workflowByServiceName,
  };
}
