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
import { EmptyState } from "@/components/app/empty-state";
import { PageHeader } from "@/components/app/page-header";
import { PageShell } from "@/components/app/page-shell";
import { Badge } from "@/components/ui/badge";
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
import { CASE_STATUS_META } from "@/features/cases/constants";

type SummaryStats = {
  totalEmployees: number;
  totalAssignedCases: number;
  totalTeethTracked: number;
  openCases: number;
  openTeeth: number;
  completedThisMonth: number;
  urgentOpenCases: number;
  avgTurnaroundDays: number | null;
};

type EmployeeStat = {
  id: string;
  name: string;
  totalCases: number;
  totalTeethTracked: number;
  openCases: number;
  openTeeth: number;
  closedCases: number;
  closedTeeth: number;
  completedProcessesThisWeek: number;
  completedProcessesThisMonth: number;
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

interface LabOperationsDashboardProps {
  title: string;
  description: string;
  summary: SummaryStats;
  employeeStats: EmployeeStat[];
  statusData: StatusDatum[];
  isSelfView: boolean;
}

const workloadConfig = {
  openTeeth: {
    label: "Open teeth",
    color: "#2563eb",
  },
  closedTeeth: {
    label: "Closed teeth",
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
    return "-";
  }

  return `${value.toFixed(1)}d`;
}

export function LabOperationsDashboard({
  title,
  description,
  summary,
  employeeStats,
  statusData,
  isSelfView,
}: LabOperationsDashboardProps) {
  const workloadData = employeeStats.slice(0, 6).map((employee) => ({
    name: employee.name,
    openTeeth: employee.openTeeth,
    closedTeeth: employee.closedTeeth,
  }));

  const summaryCards = [
    {
      label: "Employees tracked",
      value: summary.totalEmployees.toLocaleString(),
      hint: isSelfView ? "Your assigned operations view" : "Active employees in this lab",
      icon: Users,
    },
    {
      label: "Assigned cases",
      value: summary.totalAssignedCases.toLocaleString(),
      hint: "Unique cases linked to assigned work",
      icon: Layers3,
    },
    {
      label: "Teeth tracked",
      value: summary.totalTeethTracked.toLocaleString(),
      hint: "Uses elements quantity with teeth fallback",
      icon: BarChart3,
    },
    {
      label: "Open teeth",
      value: summary.openTeeth.toLocaleString(),
      hint: `${summary.openCases.toLocaleString()} open cases`,
      icon: BarChart3,
    },
    {
      label: "Completed this month",
      value: summary.completedThisMonth.toLocaleString(),
      hint: "Done cases finished this month",
      icon: CheckCircle2,
    },
    {
      label: "Urgent open cases",
      value: summary.urgentOpenCases.toLocaleString(),
      hint: "Cases that need immediate follow-up",
      icon: AlertTriangle,
    },
    {
      label: "Avg. turnaround",
      value: formatDays(summary.avgTurnaroundDays),
      hint: "Average from case creation to final completion",
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
                  <p className="text-3xl font-semibold tracking-tight">{item.value}</p>
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
            <CardTitle>Teeth by employee</CardTitle>
            <CardDescription>
              Open versus closed teeth across the busiest employees.
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
                  <Bar dataKey="openTeeth" fill="var(--color-openTeeth)" radius={6} />
                  <Bar dataKey="closedTeeth" fill="var(--color-closedTeeth)" radius={6} />
                </BarChart>
              </ChartContainer>
            ) : (
              <EmptyState
                title="No employee workload is visible yet"
                className="flex h-80 flex-col items-center justify-center rounded-lg border border-dashed"
              />
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Case status mix</CardTitle>
            <CardDescription>
              Distribution of visible cases by current status.
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
                title="No case statuses are available yet"
                className="flex h-72 flex-col items-center justify-center rounded-lg border border-dashed"
              />
            )}
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Employee workload</CardTitle>
          <CardDescription>
            Compare open work, closed volume, urgent queues, and process throughput.
          </CardDescription>
        </CardHeader>
        <CardContent>
          {employeeStats.length ? (
            <div className="grid gap-4 lg:grid-cols-2">
              {employeeStats.map((employee) => (
                <div
                  key={employee.id}
                  className="rounded-xl border border-border/60 bg-background p-4"
                >
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <h3 className="font-semibold text-foreground">{employee.name}</h3>
                      <p className="text-sm text-muted-foreground">
                        {employee.totalCases} tracked cases · {employee.totalTeethTracked} teeth
                        · {employee.completionRate}% closed
                      </p>
                    </div>
                    {employee.urgentOpenCases > 0 ? (
                      <Badge variant="destructive">
                        {employee.urgentOpenCases} urgent
                      </Badge>
                    ) : employee.overdueCases > 0 ? (
                      <Badge variant="outline">{employee.overdueCases} overdue</Badge>
                    ) : (
                      <Badge variant="secondary">On track</Badge>
                    )}
                  </div>

                  <dl className="mt-4 grid grid-cols-2 gap-3 text-sm sm:grid-cols-3">
                    <div className="rounded-lg bg-muted/50 p-3">
                      <dt className="text-muted-foreground">Open cases</dt>
                      <dd className="mt-1 text-lg font-semibold">{employee.openCases}</dd>
                    </div>
                    <div className="rounded-lg bg-muted/50 p-3">
                      <dt className="text-muted-foreground">Open teeth</dt>
                      <dd className="mt-1 text-lg font-semibold">{employee.openTeeth}</dd>
                    </div>
                    <div className="rounded-lg bg-muted/50 p-3">
                      <dt className="text-muted-foreground">Closed cases</dt>
                      <dd className="mt-1 text-lg font-semibold">{employee.closedCases}</dd>
                    </div>
                    <div className="rounded-lg bg-muted/50 p-3">
                      <dt className="text-muted-foreground">Closed teeth</dt>
                      <dd className="mt-1 text-lg font-semibold">{employee.closedTeeth}</dd>
                    </div>
                    <div className="rounded-lg bg-muted/50 p-3">
                      <dt className="text-muted-foreground">Month processes</dt>
                      <dd className="mt-1 text-lg font-semibold">
                        {employee.completedProcessesThisMonth}
                      </dd>
                    </div>
                    <div className="rounded-lg bg-muted/50 p-3">
                      <dt className="text-muted-foreground">Avg. time</dt>
                      <dd className="mt-1 text-lg font-semibold">
                        {formatDays(employee.avgTurnaroundDays)}
                      </dd>
                    </div>
                  </dl>
                </div>
              ))}
            </div>
          ) : (
            <EmptyState title="No employee records were found for this dashboard" />
          )}
        </CardContent>
      </Card>
    </PageShell>
  );
}
