import type { PrismaClient } from "@/generated/prisma/client";

import type { ServiceTypeWorkflow } from "../service-types/service-types.schemas";

type PrismaClientLike = Pick<
  PrismaClient,
  | "block_types"
  | "components"
  | "customers"
  | "dentists"
  | "milling_drills"
  | "processes"
  | "service_types"
>;

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

type DefaultCustomerDefinition = {
  key: string;
  name: string;
  phone?: string;
  email?: string;
  notes?: string;
  dentists: Array<{
    name: string;
    phone?: string;
    email?: string;
    notes?: string;
  }>;
};

type DefaultComponentDefinition = {
  name: string;
  category: string;
  brand?: string;
  default_cost: string;
  default_price: string;
};

type DefaultBlockTypeDefinition = {
  name: string;
  material: string;
  brand?: string;
  size?: string;
  shade?: string;
  default_cost: string;
};

type DefaultMillingDrillDefinition = {
  name: string;
  status: "ACTIVE" | "STORED" | "RETIRED" | "LOST";
  current_blocks_count: number;
  estimated_max_blocks: number;
  notes?: string;
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

const DEFAULT_CUSTOMERS: DefaultCustomerDefinition[] = [
  {
    key: "smile-design",
    name: "Smile Design Clinic",
    phone: "(555) 010-1000",
    email: "frontdesk@smiledesign.example",
    notes: "Starter customer for crown, veneer, and bridge cases.",
    dentists: [
      {
        name: "Dr. Emma Silva",
        phone: "(555) 010-1001",
        email: "emma@smiledesign.example",
      },
      {
        name: "Dr. Lucas Grant",
        phone: "(555) 010-1002",
        email: "lucas@smiledesign.example",
      },
    ],
  },
  {
    key: "oral-surgery",
    name: "Oral Surgery Partners",
    phone: "(555) 020-2000",
    email: "cases@oralsurgery.example",
    notes: "Starter customer for implant and surgical guide cases.",
    dentists: [
      {
        name: "Dr. Maya Chen",
        phone: "(555) 020-2001",
        email: "maya@oralsurgery.example",
      },
    ],
  },
  {
    key: "family-dental",
    name: "Family Dental Group",
    phone: "(555) 030-3000",
    email: "ops@familydental.example",
    notes: "Starter customer for everyday restorative work.",
    dentists: [
      {
        name: "Dr. Noah Brooks",
        phone: "(555) 030-3001",
        email: "noah@familydental.example",
      },
    ],
  },
] satisfies DefaultCustomerDefinition[];

const DEFAULT_COMPONENTS: DefaultComponentDefinition[] = [
  {
    name: "Ti Base",
    category: "Implant",
    brand: "DemoDent",
    default_cost: "35.00",
    default_price: "90.00",
  },
  {
    name: "Analog",
    category: "Model",
    brand: "DemoDent",
    default_cost: "12.00",
    default_price: "30.00",
  },
  {
    name: "Screw",
    category: "Implant",
    brand: "DemoDent",
    default_cost: "8.00",
    default_price: "20.00",
  },
  {
    name: "Printed Model",
    category: "Model",
    brand: "In-house",
    default_cost: "18.00",
    default_price: "45.00",
  },
] satisfies DefaultComponentDefinition[];

const DEFAULT_BLOCK_TYPES: DefaultBlockTypeDefinition[] = [
  {
    name: "Zirconia A1",
    material: "Zirconia",
    brand: "Vita",
    size: "98mm",
    shade: "A1",
    default_cost: "48.00",
  },
  {
    name: "Zirconia A2",
    material: "Zirconia",
    brand: "Vita",
    size: "98mm",
    shade: "A2",
    default_cost: "48.00",
  },
  {
    name: "PMMA Clear",
    material: "PMMA",
    brand: "DemoBlock",
    size: "98mm",
    shade: "Clear",
    default_cost: "22.00",
  },
  {
    name: "Lithium Disilicate HT A2",
    material: "Lithium Disilicate",
    brand: "Ivoclar",
    size: "C14",
    shade: "A2",
    default_cost: "32.00",
  },
] satisfies DefaultBlockTypeDefinition[];

const DEFAULT_MILLING_DRILLS: DefaultMillingDrillDefinition[] = [
  {
    name: "Diamond 1.0mm",
    status: "ACTIVE",
    current_blocks_count: 0,
    estimated_max_blocks: 120,
  },
  {
    name: "Diamond 2.5mm",
    status: "ACTIVE",
    current_blocks_count: 0,
    estimated_max_blocks: 100,
  },
  {
    name: "Carbide 0.6mm",
    status: "STORED",
    current_blocks_count: 0,
    estimated_max_blocks: 80,
    notes: "Detail tool for fine anatomy and margins.",
  },
] satisfies DefaultMillingDrillDefinition[];

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

async function ensureDefaultCustomers(
  prisma: PrismaClientLike,
  lab_id: string,
) {
  const customers = [];

  for (const defaultCustomer of DEFAULT_CUSTOMERS) {
    const existing = await prisma.customers.findFirst({
      where: { lab_id, name: defaultCustomer.name },
    });

    const customer = existing
      ? await prisma.customers.update({
          where: { id: existing.id },
          data: {
            phone: defaultCustomer.phone,
            email: defaultCustomer.email,
            notes: defaultCustomer.notes,
            is_active: true,
            deleted_at: null,
          },
        })
      : await prisma.customers.create({
          data: {
            lab_id,
            name: defaultCustomer.name,
            phone: defaultCustomer.phone,
            email: defaultCustomer.email,
            notes: defaultCustomer.notes,
            is_active: true,
          },
        });

    customers.push(customer);

    for (const defaultDentist of defaultCustomer.dentists) {
      const existingDentist = await prisma.dentists.findFirst({
        where: {
          lab_id,
          customer_id: customer.id,
          name: defaultDentist.name,
        },
      });

      if (existingDentist) {
        await prisma.dentists.update({
          where: { id: existingDentist.id },
          data: {
            phone: defaultDentist.phone,
            email: defaultDentist.email,
            notes: defaultDentist.notes,
            is_active: true,
            deleted_at: null,
          },
        });
        continue;
      }

      await prisma.dentists.create({
        data: {
          lab_id,
          customer_id: customer.id,
          name: defaultDentist.name,
          phone: defaultDentist.phone,
          email: defaultDentist.email,
          notes: defaultDentist.notes,
          is_active: true,
        },
      });
    }
  }

  return customers;
}

async function ensureDefaultProductionReferences(
  prisma: PrismaClientLike,
  lab_id: string,
) {
  const components = await Promise.all(
    DEFAULT_COMPONENTS.map((component) =>
      prisma.components.upsert({
        where: { lab_id_name: { lab_id, name: component.name } },
        update: {
          category: component.category,
          brand: component.brand,
          default_cost: component.default_cost,
          default_price: component.default_price,
          is_active: true,
          deleted_at: null,
        },
        create: {
          lab_id,
          name: component.name,
          category: component.category,
          brand: component.brand,
          default_cost: component.default_cost,
          default_price: component.default_price,
          is_active: true,
        },
      }),
    ),
  );

  const blockTypes = await Promise.all(
    DEFAULT_BLOCK_TYPES.map((blockType) =>
      prisma.block_types.upsert({
        where: { lab_id_name: { lab_id, name: blockType.name } },
        update: {
          material: blockType.material,
          brand: blockType.brand,
          size: blockType.size,
          shade: blockType.shade,
          default_cost: blockType.default_cost,
          is_active: true,
          deleted_at: null,
        },
        create: {
          lab_id,
          name: blockType.name,
          material: blockType.material,
          brand: blockType.brand,
          size: blockType.size,
          shade: blockType.shade,
          default_cost: blockType.default_cost,
          is_active: true,
        },
      }),
    ),
  );

  const millingDrills = await Promise.all(
    DEFAULT_MILLING_DRILLS.map((drill) =>
      prisma.milling_drills.upsert({
        where: { lab_id_name: { lab_id, name: drill.name } },
        update: {
          status: drill.status,
          current_blocks_count: drill.current_blocks_count,
          estimated_max_blocks: drill.estimated_max_blocks,
          notes: drill.notes,
        },
        create: {
          lab_id,
          name: drill.name,
          status: drill.status,
          current_blocks_count: drill.current_blocks_count,
          estimated_max_blocks: drill.estimated_max_blocks,
          notes: drill.notes,
        },
      }),
    ),
  );

  return { components, blockTypes, millingDrills };
}

export async function   ensureDefaultCatalogForLab(
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
          data: { is_active: true, deleted_at: null, workflow_json },
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
            base_price: oldSeedService.base_price,
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
          base_price: "0.00",
          is_active: true,
          workflow_json,
        },
      }),
    );
  }

  const customers = await ensureDefaultCustomers(prisma, lab_id);
  const { components, blockTypes, millingDrills } =
    await ensureDefaultProductionReferences(prisma, lab_id);

  return {
    blockTypes,
    components,
    customers,
    millingDrills,
    processes,
    services,
    serviceByName: new Map(services.map((service) => [service.name, service])),
    workflowByServiceName,
  };
}
