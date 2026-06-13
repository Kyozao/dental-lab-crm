import { CadStatsDashboard } from "@/features/dashboard/components/cad-stats-dashboard";
import { getMockDashboardData } from "@/lib/mock-data/pages";
import { requireCurrentLab } from "@/lib/onboarding";

export default async function DashboardPage() {
  await requireCurrentLab();

  const data = getMockDashboardData();

  return (
    <CadStatsDashboard
      title="Production Statistics"
      description="Track workload, completions, and bottlenecks across the lab workflow."
      summary={data.summary}
      designerStats={data.designerStats}
      statusData={data.statusData}
      isSelfView={false}
    />
  );
}
