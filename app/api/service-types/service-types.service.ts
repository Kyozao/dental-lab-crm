import { prisma } from "@/lib/prisma";

import { activeReferenceWhere, archiveData } from "../_shared/archive";
import { assertCanAccessBackoffice } from "../_shared/authorization";
import { getSingleLabMembership } from "../_shared/membership";
import {
  activeStateData,
  mapReferenceDates,
  optionalString,
  ReferenceNotFoundError,
  ReferenceValidationError,
} from "../_shared/reference-resource";
import {
  emptyWorkflow,
  type ServiceTypeInput,
  type ServiceTypeWorkflow,
} from "./service-types.schemas";

function mapServiceType<
  T extends {
    created_at: Date;
    updated_at: Date;
    deleted_at: Date | null;
    base_price: { toString(): string };
    labs?: { currency: string } | null;
  },
>(serviceType: T) {
  return {
    ...mapReferenceDates(serviceType),
    base_price: serviceType.base_price.toString(),
    currency: serviceType.labs?.currency ?? "BRL",
  };
}

async function validateWorkflowProcesses(
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
    throw new ReferenceValidationError(
      Object.fromEntries(
        invalidEntries.map(({ index }) => [
          `workflow_json.steps.${index}.process_id`,
          ["Process is inactive, archived, or not in this lab."],
        ]),
      ),
    );
  }
}

export async function listServiceTypesForLoggedLab(user_id: string) {
  const membership = await getSingleLabMembership(user_id);
  assertCanAccessBackoffice(membership.role);
  const { lab_id } = membership;
  const serviceTypes = await prisma.service_types.findMany({
    where: {
      lab_id,
      ...activeReferenceWhere,
    },
    include: {
      labs: {
        select: {
          currency: true,
        },
      },
    },
    orderBy: { name: "asc" },
  });

  return {
    items: serviceTypes.map(mapServiceType),
    currency: serviceTypes[0]?.labs?.currency ?? (
      await prisma.labs.findUniqueOrThrow({
        where: { id: lab_id },
        select: { currency: true },
      })
    ).currency,
  };
}

export async function getServiceTypeForLoggedLab(
  user_id: string,
  service_type_id: string,
) {
  const membership = await getSingleLabMembership(user_id);
  assertCanAccessBackoffice(membership.role);
  const { lab_id } = membership;
  const serviceType = await prisma.service_types.findFirst({
    where: {
      id: service_type_id,
      lab_id,
      ...activeReferenceWhere,
    },
    include: {
      labs: {
        select: {
          currency: true,
        },
      },
    },
  });

  if (!serviceType) throw new ReferenceNotFoundError("Service type");

  return mapServiceType(serviceType);
}

export async function createServiceTypeForLoggedLab(
  user_id: string,
  payload: ServiceTypeInput,
) {
  const membership = await getSingleLabMembership(user_id);
  assertCanAccessBackoffice(membership.role);
  const { lab_id } = membership;
  const workflow_json = payload.workflow_json ?? emptyWorkflow;
  await validateWorkflowProcesses(lab_id, workflow_json);

  const serviceType = await prisma.service_types.create({
    data: {
      lab_id,
      name: payload.name!,
      base_price: payload.base_price!,
      notes: optionalString(payload.notes),
      workflow_json,
      ...activeStateData(payload),
    },
    include: {
      labs: {
        select: {
          currency: true,
        },
      },
    },
  });

  return mapServiceType(serviceType);
}

export async function updateServiceTypeForLoggedLab(
  user_id: string,
  service_type_id: string,
  payload: ServiceTypeInput,
) {
  const membership = await getSingleLabMembership(user_id);
  assertCanAccessBackoffice(membership.role);
  const { lab_id } = membership;
  const existing = await prisma.service_types.findFirst({
    where: { id: service_type_id, lab_id },
    select: { id: true },
  });

  if (!existing) throw new ReferenceNotFoundError("Service type");

  if (payload.workflow_json) {
    await validateWorkflowProcesses(lab_id, payload.workflow_json);
  }

  const serviceType = await prisma.service_types.update({
    where: { id: service_type_id },
    data: {
      name: optionalString(payload.name) ?? undefined,
      base_price: payload.base_price ?? undefined,
      notes: optionalString(payload.notes),
      workflow_json: payload.workflow_json,
      ...activeStateData(payload),
    },
    include: {
      labs: {
        select: {
          currency: true,
        },
      },
    },
  });

  return mapServiceType(serviceType);
}

export async function archiveServiceTypeForLoggedLab(
  user_id: string,
  service_type_id: string,
) {
  const membership = await getSingleLabMembership(user_id);
  assertCanAccessBackoffice(membership.role);
  const { lab_id } = membership;
  const existing = await prisma.service_types.findFirst({
    where: {
      id: service_type_id,
      lab_id,
      ...activeReferenceWhere,
    },
    select: { id: true },
  });

  if (!existing) throw new ReferenceNotFoundError("Service type");

  const serviceType = await prisma.service_types.update({
    where: { id: service_type_id },
    data: archiveData(),
    include: {
      labs: {
        select: {
          currency: true,
        },
      },
    },
  });

  return mapServiceType(serviceType);
}
