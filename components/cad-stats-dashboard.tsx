"use client";

import {
  AlertTriangle,
  BarChart3,
  CheckCircle2,
  Clock3,
  Layers3,
  Users,
} from "lucide-react";
import {
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  Pie,
  PieChart,
  XAxis,
  YAxis,
} from "recharts";
import { Badge } from "@/components/ui/badge";
import { EmptyState } from "@/components/app/empty-state";
import { PageHeader } from "@/components/app/page-header";
import { PageShell } from "@/components/app/page-shell";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  ChartContainer,
  ChartTooltip,
  ChartTooltipContent,
  type ChartConfig,
} from "@/components/ui/chart";
import { CASE_STATUS_META } from "@/lib/case-status";

type SummaryStats = {
  totalDesigners: number;
  totalAssignedCases: number;
  totalTeethDesigned: number;
  openCases: number;
  openTeeth: number;
  completedThisMonth: number;
  urgentOpenCases: number;
  avgTurnaroundDays: number | null;
};

type DesignerStat = {
  id: string;
  name: string;
  totalCases: number;
  totalTeethDesigned: number;
  activeCases: number;
  activeTeeth: number;
  completedCases: number;
  completedTeeth: number;
  completedThisWeek: number;
  completedThisMonth: number;
  completedTeethThisMonth: number;
  urgentOpenCases: number;
  overdueCases: number;
  avgTurnaroundDays: number | null;
  completionRate: number;
};

type StatusDatum = {
  status: string;
  label: string;
  value: number;
  fill: string;
};

interface CadStatsDashboardProps {
  title: string;
  description: string;
  summary: SummaryStats;
  designerStats: DesignerStat[];
  statusData: StatusDatum[];
  isSelfView: boolean;
}

const workloadConfig = {
  openTeeth: {
    label: "Open teeth",
    color: "#2563eb",
  },
  completedTeeth: {
    label: "Completed teeth",
    color: "#16a34a",
  },
} satisfies ChartConfig;

const statusConfig = Object.fromEntries(
  Object.entries(CASE_STATUS_META).map(([status, meta]) => [
    status,
    { label: meta.shortLabel, color: meta.chartColor },
  ]),
) satisfies ChartConfig;

function formatDays(value: number | null) {
  if (value === null) {
    return "—";
  }

  return `${value.toFixed(1)}d`;
}

export function CadStatsDashboard({
  title,
  description,
  summary,
  designerStats,
  statusData,
  isSelfView,
}: CadStatsDashboardProps) {
  const workloadData = designerStats.slice(0, 6).map((designer) => ({
    name: designer.name,
    openTeeth: designer.activeTeeth,
    completedTeeth: designer.completedTeeth,
  }));

  const summaryCards = [
    {
      label: "Designers tracked",
      value: summary.totalDesigners.toLocaleString(),
      hint: isSelfView ? "Your personal CAD view" : "Active CAD designers",
      icon: Users,
    },
    {
      label: "Assigned cases",
      value: summary.totalAssignedCases.toLocaleString(),
      hint: "Total workload on record",
      icon: Layers3,
    },
    {
      label: "Teeth designed",
      value: summary.totalTeethDesigned.toLocaleString(),
      hint: "Summed from case elements",
      icon: BarChart3,
    },
    {
      label: "Open teeth",
      value: summary.openTeeth.toLocaleString(),
      hint: "Still in progress",
      icon: BarChart3,
    },
    {
      label: "Completed this month",
      value: summary.completedThisMonth.toLocaleString(),
      hint: "Throughput this month",
      icon: CheckCircle2,
    },
    {
      label: "Urgent open cases",
      value: summary.urgentOpenCases.toLocaleString(),
      hint: "Need fast follow-up",
      icon: AlertTriangle,
    },
    {
      label: "Avg. turnaround",
      value: formatDays(summary.avgTurnaroundDays),
      hint: "From creation to done",
      icon: Clock3,
    },
  ];

  return (
    <PageShell width="wide">
      <PageHeader
        title={title}
        description={description}
        badge={
          isSelfView ? (
          <Badge variant="outline" className="w-fit">
            Showing only your assigned cases
          </Badge>
          ) : null
        }
      />

      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
        {summaryCards.map((item) => {
          const Icon = item.icon;

          return (
            <Card key={item.label}>
              <CardContent className="flex items-start justify-between gap-4 pt-6">
                <div className="space-y-1">
                  <p className="text-sm text-muted-foreground">{item.label}</p>
                  <p className="text-3xl font-semibold tracking-tight">
                    {item.value}
                  </p>
                  <p className="text-xs text-muted-foreground">{item.hint}</p>
                </div>
                <div className="rounded-lg bg-accent p-2 text-muted-foreground">
                  <Icon className="h-5 w-5" />
                </div>
              </CardContent>
            </Card>
          );
        })}
      </div>

      <div className="grid gap-6 xl:grid-cols-[2fr_1fr]">
        <Card>
          <CardHeader>
            <CardTitle>Teeth by designer</CardTitle>
            <CardDescription>
              Open versus completed teeth across the busiest CAD designers.
            </CardDescription>
          </CardHeader>
          <CardContent>
            {workloadData.length ? (
              <ChartContainer config={workloadConfig} className="h-80 w-full">
                <BarChart accessibilityLayer data={workloadData}>
                  <CartesianGrid vertical={false} />
                  <XAxis dataKey="name" tickLine={false} axisLine={false} />
                  <YAxis hide />
                  <ChartTooltip
                    cursor={false}
                    content={<ChartTooltipContent indicator="dot" />}
                  />
                  <Bar
                    dataKey="openTeeth"
                    fill="var(--color-openTeeth)"
                    radius={6}
                  />
                  <Bar
                    dataKey="completedTeeth"
                    fill="var(--color-completedTeeth)"
                    radius={6}
                  />
                </BarChart>
              </ChartContainer>
            ) : (
              <EmptyState
                title="No CAD activity yet"
                className="flex h-80 flex-col items-center justify-center rounded-lg border border-dashed"
              />
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Case status mix</CardTitle>
            <CardDescription>
              Distribution of all visible CAD cases by stage.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            {statusData.length ? (
              <>
                <ChartContainer
                  config={statusConfig}
                  className="mx-auto h-72 w-full max-w-xs"
                >
                  <PieChart>
                    <ChartTooltip
                      cursor={false}
                      content={
                        <ChartTooltipContent
                          hideLabel
                          indicator="dot"
                          nameKey="status"
                        />
                      }
                    />
                    <Pie
                      data={statusData}
                      dataKey="value"
                      nameKey="label"
                      innerRadius={55}
                      outerRadius={85}
                      strokeWidth={4}
                    >
                      {statusData.map((entry) => (
                        <Cell key={entry.status} fill={entry.fill} />
                      ))}
                    </Pie>
                  </PieChart>
                </ChartContainer>

                <div className="space-y-2 text-sm">
                  {statusData.map((item) => (
                    <div
                      key={item.status}
                      className="flex items-center justify-between rounded-md border px-3 py-2"
                    >
                      <div className="flex items-center gap-2">
                        <span
                          className="h-2.5 w-2.5 rounded-full"
                          style={{ backgroundColor: item.fill }}
                        />
                        <span>{item.label}</span>
                      </div>
                      <span className="font-medium">{item.value}</span>
                    </div>
                  ))}
                </div>
              </>
            ) : (
              <EmptyState
                title="No case statuses to display yet"
                className="flex h-72 flex-col items-center justify-center rounded-lg border border-dashed"
              />
            )}
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Designer leaderboard</CardTitle>
          <CardDescription>
            Quick comparison of throughput, urgency, and turnaround time.
          </CardDescription>
        </CardHeader>
        <CardContent>
          {designerStats.length ? (
            <div className="grid gap-4 lg:grid-cols-2">
              {designerStats.map((designer) => (
                <div
                  key={designer.id}
                  className="rounded-xl border border-border/60 bg-background p-4"
                >
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <h3 className="font-semibold text-foreground">
                        {designer.name}
                      </h3>
                      <p className="text-sm text-muted-foreground">
                        {designer.totalCases} assigned •{" "}
                        {designer.totalTeethDesigned} teeth designed •{" "}
                        {designer.completionRate}% complete
                      </p>
                    </div>
                    {designer.urgentOpenCases > 0 ? (
                      <Badge variant="destructive">
                        {designer.urgentOpenCases} urgent
                      </Badge>
                    ) : (
                      <Badge variant="secondary">On track</Badge>
                    )}
                  </div>

                  <dl className="mt-4 grid grid-cols-2 gap-3 text-sm sm:grid-cols-3">
                    <div className="rounded-lg bg-muted/50 p-3">
                      <dt className="text-muted-foreground">Open cases</dt>
                      <dd className="mt-1 text-lg font-semibold">
                        {designer.activeCases}
                      </dd>
                    </div>
                    <div className="rounded-lg bg-muted/50 p-3">
                      <dt className="text-muted-foreground">Open teeth</dt>
                      <dd className="mt-1 text-lg font-semibold">
                        {designer.activeTeeth}
                      </dd>
                    </div>
                    <div className="rounded-lg bg-muted/50 p-3">
                      <dt className="text-muted-foreground">Done cases</dt>
                      <dd className="mt-1 text-lg font-semibold">
                        {designer.completedCases}
                      </dd>
                    </div>
                    <div className="rounded-lg bg-muted/50 p-3">
                      <dt className="text-muted-foreground">Done teeth</dt>
                      <dd className="mt-1 text-lg font-semibold">
                        {designer.completedTeeth}
                      </dd>
                    </div>
                    <div className="rounded-lg bg-muted/50 p-3">
                      <dt className="text-muted-foreground">Month teeth</dt>
                      <dd className="mt-1 text-lg font-semibold">
                        {designer.completedTeethThisMonth}
                      </dd>
                    </div>
                    <div className="rounded-lg bg-muted/50 p-3">
                      <dt className="text-muted-foreground">Avg. time</dt>
                      <dd className="mt-1 text-lg font-semibold">
                        {formatDays(designer.avgTurnaroundDays)}
                      </dd>
                    </div>
                  </dl>
                </div>
              ))}
            </div>
          ) : (
            <EmptyState title="No CAD designers were found in the system yet" />
          )}
        </CardContent>
      </Card>
    </PageShell>
  );
}
