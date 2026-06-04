import { CadStatsDashboard } from "@/features/dashboard/components/cad-stats-dashboard";
import { getMockDashboardData } from "@/lib/mock-data/pages";

export default function DashboardPage() {
  const data = getMockDashboardData();

  return (
    <CadStatsDashboard
      title="CAD Designer Statistics"
      description="Track workload, completions, and bottlenecks across your CAD design team."
      summary={data.summary}
      designerStats={data.designerStats}
      statusData={data.statusData}
      isSelfView={false}
    />
  );
}
