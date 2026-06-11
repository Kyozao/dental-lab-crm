import { prisma } from "@/lib/prisma";

import { activeReferenceWhere, archiveData } from "../_shared/archive";
import { getSingleLabMembership } from "../_shared/membership";
import {
  activeStateData,
  mapReferenceDates,
  optionalString,
  ReferenceNotFoundError,
} from "../_shared/reference-resource";
import type { CustomerInput } from "./customers.schemas";

export async function listCustomersForLoggedLab(user_id: string) {
  const { lab_id } = await getSingleLabMembership(user_id);
  const customers = await prisma.customers.findMany({
    where: {
      lab_id,
      ...activeReferenceWhere,
    },
    include: {
      dentists: {
        where: {
          lab_id,
          ...activeReferenceWhere,
        },
        select: {
          id: true,
          name: true,
        },
        orderBy: { name: "asc" },
      },
    },
    orderBy: { name: "asc" },
  });

  return customers.map(mapReferenceDates);
}

export async function createCustomerForLoggedLab(
  user_id: string,
  payload: CustomerInput,
) {
  const { lab_id } = await getSingleLabMembership(user_id);

  const customer = await prisma.customers.create({
    data: {
      lab_id,
      name: payload.name!,
      phone: optionalString(payload.phone),
      email: optionalString(payload.email),
      notes: optionalString(payload.notes),
      ...activeStateData(payload),
    },
  });

  return mapReferenceDates(customer);
}

export async function updateCustomerForLoggedLab(
  user_id: string,
  customer_id: string,
  payload: CustomerInput,
) {
  const { lab_id } = await getSingleLabMembership(user_id);
  const existing = await prisma.customers.findFirst({
    where: { id: customer_id, lab_id },
    select: { id: true },
  });

  if (!existing) throw new ReferenceNotFoundError("customer");

  const customer = await prisma.customers.update({
    where: { id: customer_id },
    data: {
      name: optionalString(payload.name) ?? undefined,
      phone: optionalString(payload.phone),
      email: optionalString(payload.email),
      notes: optionalString(payload.notes),
      ...activeStateData(payload),
    },
  });

  return mapReferenceDates(customer);
}

export async function archiveCustomerForLoggedLab(user_id: string, customer_id: string) {
  const { lab_id } = await getSingleLabMembership(user_id);
  const existing = await prisma.customers.findFirst({
    where: {
      id: customer_id,
      lab_id,
      ...activeReferenceWhere,
    },
    select: { id: true },
  });

  if (!existing) throw new ReferenceNotFoundError("customer");

  const customer = await prisma.customers.update({
    where: { id: customer_id },
    data: archiveData(),
  });

  return mapReferenceDates(customer);
}
