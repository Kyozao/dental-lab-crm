"use client";

import { useQuery } from "@tanstack/react-query";

import { processesApi } from "@/features/cases/processes";

export const processesQueryKey = ["processes"] as const;

export function useProcesses(enabled = true) {
  return useQuery({
    queryKey: processesQueryKey,
    queryFn: processesApi.getAll,
    enabled,
  });
}
