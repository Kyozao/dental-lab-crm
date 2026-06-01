import { getAuthenticatedAppUser } from "@/lib/auth/get-app-user";
import { apiError, apiSuccess } from "@/lib/api/response";
import { prisma } from "@/lib/prisma";
import {
  caseComponentsPayloadSchema,
  createCaseSchema,
} from "@/lib/validators/case";

const VALID_CASE_STATUSES = [
  "ENTRY",
  "WAITING_INFO",
  "DESIGNING",
  "WAITING_APPROVAL",
  "DESIGN_READY",
  "MILLING_PRINTING",
  "DONE",
] as const;

function normalizeCasePayload(payload: Record<string, unknown>) {
  return {
    code: payload.code,
    patientName: payload.patientName,
    clinicId: payload.clinicId,
    serviceTypeId: payload.serviceTypeId ?? undefined,
    dentistId: payload.dentistId ?? undefined,
    cadDesignerId: payload.cadDesignerId ?? undefined,
    currentStatus: payload.currentStatus ?? "ENTRY",
    pendingNote: payload.pendingNote ?? undefined,
    observations: payload.observations ?? undefined,
    teeth: payload.teeth ?? undefined,
    elementsQty: payload.elementsQty ?? undefined,
    shade: payload.shade ?? undefined,
    dueDate: payload.dueDate ?? undefined,
    isUrgent:
      payload.isUrgent === true
        ? "true"
        : payload.isUrgent === false
          ? "false"
          : payload.isUrgent,
  };
}

export async function GET(request: Request) {
  const appUser = await getAuthenticatedAppUser();

  if (!appUser) {
    return apiError(401, "UNAUTHORIZED", "Not authenticated.");
  }

  const { searchParams } = new URL(request.url);
  const statusParam = searchParams.get("status");
  const search = searchParams.get("search")?.trim() ?? "";
  const page = Math.max(Number(searchParams.get("page") ?? 1), 1);
  const pageSize = Math.min(
    Math.max(Number(searchParams.get("pageSize") ?? 20), 1),
    100,
  );

  if (
    statusParam &&
    !VALID_CASE_STATUSES.includes(
      statusParam as (typeof VALID_CASE_STATUSES)[number],
    )
  ) {
    return apiError(400, "INVALID_STATUS", "Invalid case status filter.");
  }


  const statusFilter = statusParam
    ? (statusParam as (typeof VALID_CASE_STATUSES)[number])
    : undefined;

  const where: NonNullable<
    Parameters<typeof prisma.case.findMany>[0]
  >["where"] = {
    ...(appUser.role === "CAD_DESIGNER" ? { cadDesignerId: appUser.id } : {}),
    ...(statusFilter ? { currentStatus: statusFilter } : {}),
    ...(search
      ? {
          OR: [
            { code: { contains: search, mode: "insensitive" as const } },
            { patientName: { contains: search, mode: "insensitive" as const } },
            {
              clinic: {
                is: {
                  name: {
                    contains: search,
                    mode: "insensitive" as const,
                  },
                },
              },
            },
          ],
        }
      : {}),
  };

  const [total, cases] = await Promise.all([
    prisma.case.count({ where }),
    prisma.case.findMany({
      where,
      orderBy: [{ isUrgent: "desc" }, { updatedAt: "desc" }],
      skip: (page - 1) * pageSize,
      take: pageSize,
      select: {
        id: true,
        code: true,
        patientName: true,
        caseScope: true,
        currentStatus: true,
        dueDate: true,
        isUrgent: true,
        createdAt: true,
        updatedAt: true,
        clinic: {
          select: {
            name: true,
          },
        },
        serviceType: {
          select: {
            name: true,
          },
        },
        cadDesigner: {
          select: {
            name: true,
          },
        },
      },
    }),
  ]);

  return apiSuccess(
    cases.map((caseItem) => ({
      id: caseItem.id,
      code: caseItem.code,
      patientName: caseItem.patientName,
      clinicName: caseItem.clinic?.name ?? null,
      serviceTypeName: caseItem.serviceType?.name ?? null,
      cadDesignerName: caseItem.cadDesigner?.name ?? null,
      currentStatus: caseItem.currentStatus,
      dueDate: caseItem.dueDate?.toISOString() ?? null,
      isUrgent: caseItem.isUrgent,
      createdAt: caseItem.createdAt.toISOString(),
      updatedAt: caseItem.updatedAt.toISOString(),
    })),
    {
      meta: {
        page,
        pageSize,
        total,
      },
    },
  );
}

export async function POST(request: Request) {
  const appUser = await getAuthenticatedAppUser();

  if (!appUser) {
    return apiError(401, "UNAUTHORIZED", "Not authenticated.");
  }

  let payload: Record<string, unknown>;

  try {
    payload = (await request.json()) as Record<string, unknown>;
  } catch {
    return apiError(400, "INVALID_JSON", "Request body must be valid JSON.");
  }

  const parsed = createCaseSchema.safeParse(normalizeCasePayload(payload));
  const parsedComponents = caseComponentsPayloadSchema.safeParse(
    payload.components ?? [],
  );

  if (!parsed.success || !parsedComponents.success) {
    return apiError(400, "VALIDATION_ERROR", "Invalid case payload.", {
      fields: {
        ...(!parsed.success ? parsed.error.flatten().fieldErrors : {}),
        ...(!parsedComponents.success
          ? { components: ["Invalid component data."] }
          : {}),
      },
    });
  }

  const components = parsedComponents.data;
  const data = parsed.data;

  if (components.length) {
    const uniqueIds = [...new Set(components.map((item) => item.componentId))];
    const existingCount = await prisma.component.count({
      where: {
        id: {
          in: uniqueIds,
        },
      },
    });

    if (existingCount !== uniqueIds.length) {
      return apiError(400, "INVALID_COMPONENTS", "One or more components are invalid.");
    }
  }

  try {
    const createdCase = await prisma.case.create({
      data: {
        code: data.code,
        patientName: data.patientName,
        clinicId: data.clinicId,
        serviceTypeId: data.serviceTypeId || null,
        dentistId: data.dentistId || null,
        cadDesignerId: data.cadDesignerId || null,
        createdByUserId: appUser.id,
        currentStatus: data.currentStatus,
        pendingNote: data.pendingNote || null,
        observations: data.observations || null,
        teeth: data.teeth || null,
        elementsQty: data.elementsQty ?? null,
        shade: data.shade || null,
        dueDate: data.dueDate ? new Date(data.dueDate) : null,
        isUrgent: data.isUrgent,
        statusHistory: {
          create: {
            toStatus: data.currentStatus,
            note: "Case created via API",
          },
        },
        caseComponentUsages: components.length
          ? {
              create: components.map((component) => ({
                componentId: component.componentId,
                quantity: component.quantity,
                chargeClient: component.chargeClient,
                unitCost: component.unitCost ?? null,
                unitPrice: component.unitPrice ?? null,
                notes: component.notes || null,
              })),
            }
          : undefined,
      },
      select: {
        id: true,
        code: true,
        currentStatus: true,
        createdAt: true,
        updatedAt: true,
      },
    });

    return apiSuccess(
      {
        ...createdCase,
        createdAt: createdCase.createdAt.toISOString(),
        updatedAt: createdCase.updatedAt.toISOString(),
      },
      { status: 201 },
    );
  } catch (error) {
    return apiError(
      500,
      "CASE_CREATE_FAILED",
      error instanceof Error ? error.message : "Failed to create case.",
    );
  }
}
