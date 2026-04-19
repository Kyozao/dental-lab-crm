import { apiError, apiSuccess } from "@/lib/api/response";
import { prisma } from "@/lib/prisma";
import {
  createBlockTypeSchema,
  createClinicSchema,
  createComponentSchema,
  createDentistSchema,
  createMillingDrillSchema,
  createServiceTypeSchema,
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
  params: Promise<{ entity: string }>;
};

function normalizeBoolish(value: unknown) {
  if (value === true) return "true";
  if (value === false) return "false";
  return value;
}

function normalizeEntityPayload(entity: RegistryEntity, payload: Record<string, unknown>) {
  switch (entity) {
    case "clinics":
      return {
        name: payload.name,
        phone: payload.phone,
        email: payload.email,
        notes: payload.notes,
      };
    case "dentists":
      return {
        clinicId: payload.clinicId,
        name: payload.name,
        phone: payload.phone,
        email: payload.email,
        notes: payload.notes,
      };
    case "components":
      return {
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
        name: payload.name,
        notes: payload.notes,
        isActive: normalizeBoolish(payload.isActive),
      };
    case "milling-drills":
      return {
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

export async function POST(request: Request, context: RouteContext) {
  const { appUser, errorResponse } = await requireAppUser();

  if (errorResponse || !appUser) {
    return errorResponse;
  }

  const staffError = requireStaffUser(appUser.role);

  if (staffError) {
    return staffError;
  }

  const { entity } = await context.params;

  if (!isRegistryEntity(entity)) {
    return apiError(404, "ENTITY_NOT_FOUND", "Registry entity not found.");
  }

  let payload: Record<string, unknown>;

  try {
    payload = (await request.json()) as Record<string, unknown>;
  } catch {
    return apiError(400, "INVALID_JSON", "Request body must be valid JSON.");
  }

  const normalized = normalizeEntityPayload(entity, payload);

  if (entity === "clinics") {
    const parsed = createClinicSchema.safeParse(normalized);

    if (!parsed.success) {
      return apiError(400, "VALIDATION_ERROR", "Invalid clinic payload.", {
        fields: parsed.error.flatten().fieldErrors,
      });
    }

    const created = await prisma.clinic.create({ data: parsed.data });
    return apiSuccess(created, { status: 201 });
  }

  if (entity === "dentists") {
    const parsed = createDentistSchema.safeParse(normalized);

    if (!parsed.success) {
      return apiError(400, "VALIDATION_ERROR", "Invalid dentist payload.", {
        fields: parsed.error.flatten().fieldErrors,
      });
    }

    const created = await prisma.dentist.create({ data: parsed.data });
    return apiSuccess(created, { status: 201 });
  }

  if (entity === "components") {
    const parsed = createComponentSchema.safeParse(normalized);

    if (!parsed.success) {
      return apiError(400, "VALIDATION_ERROR", "Invalid component payload.", {
        fields: parsed.error.flatten().fieldErrors,
      });
    }

    const created = await prisma.component.create({ data: parsed.data });
    return apiSuccess(created, { status: 201 });
  }

  if (entity === "block-types") {
    const parsed = createBlockTypeSchema.safeParse(normalized);

    if (!parsed.success) {
      return apiError(400, "VALIDATION_ERROR", "Invalid block type payload.", {
        fields: parsed.error.flatten().fieldErrors,
      });
    }

    const created = await prisma.blockType.create({ data: parsed.data });
    return apiSuccess(created, { status: 201 });
  }

  if (entity === "service-types") {
    const parsed = createServiceTypeSchema.safeParse(normalized);

    if (!parsed.success) {
      return apiError(400, "VALIDATION_ERROR", "Invalid service type payload.", {
        fields: parsed.error.flatten().fieldErrors,
      });
    }

    const created = await prisma.serviceType.create({ data: parsed.data });
    return apiSuccess(created, { status: 201 });
  }

  const parsed = createMillingDrillSchema.safeParse(normalized);

  if (!parsed.success) {
    return apiError(400, "VALIDATION_ERROR", "Invalid milling drill payload.", {
      fields: parsed.error.flatten().fieldErrors,
    });
  }

  const created = await prisma.millingDrill.create({ data: parsed.data });
  return apiSuccess(created, { status: 201 });
}
