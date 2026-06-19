import { Prisma } from "@/generated/prisma/client";
import { prisma } from "@/lib/prisma";
import {
  buildCasePatientDetail,
  resolveCasePriority,
  selectCurrentCaseProcess,
} from "./cases.list-utils";

import { activeReferenceWhere } from "../_shared/archive";
import type { CreateCaseInput } from "./cases.schemas";

export const CREATE_CASE_MAX_RETRIES = 3;

const caseProcessSelect = {
  id: true,
  case_service_id: true,
  process_id: true,
  workflow_step_id: true,
  status: true,
  assigned_lab_member_id: true,
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
  assignedLabMember: {
    select: {
      id: true,
      users: {
        select: {
          name: true,
        },
      },
    },
  },
  dependencies: {
    select: {
      depends_on_case_process_id: true,
    },
  },
} as const;

export const caseInclude = {
  labs: {
    select: {
      currency: true,
    },
  },
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
      base_price: true,
    },
  },
  case_services: {
    select: {
      id: true,
      service_type_id: true,
      service_name_snapshot: true,
      service_base_price_snapshot: true,
      unit_price: true,
      is_unit_price_overridden: true,
      quantity: true,
      created_at: true,
      updated_at: true,
      service_types: {
        select: {
          id: true,
          name: true,
        },
      },
      case_processes: {
        select: caseProcessSelect,
        orderBy: { created_at: "asc" },
      },
    },
    orderBy: { created_at: "asc" },
  },
  createdByUser: {
    select: {
      id: true,
      name: true,
    },
  },
  case_comments: {
    select: {
      id: true,
      case_id: true,
      author_user_id: true,
      author_lab_member_id: true,
      body: true,
      created_at: true,
      authorUser: {
        select: {
          name: true,
          email: true,
        },
      },
      authorLabMember: {
        select: {
          role: true,
        },
      },
    },
    where: { deleted_at: null },
    orderBy: { created_at: "asc" },
  },
  statusHistory: {
    select: {
      id: true,
      from_status: true,
      to_status: true,
      note: true,
      changed_at: true,
    },
    orderBy: { changed_at: "desc" },
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
  created_by_user_id: true,
  current_status: true,
  service_base_price_snapshot: true,
  case_price: true,
  is_price_overridden: true,
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
      base_price: true,
    },
  },
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
          status: true,
          processes: {
            select: {
              name: true,
            },
          },
          assignedLabMember: {
            select: {
              id: true,
              users: {
                select: {
                  name: true,
                },
              },
            },
          },
        },
        orderBy: { created_at: "asc" },
      },
    },
    orderBy: { created_at: "asc" },
  },
  labs: {
    select: {
      currency: true,
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
  "customer_id" | "dentist_id"
> & {
  service_lines?: CreateCaseInput["service_lines"];
};

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

function mapCaseProcess(
  process: CaseWithRelations["case_services"][number]["case_processes"][number],
) {
  return {
    id: process.id,
    case_service_id: process.case_service_id,
    process_id: process.process_id,
    processName: process.processes.name,
    workflow_step_id: process.workflow_step_id,
    status: process.status,
    assigned_lab_member_id: process.assigned_lab_member_id,
    assignedToName: process.assignedLabMember?.users.name ?? null,
    dependsOnCaseProcessIds: process.dependencies.map(
      (dependency) => dependency.depends_on_case_process_id,
    ),
    started_at: process.started_at,
    completed_at: process.completed_at,
    created_at: process.created_at,
    updated_at: process.updated_at,
  };
}

function getPrimaryServiceLine(
  caseItem:
    | CaseWithRelations
    | CaseSummaryWithRelations,
) {
  return caseItem.case_services[0] ?? null;
}

function getPrimaryServiceSummary(
  caseItem:
    | CaseWithRelations
    | CaseSummaryWithRelations,
) {
  const primaryLine = getPrimaryServiceLine(caseItem);

  if (primaryLine) {
    return {
      serviceTypeId: primaryLine.service_type_id,
      serviceTypeName: primaryLine.service_name_snapshot,
      serviceBasePriceSnapshot:
        primaryLine.service_base_price_snapshot.toString(),
      casePrice: primaryLine.unit_price
        .mul(primaryLine.quantity)
        .toString(),
      isPriceOverridden: primaryLine.is_unit_price_overridden,
    };
  }

  return {
    serviceTypeId: caseItem.service_type_id,
    serviceTypeName: caseItem.service_types?.name ?? null,
    serviceBasePriceSnapshot:
      caseItem.service_base_price_snapshot?.toString() ?? null,
    casePrice: caseItem.case_price?.toString() ?? null,
    isPriceOverridden: caseItem.is_price_overridden,
  };
}

export function mapCase(caseItem: CaseWithRelations) {
  const summary = mapCaseSummary(caseItem);

  return {
    ...summary,
    comments: caseItem.case_comments.map((comment) => ({
      id: comment.id,
      caseId: comment.case_id,
      authorUserId: comment.author_user_id,
      authorLabMemberId: comment.author_lab_member_id,
      authorName: comment.authorUser.name || comment.authorUser.email,
      authorRole: comment.authorLabMember.role,
      body: comment.body,
      createdAt: comment.created_at,
      deletedAt: null,
      deletedByUserId: null,
      canDelete: false,
    })),
    statusHistory: caseItem.statusHistory.map((historyItem) => ({
      id: historyItem.id,
      fromStatus: historyItem.from_status,
      toStatus: historyItem.to_status,
      note: historyItem.note,
      changedAt: historyItem.changed_at,
    })),
    serviceLines: caseItem.case_services.map((serviceLine) => ({
      id: serviceLine.id,
      serviceTypeId: serviceLine.service_type_id,
      serviceTypeName: serviceLine.service_name_snapshot,
      serviceBasePriceSnapshot:
        serviceLine.service_base_price_snapshot.toString(),
      unitPrice: serviceLine.unit_price.toString(),
      isUnitPriceOverridden: serviceLine.is_unit_price_overridden,
      quantity: serviceLine.quantity,
      lineTotal: serviceLine.unit_price.mul(serviceLine.quantity).toString(),
      processes: serviceLine.case_processes.map(mapCaseProcess),
      createdAt: serviceLine.created_at,
      updatedAt: serviceLine.updated_at,
    })),
    processes: caseItem.case_services.flatMap((serviceLine) =>
      serviceLine.case_processes.map(mapCaseProcess),
    ),
  };
}

export function mapCaseSummary(caseItem: CaseSummaryWithRelations) {
  const primary = getPrimaryServiceSummary(caseItem);
  const currentProcess = selectCurrentCaseProcess(caseItem);

  return {
    id: caseItem.id,
    dentalLabId: caseItem.lab_id,
    code: caseItem.code,
    patientName: caseItem.patient_name,
    customerId: caseItem.customer_id,
    customerName: caseItem.customers?.name ?? null,
    serviceTypeId: primary.serviceTypeId,
    serviceTypeName: primary.serviceTypeName,
    serviceLineCount: caseItem.case_services.length,
    dentistId: caseItem.dentist_id,
    dentistName: caseItem.dentists?.name ?? null,
    createdByUserId: caseItem.created_by_user_id,
    createdByUserName: caseItem.createdByUser?.name ?? null,
    currentStatus: caseItem.current_status,
    serviceBasePriceSnapshot: primary.serviceBasePriceSnapshot,
    casePrice: primary.casePrice,
    isPriceOverridden: primary.isPriceOverridden,
    serviceLabel: currentProcess?.serviceLabel ?? primary.serviceTypeName,
    labCurrency: caseItem.labs.currency,
    teeth: caseItem.teeth,
    elementsQty: caseItem.elements_qty,
    shade: caseItem.shade,
    patientDetail: buildCasePatientDetail(caseItem),
    dueDate: caseItem.due_date,
    isUrgent: caseItem.is_urgent,
    priority: resolveCasePriority(caseItem.is_urgent, caseItem.due_date),
    observations: caseItem.observations,
    pendingNote: caseItem.pending_note,
    currentCaseProcessId: currentProcess?.caseProcessId ?? null,
    currentProcessId: currentProcess?.processId ?? null,
    currentWorkflowStepId: currentProcess?.workflowStepId ?? null,
    currentProcessName: currentProcess?.processName ?? null,
    currentProcessStatus: currentProcess?.status ?? null,
    currentProcessAssigneeId: currentProcess?.assignedLabMemberId ?? null,
    currentProcessAssigneeName: currentProcess?.assignedLabMemberName ?? null,
    progressPercent: currentProcess?.progressPercent ?? 0,
    completedSteps: currentProcess?.completedSteps ?? 0,
    totalSteps: currentProcess?.totalSteps ?? 0,
    createdAt: caseItem.created_at,
    updatedAt: caseItem.updated_at,
  };
}

export async function validateActiveCaseReferences(
  lab_id: string,
  input: CaseReferenceInput,
) {
  const errors: Record<string, string[]> = {};
  const serviceTypeIds = input.service_lines
    ? [
        ...new Set(
          input.service_lines.map((serviceLine) => serviceLine.service_type_id),
        ),
      ]
    : [];

  const [customer, dentist, serviceTypes] = await Promise.all([
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
    serviceTypeIds.length > 0
      ? prisma.service_types.findMany({
          where: {
            id: { in: serviceTypeIds },
            lab_id,
            ...activeReferenceWhere,
          },
          select: { id: true },
        })
      : Promise.resolve([]),
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

  const activeServiceTypeIds = new Set(serviceTypes.map((serviceType) => serviceType.id));
  input.service_lines?.forEach((serviceLine, index) => {
    if (!activeServiceTypeIds.has(serviceLine.service_type_id)) {
      addReferenceError(
        errors,
        `service_lines.${index}.service_type_id`,
        "Service type is inactive, archived, or not in this lab.",
      );
    }
  });

  if (Object.keys(errors).length > 0) {
    throw new InactiveReferenceError(errors);
  }
}
