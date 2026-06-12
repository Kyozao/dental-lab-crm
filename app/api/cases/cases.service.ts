import { prisma } from "@/lib/prisma";
import type { Prisma } from "@/generated/prisma/client";
import {
  getLabMember,
  MissingLabMembershipError,
} from "../_shared/membership";

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
import {
  createCaseWithWorkflow,
  getWorkflowForCaseCreate,
} from "./cases.workflow";

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

  for (let attempt = 1; attempt <= CREATE_CASE_MAX_RETRIES; attempt += 1) {
    const code = await generateNextCaseCode(membership.lab_id);

    try {
      const createdCase = await prisma.$transaction(async (tx) => {
        return createCaseWithWorkflow(
          tx,
          user_id,
          membership.lab_id,
          input,
          code,
          workflow,
        );
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
