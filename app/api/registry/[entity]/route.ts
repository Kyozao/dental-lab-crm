import { apiError, apiSuccess } from "@/lib/api/response";
import { createRegistryEntity } from "@/lib/mock-data/store";

const ENTITIES = new Set([
  "clinics",
  "dentists",
  "components",
  "block-types",
  "service-types",
  "milling-drills",
]);

export async function POST(
  request: Request,
  context: { params: Promise<{ entity: string }> },
) {
  const { entity } = await context.params;

  if (!ENTITIES.has(entity)) {
    return apiError(404, "ENTITY_NOT_FOUND", "Registry entity not found.");
  }

  try {
    const payload = (await request.json()) as Record<string, unknown>;
    return apiSuccess(createRegistryEntity(entity, payload), { status: 201 });
  } catch {
    return apiError(400, "INVALID_JSON", "Request body must be valid JSON.");
  }
}
