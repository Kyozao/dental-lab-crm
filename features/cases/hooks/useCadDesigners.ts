"use client";

import { useQuery } from "@tanstack/react-query";

import { cadDesignersApi } from "@/features/cases/cad-designers";

export const cadDesignersQueryKey = ["cad-designers"] as const;

export function useCadDesigners(enabled = true) {
  return useQuery({
    queryKey: cadDesignersQueryKey,
    queryFn: cadDesignersApi.getAll,
    enabled,
  });
}
