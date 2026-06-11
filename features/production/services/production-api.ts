import { api } from "@/lib/api";
import type { ProductionProcess } from "@/features/production/production.types";

type ProductionResponse = {
  data: ProductionProcess[];
  error: string | null;
  meta: Record<string, unknown>;
};

export async function getProductionProcessesApi() {
  const response = await api<ProductionResponse>("/api/production");
  return response.data;
}

export async function createMilling(_payload: Record<string, unknown>) {
  void _payload;
  return;
}

export async function updateMilling(
  _millingId: string,
  _payload: Record<string, unknown>,
) {
  void _millingId;
  void _payload;
  return;
}

export async function deleteMilling(_millingId: string) {
  void _millingId;
  return;
}
