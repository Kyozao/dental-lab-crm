"use client";

import { useQuery } from "@tanstack/react-query";

import { casesApi } from "@/features/cases/cases";

export const casesQueryKey = ["cases"] as const;

export function useCases() {
  return useQuery({
    queryKey: casesQueryKey,
    queryFn: casesApi.getAll,
  });
}
