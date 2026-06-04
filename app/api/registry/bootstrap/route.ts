import { apiSuccess } from "@/lib/api/response";
import { getRegistryBootstrap } from "@/lib/mock-data/store";

export async function GET() {
  return apiSuccess(getRegistryBootstrap());
}
