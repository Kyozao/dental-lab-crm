import { redirect } from "next/navigation";
import { CadStatsDashboard } from "@/components/cad-stats-dashboard";
import { getAuthenticatedAppUser } from "@/lib/auth/get-app-user";
import { CASE_STATUS_META } from "@/lib/case-status";
import { prisma } from "@/lib/prisma";

function getDoneDate(caseItem: {
  updatedAt: Date;
  statusHistory: Array<{ changedAt: Date }>;
}) {
  return caseItem.statusHistory[0]?.changedAt ?? caseItem.updatedAt;
}

function getCaseTeethCount(caseItem: {
  elementsQty: number | null;
  teeth: string | null;
}) {
  if (
    typeof caseItem.elementsQty === "number" &&
    Number.isFinite(caseItem.elementsQty)
  ) {
    return Math.max(caseItem.elementsQty, 0);
  }

  return (caseItem.teeth ?? "")
    .split(/[\s,;/]+/)
    .map((value) => value.trim())
    .filter(Boolean).length;
}

export default async function DashboardPage() {
  const appUser = await getAuthenticatedAppUser();

  if (!appUser) {
    redirect("/login");
  }

  const designers = await prisma.user.findMany({
    where: {
      role: "CAD_DESIGNER",
      isActive: true,
      ...(appUser.role === "CAD_DESIGNER" ? { id: appUser.id } : {}),
    },
    orderBy: { name: "asc" },
    select: {
      id: true,
      name: true,
      assignedCases: {
        orderBy: { updatedAt: "desc" },
        select: {
          id: true,
          currentStatus: true,
          teeth: true,
          elementsQty: true,
          isUrgent: true,
          createdAt: true,
          updatedAt: true,
          dueDate: true,
          statusHistory: {
            where: { toStatus: "DONE" },
            orderBy: { changedAt: "desc" },
            take: 1,
            select: { changedAt: true },
          },
        },
      },
    },
  });

  const now = new Date();
  const monthStart = new Date(now.getFullYear(), now.getMonth(), 1);
  const weekStart = new Date(now);
  weekStart.setDate(now.getDate() - 6);
  weekStart.setHours(0, 0, 0, 0);

  const allCases = designers.flatMap((designer) => designer.assignedCases);

  const designerStats = designers
    .map((designer) => {
      const totalCases = designer.assignedCases.length;
      const activeCases = designer.assignedCases.filter(
        (caseItem) => caseItem.currentStatus !== "DONE",
      );
      const completedCases = designer.assignedCases.filter(
        (caseItem) => caseItem.currentStatus === "DONE",
      );
      const completedThisMonth = completedCases.filter(
        (caseItem) => getDoneDate(caseItem) >= monthStart,
      ).length;
      const completedThisWeek = completedCases.filter(
        (caseItem) => getDoneDate(caseItem) >= weekStart,
      ).length;
      const totalTeethDesigned = designer.assignedCases.reduce(
        (sum, caseItem) => sum + getCaseTeethCount(caseItem),
        0,
      );
      const activeTeeth = activeCases.reduce(
        (sum, caseItem) => sum + getCaseTeethCount(caseItem),
        0,
      );
      const completedTeeth = completedCases.reduce(
        (sum, caseItem) => sum + getCaseTeethCount(caseItem),
        0,
      );
      const completedTeethThisMonth = completedCases
        .filter((caseItem) => getDoneDate(caseItem) >= monthStart)
        .reduce((sum, caseItem) => sum + getCaseTeethCount(caseItem), 0);
      const overdueCases = activeCases.filter(
        (caseItem) => caseItem.dueDate && caseItem.dueDate < now,
      ).length;
      const urgentOpenCases = activeCases.filter(
        (caseItem) => caseItem.isUrgent,
      ).length;
      const avgTurnaroundDays = completedCases.length
        ? Number(
            (
              completedCases.reduce((sum, caseItem) => {
                const elapsedMs =
                  getDoneDate(caseItem).getTime() -
                  caseItem.createdAt.getTime();

                return sum + elapsedMs / 86_400_000;
              }, 0) / completedCases.length
            ).toFixed(1),
          )
        : null;

      return {
        id: designer.id,
        name: designer.name,
        totalCases,
        totalTeethDesigned,
        activeCases: activeCases.length,
        activeTeeth,
        completedCases: completedCases.length,
        completedTeeth,
        completedThisWeek,
        completedThisMonth,
        completedTeethThisMonth,
        urgentOpenCases,
        overdueCases,
        avgTurnaroundDays,
        completionRate: totalCases
          ? Math.round((completedCases.length / totalCases) * 100)
          : 0,
      };
    })
    .sort(
      (a, b) =>
        b.completedThisMonth - a.completedThisMonth ||
        b.completedCases - a.completedCases ||
        a.name.localeCompare(b.name),
    );

  const summary = {
    totalDesigners: designers.length,
    totalAssignedCases: allCases.length,
    totalTeethDesigned: allCases.reduce(
      (sum, caseItem) => sum + getCaseTeethCount(caseItem),
      0,
    ),
    openCases: allCases.filter((caseItem) => caseItem.currentStatus !== "DONE")
      .length,
    openTeeth: allCases
      .filter((caseItem) => caseItem.currentStatus !== "DONE")
      .reduce((sum, caseItem) => sum + getCaseTeethCount(caseItem), 0),
    completedThisMonth: allCases.filter(
      (caseItem) =>
        caseItem.currentStatus === "DONE" &&
        getDoneDate(caseItem) >= monthStart,
    ).length,
    urgentOpenCases: allCases.filter(
      (caseItem) => caseItem.currentStatus !== "DONE" && caseItem.isUrgent,
    ).length,
    avgTurnaroundDays: (() => {
      const completedCases = allCases.filter(
        (caseItem) => caseItem.currentStatus === "DONE",
      );

      if (!completedCases.length) {
        return null;
      }

      return Number(
        (
          completedCases.reduce((sum, caseItem) => {
            const elapsedMs =
              getDoneDate(caseItem).getTime() - caseItem.createdAt.getTime();

            return sum + elapsedMs / 86_400_000;
          }, 0) / completedCases.length
        ).toFixed(1),
      );
    })(),
  };

  const statusData = Object.entries(CASE_STATUS_META).map(([status, meta]) => ({
    status,
    label: meta.shortLabel,
    fill: meta.chartColor,
    value: allCases.filter((caseItem) => caseItem.currentStatus === status)
      .length,
  })).filter((item) => item.value > 0);

  return (
    <CadStatsDashboard
      title={
        appUser.role === "CAD_DESIGNER"
          ? "My CAD Statistics"
          : "CAD Designer Statistics"
      }
      description={
        appUser.role === "CAD_DESIGNER"
          ? "Monitor your workload, urgent cases, and turnaround time in one place."
          : "Track workload, completions, and bottlenecks across your CAD design team."
      }
      summary={summary}
      designerStats={designerStats}
      statusData={statusData}
      isSelfView={appUser.role === "CAD_DESIGNER"}
    />
  );
}
