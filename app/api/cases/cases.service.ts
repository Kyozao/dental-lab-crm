import { prisma } from "@/lib/prisma";
import type { Prisma } from "@/generated/prisma/client";
import { CasePriority, CaseStatus, UserRole } from "@/generated/prisma/enums";
import {
  getLabMember,
  MissingLabMembershipError,
} from "../_shared/membership";
import {
  bumpLabScheduleRevision,
  normalizeCasePriorityInput,
} from "../_shared/scheduling";

import {
  caseInclude,
  caseSummarySelect,
  CREATE_CASE_MAX_RETRIES,
  generateNextCaseCode,
  InactiveReferenceError,
  isCaseCodeCollision,
  mapCase,
  mapCaseSummary,
  validateActiveCaseReferences,
} from "./cases.utils";
import { selectCurrentCaseProcess } from "./cases.list-utils";
import type {
  CreateCaseInput,
  ListCasesInput,
  UpdateCaseInput,
} from "./cases.schemas";
import {
  createCaseWithWorkflow,
  getWorkflowForServiceType,
  MissingServiceTypeWorkflowError,
  replaceWorkflowForExistingCase,
  validateWorkflowProcesses,
  type ServiceLineWorkflowPlan,
} from "./cases.workflow";
import type { ServiceTypeWorkflow } from "../service-types/service-types.schemas";
import { resolveEffectiveServiceBasePrice } from "./cases.pricing";

export { InactiveReferenceError, MissingLabMembershipError, MissingServiceTypeWorkflowError };

export class CaseNotFoundError extends Error {
  constructor() {
    super("Case not found.");
    this.name = "CaseNotFoundError";
  }
}

export class CaseAuthorizationError extends Error {
  constructor(message = "Forbidden") {
    super(message);
    this.name = "CaseAuthorizationError";
  }
}

export type LabMembershipContext = Awaited<ReturnType<typeof getLabMember>>;

type ExistingCaseForUpdate = {
  id: string;
  customer_id: string | null;
  dentist_id: string | null;
  current_status: CaseStatus;
};

type ExistingCaseForServiceLineUpdate = ExistingCaseForUpdate & {
  case_services: Array<{
    id: string;
    service_type_id: string;
    service_name_snapshot: string;
    service_base_price_snapshot: { toString(): string };
    unit_price: { toString(): string };
    is_unit_price_overridden: boolean;
    quantity: number;
    case_processes: Array<{
      id: string;
      process_id: string;
      workflow_step_id: string;
      snapshot_fixed_minutes: number;
      snapshot_minutes_per_unit: number;
      snapshot_expected_duration_days: number;
      snapshot_dependency_lag_days: number;
      snapshot_requires_milling_machine: boolean;
      dependencies: Array<{ depends_on_case_process_id: string }>;
    }>;
  }>;
};

type CaseUpdateData = {
  patient_name: UpdateCaseInput["patient_name"];
  customer_id: UpdateCaseInput["customer_id"];
  dentist_id: UpdateCaseInput["dentist_id"];
  current_status: UpdateCaseInput["current_status"];
  teeth: UpdateCaseInput["teeth"];
  elements_qty: UpdateCaseInput["elements_qty"];
  shade: UpdateCaseInput["shade"];
  due_date: UpdateCaseInput["due_date"];
  priority: CasePriority | undefined;
  is_urgent: UpdateCaseInput["is_urgent"];
  observations: UpdateCaseInput["observations"];
};

export function getCaseStatusTransitionHistoryEntry(input: {
  previousStatus: CaseStatus | null;
  nextStatus?: CaseStatus | null;
  statusReason?: string | null;
}) {
  if (!input.nextStatus) {
    return null;
  }

  if (input.previousStatus === input.nextStatus) {
    return null;
  }

  return {
    fromStatus: input.previousStatus,
    toStatus: input.nextStatus,
    note: input.statusReason ?? null,
  };
}

async function createStatusHistoryEntry(
  tx: Prisma.TransactionClient,
  input: {
    case_id: string;
    from_status: CaseStatus | null;
    to_status: CaseStatus;
    note?: string | null;
  },
) {
  await tx.case_status_histories.create({
    data: {
      case_id: input.case_id,
      from_status: input.from_status,
      to_status: input.to_status,
      note: input.note ?? null,
    },
  });
}

async function applyCaseStatusTransitionHistory(
  tx: Prisma.TransactionClient,
  existingCase: ExistingCaseForUpdate,
  input: UpdateCaseInput,
) {
  const transition = getCaseStatusTransitionHistoryEntry({
    previousStatus: existingCase.current_status,
    nextStatus: input.current_status,
    statusReason: input.status_reason,
  });

  if (!transition) {
    return;
  }

  await createStatusHistoryEntry(tx, {
    case_id: existingCase.id,
    from_status: transition.fromStatus,
    to_status: transition.toStatus,
    note: transition.note,
  });
}

function productionCaseScope(labMemberId: string): Prisma.casesWhereInput {
  return {
    case_processes: {
      some: {
        assigned_lab_member_id: labMemberId,
      },
    },
  };
}

export function buildAccessibleCasesWhere(
  membership: LabMembershipContext,
  case_id?: string,
): Prisma.casesWhereInput {
  return {
    ...(case_id ? { id: case_id } : {}),
    lab_id: membership.lab_id,
    ...(membership.role === UserRole.PRODUCTION
      ? productionCaseScope(membership.id)
      : {}),
  };
}

function assertCanManageCases(role: UserRole) {
  if (
    role !== UserRole.OWNER &&
    role !== UserRole.ADMIN &&
    role !== UserRole.MANAGER
  ) {
    throw new CaseAuthorizationError();
  }
}

function buildBaseCaseUpdateData(input: UpdateCaseInput): CaseUpdateData {
  const priority = normalizeCasePriorityInput(
    input.priority,
    input.is_urgent,
  );

  return {
    patient_name: input.patient_name,
    customer_id: input.customer_id,
    dentist_id: input.dentist_id,
    current_status: input.current_status,
    teeth: input.teeth,
    elements_qty: input.elements_qty,
    shade: input.shade,
    due_date: input.due_date,
    priority,
    is_urgent:
      input.is_urgent !== undefined
        ? input.is_urgent
        : priority === CasePriority.URGENT
          ? true
          : priority
            ? false
            : undefined,
    observations: input.observations,
  };
}

function resolveNextCaseReferences(
  input: UpdateCaseInput,
  existingCase: ExistingCaseForUpdate,
) {
  return {
    customer_id:
      input.customer_id !== undefined ? input.customer_id : existingCase.customer_id,
    dentist_id:
      input.dentist_id !== undefined ? input.dentist_id : existingCase.dentist_id,
  };
}

async function buildServiceLinePlans(
  lab_id: string,
  customer_id: string | null | undefined,
  input: CreateCaseInput | { service_lines: NonNullable<UpdateCaseInput["service_lines"]> },
) {
  const serviceTypeIds = [
    ...new Set(input.service_lines.map((serviceLine) => serviceLine.service_type_id)),
  ];
  const [serviceTypes, customer] = await Promise.all([
    prisma.service_types.findMany({
      where: {
        lab_id,
        id: { in: serviceTypeIds },
      },
      select: {
        id: true,
        name: true,
        base_price: true,
        delivery_buffer_days: true,
      },
    }),
    customer_id
      ? prisma.customers.findFirst({
          where: {
            id: customer_id,
            lab_id,
          },
          select: {
            price_table_id: true,
            price_tables: {
              select: {
                price_table_service_prices: {
                  where: {
                    service_type_id: { in: serviceTypeIds },
                  },
                  select: {
                    service_type_id: true,
                    price: true,
                  },
                },
              },
            },
          },
        })
      : Promise.resolve(null),
  ]);
  const serviceTypeById = new Map(
    serviceTypes.map((serviceType) => [serviceType.id, serviceType]),
  );
  const tablePriceByServiceTypeId = new Map(
    customer?.price_tables?.price_table_service_prices.map((entry) => [
      entry.service_type_id,
      entry.price.toString(),
    ]) ?? [],
  );

  return Promise.all(
    input.service_lines.map(async (serviceLine) => {
      const serviceType = serviceTypeById.get(serviceLine.service_type_id);
      if (!serviceType) {
        throw new InactiveReferenceError({
          service_lines: ["One or more service types could not be loaded."],
        });
      }

      const resolvedBasePrice = resolveEffectiveServiceBasePrice({
        serviceTypeBasePrice: serviceType.base_price.toString(),
        customerPriceTablePrice:
          tablePriceByServiceTypeId.get(serviceLine.service_type_id) ?? null,
      });

      const workflow =
        serviceLine.workflow_json ??
        (await getWorkflowForServiceType(lab_id, serviceLine.service_type_id));
      await validateWorkflowProcesses(lab_id, workflow);

      return {
        input: serviceLine,
        serviceNameSnapshot: serviceType.name,
        serviceBasePriceSnapshot: resolvedBasePrice,
        deliveryBufferDaysSnapshot: serviceType.delivery_buffer_days,
        unitPrice:
          serviceLine.is_unit_price_overridden && serviceLine.unit_price
            ? serviceLine.unit_price
            : resolvedBasePrice,
        isUnitPriceOverridden: Boolean(serviceLine.is_unit_price_overridden),
        workflow,
      } satisfies ServiceLineWorkflowPlan;
    }),
  );
}

function getWorkflowFromExistingLine(
  serviceLine: {
    case_processes: Array<{
      id: string;
      process_id: string;
      workflow_step_id: string;
      snapshot_fixed_minutes: number;
      snapshot_minutes_per_unit: number;
      snapshot_expected_duration_days: number;
      snapshot_dependency_lag_days: number;
      snapshot_requires_milling_machine: boolean;
      dependencies: Array<{ depends_on_case_process_id: string }>;
    }>;
  },
): ServiceTypeWorkflow {
  const stepIdByCaseProcessId = new Map(
    serviceLine.case_processes.map((process) => [process.id, process.workflow_step_id]),
  );

  return {
    steps: serviceLine.case_processes.map((process) => ({
      id: process.workflow_step_id,
      process_id: process.process_id,
      fixed_minutes: process.snapshot_fixed_minutes,
      minutes_per_unit: process.snapshot_minutes_per_unit,
      expected_duration_days: process.snapshot_expected_duration_days,
      dependency_lag_days: process.snapshot_dependency_lag_days,
      requires_milling_machine: process.snapshot_requires_milling_machine,
      dependsOn: process.dependencies
        .map((dependency) => stepIdByCaseProcessId.get(dependency.depends_on_case_process_id))
        .filter((stepId): stepId is string => Boolean(stepId)),
    })),
  };
}

function workflowsMatch(
  left: ServiceTypeWorkflow,
  right: ServiceTypeWorkflow,
) {
  if (left.steps.length !== right.steps.length) return false;

  return left.steps.every((step, index) => {
    const otherStep = right.steps[index];
    if (!otherStep) return false;
    if (step.id !== otherStep.id) return false;
    if (step.process_id !== otherStep.process_id) return false;
    if (step.dependsOn.length !== otherStep.dependsOn.length) return false;

    return step.dependsOn.every(
      (dependencyStepId, dependencyIndex) =>
        dependencyStepId === otherStep.dependsOn[dependencyIndex],
    );
  });
}

async function syncCaseServiceLines(
  tx: Prisma.TransactionClient,
  case_id: string,
  existingCase: {
    case_services: Array<{
      id: string;
      service_type_id: string;
      service_name_snapshot: string;
      service_base_price_snapshot: { toString(): string };
      unit_price: { toString(): string };
      is_unit_price_overridden: boolean;
      quantity: number;
      case_processes: Array<{
        id: string;
        process_id: string;
        workflow_step_id: string;
        snapshot_fixed_minutes: number;
        snapshot_minutes_per_unit: number;
        snapshot_expected_duration_days: number;
        snapshot_dependency_lag_days: number;
        snapshot_requires_milling_machine: boolean;
        dependencies: Array<{ depends_on_case_process_id: string }>;
      }>;
    }>;
  },
  plans: ServiceLineWorkflowPlan[],
) {
  const existingById = new Map(
    existingCase.case_services.map((serviceLine) => [serviceLine.id, serviceLine]),
  );
  const requestedIds = new Set(
    plans
      .map((plan) => plan.input.id)
      .filter((id): id is string => Boolean(id)),
  );
  const removedIds = existingCase.case_services
    .filter((serviceLine) => !requestedIds.has(serviceLine.id))
    .map((serviceLine) => serviceLine.id);

  if (removedIds.length > 0) {
    await tx.case_services.deleteMany({
      where: {
        id: { in: removedIds },
        case_id,
      },
    });
  }

  for (const plan of plans) {
    const existingLine = plan.input.id ? existingById.get(plan.input.id) : undefined;

    if (!existingLine) {
      const created = await tx.case_services.create({
        data: {
          case_id,
          service_type_id: plan.input.service_type_id,
          service_name_snapshot: plan.serviceNameSnapshot,
          service_base_price_snapshot: plan.serviceBasePriceSnapshot,
          delivery_buffer_days_snapshot: plan.deliveryBufferDaysSnapshot,
          unit_price: plan.unitPrice,
          is_unit_price_overridden: plan.isUnitPriceOverridden,
          quantity: plan.input.quantity,
        },
        select: { id: true },
      });

      await replaceWorkflowForExistingCase(tx, case_id, created.id, plan.workflow);
      continue;
    }

    const serviceTypeChanged =
      existingLine.service_type_id !== plan.input.service_type_id;
    const existingWorkflow = getWorkflowFromExistingLine(existingLine);
    const workflowChanged = plan.input.workflow_json
      ? !workflowsMatch(plan.input.workflow_json, existingWorkflow)
      : false;
    const nextIsUnitPriceOverridden =
      plan.input.is_unit_price_overridden ?? existingLine.is_unit_price_overridden;
    const nextUnitPrice = nextIsUnitPriceOverridden
      ? plan.input.unit_price ?? existingLine.unit_price.toString()
      : plan.serviceBasePriceSnapshot;

    await tx.case_services.update({
      where: { id: existingLine.id },
      data: {
        service_type_id: plan.input.service_type_id,
        service_name_snapshot: plan.serviceNameSnapshot,
        service_base_price_snapshot: plan.serviceBasePriceSnapshot,
        delivery_buffer_days_snapshot: plan.deliveryBufferDaysSnapshot,
        unit_price: nextUnitPrice,
        is_unit_price_overridden: nextIsUnitPriceOverridden,
        quantity: plan.input.quantity,
      },
    });

    if (workflowChanged || serviceTypeChanged) {
      await replaceWorkflowForExistingCase(
        tx,
        case_id,
        existingLine.id,
        serviceTypeChanged
          ? plan.workflow
          : (plan.input.workflow_json ?? existingWorkflow),
      );
    }
  }

  const primaryServiceLine = await tx.case_services.findFirst({
    where: { case_id },
    orderBy: { created_at: "asc" },
    select: {
      service_type_id: true,
      service_base_price_snapshot: true,
      unit_price: true,
      is_unit_price_overridden: true,
    },
  });

  await tx.cases.update({
    where: { id: case_id },
    data: {
      service_type_id: primaryServiceLine?.service_type_id ?? null,
      service_base_price_snapshot:
        primaryServiceLine?.service_base_price_snapshot ?? null,
      case_price: primaryServiceLine?.unit_price ?? null,
      is_price_overridden:
        primaryServiceLine?.is_unit_price_overridden ?? false,
    },
  });
}

async function loadExistingCaseForUpdate(
  membership: LabMembershipContext,
  case_id: string,
) {
  const existingCase = await prisma.cases.findFirst({
    where: {
      id: case_id,
      lab_id: membership.lab_id,
    },
    select: {
      id: true,
      customer_id: true,
      dentist_id: true,
      current_status: true,
    },
  });

  if (!existingCase) {
    throw new CaseNotFoundError();
  }

  return existingCase satisfies ExistingCaseForUpdate;
}

async function loadExistingCaseForServiceLineUpdate(
  membership: LabMembershipContext,
  case_id: string,
) {
  const existingCase = await prisma.cases.findFirst({
    where: {
      id: case_id,
      lab_id: membership.lab_id,
    },
    select: {
      id: true,
      customer_id: true,
      dentist_id: true,
      current_status: true,
      case_services: {
        select: {
          id: true,
          service_type_id: true,
          service_name_snapshot: true,
          service_base_price_snapshot: true,
          unit_price: true,
          is_unit_price_overridden: true,
          quantity: true,
          case_processes: {
            select: {
              id: true,
              process_id: true,
              workflow_step_id: true,
              snapshot_fixed_minutes: true,
              snapshot_minutes_per_unit: true,
              snapshot_expected_duration_days: true,
              snapshot_dependency_lag_days: true,
              snapshot_requires_milling_machine: true,
              dependencies: {
                select: {
                  depends_on_case_process_id: true,
                },
              },
            },
          },
        },
        orderBy: { created_at: "asc" },
      },
    },
  });

  if (!existingCase) {
    throw new CaseNotFoundError();
  }

  return existingCase satisfies ExistingCaseForServiceLineUpdate;
}

async function validateReferencesAndBuildServiceLinePlans(
  membership: LabMembershipContext,
  existingCase: ExistingCaseForUpdate,
  input: UpdateCaseInput & {
    service_lines: NonNullable<UpdateCaseInput["service_lines"]>;
  },
) {
  const nextReferences = resolveNextCaseReferences(input, existingCase);
  await validateActiveCaseReferences(membership.lab_id, {
    ...nextReferences,
    service_lines: input.service_lines,
  });

  return buildServiceLinePlans(
    membership.lab_id,
    nextReferences.customer_id,
    { service_lines: input.service_lines },
  );
}

async function validateUpdatedCaseReferences(
  membership: LabMembershipContext,
  existingCase: ExistingCaseForUpdate,
  input: UpdateCaseInput,
) {
  await validateActiveCaseReferences(
    membership.lab_id,
    resolveNextCaseReferences(input, existingCase),
  );
}

async function updateCaseWithServiceLines(
  membership: LabMembershipContext,
  case_id: string,
  input: UpdateCaseInput & {
    service_lines: NonNullable<UpdateCaseInput["service_lines"]>;
  },
  baseCaseUpdate: CaseUpdateData,
) {
  const existingCase = await loadExistingCaseForServiceLineUpdate(
    membership,
    case_id,
  );
  const serviceLinePlans = await validateReferencesAndBuildServiceLinePlans(
    membership,
    existingCase,
    input,
  );

  await prisma.$transaction(async (tx) => {
    await tx.cases.update({
      where: { id: existingCase.id },
      data: baseCaseUpdate,
    });

    await applyCaseStatusTransitionHistory(tx, existingCase, input);
    await syncCaseServiceLines(tx, existingCase.id, existingCase, serviceLinePlans);
    await bumpLabScheduleRevision(tx, membership.lab_id);
  });

  return existingCase.id;
}

async function updateCaseDetailsOnly(
  membership: LabMembershipContext,
  case_id: string,
  input: UpdateCaseInput,
  baseCaseUpdate: CaseUpdateData,
) {
  const existingCase = await loadExistingCaseForUpdate(membership, case_id);
  await validateUpdatedCaseReferences(membership, existingCase, input);

  await prisma.$transaction(async (tx) => {
    await tx.cases.update({
      where: { id: existingCase.id },
      data: baseCaseUpdate,
    });

    await applyCaseStatusTransitionHistory(tx, existingCase, input);
    await bumpLabScheduleRevision(tx, membership.lab_id);
  });

  return existingCase.id;
}

export async function listCases(
  user_id: string,
  input: ListCasesInput,
) {
  const membership = await getLabMember(user_id);
  const where: Prisma.casesWhereInput = {
    ...buildAccessibleCasesWhere(membership),
    current_status: input.status,
    customer_id: input.customer_id,
    priority: input.priority,
    is_urgent: input.urgent,
    ...(input.current_process_ids?.length
      ? {
          case_processes: {
            some: {
              status: {
                in: ["READY", "IN_PROGRESS"],
              },
              process_id: {
                in: input.current_process_ids,
              },
            },
          },
        }
      : {}),
  };

  if (input.q) {
    where.OR = [
      { code: { contains: input.q, mode: "insensitive" } },
      { patient_name: { contains: input.q, mode: "insensitive" } },
      {
        customers: {
          is: { name: { contains: input.q, mode: "insensitive" } },
        },
      },
      {
        dentists: {
          is: { name: { contains: input.q, mode: "insensitive" } },
        },
      },
      {
        case_services: {
          some: {
            service_name_snapshot: { contains: input.q, mode: "insensitive" },
          },
        },
      },
    ];
  }

  const cases = await prisma.cases.findMany({
    where,
    select: caseSummarySelect,
    orderBy: {
      created_at: "desc",
    },
  });

  const filteredCases = input.current_process_ids?.length
    ? cases.filter((caseItem) => {
        const currentProcess = selectCurrentCaseProcess(caseItem);
        return (
          currentProcess !== null &&
          input.current_process_ids?.includes(currentProcess.processId)
        );
      })
    : cases;

  return filteredCases.slice(0, input.limit).map(mapCaseSummary);
}

export async function getCaseById(user_id: string, case_id: string) {
  const membership = await getLabMember(user_id);

  const caseItem = await prisma.cases.findFirst({
    where: buildAccessibleCasesWhere(membership, case_id),
    include: caseInclude,
  });

  if (!caseItem) throw new CaseNotFoundError();

  const availableProcesses = await prisma.processes.findMany({
    where: {
      lab_id: membership.lab_id,
      is_active: true,
      deleted_at: null,
    },
    select: {
      id: true,
      name: true,
    },
    orderBy: { name: "asc" },
  });

  return {
    ...mapCase(caseItem),
    availableProcesses,
  };
}

export async function createCase(
  user_id: string,
  input: CreateCaseInput,
) {
  const membership = await getLabMember(user_id);
  assertCanManageCases(membership.role);
  await validateActiveCaseReferences(membership.lab_id, input);
  const serviceLinePlans = await buildServiceLinePlans(
    membership.lab_id,
    input.customer_id,
    input,
  );

  for (let attempt = 1; attempt <= CREATE_CASE_MAX_RETRIES; attempt += 1) {
    const code = await generateNextCaseCode(membership.lab_id);

    try {
      const createdCase = await prisma.$transaction(async (tx) => {
        const created = await createCaseWithWorkflow(
          tx,
          user_id,
          membership.lab_id,
          input,
          code,
          serviceLinePlans,
        );
        await bumpLabScheduleRevision(tx, membership.lab_id);
        return created;
      });

      return mapCase(createdCase);
    } catch (error) {
      if (attempt < CREATE_CASE_MAX_RETRIES && isCaseCodeCollision(error)) {
        continue;
      }

      throw error;
    }
  }

  throw new Error("Failed to create case after retrying case code generation.");
}

export async function updateCase(
  user_id: string,
  case_id: string,
  input: UpdateCaseInput,
) {
  const membership = await getLabMember(user_id);
  assertCanManageCases(membership.role);
  const baseCaseUpdate = buildBaseCaseUpdateData(input);
  const updatedCaseId = input.service_lines
    ? await updateCaseWithServiceLines(membership, case_id, {
        ...input,
        service_lines: input.service_lines,
      }, baseCaseUpdate)
    : await updateCaseDetailsOnly(membership, case_id, input, baseCaseUpdate);

  const updatedCase = await prisma.cases.findUniqueOrThrow({
    where: { id: updatedCaseId },
    include: caseInclude,
  });

  return mapCase(updatedCase);
}

export async function replaceCaseWorkflow(
  user_id: string,
  case_id: string,
  case_service_id: string,
  workflow: ServiceTypeWorkflow,
) {
  const membership = await getLabMember(user_id);
  assertCanManageCases(membership.role);
  const existing = await prisma.cases.findFirst({
    where: {
      id: case_id,
      lab_id: membership.lab_id,
      case_services: {
        some: {
          id: case_service_id,
        },
      },
    },
    select: { id: true },
  });

  if (!existing) throw new CaseNotFoundError();

  await validateWorkflowProcesses(membership.lab_id, workflow);

  const updatedCase = await prisma.$transaction(async (tx) => {
    await replaceWorkflowForExistingCase(tx, existing.id, case_service_id, workflow);
    await bumpLabScheduleRevision(tx, membership.lab_id);

    return tx.cases.findUniqueOrThrow({
      where: { id: existing.id },
      include: caseInclude,
    });
  });

  return mapCase(updatedCase);
}
