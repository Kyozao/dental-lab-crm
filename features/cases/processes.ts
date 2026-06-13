import { api } from "@/lib/api";
import type { ProcessOption } from "@/features/cases/types";

type ProcessesResponse = {
  data: ProcessOption[];
  error: string | null;
  meta: Record<string, unknown>;
};

export const processesApi = {
  async getAll() {
    const response = await api<ProcessesResponse>("/api/processes");

    if (response.error) {
      throw new Error(response.error);
    }

    return response.data;
  },
};
