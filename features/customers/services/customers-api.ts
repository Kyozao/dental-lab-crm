import { api } from "@/lib/api";

import type {
  Customer,
  CustomerDetail,
  CustomerPayload,
} from "@/features/customers/types";

type ApiSuccess<T> = {
  data: T;
  error: null;
  meta: Record<string, unknown>;
};

export async function listCustomersApi() {
  const response = await api<ApiSuccess<Customer[]>>("/api/customers", {
    method: "GET",
    headers: { Accept: "application/json" },
  });

  return response.data;
}

export async function createCustomerApi(payload: CustomerPayload) {
  const response = await api<ApiSuccess<Customer>>("/api/customers", {
    method: "POST",
    headers: { Accept: "application/json" },
    body: JSON.stringify(payload),
  });

  return response.data;
}

export async function getCustomerDetailApi(customerId: string) {
  const response = await api<ApiSuccess<CustomerDetail>>(`/api/customers/${customerId}`, {
    method: "GET",
    headers: { Accept: "application/json" },
  });

  return response.data;
}

export async function updateCustomerApi(customerId: string, payload: CustomerPayload) {
  const response = await api<ApiSuccess<Customer>>(`/api/customers/${customerId}`, {
    method: "PATCH",
    headers: { Accept: "application/json" },
    body: JSON.stringify(payload),
  });

  return response.data;
}

export async function archiveCustomerApi(customerId: string) {
  const response = await api<ApiSuccess<Customer>>(`/api/customers/${customerId}`, {
    method: "DELETE",
    headers: { Accept: "application/json" },
  });

  return response.data;
}
