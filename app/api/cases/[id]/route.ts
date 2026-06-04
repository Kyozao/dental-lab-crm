import { apiError, apiSuccess } from "@/lib/api/response";
import { deleteCase, getCase, updateCase } from "@/lib/mock-data/store";

export async function GET(
  _request: Request,
  context: { params: Promise<{ id: string }> },
) {
  const { id } = await context.params;
  const item = getCase(id);

  if (!item) {
    return apiError(404, "CASE_NOT_FOUND", "Case not found.");
  }

  return apiSuccess(item);
}

export async function PATCH(
  request: Request,
  context: { params: Promise<{ id: string }> },
) {
  const { id } = await context.params;

  try {
    const payload = (await request.json()) as Record<string, unknown>;
    const item = updateCase(id, payload);

    if (!item) {
      return apiError(404, "CASE_NOT_FOUND", "Case not found.");
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

  if (!deleteCase(id)) {
    return apiError(404, "CASE_NOT_FOUND", "Case not found.");
  }

  return apiSuccess({ id, deleted: true });
}
