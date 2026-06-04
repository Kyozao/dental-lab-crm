import { apiError, apiSuccess } from "@/lib/api/response";
import { deleteMilling, updateMilling } from "@/lib/mock-data/store";

export async function PATCH(
  request: Request,
  context: { params: Promise<{ id: string }> },
) {
  const { id } = await context.params;

  try {
    const payload = (await request.json()) as Record<string, unknown>;
    const item = updateMilling(id, payload);

    if (!item) {
      return apiError(404, "MILLING_NOT_FOUND", "Milling record not found.");
    }

    return apiSuccess(item);
  } catch {
    return apiError(400, "INVALID_JSON", "Request body must be valid JSON.");
  }
}

export async function DELETE(
  _request: Request,
  context: { params: Promise<{ id: string }> },
) {
  const { id } = await context.params;

  if (!deleteMilling(id)) {
    return apiError(404, "MILLING_NOT_FOUND", "Milling record not found.");
  }

  return apiSuccess({ id, deleted: true });
}
