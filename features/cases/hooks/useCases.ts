"use client";

import { useQuery } from "@tanstack/react-query";

import { casesApi, type CaseListQuery } from "@/features/cases/cases";

export const casesQueryKey = ["cases"] as const;

export function useCases(query: CaseListQuery) {
  return useQuery({
    queryKey: [...casesQueryKey, query],
    queryFn: () => casesApi.getAll(query),
  });
}
