"use client";

import { useMemo } from "react";
import { useSearchParams } from "next/navigation";

import { Panel } from "@/components/app/panel";
import { CasesOverviewStrip } from "@/features/cases/components/cases-overview-strip";
import { CasesTable } from "@/features/cases/components/cases-table";
import { useCases } from "@/features/cases/hooks/useCases";
import { getCasesQueryFromSearchParams } from "@/features/cases/cases-query";
import type { ComponentOption } from "@/features/cases/types";

type Props = {
  components: ComponentOption[];
  currentUserRole: string;
};

export function CasesListSection({
  components,
  currentUserRole,
}: Props) {
  const searchParams = useSearchParams();
  const casesQuery = useMemo(
    () => getCasesQueryFromSearchParams(searchParams),
    [searchParams],
  );
  const casesQueryResult = useCases(casesQuery);

  return (
    <div className="space-y-4">
      <CasesOverviewStrip
        cases={casesQueryResult.data ?? []}
        isLoading={casesQueryResult.isLoading}
      />

      <Panel>
        <CasesTable
          components={components}
          currentUserRole={currentUserRole}
          casesQueryResult={casesQueryResult}
        />
      </Panel>
    </div>
  );
}
