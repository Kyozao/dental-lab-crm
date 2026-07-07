import { getDashboardForLoggedLab } from "@/app/api/dashboard/dashboard.service";
import { LabOperationsDashboard } from "@/features/dashboard/components/lab-operations-dashboard";
import { requireCurrentLab } from "@/lib/onboarding";

export default async function DashboardPage() {
  const { user_id } = await requireCurrentLab();
  const data = await getDashboardForLoggedLab(user_id);

  return (
    <LabOperationsDashboard
      title="Lab operations dashboard"
      description="Monitor employee workload, case status mix, urgent queues, and completed throughput across the lab."
      summary={data.summary}
      employeeStats={data.employeeStats}
      statusData={data.statusData}
      isSelfView={false}
    />
  );
}
