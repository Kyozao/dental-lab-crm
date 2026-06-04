import { apiSuccess } from "@/lib/api/response";
import { getRegistryData } from "@/lib/mock-data/store";

export async function GET() {
  return apiSuccess(getRegistryData());
}
