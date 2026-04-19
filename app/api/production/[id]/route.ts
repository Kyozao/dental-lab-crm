import { apiError, apiSuccess } from "@/lib/api/response";
import { prisma } from "@/lib/prisma";
import { createMillingSchema } from "@/lib/validators/production";
import { requireAppUser, requireStaffUser } from "@/lib/api/auth";

type RouteContext = {
  params: Promise<{ id: string }>;
};

export async function PATCH(request: Request, context: RouteContext) {
  const { appUser, errorResponse } = await requireAppUser();

  if (errorResponse || !appUser) {
    return errorResponse;
  }

  const staffError = requireStaffUser(appUser.role);

  if (staffError) {
    return staffError;
  }

  const { id } = await context.params;

  let payload: unknown;

  try {
    payload = await request.json();
  } catch {
    return apiError(400, "INVALID_JSON", "Request body must be valid JSON.");
  }

  const parsed = createMillingSchema.safeParse(payload);

  if (!parsed.success) {
    return apiError(400, "VALIDATION_ERROR", "Invalid milling payload.", {
      fields: parsed.error.flatten().fieldErrors,
    });
  }

  try {
    const milling = await prisma.caseMilling.update({
      where: { id },
      data: {
        blockTypeId: parsed.data.blockTypeId,
        millingDrillId: parsed.data.millingDrillId,
        fineMillingDrillId:
          parsed.data.fineMillingDrillId ?? parsed.data.millingDrillId ?? null,
        coarseMillingDrillId: parsed.data.coarseMillingDrillId ?? null,
        teethMilledQty: parsed.data.teethMilledQty,
        status: parsed.data.status,
        failureReason: parsed.data.failureReason,
        notes: parsed.data.notes,
        milledAt: new Date(parsed.data.milledAt),
      },
      include: {
        case: { select: { id: true, code: true } },
        blockType: { select: { id: true, name: true } },
        millingDrill: { select: { id: true, name: true } },
        fineMillingDrill: { select: { id: true, name: true, type: true } },
        coarseMillingDrill: { select: { id: true, name: true, type: true } },
      },
    });

    return apiSuccess(milling);
  } catch {
    return apiError(404, "MILLING_NOT_FOUND", "Milling record not found.");
  }
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

  const { id } = await context.params;

  try {
    await prisma.caseMilling.delete({ where: { id } });
  } catch {
    return apiError(404, "MILLING_NOT_FOUND", "Milling record not found.");
  }

  return apiSuccess({ id, deleted: true });
}
