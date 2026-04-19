import { apiError, apiSuccess } from "@/lib/api/response";
import { prisma } from "@/lib/prisma";
import {
  updateBlockTypeSchema,
  updateClinicSchema,
  updateComponentSchema,
  updateDentistSchema,
  updateMillingDrillSchema,
  updateServiceTypeSchema,
} from "@/lib/validators/registry";
import { requireAppUser, requireStaffUser } from "@/lib/api/auth";

type RegistryEntity =
  | "clinics"
  | "dentists"
  | "components"
  | "block-types"
  | "service-types"
  | "milling-drills";

type RouteContext = {
  params: Promise<{ entity: string; id: string }>;
};

function normalizeBoolish(value: unknown) {
  if (value === true) return "true";
  if (value === false) return "false";
  return value;
}

function isRegistryEntity(value: string): value is RegistryEntity {
  return [
    "clinics",
    "dentists",
    "components",
    "block-types",
    "service-types",
    "milling-drills",
  ].includes(value);
}

function normalizeUpdatePayload(
  entity: RegistryEntity,
  id: string,
  payload: Record<string, unknown>,
) {
  switch (entity) {
    case "clinics":
      return {
        id,
        name: payload.name,
        phone: payload.phone,
        email: payload.email,
        notes: payload.notes,
      };
    case "dentists":
      return {
        id,
        clinicId: payload.clinicId,
        name: payload.name,
        phone: payload.phone,
        email: payload.email,
        notes: payload.notes,
      };
    case "components":
      return {
        id,
        name: payload.name,
        category: payload.category,
        brand: payload.brand,
        defaultCost:
          payload.defaultCost === null ? undefined :
          payload.defaultCost === undefined ? undefined :
          String(payload.defaultCost),
        defaultPrice:
          payload.defaultPrice === null ? undefined :
          payload.defaultPrice === undefined ? undefined :
          String(payload.defaultPrice),
        isActive: normalizeBoolish(payload.isActive),
      };
    case "block-types":
      return {
        id,
        name: payload.name,
        material: payload.material,
        brand: payload.brand,
        size: payload.size,
        shade: payload.shade,
        defaultCost:
          payload.defaultCost === null ? undefined :
          payload.defaultCost === undefined ? undefined :
          String(payload.defaultCost),
        isActive: normalizeBoolish(payload.isActive),
      };
    case "service-types":
      return {
        id,
        name: payload.name,
        notes: payload.notes,
        isActive: normalizeBoolish(payload.isActive),
      };
    case "milling-drills":
      return {
        id,
        name: payload.name,
        type: payload.type,
        brand: payload.brand,
        serialNumber: payload.serialNumber,
        maxTeethRecommended:
          payload.maxTeethRecommended === null ? undefined :
          payload.maxTeethRecommended === undefined ? undefined :
          String(payload.maxTeethRecommended),
        notes: payload.notes,
        isActive: normalizeBoolish(payload.isActive),
      };
  }
}

export async function PATCH(request: Request, context: RouteContext) {
  const { appUser, errorResponse } = await requireAppUser();

  if (errorResponse || !appUser) {
    return errorResponse;
  }

  const staffError = requireStaffUser(appUser.role);

  if (staffError) {
    return staffError;
  }

  const { entity, id } = await context.params;

  if (!isRegistryEntity(entity)) {
    return apiError(404, "ENTITY_NOT_FOUND", "Registry entity not found.");
  }

  let payload: Record<string, unknown>;

  try {
    payload = (await request.json()) as Record<string, unknown>;
  } catch {
    return apiError(400, "INVALID_JSON", "Request body must be valid JSON.");
  }

  const normalized = normalizeUpdatePayload(entity, id, payload);

  if (entity === "clinics") {
    const parsed = updateClinicSchema.safeParse(normalized);

    if (!parsed.success) {
      return apiError(400, "VALIDATION_ERROR", "Invalid clinic payload.", {
        fields: parsed.error.flatten().fieldErrors,
      });
    }

    const updated = await prisma.clinic.update({
      where: { id: parsed.data.id },
      data: {
        name: parsed.data.name,
        phone: parsed.data.phone || null,
        email: parsed.data.email || null,
        notes: parsed.data.notes || null,
      },
    });

    return apiSuccess(updated);
  }

  if (entity === "dentists") {
    const parsed = updateDentistSchema.safeParse(normalized);

    if (!parsed.success) {
      return apiError(400, "VALIDATION_ERROR", "Invalid dentist payload.", {
        fields: parsed.error.flatten().fieldErrors,
      });
    }

    const updated = await prisma.dentist.update({
      where: { id: parsed.data.id },
      data: {
        clinicId: parsed.data.clinicId,
        name: parsed.data.name,
        phone: parsed.data.phone || null,
        email: parsed.data.email || null,
        notes: parsed.data.notes || null,
      },
    });

    return apiSuccess(updated);
  }

  if (entity === "components") {
    const parsed = updateComponentSchema.safeParse(normalized);

    if (!parsed.success) {
      return apiError(400, "VALIDATION_ERROR", "Invalid component payload.", {
        fields: parsed.error.flatten().fieldErrors,
      });
    }

    const updated = await prisma.component.update({
      where: { id: parsed.data.id },
      data: {
        name: parsed.data.name,
        category: parsed.data.category ?? null,
        brand: parsed.data.brand ?? null,
        defaultCost: parsed.data.defaultCost ?? null,
        defaultPrice: parsed.data.defaultPrice ?? null,
        isActive: parsed.data.isActive,
      },
    });

    return apiSuccess(updated);
  }

  if (entity === "block-types") {
    const parsed = updateBlockTypeSchema.safeParse(normalized);

    if (!parsed.success) {
      return apiError(400, "VALIDATION_ERROR", "Invalid block type payload.", {
        fields: parsed.error.flatten().fieldErrors,
      });
    }

    const updated = await prisma.blockType.update({
      where: { id: parsed.data.id },
      data: {
        name: parsed.data.name,
        material: parsed.data.material ?? null,
        brand: parsed.data.brand ?? null,
        size: parsed.data.size ?? null,
        shade: parsed.data.shade ?? null,
        defaultCost: parsed.data.defaultCost ?? null,
        isActive: parsed.data.isActive,
      },
    });

    return apiSuccess(updated);
  }

  if (entity === "service-types") {
    const parsed = updateServiceTypeSchema.safeParse(normalized);

    if (!parsed.success) {
      return apiError(400, "VALIDATION_ERROR", "Invalid service type payload.", {
        fields: parsed.error.flatten().fieldErrors,
      });
    }

    const updated = await prisma.serviceType.update({
      where: { id: parsed.data.id },
      data: {
        name: parsed.data.name,
        notes: parsed.data.notes ?? null,
        isActive: parsed.data.isActive,
      },
    });

    return apiSuccess(updated);
  }

  const parsed = updateMillingDrillSchema.safeParse(normalized);

  if (!parsed.success) {
    return apiError(400, "VALIDATION_ERROR", "Invalid milling drill payload.", {
      fields: parsed.error.flatten().fieldErrors,
    });
  }

  const updated = await prisma.millingDrill.update({
    where: { id: parsed.data.id },
    data: {
      name: parsed.data.name,
      type: parsed.data.type ?? null,
      brand: parsed.data.brand ?? null,
      serialNumber: parsed.data.serialNumber ?? null,
      maxTeethRecommended: parsed.data.maxTeethRecommended ?? null,
      notes: parsed.data.notes ?? null,
      isActive: parsed.data.isActive,
    },
  });

  return apiSuccess(updated);
}

export async function DELETE(_request: Request, context: RouteContext) {
  const { appUser, errorResponse } = await requireAppUser();

  if (errorResponse || !appUser) {
    return errorResponse;
  }

  const staffError = requireStaffUser(appUser.role);

  if (staffError) {
    return staffError;
  }

  const { entity, id } = await context.params;

  if (!isRegistryEntity(entity)) {
    return apiError(404, "ENTITY_NOT_FOUND", "Registry entity not found.");
  }

  try {
    if (entity === "clinics") {
      await prisma.clinic.delete({ where: { id } });
    } else if (entity === "dentists") {
      await prisma.dentist.delete({ where: { id } });
    } else if (entity === "components") {
      await prisma.component.delete({ where: { id } });
    } else if (entity === "block-types") {
      await prisma.blockType.delete({ where: { id } });
    } else if (entity === "service-types") {
      await prisma.serviceType.delete({ where: { id } });
    } else {
      await prisma.millingDrill.delete({ where: { id } });
    }
  } catch {
    return apiError(404, "ENTITY_NOT_FOUND", "Entity not found.");
  }

  return apiSuccess({ id, deleted: true });
}
