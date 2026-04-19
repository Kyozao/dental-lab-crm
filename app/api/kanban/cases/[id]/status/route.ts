import { getAuthenticatedAppUser } from "@/lib/auth/get-app-user";
import { apiError, apiSuccess } from "@/lib/api/response";
import { prisma } from "@/lib/prisma";
import { caseStatusEnum } from "@/lib/validators/case";

export async function PATCH(
  request: Request,
  context: { params: Promise<{ id: string }> },
) {
  const appUser = await getAuthenticatedAppUser();

  if (!appUser) {
    return apiError(401, "UNAUTHORIZED", "Not authenticated.");
  }

  const { id } = await context.params;

  let payload: Record<string, unknown>;

  try {
    payload = (await request.json()) as Record<string, unknown>;
  } catch {
    return apiError(400, "INVALID_JSON", "Request body must be valid JSON.");
  }

  const parsedStatus = caseStatusEnum.safeParse(
    payload.currentStatus ?? payload.status,
  );
  const note = typeof payload.note === "string" ? payload.note.trim() : "";

  if (!parsedStatus.success) {
    return apiError(400, "INVALID_STATUS", "Invalid case status.");
  }

  const existingCase = await prisma.case.findUnique({
    where: { id },
    select: {
      id: true,
      cadDesignerId: true,
      currentStatus: true,
      pendingNote: true,
    },
  });

  if (!existingCase) {
    return apiError(404, "CASE_NOT_FOUND", "Case not found.");
  }

  if (
    appUser.role === "CAD_DESIGNER" &&
    existingCase.cadDesignerId !== appUser.id
  ) {
    return apiError(403, "FORBIDDEN", "You cannot update this case.");
  }

  const nextStatus = parsedStatus.data;

  const updatedCase = await prisma.case.update({
    where: { id },
    data: {
      currentStatus: nextStatus,
      pendingNote: note || existingCase.pendingNote || null,
      ...(existingCase.currentStatus !== nextStatus
        ? {
            statusHistory: {
              create: {
                fromStatus: existingCase.currentStatus,
                toStatus: nextStatus,
                note: note || "Status updated via API",
              },
            },
          }
        : {}),
    },
    select: {
      id: true,
      currentStatus: true,
      pendingNote: true,
      updatedAt: true,
    },
  });

  return apiSuccess({
    ...updatedCase,
    updatedAt: updatedCase.updatedAt.toISOString(),
  });
}
