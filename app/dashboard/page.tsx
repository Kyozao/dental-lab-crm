import { CadStatsDashboard } from "@/features/dashboard/components/cad-stats-dashboard";
import { serverApiGet } from "@/lib/api/server";

type DashboardResponse = React.ComponentProps<typeof CadStatsDashboard>;

export default async function DashboardPage() {
  const envelope = await serverApiGet<
    Pick<DashboardResponse, "summary" | "designerStats" | "statusData">
  >("/api/dashboard");
  const data = envelope.data;

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
