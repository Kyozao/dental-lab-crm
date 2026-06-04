import { apiError, apiSuccess } from "@/lib/api/response";
import { createCase, listCases } from "@/lib/mock-data/store";

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const result = listCases(searchParams);

  return apiSuccess(result.cases, {
    meta: {
      total: result.total,
      page: result.page,
      pageSize: result.pageSize,
    },
  });
}

export async function POST(request: Request) {
  try {
    const payload = (await request.json()) as Record<string, unknown>;
    return apiSuccess(createCase(payload), { status: 201 });
  } catch {
    return apiError(400, "INVALID_JSON", "Request body must be valid JSON.");
  }
}
