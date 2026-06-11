import { api } from "@/lib/api";
import type { CustomerOption } from "@/features/cases/types";

type CustomersResponse = {
  data: CustomerOption[];
  error: string | null;
  meta: Record<string, unknown>;
};

export const customersApi = {
  async getAll() {
    const response = await api<CustomersResponse>("/api/customers");

    if (response.error) {
      throw new Error(response.error);
    }

    return response.data;
  },
};
