import { Prisma } from "@/generated/prisma/client";
import { UserRole } from "@/generated/prisma/enums";
import { prisma } from "@/lib/prisma";

import { activeReferenceWhere } from "../_shared/archive";
import type { CreateCaseInput } from "./cases.schemas";

export const CREATE_CASE_MAX_RETRIES = 3;

export const  caseInclude = {
  customers: {
    select: {
      id: true,
      name: true,
    },
  },
  dentists: {
    select: {
      id: true,
      name: true,
    },
  },
  service_types: {
    select: {
      id: true,
      name: true,
    },
  },
  case_processes: {
    select: {
      id: true,
      process_id: true,
      workflow_step_id: true,
      status: true,
      assigned_to_id: true,
      started_at: true,
      completed_at: true,
      created_at: true,
      updated_at: true,
      processes: {
        select: {
          id: true,
          name: true,
        },
      },
      assignedTo: {
        select: {
          id: true,
          name: true,
        },
      },
      dependencies: {
        select: {
          depends_on_case_process_id: true,
        },
      },
    },
    orderBy: { created_at: "asc" },
  },
  cadDesigner: {
    select: {
      id: true,
      name: true,
    },
  },
  createdByUser: {
    select: {
      id: true,
      name: true,
    },
  },
} satisfies Prisma.casesInclude;

export const caseSummarySelect = {
  id: true,
  lab_id: true,
  code: true,
  patient_name: true,
  customer_id: true,
  service_type_id: true,
  dentist_id: true,
  cad_designer_id: true,
  created_by_user_id: true,
  current_status: true,
  teeth: true,
  elements_qty: true,
  shade: true,
  due_date: true,
  is_urgent: true,
  observations: true,
  pending_note: true,
  created_at: true,
  updated_at: true,
  customers: {
    select: {
      name: true,
    },
  },
  dentists: {
    select: {
      name: true,
    },
  },
  service_types: {
    select: {
      name: true,
    },
  },
  cadDesigner: {
    select: {
      name: true,
    },
  },
  createdByUser: {
    select: {
      name: true,
    },
  },
} satisfies Prisma.casesSelect;

type CaseWithRelations = Prisma.casesGetPayload<{
  include: typeof caseInclude;
}>;

type CaseSummaryWithRelations = Prisma.casesGetPayload<{
  select: typeof caseSummarySelect;
}>;

type CaseReferenceInput = Pick<
  CreateCaseInput,
  "customer_id" | "service_type_id" | "dentist_id" | "cad_designer_id"
>;

export class InactiveReferenceError extends Error {
  constructor(public readonly fields: Record<string, string[]>) {
    super("One or more selected references are inactive, archived, or outside this lab.");
    this.name = "InactiveReferenceError";
  }
}

function addReferenceError(
  errors: Record<string, string[]>,
  field: string,
  message: string,
) {
  errors[field] = [...(errors[field] ?? []), message];
}

export async function generateNextCaseCode(lab_id: string) {
  const [result] = await prisma.$queryRaw<{ maxCode: string | null }[]>`
    SELECT MAX(("code")::numeric)::text AS "maxCode"
    FROM "cases"
    WHERE "lab_id" = ${lab_id}
      AND "code" ~ '^[0-9]+$'
  `;

  const next = Number(result?.maxCode ?? 0) + 1;
  return String(next).padStart(4, "0");
}

export function isCaseCodeCollision(error: unknown) {
  if (
    !(error instanceof Prisma.PrismaClientKnownRequestError) ||
    error.code !== "P2002"
  ) {
    return false;
  }

  const target = error.meta?.target;

  if (Array.isArray(target)) {
    return target.includes("lab_id") && target.includes("code");
  }

  return typeof target === "string" && target.includes("code");
}

export function mapCase(caseItem: CaseWithRelations) {
  const summary = mapCaseSummary(caseItem);

  return {
    ...summary,
    processes: caseItem.case_processes.map((process) => ({
      id: process.id,
      process_id: process.process_id,
      processName: process.processes.name,
      workflow_step_id: process.workflow_step_id,
      status: process.status,
      assigned_to_id: process.assigned_to_id,
      assignedToName: process.assignedTo?.name ?? null,
      dependsOnCaseProcessIds: process.dependencies.map(
        (dependency) => dependency.depends_on_case_process_id,
      ),
      started_at: process.started_at,
      completed_at: process.completed_at,
      created_at: process.created_at,
      updated_at: process.updated_at,
    })),
  };
}

export function mapCaseSummary(caseItem: CaseSummaryWithRelations) {
  return {
    id: caseItem.id,
    dentalLabId: caseItem.lab_id,
    code: caseItem.code,
    patientName: caseItem.patient_name,
    customerId: caseItem.customer_id,
    customerName: caseItem.customers?.name ?? null,
    serviceTypeId: caseItem.service_type_id,
    serviceTypeName: caseItem.service_types?.name ?? null,
    dentistId: caseItem.dentist_id,
    dentistName: caseItem.dentists?.name ?? null,
    cadDesignerId: caseItem.cad_designer_id,
    cadDesignerName: caseItem.cadDesigner?.name ?? null,
    createdByUserId: caseItem.created_by_user_id,
    createdByUserName: caseItem.createdByUser?.name ?? null,
    currentStatus: caseItem.current_status,
    teeth: caseItem.teeth,
    elementsQty: caseItem.elements_qty,
    shade: caseItem.shade,
    dueDate: caseItem.due_date,
    isUrgent: caseItem.is_urgent,
    observations: caseItem.observations,
    pendingNote: caseItem.pending_note,
    createdAt: caseItem.created_at,
    updatedAt: caseItem.updated_at,
  };
}

export async function validateActiveCaseReferences(
  lab_id: string,
  input: CaseReferenceInput,
) {
  const errors: Record<string, string[]> = {};

  const [customer, dentist, serviceType, cadDesigner] = await Promise.all([
    input.customer_id
      ? prisma.customers.findFirst({
          where: {
            id: input.customer_id,
            lab_id,
            ...activeReferenceWhere,
          },
          select: { id: true },
        })
      : Promise.resolve(null),
    input.dentist_id
      ? prisma.dentists.findFirst({
          where: {
            id: input.dentist_id,
            lab_id,
            ...activeReferenceWhere,
          },
          select: { id: true, customer_id: true },
        })
      : Promise.resolve(null),
    input.service_type_id
      ? prisma.service_types.findFirst({
          where: {
            id: input.service_type_id,
            lab_id,
            ...activeReferenceWhere,
          },
          select: { id: true },
        })
      : Promise.resolve(null),
    input.cad_designer_id
      ? prisma.users.findFirst({
          where: {
            id: input.cad_designer_id,
            ...activeReferenceWhere,
            memberships: {
              some: {
                lab_id,
                role: UserRole.CAD_DESIGNER,
              },
            },
          },
          select: { id: true },
        })
      : Promise.resolve(null),
  ]);

  if (input.customer_id && !customer) {
    addReferenceError(errors, "customer_id", "customer is inactive, archived, or not in this lab.");
  }

  if (input.dentist_id && !dentist) {
    addReferenceError(errors, "dentist_id", "Dentist is inactive, archived, or not in this lab.");
  }

  if (!input.customer_id && input.dentist_id) {
    addReferenceError(errors, "dentist_id", "Select a customer before selecting a dentist.");
  }

  if (input.customer_id && dentist && dentist.customer_id !== input.customer_id) {
    addReferenceError(errors, "dentist_id", "Dentist does not belong to the selected customer.");
  }

  if (input.service_type_id && !serviceType) {
    addReferenceError(errors, "service_type_id", "Service type is inactive, archived, or not in this lab.");
  }

  if (input.cad_designer_id && !cadDesigner) {
    addReferenceError(errors, "cad_designer_id", "CAD designer is inactive, archived, or not assigned to this lab.");
  }

  if (Object.keys(errors).length > 0) {
    throw new InactiveReferenceError(errors);
  }
}
