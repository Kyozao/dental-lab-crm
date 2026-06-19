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
import { buildCustomerDashboard } from "./customers.dashboard";
import type { CustomerInput } from "./customers.schemas";

async function validateAssignedPriceTable(
  lab_id: string,
  price_table_id: string | null | undefined,
) {
  if (!price_table_id) return;

  const priceTable = await prisma.price_tables.findFirst({
    where: {
      id: price_table_id,
      lab_id,
      ...activeReferenceWhere,
    },
    select: { id: true },
  });

  if (!priceTable) {
    throw new ReferenceValidationError({
      price_table_id: ["Price table is inactive, archived, or not in this lab."],
    });
  }
}

function mapAssignedPriceTable(
  priceTable:
    | {
        id: string;
        name: string;
        price_table_service_prices?: Array<{
          service_type_id: string;
          price: { toString(): string };
        }>;
      }
    | null
    | undefined,
) {
  if (!priceTable) return null;

  return {
    id: priceTable.id,
    name: priceTable.name,
    service_prices:
      priceTable.price_table_service_prices?.map((row) => ({
        service_type_id: row.service_type_id,
        price: row.price.toString(),
      })) ?? [],
  };
}

export async function listCustomersForLoggedLab(user_id: string) {
  const membership = await getSingleLabMembership(user_id);
  assertCanAccessBackoffice(membership.role);
  const { lab_id } = membership;
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
      price_tables: {
        select: {
          id: true,
          name: true,
          price_table_service_prices: {
            select: {
              service_type_id: true,
              price: true,
            },
          },
        },
      },
    },
    orderBy: { name: "asc" },
  });

  return customers.map((customer) => ({
    ...mapReferenceDates(customer),
    price_table: mapAssignedPriceTable(customer.price_tables),
  }));
}

export async function getCustomerForLoggedLab(user_id: string, customer_id: string) {
  const membership = await getSingleLabMembership(user_id);
  assertCanAccessBackoffice(membership.role);
  const { lab_id } = membership;
  const customer = await prisma.customers.findFirst({
    where: {
      id: customer_id,
      lab_id,
    },
    select: {
      id: true,
      name: true,
      phone: true,
      email: true,
      notes: true,
      price_table_id: true,
      is_active: true,
      deleted_at: true,
      created_at: true,
      updated_at: true,
      labs: {
        select: {
          currency: true,
        },
      },
      dentists: {
        where: {
          lab_id,
          ...activeReferenceWhere,
        },
        select: {
          id: true,
          customer_id: true,
          name: true,
          phone: true,
          email: true,
          notes: true,
          is_active: true,
          created_at: true,
          updated_at: true,
        },
        orderBy: { name: "asc" },
      },
      price_tables: {
        select: {
          id: true,
          name: true,
        },
      },
      cases: {
        where: {
          lab_id,
          customer_id,
        },
        select: {
          id: true,
          code: true,
          patient_name: true,
          current_status: true,
          due_date: true,
          updated_at: true,
          case_price: true,
          case_services: {
            select: {
              service_name_snapshot: true,
              quantity: true,
              unit_price: true,
            },
          },
          service_types: {
            select: {
              name: true,
            },
          },
        },
      },
    },
  });

  if (!customer) throw new ReferenceNotFoundError("customer");

  const dashboard = buildCustomerDashboard(customer.cases, {
    dentistCount: customer.dentists.length,
    currency: customer.labs.currency,
  });

  return {
    id: customer.id,
    name: customer.name,
    phone: customer.phone,
    email: customer.email,
    notes: customer.notes,
    price_table_id: customer.price_table_id,
    price_table: customer.price_tables
      ? {
          id: customer.price_tables.id,
          name: customer.price_tables.name,
        }
      : null,
    is_active: customer.is_active,
    created_at: customer.created_at.toISOString(),
    updated_at: customer.updated_at.toISOString(),
    deleted_at: customer.deleted_at?.toISOString() ?? null,
    dentists: customer.dentists.map((dentist) => ({
      id: dentist.id,
      customer_id: dentist.customer_id,
      name: dentist.name,
      phone: dentist.phone,
      email: dentist.email,
      notes: dentist.notes,
      is_active: dentist.is_active,
      created_at: dentist.created_at.toISOString(),
      updated_at: dentist.updated_at.toISOString(),
    })),
    dashboard,
  };
}

export async function createCustomerForLoggedLab(
  user_id: string,
  payload: CustomerInput,
) {
  const membership = await getSingleLabMembership(user_id);
  assertCanAccessBackoffice(membership.role);
  const { lab_id } = membership;
  await validateAssignedPriceTable(lab_id, payload.price_table_id);

  const customer = await prisma.customers.create({
    data: {
      lab_id,
      name: payload.name!,
      phone: optionalString(payload.phone),
      email: optionalString(payload.email),
      notes: optionalString(payload.notes),
      price_table_id:
        payload.price_table_id === undefined ? undefined : payload.price_table_id,
      ...activeStateData(payload),
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
      price_tables: {
        select: {
          id: true,
          name: true,
          price_table_service_prices: {
            select: {
              service_type_id: true,
              price: true,
            },
          },
        },
      },
    },
  });

  return {
    ...mapReferenceDates(customer),
    price_table: mapAssignedPriceTable(customer.price_tables),
  };
}

export async function updateCustomerForLoggedLab(
  user_id: string,
  customer_id: string,
  payload: CustomerInput,
) {
  const membership = await getSingleLabMembership(user_id);
  assertCanAccessBackoffice(membership.role);
  const { lab_id } = membership;
  const existing = await prisma.customers.findFirst({
    where: { id: customer_id, lab_id },
    select: { id: true },
  });

  if (!existing) throw new ReferenceNotFoundError("customer");
  await validateAssignedPriceTable(lab_id, payload.price_table_id);

  const customer = await prisma.customers.update({
    where: { id: customer_id },
    data: {
      name: optionalString(payload.name) ?? undefined,
      phone: optionalString(payload.phone),
      email: optionalString(payload.email),
      notes: optionalString(payload.notes),
      price_table_id:
        payload.price_table_id === undefined ? undefined : payload.price_table_id,
      ...activeStateData(payload),
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
      price_tables: {
        select: {
          id: true,
          name: true,
          price_table_service_prices: {
            select: {
              service_type_id: true,
              price: true,
            },
          },
        },
      },
    },
  });

  return {
    ...mapReferenceDates(customer),
    price_table: mapAssignedPriceTable(customer.price_tables),
  };
}

export async function archiveCustomerForLoggedLab(user_id: string, customer_id: string) {
  const membership = await getSingleLabMembership(user_id);
  assertCanAccessBackoffice(membership.role);
  const { lab_id } = membership;
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
      price_tables: {
        select: {
          id: true,
          name: true,
          price_table_service_prices: {
            select: {
              service_type_id: true,
              price: true,
            },
          },
        },
      },
    },
  });

  return {
    ...mapReferenceDates(customer),
    price_table: mapAssignedPriceTable(customer.price_tables),
  };
}
