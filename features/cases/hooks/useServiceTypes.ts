"use client";

import { useQuery } from "@tanstack/react-query";

import { serviceTypesApi } from "@/features/cases/service-types";

export const serviceTypesQueryKey = ["service-types"] as const;

export function useServiceTypes(enabled = true) {
  return useQuery({
    queryKey: serviceTypesQueryKey,
    queryFn: serviceTypesApi.getAll,
    enabled,
  });
}
