"use client";

import { useQuery } from "@tanstack/react-query";

import { listEmployeesApi } from "@/features/employees/services/employees-api";

export const employeesQueryKey = ["employees"] as const;

export function useEmployees(enabled = true) {
  return useQuery({
    queryKey: employeesQueryKey,
    queryFn: async () => {
      const result = await listEmployeesApi();
      return result.employees;
    },
    enabled,
  });
}
