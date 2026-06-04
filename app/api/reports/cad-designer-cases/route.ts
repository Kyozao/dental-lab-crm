import { apiSuccess } from "@/lib/api/response";

export async function GET() {
  return apiSuccess({
    enabled: false,
    message: "Reports are disabled in the API-only mock runtime.",
    items: [],
  });
}
