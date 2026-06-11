import { randomUUID } from "node:crypto";

import { prisma } from "@/lib/prisma";
import type { Prisma } from "@/generated/prisma/client";
import { CaseProcessStatus } from "@/generated/prisma/enums";
import {
  getLabMember,
  MissingLabMembershipError,
} from "../_shared/membership";
import { activeReferenceWhere } from "../_shared/archive";

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
import type { CreateCaseInput, ListCasesInput, UpdateCaseInput } from "./cases.schemas";
import type {
  ServiceTypeWorkflow,
  ServiceTypeWorkflowStep,
} from "../service-types/service-types.schemas";

export { InactiveReferenceError, MissingLabMembershipError };

export class CaseNotFoundError extends Error {
  constructor() {
    super("Case not found.");
    this.name = "CaseNotFoundError";
  }
}

export async function listCases(
  user_id: string,
  input: ListCasesInput,
) {
  const membership = await getLabMember(user_id);
  const where: Prisma.casesWhereInput = {
    lab_id: membership.lab_id,
    current_status: input.status,
    customer_id: input.customer_id,
    is_urgent: input.urgent,
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
        service_types: {
          is: { name: { contains: input.q, mode: "insensitive" } },
        },
      },
      {
        cadDesigner: {
          is: { name: { contains: input.q, mode: "insensitive" } },
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
    take: input.limit,
  });

  return cases.map(mapCaseSummary);
}

export async function getCaseById(user_id: string, case_id: string) {
  const membership = await getLabMember(user_id);

  const caseItem = await prisma.cases.findFirst({
    where: {
      id: case_id,
      lab_id: membership.lab_id,
    },
    include: caseInclude,
  });

  if (!caseItem) throw new CaseNotFoundError();

  return mapCase(caseItem);
}

function isWorkflowStep(value: unknown): value is ServiceTypeWorkflowStep {
  if (!value || typeof value !== "object" || Array.isArray(value)) return false;

  const step = value as Record<string, unknown>;
  return (
    typeof step.id === "string" &&
    typeof step.process_id === "string" &&
    Array.isArray(step.dependsOn) &&
    step.dependsOn.every((dependency) => typeof dependency === "string")
  );
}

function normalizeWorkflowJson(value: unknown): ServiceTypeWorkflow {
  if (!value || typeof value !== "object" || Array.isArray(value)) {
    return { steps: [] };
  }

  const steps = (value as Record<string, unknown>).steps;
  if (!Array.isArray(steps)) return { steps: [] };

  return {
    steps: steps.filter(isWorkflowStep),
  };
}

async function getWorkflowForCaseCreate(
  lab_id: string,
  service_type_id?: string | null,
) {
  if (!service_type_id) return { steps: [] };

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

  if (workflow.steps.some((step) => !activeProcessIds.has(step.process_id))) {
    throw new InactiveReferenceError({
      service_type_id: [
        "Service type workflow references an inactive, archived, or cross-lab process.",
      ],
    });
  }

  return workflow;
}

export async function createCase(
  user_id: string,
  input: CreateCaseInput,
) {
  const membership = await getLabMember(user_id);
  await validateActiveCaseReferences(membership.lab_id, input);
  const workflow = await getWorkflowForCaseCreate(
    membership.lab_id,
    input.service_type_id,
  );
  const caseProcessRows = workflow.steps.map((step) => ({
    id: randomUUID(),
    process_id: step.process_id,
    workflow_step_id: step.id,
    status:
      step.dependsOn.length === 0
        ? CaseProcessStatus.READY
        : CaseProcessStatus.LOCKED,
  }));
  const caseProcessIdByStepId = new Map(
    workflow.steps.map((step, index) => [step.id, caseProcessRows[index].id]),
  );
  const dependencyRows = workflow.steps.flatMap((step) => {
    const case_process_id = caseProcessIdByStepId.get(step.id);
    if (!case_process_id) return [];

    return step.dependsOn.flatMap((dependencyStepId) => {
      const depends_on_case_process_id = caseProcessIdByStepId.get(dependencyStepId);
      if (!depends_on_case_process_id) return [];

      return {
        case_process_id,
        depends_on_case_process_id,
      };
    });
  });

  for (let attempt = 1; attempt <= CREATE_CASE_MAX_RETRIES; attempt += 1) {
    const code = await generateNextCaseCode(membership.lab_id);

    try {
      const createdCase = await prisma.$transaction(async (tx) => {
        const item = await tx.cases.create({
          data: {
            lab_id: membership.lab_id,
            code,
            patient_name: input.patient_name,
            customer_id: input.customer_id,
            service_type_id: input.service_type_id,
            dentist_id: input.dentist_id,
            cad_designer_id: input.cad_designer_id,
            created_by_user_id: user_id,
            current_status: input.current_status,
            teeth: input.teeth,
            elements_qty: input.elements_qty,
            shade: input.shade,
            due_date: input.due_date,
            is_urgent: input.is_urgent,
            observations: input.observations,
            pending_note: input.pending_note,
            case_processes:
              caseProcessRows.length > 0
                ? { create: caseProcessRows }
                : undefined,
          },
        });

        if (dependencyRows.length > 0) {
          await tx.case_process_dependencies.createMany({
            data: dependencyRows,
          });
        }

        return tx.cases.findUniqueOrThrow({
          where: { id: item.id },
          include: caseInclude,
        });
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
  const existing = await prisma.cases.findFirst({
    where: {
      id: case_id,
      lab_id: membership.lab_id,
    },
    select: {
      id: true,
      customer_id: true,
      service_type_id: true,
      dentist_id: true,
      cad_designer_id: true,
    },
  });

  if (!existing) throw new CaseNotFoundError();

  await validateActiveCaseReferences(membership.lab_id, {
    customer_id: input.customer_id !== undefined ? input.customer_id : existing.customer_id,
    service_type_id:
      input.service_type_id !== undefined
        ? input.service_type_id
        : existing.service_type_id,
    dentist_id:
      input.dentist_id !== undefined ? input.dentist_id : existing.dentist_id,
    cad_designer_id:
      input.cad_designer_id !== undefined
        ? input.cad_designer_id
        : existing.cad_designer_id,
  });

  const updatedCase = await prisma.cases.update({
    where: { id: existing.id },
    data: {
      patient_name: input.patient_name,
      customer_id: input.customer_id,
      service_type_id: input.service_type_id,
      dentist_id: input.dentist_id,
      cad_designer_id: input.cad_designer_id,
      current_status: input.current_status,
      teeth: input.teeth,
      elements_qty: input.elements_qty,
      shade: input.shade,
      due_date: input.due_date,
      is_urgent: input.is_urgent,
      observations: input.observations,
      pending_note: input.pending_note,
    },
    include: caseInclude,
  });

  return mapCase(updatedCase);
}
