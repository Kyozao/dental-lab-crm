import { apiError, apiSuccess } from "@/lib/api/response";
import {
  createMilling,
  getProductionData,
} from "@/lib/mock-data/store";

export async function GET() {
  return apiSuccess(getProductionData());
}

export async function POST(request: Request) {
  try {
    const payload = (await request.json()) as Record<string, unknown>;
    return apiSuccess(createMilling(payload), { status: 201 });
  } catch {
    return apiError(400, "INVALID_JSON", "Request body must be valid JSON.");
  }
}
