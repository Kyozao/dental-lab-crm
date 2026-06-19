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
import type { DentistInput, DentistListQuery } from "./dentists.schemas";

async function assertCustomerBelongsToLab(lab_id: string, customer_id: string) {
  const customer = await prisma.customers.findFirst({
    where: {
      id: customer_id,
      lab_id,
      ...activeReferenceWhere,
    },
    select: {
      id: true,
    },
  });

  if (!customer) {
    throw new ReferenceValidationError({
      customer_id: ["Customer is inactive, archived, or not in this lab."],
    });
  }
}

export async function listDentistsForLoggedLab(
  user_id: string,
  filters: DentistListQuery,
) {
  const membership = await getSingleLabMembership(user_id);
  assertCanAccessBackoffice(membership.role);
  const { lab_id } = membership;

  if (filters.customer_id) {
    await assertCustomerBelongsToLab(lab_id, filters.customer_id);
  }

  const dentists = await prisma.dentists.findMany({
    where: {
      lab_id,
      ...activeReferenceWhere,
      ...(filters.customer_id ? { customer_id: filters.customer_id } : {}),
    },
    orderBy: { name: "asc" },
  });

  return dentists.map(mapReferenceDates);
}

export async function createDentistForLoggedLab(
  user_id: string,
  payload: DentistInput,
) {
  const membership = await getSingleLabMembership(user_id);
  assertCanAccessBackoffice(membership.role);
  const { lab_id } = membership;
  const customer_id = optionalString(payload.customer_id);

  if (!customer_id) {
    throw new ReferenceValidationError({
      customer_id: ["Customer is required."],
    });
  }

  await assertCustomerBelongsToLab(lab_id, customer_id);

  const dentist = await prisma.dentists.create({
    data: {
      lab_id,
      customer_id,
      name: payload.name!,
      phone: optionalString(payload.phone),
      email: optionalString(payload.email),
      notes: optionalString(payload.notes),
      ...activeStateData(payload),
    },
  });

  return mapReferenceDates(dentist);
}

export async function updateDentistForLoggedLab(
  user_id: string,
  dentist_id: string,
  payload: DentistInput,
) {
  const membership = await getSingleLabMembership(user_id);
  assertCanAccessBackoffice(membership.role);
  const { lab_id } = membership;
  const existing = await prisma.dentists.findFirst({
    where: {
      id: dentist_id,
      lab_id,
    },
    select: {
      id: true,
    },
  });

  if (!existing) throw new ReferenceNotFoundError("dentist");

  const dentist = await prisma.dentists.update({
    where: {
      id: dentist_id,
    },
    data: {
      name: optionalString(payload.name) ?? undefined,
      phone: optionalString(payload.phone),
      email: optionalString(payload.email),
      notes: optionalString(payload.notes),
      ...activeStateData(payload),
    },
  });

  return mapReferenceDates(dentist);
}

export async function archiveDentistForLoggedLab(user_id: string, dentist_id: string) {
  const membership = await getSingleLabMembership(user_id);
  assertCanAccessBackoffice(membership.role);
  const { lab_id } = membership;
  const existing = await prisma.dentists.findFirst({
    where: {
      id: dentist_id,
      lab_id,
      ...activeReferenceWhere,
    },
    select: {
      id: true,
    },
  });

  if (!existing) throw new ReferenceNotFoundError("dentist");

  const dentist = await prisma.dentists.update({
    where: {
      id: dentist_id,
    },
    data: archiveData(),
  });

  return mapReferenceDates(dentist);
}
