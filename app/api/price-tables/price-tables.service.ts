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
import type { PriceTableInput } from "./price-tables.schemas";

function mapPriceTableListItem<
  T extends {
    created_at: Date;
    updated_at: Date;
    deleted_at: Date | null;
    price_table_service_prices: Array<{ id: string }>;
    customers: Array<{ id: string }>;
  },
>(priceTable: T) {
  return {
    ...mapReferenceDates(priceTable),
    service_price_count: priceTable.price_table_service_prices.length,
    assigned_customer_count: priceTable.customers.length,
  };
}

function mapPriceTableDetail<
  T extends {
    created_at: Date;
    updated_at: Date;
    deleted_at: Date | null;
    price_table_service_prices: Array<{
      id: string;
      service_type_id: string;
      price: { toString(): string };
      service_types: {
        id: string;
        name: string;
        base_price: { toString(): string };
      };
    }>;
    customers: Array<{ id: string; name: string }>;
  },
>(priceTable: T) {
  return {
    ...mapReferenceDates(priceTable),
    service_prices: priceTable.price_table_service_prices.map((row) => ({
      id: row.id,
      service_type_id: row.service_type_id,
      price: row.price.toString(),
      service_type: {
        id: row.service_types.id,
        name: row.service_types.name,
        base_price: row.service_types.base_price.toString(),
      },
    })),
    assigned_customers: priceTable.customers,
  };
}

async function validatePriceTableName(
  lab_id: string,
  name: string,
  excludeId?: string,
) {
  const existing = await prisma.price_tables.findFirst({
    where: {
      lab_id,
      name,
      ...activeReferenceWhere,
      ...(excludeId ? { NOT: { id: excludeId } } : {}),
    },
    select: { id: true },
  });

  if (existing) {
    throw new ReferenceValidationError({
      name: ["An active price table with this name already exists."],
    });
  }
}

async function validateServicePrices(
  lab_id: string,
  service_prices: NonNullable<PriceTableInput["service_prices"]>,
) {
  if (service_prices.length === 0) return;

  const serviceTypeIds = [...new Set(service_prices.map((row) => row.service_type_id))];
  const serviceTypes = await prisma.service_types.findMany({
    where: {
      id: { in: serviceTypeIds },
      lab_id,
      ...activeReferenceWhere,
    },
    select: { id: true },
  });
  const activeIds = new Set(serviceTypes.map((row) => row.id));
  const fields: Record<string, string[]> = {};

  service_prices.forEach((row, index) => {
    if (!activeIds.has(row.service_type_id)) {
      fields[`service_prices.${index}.service_type_id`] = [
        "Service type is inactive, archived, or not in this lab.",
      ];
    }
  });

  if (Object.keys(fields).length > 0) {
    throw new ReferenceValidationError(fields);
  }
}

export async function listPriceTablesForLoggedLab(user_id: string) {
  const membership = await getSingleLabMembership(user_id);
  assertCanAccessBackoffice(membership.role);

  const priceTables = await prisma.price_tables.findMany({
    where: {
      lab_id: membership.lab_id,
      ...activeReferenceWhere,
    },
    include: {
      price_table_service_prices: {
        select: { id: true },
      },
      customers: {
        where: { ...activeReferenceWhere },
        select: { id: true },
      },
    },
    orderBy: { name: "asc" },
  });

  return priceTables.map(mapPriceTableListItem);
}

export async function getPriceTableForLoggedLab(user_id: string, price_table_id: string) {
  const membership = await getSingleLabMembership(user_id);
  assertCanAccessBackoffice(membership.role);

  const priceTable = await prisma.price_tables.findFirst({
    where: {
      id: price_table_id,
      lab_id: membership.lab_id,
      ...activeReferenceWhere,
    },
    include: {
      price_table_service_prices: {
        include: {
          service_types: {
            select: {
              id: true,
              name: true,
              base_price: true,
            },
          },
        },
        orderBy: {
          service_types: {
            name: "asc",
          },
        },
      },
      customers: {
        where: { ...activeReferenceWhere },
        select: {
          id: true,
          name: true,
        },
        orderBy: { name: "asc" },
      },
    },
  });

  if (!priceTable) throw new ReferenceNotFoundError("Price table");

  return mapPriceTableDetail(priceTable);
}

export async function createPriceTableForLoggedLab(
  user_id: string,
  payload: PriceTableInput,
) {
  const membership = await getSingleLabMembership(user_id);
  assertCanAccessBackoffice(membership.role);

  const creatingActive =
    payload.is_active === false || payload.is_active === "false" ? false : true;
  if (creatingActive) {
    await validatePriceTableName(membership.lab_id, payload.name!);
  }
  if (payload.service_prices) {
    await validateServicePrices(membership.lab_id, payload.service_prices);
  }

  const priceTable = await prisma.price_tables.create({
    data: {
      lab_id: membership.lab_id,
      name: payload.name!,
      ...activeStateData(payload),
      ...(payload.service_prices
        ? {
            price_table_service_prices: {
              create: payload.service_prices.map((row) => ({
                service_type_id: row.service_type_id,
                price: row.price,
              })),
            },
          }
        : {}),
    },
    include: {
      price_table_service_prices: {
        include: {
          service_types: {
            select: {
              id: true,
              name: true,
              base_price: true,
            },
          },
        },
        orderBy: {
          service_types: {
            name: "asc",
          },
        },
      },
      customers: {
        where: { ...activeReferenceWhere },
        select: { id: true, name: true },
      },
    },
  });

  return mapPriceTableDetail(priceTable);
}

export async function updatePriceTableForLoggedLab(
  user_id: string,
  price_table_id: string,
  payload: PriceTableInput,
) {
  const membership = await getSingleLabMembership(user_id);
  assertCanAccessBackoffice(membership.role);

  const existing = await prisma.price_tables.findFirst({
    where: {
      id: price_table_id,
      lab_id: membership.lab_id,
    },
    select: {
      id: true,
      name: true,
      is_active: true,
      deleted_at: true,
    },
  });

  if (!existing) throw new ReferenceNotFoundError("Price table");

  const nextName = optionalString(payload.name) ?? existing.name;
  const nextIsActive =
    payload.is_active === true ||
    payload.is_active === "true" ||
    payload.is_active === "on"
      ? true
      : payload.is_active === false || payload.is_active === "false"
        ? false
        : existing.is_active && existing.deleted_at === null;

  if (nextIsActive) {
    await validatePriceTableName(membership.lab_id, nextName, price_table_id);
  }

  if (payload.service_prices) {
    await validateServicePrices(membership.lab_id, payload.service_prices);
  }

  const updated = await prisma.$transaction(async (tx) => {
    await tx.price_tables.update({
      where: { id: price_table_id },
      data: {
        name: optionalString(payload.name) ?? undefined,
        ...activeStateData(payload),
      },
    });

    if (payload.service_prices) {
      await tx.price_table_service_prices.deleteMany({
        where: { price_table_id },
      });

      if (payload.service_prices.length > 0) {
        await tx.price_table_service_prices.createMany({
          data: payload.service_prices.map((row) => ({
            price_table_id,
            service_type_id: row.service_type_id,
            price: row.price,
          })),
        });
      }
    }

    return tx.price_tables.findUniqueOrThrow({
      where: { id: price_table_id },
      include: {
        price_table_service_prices: {
          include: {
            service_types: {
              select: {
                id: true,
                name: true,
                base_price: true,
              },
            },
          },
          orderBy: {
            service_types: {
              name: "asc",
            },
          },
        },
        customers: {
          where: { ...activeReferenceWhere },
          select: { id: true, name: true },
          orderBy: { name: "asc" },
        },
      },
    });
  });

  return mapPriceTableDetail(updated);
}

export async function archivePriceTableForLoggedLab(user_id: string, price_table_id: string) {
  const membership = await getSingleLabMembership(user_id);
  assertCanAccessBackoffice(membership.role);

  const existing = await prisma.price_tables.findFirst({
    where: {
      id: price_table_id,
      lab_id: membership.lab_id,
      ...activeReferenceWhere,
    },
    select: { id: true },
  });

  if (!existing) throw new ReferenceNotFoundError("Price table");

  const archived = await prisma.$transaction(async (tx) => {
    await tx.customers.updateMany({
      where: {
        lab_id: membership.lab_id,
        price_table_id,
      },
      data: {
        price_table_id: null,
      },
    });

    return tx.price_tables.update({
      where: { id: price_table_id },
      data: archiveData(),
      include: {
        price_table_service_prices: {
          include: {
            service_types: {
              select: {
                id: true,
                name: true,
                base_price: true,
              },
            },
          },
        },
        customers: {
          where: { ...activeReferenceWhere },
          select: { id: true, name: true },
        },
      },
    });
  });

  return mapPriceTableDetail(archived);
}
