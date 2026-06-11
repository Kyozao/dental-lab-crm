import { api } from "@/lib/api";
import type { CadDesignerOption } from "@/features/cases/types";

type CadDesignersResponse = {
  data: CadDesignerOption[];
  error: string | null;
  meta: Record<string, unknown>;
};

export const cadDesignersApi = {
  async getAll() {
    const response = await api<CadDesignersResponse>("/api/cad-designers");

    if (response.error) {
      throw new Error(response.error);
    }

    return response.data;
  },
};
