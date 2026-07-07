import type { CaseListQuery } from "@/features/cases/cases";

type SearchParamsLike = {
  get(name: string): string | null;
  getAll(name: string): string[];
};

export function getCasesQueryFromSearchParams(
  searchParams: SearchParamsLike,
): CaseListQuery {
  return {
    limit:
      searchParams.get("limit") ?? searchParams.get("pageSize") ?? "100",
    q: searchParams.get("q") ?? undefined,
    status: searchParams.get("status") ?? undefined,
    urgent: searchParams.get("urgent") ?? undefined,
    customerId: searchParams.get("customerId") ?? undefined,
    currentProcessIds: searchParams.getAll("currentProcessId"),
  };
}
