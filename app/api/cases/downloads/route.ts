import { apiError, apiSuccess } from "@/lib/api/response";
import { getDownloadItems } from "@/lib/mock-data/store";

export async function POST(request: Request) {
  try {
    const payload = (await request.json()) as {
      caseIds?: string[];
      kind?: "SCAN_INPUT" | "DESIGN_OUTPUT" | "MODEL_OUTPUT" | "OTHER" | "ALL" | "FINAL_OUTPUTS";
    };

    return apiSuccess(
      getDownloadItems(
        Array.isArray(payload.caseIds) ? payload.caseIds : [],
        payload.kind ?? "ALL",
      ),
    );
  } catch {
    return apiError(400, "INVALID_JSON", "Request body must be valid JSON.");
  }
}
