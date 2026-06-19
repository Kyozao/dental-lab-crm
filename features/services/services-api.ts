import { api } from "@/lib/api";
import type { ProcessOption, ServiceTypeOption } from "@/features/cases/types";

export type LabSettings = {
  id: string;
  name: string;
  currency: string;
};

export type PriceTableListItem = {
  id: string;
  name: string;
  is_active: boolean;
  deleted_at: string | null;
  created_at: string;
  updated_at: string;
  service_price_count: number;
  assigned_customer_count: number;
};

export type PriceTableDetail = {
  id: string;
  name: string;
  is_active: boolean;
  deleted_at: string | null;
  created_at: string;
  updated_at: string;
  service_prices: Array<{
    id: string;
    service_type_id: string;
    price: string;
    service_type: {
      id: string;
      name: string;
      base_price: string;
    };
  }>;
  assigned_customers: Array<{
    id: string;
    name: string;
  }>;
};

type ServiceTypesResponse = {
  data: ServiceTypeOption[];
  error: string | null;
  meta: {
    currency?: string;
  };
};

type ServiceTypeResponse = {
  data: ServiceTypeOption;
  error: string | null;
  meta: Record<string, never>;
};

type LabSettingsResponse = {
  data: LabSettings;
  error: string | null;
  meta: Record<string, never>;
};

type PriceTableListResponse = {
  data: PriceTableListItem[];
  error: string | null;
  meta: Record<string, never>;
};

type PriceTableDetailResponse = {
  data: PriceTableDetail;
  error: string | null;
  meta: Record<string, never>;
};

export type ServiceTypeMutationInput = {
  name: string;
  base_price: string;
  notes: string | null;
  is_active: boolean;
  workflow_json: ServiceTypeOption["workflow_json"];
};

export type PriceTableMutationInput = {
  name: string;
  is_active: boolean;
  service_prices: Array<{
    service_type_id: string;
    price: string;
  }>;
};

export async function listServicesApi() {
  const response = await api<ServiceTypesResponse>("/api/service-types");
  return response.data;
}

export async function createServiceApi(input: ServiceTypeMutationInput) {
  const response = await api<ServiceTypeResponse>("/api/service-types", {
    method: "POST",
    body: JSON.stringify(input),
  });
  return response.data;
}

export async function getServiceApi(serviceId: string) {
  const response = await api<ServiceTypeResponse>(`/api/service-types/${serviceId}`);
  return response.data;
}

export async function updateServiceApi(
  serviceId: string,
  input: Partial<ServiceTypeMutationInput>,
) {
  const response = await api<ServiceTypeResponse>(`/api/service-types/${serviceId}`, {
    method: "PATCH",
    body: JSON.stringify(input),
  });
  return response.data;
}

export async function archiveServiceApi(serviceId: string) {
  const response = await api<ServiceTypeResponse>(`/api/service-types/${serviceId}`, {
    method: "DELETE",
  });
  return response.data;
}

export async function getCurrentLabSettingsApi() {
  const response = await api<LabSettingsResponse>("/api/labs/current");
  return response.data;
}

export async function listPriceTablesApi() {
  const response = await api<PriceTableListResponse>("/api/price-tables");
  return response.data;
}

export async function getPriceTableApi(priceTableId: string) {
  const response = await api<PriceTableDetailResponse>(`/api/price-tables/${priceTableId}`);
  return response.data;
}

export async function createPriceTableApi(input: PriceTableMutationInput) {
  const response = await api<PriceTableDetailResponse>("/api/price-tables", {
    method: "POST",
    body: JSON.stringify(input),
  });
  return response.data;
}

export async function updatePriceTableApi(
  priceTableId: string,
  input: Partial<PriceTableMutationInput>,
) {
  const response = await api<PriceTableDetailResponse>(`/api/price-tables/${priceTableId}`, {
    method: "PATCH",
    body: JSON.stringify(input),
  });
  return response.data;
}

export async function archivePriceTableApi(priceTableId: string) {
  const response = await api<PriceTableDetailResponse>(`/api/price-tables/${priceTableId}`, {
    method: "DELETE",
  });
  return response.data;
}

export async function updateCurrentLabCurrencyApi(currency: string) {
  const response = await api<LabSettingsResponse>("/api/labs/current", {
    method: "PATCH",
    body: JSON.stringify({ currency }),
  });
  return response.data;
}

export type ServiceEditorState = {
  id?: string;
  name: string;
  base_price: string;
  notes: string;
  is_active: boolean;
  workflow_json: NonNullable<ServiceTypeOption["workflow_json"]>;
};

export type PriceTableEditorState = {
  id?: string;
  name: string;
  is_active: boolean;
  service_prices: Array<{
    service_type_id: string;
    price: string;
  }>;
};

export function buildDefaultServiceEditorState(): ServiceEditorState {
  return {
    name: "",
    base_price: "0.00",
    notes: "",
    is_active: true,
    workflow_json: { steps: [] },
  };
}

export function buildDefaultPriceTableEditorState(): PriceTableEditorState {
  return {
    name: "",
    is_active: true,
    service_prices: [],
  };
}

export function buildPriceTableEditorState(
  priceTable: PriceTableDetail,
): PriceTableEditorState {
  return {
    id: priceTable.id,
    name: priceTable.name,
    is_active: priceTable.is_active,
    service_prices: priceTable.service_prices.map((row) => ({
      service_type_id: row.service_type_id,
      price: row.price,
    })),
  };
}

export function buildServiceEditorState(service: ServiceTypeOption): ServiceEditorState {
  return {
    id: service.id,
    name: service.name,
    base_price: service.base_price,
    notes: service.notes ?? "",
    is_active: service.is_active ?? true,
    workflow_json: service.workflow_json ?? { steps: [] },
  };
}

export function serviceHasWorkflow(service: ServiceTypeOption) {
  return (service.workflow_json?.steps.length ?? 0) > 0;
}

export function processOptionsReady(processes: ProcessOption[] | undefined) {
  return Array.isArray(processes) ? processes : [];
}
