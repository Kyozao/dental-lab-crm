import { CASE_STATUS_META } from "@/features/cases/constants";
import { apiSuccess } from "@/lib/api/response";
import { getDashboardData } from "@/lib/mock-data/store";

export async function GET() {
  const dashboard = getDashboardData();

  return apiSuccess({
    summary: dashboard.summary,
    designerStats: dashboard.designerStats,
    statusData: Object.entries(CASE_STATUS_META)
      .map(([status, meta]) => ({
        status,
        label: meta.shortLabel,
        fill: meta.chartColor,
        value: dashboard.cases.filter((item) => item.currentStatus === status)
          .length,
      }))
      .filter((item) => item.value > 0),
  });
}
