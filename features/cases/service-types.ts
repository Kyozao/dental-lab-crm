import { api } from "@/lib/api";
import type { ServiceTypeOption } from "@/features/cases/types";

type ServiceTypesResponse = {
  data: ServiceTypeOption[];
  error: string | null;
  meta: {
    currency?: string;
  };
};

export const serviceTypesApi = {
  async getAll() {
    const response = await api<ServiceTypesResponse>("/api/service-types");

    if (response.error) {
      throw new Error(response.error);
    }

    return response.data;
  },
};
