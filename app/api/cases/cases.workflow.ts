import type { Prisma } from "@/generated/prisma/client";
import { CaseProcessStatus, CaseStatus } from "@/generated/prisma/enums";
import { prisma } from "@/lib/prisma";

import { activeReferenceWhere } from "../_shared/archive";
import type {
  CaseServiceLineInput,
  CreateCaseInput,
} from "./cases.schemas";
import { caseInclude, InactiveReferenceError } from "./cases.utils";
import type {
  ServiceTypeWorkflow,
  ServiceTypeWorkflowStep,
} from "../service-types/service-types.schemas";

type ServiceLineWorkflowPlan = {
  input: CaseServiceLineInput;
  serviceNameSnapshot: string;
  serviceBasePriceSnapshot: string;
  unitPrice: string;
  isUnitPriceOverridden: boolean;
  workflow: ServiceTypeWorkflow;
};

function isWorkflowStep(value: Prisma.JsonValue): value is ServiceTypeWorkflowStep {
  if (value === null || typeof value !== "object" || Array.isArray(value)) {
    return false;
  }

  const id = value.id;
  const process_id = value.process_id;
  const dependsOn = value.dependsOn;

  return (
    typeof id === "string" &&
    typeof process_id === "string" &&
    Array.isArray(dependsOn) &&
    dependsOn.every((dependency) => typeof dependency === "string")
  );
}

function normalizeWorkflowJson(value: Prisma.JsonValue | undefined): ServiceTypeWorkflow {
  if (value === undefined || value === null || typeof value !== "object" || Array.isArray(value)) {
    return { steps: [] };
  }

  const steps = value.steps;
  if (!Array.isArray(steps)) return { steps: [] };

  return {
    steps: steps.filter(isWorkflowStep),
  };
}

export async function getWorkflowForServiceType(
  lab_id: string,
  service_type_id: string,
) {
  const serviceType = await prisma.service_types.findFirst({
    where: {
      id: service_type_id,
      lab_id,
      ...activeReferenceWhere,
    },
    select: {
      workflow_json: true,
    },
  });

  const workflow = normalizeWorkflowJson(serviceType?.workflow_json);
  if (workflow.steps.length === 0) return workflow;

  await validateWorkflowProcesses(lab_id, workflow);
  return workflow;
}

export async function getWorkflowForCaseCreate(
  lab_id: string,
  service_type_id?: string | null,
) {
  if (!service_type_id) return { steps: [] };
  return getWorkflowForServiceType(lab_id, service_type_id);
}

export async function validateWorkflowProcesses(
  lab_id: string,
  workflow: ServiceTypeWorkflow,
) {
  if (workflow.steps.length === 0) return;

  const processIds = [...new Set(workflow.steps.map((step) => step.process_id))];
  const activeProcesses = await prisma.processes.findMany({
    where: {
      id: { in: processIds },
      lab_id,
      ...activeReferenceWhere,
    },
    select: { id: true },
  });
  const activeProcessIds = new Set(activeProcesses.map((process) => process.id));
  const invalidEntries = workflow.steps
    .map((step, index) => ({ step, index }))
    .filter(({ step }) => !activeProcessIds.has(step.process_id));

  if (invalidEntries.length > 0) {
    throw new InactiveReferenceError(
      Object.fromEntries(
        invalidEntries.map(({ index }) => [
          `workflow_json.steps.${index}.process_id`,
          ["Process is inactive, archived, or not in this lab."],
        ]),
      ),
    );
  }
}

export class MissingServiceTypeWorkflowError extends Error {
  constructor() {
    super("Selected service type does not have a workflow.");
    this.name = "MissingServiceTypeWorkflowError";
  }
}

export function requireWorkflowForSelectedServiceType(
  service_type_id: string | null | undefined,
  workflow: ServiceTypeWorkflow,
) {
  if (service_type_id && workflow.steps.length === 0) {
    throw new MissingServiceTypeWorkflowError();
  }
}

function buildCaseProcessRows(
  case_id: string,
  case_service_id: string,
  workflow: ServiceTypeWorkflow,
) {
  return workflow.steps.map((step) => ({
    case_id,
    case_service_id,
    process_id: step.process_id,
    workflow_step_id: step.id,
    status:
      step.dependsOn.length === 0
        ? CaseProcessStatus.READY
        : CaseProcessStatus.LOCKED,
  }));
}

async function createCaseProcessDependencies(
  tx: Prisma.TransactionClient,
  case_service_id: string,
  workflow: ServiceTypeWorkflow,
) {
  if (workflow.steps.length === 0) return;

  const persistedCaseProcesses = await tx.case_processes.findMany({
    where: { case_service_id },
    select: {
      id: true,
      workflow_step_id: true,
    },
  });
  const caseProcessIdByStepId = new Map(
    persistedCaseProcesses.map((process) => [
      process.workflow_step_id,
      process.id,
    ]),
  );
  if (caseProcessIdByStepId.size !== workflow.steps.length) {
    throw new Error("Failed to persist all case workflow steps.");
  }

  const dependencyRows = workflow.steps.flatMap((step) => {
    const case_process_id = caseProcessIdByStepId.get(step.id);
    if (!case_process_id) {
      throw new Error(`Missing persisted case process for workflow step ${step.id}.`);
    }

    return step.dependsOn.map((dependencyStepId) => {
      const depends_on_case_process_id = caseProcessIdByStepId.get(dependencyStepId);
      if (!depends_on_case_process_id) {
        throw new Error(
          `Missing persisted dependency case process for workflow step ${dependencyStepId}.`,
        );
      }

      return {
        case_process_id,
        depends_on_case_process_id,
      };
    });
  });

  if (dependencyRows.length === 0) return;

  await tx.case_process_dependencies.createMany({
    data: dependencyRows,
  });
}

function isIncompleteStatus(status: CaseProcessStatus) {
  return (
    status === CaseProcessStatus.LOCKED ||
    status === CaseProcessStatus.READY ||
    status === CaseProcessStatus.IN_PROGRESS
  );
}

function statusForEditedStep(
  step: ServiceTypeWorkflowStep,
  statusByStepId: Map<string, CaseProcessStatus>,
) {
  const existingStatus = statusByStepId.get(step.id);
  if (existingStatus && !isIncompleteStatus(existingStatus)) {
    return existingStatus;
  }

  const dependenciesComplete = step.dependsOn.every(
    (dependencyStepId) =>
      statusByStepId.get(dependencyStepId) === CaseProcessStatus.COMPLETED,
  );

  return dependenciesComplete ? CaseProcessStatus.READY : CaseProcessStatus.LOCKED;
}

function buildCaseCreateData(
  user_id: string,
  lab_id: string,
  input: CreateCaseInput,
  code: string,
  primaryLine: ServiceLineWorkflowPlan,
) {
  return {
    lab_id,
    code,
    patient_name: input.patient_name,
    customer_id: input.customer_id,
    service_type_id: primaryLine.input.service_type_id,
    dentist_id: input.dentist_id,
    created_by_user_id: user_id,
    current_status: input.current_status ?? CaseStatus.IN_PRODUCTION,
    service_base_price_snapshot: primaryLine.serviceBasePriceSnapshot,
    case_price: primaryLine.unitPrice,
    is_price_overridden: primaryLine.isUnitPriceOverridden,
    teeth: input.teeth,
    elements_qty: input.elements_qty,
    shade: input.shade,
    due_date: input.due_date,
    is_urgent: input.is_urgent,
    observations: input.observations,
    pending_note: input.pending_note,
  };
}

async function createServiceLineWorkflow(
  tx: Prisma.TransactionClient,
  case_id: string,
  plan: ServiceLineWorkflowPlan,
) {
  requireWorkflowForSelectedServiceType(plan.input.service_type_id, plan.workflow);

  const serviceLine = await tx.case_services.create({
    data: {
      case_id,
      service_type_id: plan.input.service_type_id,
      service_name_snapshot: plan.serviceNameSnapshot,
      service_base_price_snapshot: plan.serviceBasePriceSnapshot,
      unit_price: plan.unitPrice,
      is_unit_price_overridden: plan.isUnitPriceOverridden,
      quantity: plan.input.quantity,
    },
    select: { id: true },
  });

  const caseProcessRows = buildCaseProcessRows(case_id, serviceLine.id, plan.workflow);
  if (caseProcessRows.length > 0) {
    await tx.case_processes.createMany({
      data: caseProcessRows,
    });
    await createCaseProcessDependencies(tx, serviceLine.id, plan.workflow);
  }
}

export async function createCaseWithWorkflow(
  tx: Prisma.TransactionClient,
  user_id: string,
  lab_id: string,
  input: CreateCaseInput,
  code: string,
  serviceLinePlans: ServiceLineWorkflowPlan[],
) {
  if (serviceLinePlans.length === 0) {
    throw new MissingServiceTypeWorkflowError();
  }

  serviceLinePlans.forEach((plan) => {
    requireWorkflowForSelectedServiceType(
      plan.input.service_type_id,
      plan.workflow,
    );
  });

  const item = await tx.cases.create({
    data: buildCaseCreateData(
      user_id,
      lab_id,
      input,
      code,
      serviceLinePlans[0],
    ),
  });

  for (const plan of serviceLinePlans) {
    await createServiceLineWorkflow(tx, item.id, plan);
  }

  await tx.case_status_histories.create({
    data: {
      case_id: item.id,
      from_status: null,
      to_status: input.current_status ?? CaseStatus.IN_PRODUCTION,
      note:
        input.status_reason ??
        ((input.current_status ?? CaseStatus.IN_PRODUCTION) ===
        CaseStatus.IN_PRODUCTION
          ? "Case created."
          : null),
    },
  });

  return tx.cases.findUniqueOrThrow({
    where: { id: item.id },
    include: caseInclude,
  });
}

export async function createWorkflowForExistingCase(
  tx: Prisma.TransactionClient,
  case_id: string,
  case_service_id_or_service_type_id: string,
  service_type_id_or_workflow: string | ServiceTypeWorkflow,
  maybeWorkflow?: ServiceTypeWorkflow,
) {
  const case_service_id =
    maybeWorkflow === undefined ? case_id : case_service_id_or_service_type_id;
  const service_type_id =
    typeof service_type_id_or_workflow === "string"
      ? service_type_id_or_workflow
      : case_service_id_or_service_type_id;
  const workflow =
    maybeWorkflow ??
    (typeof service_type_id_or_workflow === "string"
      ? undefined
      : service_type_id_or_workflow);

  if (!workflow) {
    throw new Error("Workflow is required.");
  }

  requireWorkflowForSelectedServiceType(service_type_id, workflow);
  const existingProcess = await tx.case_processes.findFirst({
    where: { case_id, case_service_id },
    select: { id: true },
  });

  if (existingProcess) return false;

  const caseProcessRows = buildCaseProcessRows(case_id, case_service_id, workflow);
  if (caseProcessRows.length > 0) {
    await tx.case_processes.createMany({
      data: caseProcessRows,
    });
    await createCaseProcessDependencies(tx, case_service_id, workflow);
  }

  return true;
}

export async function replaceWorkflowForExistingCase(
  tx: Prisma.TransactionClient,
  case_id: string,
  case_service_id: string,
  workflow: ServiceTypeWorkflow,
) {
  const existingProcesses = await tx.case_processes.findMany({
    where: { case_id, case_service_id },
    select: {
      id: true,
      workflow_step_id: true,
      status: true,
    },
  });

  const workflowStepIds = new Set(workflow.steps.map((step) => step.id));
  const existingByStepId = new Map(
    existingProcesses.map((process) => [process.workflow_step_id, process]),
  );
  const statusByStepId = new Map(
    existingProcesses.map((process) => [
      process.workflow_step_id,
      process.status,
    ]),
  );
  const removedProcessIds = existingProcesses
    .filter((process) => !workflowStepIds.has(process.workflow_step_id))
    .map((process) => process.id);

  if (removedProcessIds.length > 0) {
    await tx.case_processes.deleteMany({
      where: { id: { in: removedProcessIds } },
    });
  }

  for (const step of workflow.steps) {
    const existing = existingByStepId.get(step.id);
    const status = statusForEditedStep(step, statusByStepId);

    if (existing) {
      await tx.case_processes.update({
        where: { id: existing.id },
        data: {
          process_id: step.process_id,
          status,
        },
      });
      continue;
    }

    await tx.case_processes.create({
      data: {
        case_id,
        case_service_id,
        process_id: step.process_id,
        workflow_step_id: step.id,
        status,
      },
    });
  }

  await tx.case_process_dependencies.deleteMany({
    where: {
      OR: [
        { caseProcess: { case_service_id } },
        { dependsOnCaseProcess: { case_service_id } },
      ],
    },
  });
  await createCaseProcessDependencies(tx, case_service_id, workflow);
}

export type { ServiceLineWorkflowPlan };
