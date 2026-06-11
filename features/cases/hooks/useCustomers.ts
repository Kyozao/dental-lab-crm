"use client";

import { useQuery } from "@tanstack/react-query";

import { customersApi } from "@/features/cases/customers";

export const customersQueryKey = ["customers"] as const;

export function useCustomers(enabled = true) {
  return useQuery({
    queryKey: customersQueryKey,
    queryFn: customersApi.getAll,
    enabled,
  });
}
