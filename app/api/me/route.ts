import { apiSuccess } from "@/lib/api/response";
import { getMockUser } from "@/lib/mock-data/store";

export async function GET() {
  return apiSuccess(getMockUser());
}
