import { api } from "@/lib/api";

import type { Dentist, DentistPayload } from "@/features/customers/types";

type ApiSuccess<T> = {
  data: T;
  error: null;
  meta: Record<string, unknown>;
};

export async function createDentistApi(customerId: string, payload: DentistPayload) {
  const response = await api<ApiSuccess<Dentist>>("/api/dentists", {
    method: "POST",
    headers: { Accept: "application/json" },
    body: JSON.stringify({
      customer_id: customerId,
      ...payload,
    }),
  });

  return response.data;
}

export async function updateDentistApi(dentistId: string, payload: DentistPayload) {
  const response = await api<ApiSuccess<Dentist>>(`/api/dentists/${dentistId}`, {
    method: "PATCH",
    headers: { Accept: "application/json" },
    body: JSON.stringify(payload),
  });

  return response.data;
}

export async function archiveDentistApi(dentistId: string) {
  const response = await api<ApiSuccess<Dentist>>(`/api/dentists/${dentistId}`, {
    method: "DELETE",
    headers: { Accept: "application/json" },
  });

  return response.data;
}
