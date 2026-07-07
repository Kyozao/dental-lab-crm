"use client";

import { useMemo } from "react";

import { Panel } from "@/components/app/panel";
import { CASE_STATUS } from "@/features/cases/constants";
import type { CaseListItem } from "@/features/cases/cases";

type Props = {
  cases: CaseListItem[];
  isLoading: boolean;
};

export function CasesOverviewStrip({ cases, isLoading }: Props) {
  const metrics = useMemo(() => {
    const today = new Date();
    const todayKey = toLocalDateKey(today);

    let activeCases = 0;
    let inProduction = 0;
    let urgent = 0;
    let dueToday = 0;

    for (const caseItem of cases) {
      const isActive =
        caseItem.currentStatus !== CASE_STATUS.DONE &&
        caseItem.currentStatus !== CASE_STATUS.CANCELLED;

      if (isActive) {
        activeCases += 1;
      }

      if (caseItem.currentStatus === CASE_STATUS.IN_PRODUCTION) {
        inProduction += 1;
      }

      if (caseItem.isUrgent) {
        urgent += 1;
      }

      if (
        isActive &&
        caseItem.dueDate &&
        toLocalDateKey(new Date(caseItem.dueDate)) === todayKey
      ) {
        dueToday += 1;
      }
    }

    return [
      { label: "Active cases", value: activeCases },
      { label: "In production", value: inProduction },
      { label: "Urgent", value: urgent },
      { label: "Due today", value: dueToday },
    ];
  }, [cases]);

  return (
    <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
      {metrics.map((metric) => (
        <Panel key={metric.label} className="p-4">
          <div className="space-y-1">
            <p className="text-xs font-medium uppercase tracking-[0.12em] text-muted-foreground">
              {metric.label}
            </p>
            <p className="text-2xl font-semibold text-foreground">
              {isLoading ? "..." : metric.value}
            </p>
          </div>
        </Panel>
      ))}
    </div>
  );
}

function toLocalDateKey(value: Date) {
  return `${value.getFullYear()}-${value.getMonth()}-${value.getDate()}`;
}
