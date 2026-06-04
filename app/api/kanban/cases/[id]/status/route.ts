import { apiError, apiSuccess } from "@/lib/api/response";
import { updateCase } from "@/lib/mock-data/store";

export async function PATCH(
  request: Request,
  context: { params: Promise<{ id: string }> },
) {
  const { id } = await context.params;

  try {
    const payload = (await request.json()) as Record<string, unknown>;
    const status = payload.currentStatus ?? payload.status;

    if (typeof status !== "string") {
      return apiError(400, "INVALID_STATUS", "Invalid case status.");
    }

    const item = updateCase(id, { currentStatus: status, note: payload.note });

    if (!item) {
      return apiError(404, "CASE_NOT_FOUND", "Case not found.");
    }

    return apiSuccess({
      id: item.id,
      currentStatus: item.currentStatus,
      pendingNote: item.pendingNote,
      updatedAt: item.updatedAt,
    });
  } catch {
    return apiError(400, "INVALID_JSON", "Request body must be valid JSON.");
  }
}
