import { apiError, apiSuccess } from "@/lib/api/response";
import {
  deleteRegistryEntity,
  updateRegistryEntity,
} from "@/lib/mock-data/store";

const ENTITIES = new Set([
  "clinics",
  "dentists",
  "components",
  "block-types",
  "service-types",
  "milling-drills",
]);

export async function PATCH(
  request: Request,
  context: { params: Promise<{ entity: string; id: string }> },
) {
  const { entity, id } = await context.params;

  if (!ENTITIES.has(entity)) {
    return apiError(404, "ENTITY_NOT_FOUND", "Registry entity not found.");
  }

  try {
    const payload = (await request.json()) as Record<string, unknown>;
    const item = updateRegistryEntity(entity, id, payload);

    if (!item) {
      return apiError(404, "ENTITY_NOT_FOUND", "Entity not found.");
    }

    return apiSuccess(item);
  } catch {
    return apiError(400, "INVALID_JSON", "Request body must be valid JSON.");
  }
}

export async function DELETE(
  _request: Request,
  context: { params: Promise<{ entity: string; id: string }> },
) {
  const { entity, id } = await context.params;

  if (!ENTITIES.has(entity)) {
    return apiError(404, "ENTITY_NOT_FOUND", "Registry entity not found.");
  }

  if (!deleteRegistryEntity(entity, id)) {
    return apiError(404, "ENTITY_NOT_FOUND", "Entity not found.");
  }

  return apiSuccess({ id, deleted: true });
}
