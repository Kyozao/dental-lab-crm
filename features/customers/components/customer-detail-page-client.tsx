"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import {
  AlertTriangle,
  CalendarClock,
  Clock3,
  FolderKanban,
  Loader2,
  Mail,
  Phone,
  Users,
  Wallet,
} from "lucide-react";
import Link from "next/link";
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
import { Panel } from "@/components/app/panel";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
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
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { CASE_STATUS_META, getCaseStatusMeta } from "@/features/cases/constants";
import {
  formatCustomerDate,
  formatCustomerMoney,
  statusBadgeVariant,
} from "@/features/customers/customers-ui";
import {
  getCustomerDetailApi,
  updateCustomerApi,
} from "@/features/customers/services/customers-api";
import type { CustomerDetail } from "@/features/customers/types";
import {
  listPriceTablesApi,
  type PriceTableListItem,
} from "@/features/services/services-api";

import { AddDentistButton, AddDentistDialog } from "./add-dentist-dialog";
import { EditCustomerDialog } from "./edit-customer-dialog";
import { EditDentistDialog } from "./edit-dentist-dialog";

type CustomerDetailPageClientProps = {
  customerId: string;
};

const statusChartConfig = Object.fromEntries(
  Object.entries(CASE_STATUS_META).map(([status, meta]) => [
    status,
    { label: meta.shortLabel, color: meta.chartColor },
  ]),
) satisfies ChartConfig;

const serviceMixConfig = {
  count: {
    label: "Quantity",
    color: "#2563eb",
  },
} satisfies ChartConfig;

function getPieColor(index: number) {
  const colors = ["#0f172a", "#334155", "#64748b", "#94a3b8", "#cbd5e1", "#e2e8f0"];
  return colors[index % colors.length];
}

function formatRelativeDueDate(value: string | null) {
  if (!value) return "No due date";
  return formatCustomerDate(value);
}

function getNotesPreview(notes: string | null) {
  const trimmed = notes?.trim();
  if (!trimmed) return "No internal notes saved for this customer yet.";
  if (trimmed.length <= 160) return trimmed;
  return `${trimmed.slice(0, 157)}...`;
}

export function CustomerDetailPageClient({
  customerId,
}: CustomerDetailPageClientProps) {
  const [customer, setCustomer] = useState<CustomerDetail | null>(null);
  const [hydrated, setHydrated] = useState(false);
  const [loading, setLoading] = useState(true);
  const [addDentistOpen, setAddDentistOpen] = useState(false);
  const [editCustomerOpen, setEditCustomerOpen] = useState(false);
  const [editingDentistId, setEditingDentistId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
  const [priceTables, setPriceTables] = useState<PriceTableListItem[]>([]);
  const [selectedPriceTableId, setSelectedPriceTableId] = useState("");
  const [savingPriceTable, setSavingPriceTable] = useState(false);

  const refreshCustomer = useCallback(async () => {
    setLoading(true);
    setError(null);

    try {
      const [nextCustomer, nextPriceTables] = await Promise.all([
        getCustomerDetailApi(customerId),
        listPriceTablesApi(),
      ]);
      setCustomer(nextCustomer);
      setPriceTables(nextPriceTables);
      setSelectedPriceTableId(nextCustomer.price_table_id ?? "");
    } catch (loadError) {
      setError(
        loadError instanceof Error
          ? loadError.message
          : "Failed to load customer.",
      );
      setCustomer(null);
    } finally {
      setLoading(false);
    }
  }, [customerId]);

  useEffect(() => {
    setHydrated(true);
    void refreshCustomer();
  }, [refreshCustomer]);

  const editingDentist =
    customer?.dentists.find((dentist) => dentist.id === editingDentistId) ?? null;

  const primaryMetrics = useMemo(() => {
    if (!customer) return [];

    const { summary } = customer.dashboard;

    return [
      {
        label: "Total cases",
        value: summary.totalCases.toLocaleString(),
        icon: FolderKanban,
      },
      {
        label: "Open cases",
        value: summary.openCases.toLocaleString(),
        icon: Clock3,
      },
      {
        label: "Snapshot value",
        value: formatCustomerMoney(
          summary.totalSnapshotValue,
          summary.currency,
        ),
        icon: Wallet,
      },
    ];
  }, [customer]);

  const secondaryMetrics = useMemo(() => {
    if (!customer) return [];

    const { summary } = customer.dashboard;

    return [
      {
        label: "Dentists",
        value: summary.dentistCount.toLocaleString(),
        icon: Users,
      },
      {
        label: "Overdue",
        value: summary.overdueCases.toLocaleString(),
        icon: AlertTriangle,
      },
      {
        label: "Due soon",
        value: summary.dueSoonCases.toLocaleString(),
        icon: CalendarClock,
      },
    ];
  }, [customer]);

  const statusData = useMemo(() => {
    return (customer?.dashboard.statusBreakdown ?? []).map((item) => ({
      ...item,
      fill:
        CASE_STATUS_META[item.key as keyof typeof CASE_STATUS_META]?.chartColor ??
        "#6b7280",
      shortLabel:
        CASE_STATUS_META[item.key as keyof typeof CASE_STATUS_META]?.shortLabel ??
        item.label,
    }));
  }, [customer]);

  const serviceMixData = useMemo(() => {
    return (customer?.dashboard.serviceMix ?? []).slice(0, 6);
  }, [customer]);

  async function handleCustomerChanged(kind: "updated" | "archived") {
    setNotice(kind === "archived" ? "Customer archived." : "Customer updated.");
    await refreshCustomer();
  }

  async function handleDentistChanged(kind: "updated" | "archived") {
    setNotice(kind === "archived" ? "Dentist archived." : "Dentist updated.");
    await refreshCustomer();
  }

  async function handleDentistCreated() {
    setNotice("Dentist created.");
    await refreshCustomer();
  }

  async function handlePriceTableSave() {
    if (!customer) return;

    try {
      setSavingPriceTable(true);
      setError(null);
      await updateCustomerApi(customer.id, {
        name: customer.name,
        phone: customer.phone ?? "",
        email: customer.email ?? "",
        notes: customer.notes ?? "",
        price_table_id: selectedPriceTableId || null,
        is_active: customer.is_active,
      });
      setNotice("Customer pricing updated.");
      await refreshCustomer();
    } catch (saveError) {
      setError(
        saveError instanceof Error
          ? saveError.message
          : "Failed to update customer pricing.",
      );
    } finally {
      setSavingPriceTable(false);
    }
  }

  return (
    <>
      <AddDentistDialog
        customerId={customerId}
        open={addDentistOpen}
        onOpenChange={setAddDentistOpen}
        onCreated={handleDentistCreated}
      />

      <EditCustomerDialog
        customer={customer}
        open={editCustomerOpen}
        onOpenChange={setEditCustomerOpen}
        onChanged={handleCustomerChanged}
      />

      <EditDentistDialog
        dentist={editingDentist}
        open={editingDentist !== null}
        onOpenChange={(open) => {
          if (!open) setEditingDentistId(null);
        }}
        onChanged={handleDentistChanged}
      />

      <div className="grid gap-5">
        {error ? (
          <div className="rounded-lg border border-destructive/20 bg-destructive/5 px-4 py-3 text-sm text-destructive">
            {error}
          </div>
        ) : null}

        {loading ? (
          <Panel>
            <div className="flex items-center justify-center gap-2 px-6 py-12 text-sm text-muted-foreground">
              <Loader2 className="h-4 w-4 animate-spin" />
              Loading customer...
            </div>
          </Panel>
        ) : null}

        {!loading && !customer ? (
          <Panel>
            <EmptyState
              title="Customer not found"
              description="This customer could not be found in the current lab."
            />
          </Panel>
        ) : null}

        {!loading && customer ? (
          <>
            <section className="overflow-hidden rounded-[28px] border border-border/60 bg-[linear-gradient(135deg,rgba(15,23,42,0.04),rgba(15,23,42,0.01)_45%,rgba(255,255,255,0.9))]">
              <div className="grid gap-6 px-5 py-6 sm:px-6">
                <div className="space-y-5">
                  <div className="flex flex-wrap items-center gap-3 text-sm text-muted-foreground">
                    <Button variant="ghost" asChild className="-ml-3 h-auto px-3 py-1.5">
                      <Link href="/customers">Back to directory</Link>
                    </Button>
                    <span className="hidden h-1 w-1 rounded-full bg-border sm:inline-block" />
                    <span>Customer detail</span>
                  </div>

                  <div className="space-y-3">
                    <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
                      <div className="space-y-2">
                        <div className="flex flex-wrap items-center gap-2">
                          <Badge variant={customer.is_active ? "success" : "neutral"}>
                            {customer.is_active ? "Active" : "Inactive"}
                          </Badge>
                          {notice ? <Badge variant="success">{notice}</Badge> : null}
                        </div>
                        <div>
                          <h1 className="text-3xl font-semibold tracking-tight text-foreground sm:text-4xl">
                            {customer.name}
                          </h1>
                          <p className="mt-2 max-w-2xl text-sm leading-6 text-muted-foreground">
                            Business activity, customer-owned dentists, and recent case momentum in one view.
                          </p>
                        </div>
                      </div>

                      <div className="flex flex-wrap gap-2">
                        <Button
                          type="button"
                          variant="outline"
                          size="sm"
                          onClick={() => setEditCustomerOpen(true)}
                        >
                          Edit customer
                        </Button>
                        <Button
                          type="button"
                          variant="outline"
                          size="sm"
                          onClick={() => void refreshCustomer()}
                          disabled={!hydrated || loading}
                        >
                          Refresh
                        </Button>
                      </div>
                    </div>

                    <div className="flex flex-wrap gap-3 text-sm">
                      <div className="inline-flex min-h-11 items-center gap-2 rounded-full border border-border/60 bg-background/80 px-4 py-2 text-muted-foreground">
                        <Mail className="h-4 w-4" />
                        <span>{customer.email ?? "No email recorded"}</span>
                      </div>
                      <div className="inline-flex min-h-11 items-center gap-2 rounded-full border border-border/60 bg-background/80 px-4 py-2 text-muted-foreground">
                        <Phone className="h-4 w-4" />
                        <span>{customer.phone ?? "No phone recorded"}</span>
                      </div>
                    </div>

                    <div className="grid gap-3 xl:grid-cols-[minmax(0,1.2fr)_auto_auto]">
                      <div className="rounded-2xl border border-border/50 bg-background/70 px-4 py-3">
                        <div className="text-xs uppercase tracking-[0.16em] text-muted-foreground">
                          Notes
                        </div>
                        <div className="mt-2 text-sm leading-6 text-foreground">
                          {getNotesPreview(customer.notes)}
                        </div>
                      </div>
                      <div className="rounded-2xl border border-border/50 bg-background/70 px-4 py-3 text-sm text-muted-foreground">
                        <div className="text-xs uppercase tracking-[0.16em]">Added</div>
                        <div className="mt-1 font-medium text-foreground">
                          {formatCustomerDate(customer.created_at)}
                        </div>
                      </div>
                      <div className="rounded-2xl border border-border/50 bg-background/70 px-4 py-3 text-sm text-muted-foreground">
                        <div className="text-xs uppercase tracking-[0.16em]">Updated</div>
                        <div className="mt-1 font-medium text-foreground">
                          {formatCustomerDate(customer.updated_at)}
                        </div>
                      </div>
                    </div>

                    <div className="rounded-2xl border border-border/50 bg-background/70 px-4 py-4">
                      <div className="flex flex-col gap-3 lg:flex-row lg:items-end lg:justify-between">
                        <div className="grid gap-1">
                          <div className="text-xs uppercase tracking-[0.16em] text-muted-foreground">
                            Assigned price table
                          </div>
                          <p className="text-sm text-muted-foreground">
                            Control which reusable customer pricing defaults load into new case service lines.
                          </p>
                        </div>
                        <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
                          <select
                            value={selectedPriceTableId}
                            onChange={(event) => setSelectedPriceTableId(event.target.value)}
                            className="flex h-10 min-w-[240px] rounded-md border bg-background px-3 py-2 text-sm"
                            disabled={savingPriceTable}
                          >
                            <option value="">Use service base prices</option>
                            {priceTables.map((priceTable) => (
                              <option key={priceTable.id} value={priceTable.id}>
                                {priceTable.name}
                              </option>
                            ))}
                          </select>
                          <Button
                            type="button"
                            variant="outline"
                            onClick={() => void handlePriceTableSave()}
                            disabled={savingPriceTable}
                          >
                            {savingPriceTable ? "Saving..." : "Save pricing"}
                          </Button>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </section>

            <div className="grid gap-5 xl:grid-cols-[minmax(0,1.45fr)_minmax(320px,0.8fr)]">
              <div className="space-y-5">
                <Card className="overflow-hidden border-border/60">
                  <CardHeader className="border-b border-border/50 pb-4">
                    <div className="flex flex-wrap items-start justify-between gap-3">
                      <div>
                        <CardTitle>Recent cases</CardTitle>
                        <CardDescription>
                          The latest customer work, prioritized by case status, due date, and value.
                        </CardDescription>
                      </div>
                      <Badge variant="outline">
                        {customer.dashboard.recentCases.length} recent
                      </Badge>
                    </div>
                  </CardHeader>
                  <CardContent className="space-y-3 pt-5">
                    {customer.dashboard.recentCases.length === 0 ? (
                      <EmptyState
                        title="No cases yet"
                        description="Recent case activity will appear here after the first case is created for this customer."
                        className="px-0 py-8"
                      />
                    ) : (
                      customer.dashboard.recentCases.map((caseItem) => {
                        const statusMeta = getCaseStatusMeta(caseItem.currentStatus);

                        return (
                          <div
                            key={caseItem.id}
                            className="rounded-2xl border border-border/60 bg-muted/10 p-4 transition-colors hover:bg-muted/20"
                          >
                            <div className="flex flex-wrap items-start justify-between gap-3">
                              <div className="space-y-1">
                                <div className="flex flex-wrap items-center gap-2">
                                  <span className="text-sm font-semibold tracking-[0.14em] text-muted-foreground">
                                    {caseItem.code}
                                  </span>
                                  <span className="text-muted-foreground">/</span>
                                  <span className="font-medium">{caseItem.patientName}</span>
                                </div>
                                <div className="text-sm text-muted-foreground">
                                  {caseItem.serviceSummary}
                                </div>
                              </div>
                              <Badge variant={statusBadgeVariant(caseItem.currentStatus)}>
                                {statusMeta?.shortLabel ?? caseItem.currentStatus}
                              </Badge>
                            </div>

                            <div className="mt-4 grid gap-2 text-xs text-muted-foreground sm:grid-cols-3">
                              <div className="rounded-xl border border-border/50 bg-background/70 px-3 py-2">
                                <div className="uppercase tracking-[0.16em]">Due</div>
                                <div className="mt-1 font-medium text-foreground">
                                  {formatRelativeDueDate(caseItem.dueDate)}
                                </div>
                              </div>
                              <div className="rounded-xl border border-border/50 bg-background/70 px-3 py-2">
                                <div className="uppercase tracking-[0.16em]">Value</div>
                                <div className="mt-1 font-medium text-foreground">
                                  {formatCustomerMoney(
                                    caseItem.snapshotValue,
                                    customer.dashboard.summary.currency,
                                  )}
                                </div>
                              </div>
                              <div className="rounded-xl border border-border/50 bg-background/70 px-3 py-2">
                                <div className="uppercase tracking-[0.16em]">Updated</div>
                                <div className="mt-1 font-medium text-foreground">
                                  {formatCustomerDate(caseItem.updatedAt)}
                                </div>
                              </div>
                            </div>
                          </div>
                        );
                      })
                    )}
                  </CardContent>
                </Card>

                <Card className="border-border/60">
                  <CardHeader className="border-b border-border/50 pb-4">
                    <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                      <div>
                        <CardTitle>Dentist management</CardTitle>
                        <CardDescription>
                          Customer-owned dentist contacts used across case assignment and communication flows.
                        </CardDescription>
                      </div>
                      <AddDentistButton
                        disabled={!hydrated}
                        onClick={() => setAddDentistOpen(true)}
                      />
                    </div>
                  </CardHeader>
                  <CardContent className="px-0 pt-0">
                    <div className="overflow-x-auto">
                      <Table>
                        <TableHeader>
                          <TableRow>
                            <TableHead className="pl-6">Name</TableHead>
                            <TableHead>Contact</TableHead>
                            <TableHead>Status</TableHead>
                            <TableHead className="w-[120px] pr-6 text-right">Manage</TableHead>
                          </TableRow>
                        </TableHeader>
                        <TableBody>
                          {customer.dentists.length === 0 ? (
                            <TableRow>
                              <TableCell colSpan={4} className="px-6 py-8">
                                <EmptyState
                                  title="No active dentists"
                                  description="Add the first dentist for this customer to keep case assignment options ready."
                                  className="py-2"
                                />
                              </TableCell>
                            </TableRow>
                          ) : (
                            customer.dentists.map((dentist) => (
                              <TableRow key={dentist.id}>
                                <TableCell className="pl-6">
                                  <div className="space-y-1">
                                    <div className="font-medium">{dentist.name}</div>
                                    {dentist.notes?.trim() ? (
                                      <div className="max-w-[260px] truncate text-xs text-muted-foreground">
                                        {dentist.notes}
                                      </div>
                                    ) : null}
                                  </div>
                                </TableCell>
                                <TableCell>
                                  <div className="space-y-1 text-sm">
                                    <div>{dentist.email ?? "-"}</div>
                                    <div className="text-muted-foreground">
                                      {dentist.phone ?? "No phone"}
                                    </div>
                                  </div>
                                </TableCell>
                                <TableCell>
                                  <Badge variant={dentist.is_active ? "success" : "neutral"}>
                                    {dentist.is_active ? "Active" : "Inactive"}
                                  </Badge>
                                </TableCell>
                                <TableCell className="pr-6 text-right">
                                  <Button
                                    type="button"
                                    variant="outline"
                                    size="sm"
                                    onClick={() => setEditingDentistId(dentist.id)}
                                  >
                                    Manage
                                  </Button>
                                </TableCell>
                              </TableRow>
                            ))
                          )}
                        </TableBody>
                      </Table>
                    </div>
                  </CardContent>
                </Card>
              </div>

              <aside className="space-y-5">
                <Card className="border-border/60">
                  <CardHeader className="pb-4">
                    <CardTitle>Customer summary</CardTitle>
                    <CardDescription>
                      The top-line numbers for this account, with the primary metrics surfaced first.
                    </CardDescription>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <div className="grid gap-3">
                      {primaryMetrics.map((item) => {
                        const Icon = item.icon;

                        return (
                          <div
                            key={item.label}
                            className="flex items-center justify-between gap-4 rounded-2xl border border-border/60 bg-muted/10 px-4 py-4"
                          >
                            <div>
                              <div className="text-xs uppercase tracking-[0.18em] text-muted-foreground">
                                {item.label}
                              </div>
                              <div className="mt-2 text-2xl font-semibold tracking-tight">
                                {item.value}
                              </div>
                            </div>
                            <div className="rounded-2xl bg-accent p-3 text-muted-foreground">
                              <Icon className="h-4 w-4" />
                            </div>
                          </div>
                        );
                      })}
                    </div>

                    <div className="grid gap-3 sm:grid-cols-3 xl:grid-cols-1 2xl:grid-cols-3">
                      {secondaryMetrics.map((item) => {
                        const Icon = item.icon;

                        return (
                          <div
                            key={item.label}
                            className="rounded-2xl border border-dashed border-border/60 px-4 py-3"
                          >
                            <div className="flex items-center gap-2 text-xs uppercase tracking-[0.16em] text-muted-foreground">
                              <Icon className="h-3.5 w-3.5" />
                              {item.label}
                            </div>
                            <div className="mt-2 text-lg font-semibold">{item.value}</div>
                          </div>
                        );
                      })}
                    </div>
                  </CardContent>
                </Card>

                <Card className="border-border/60">
                  <CardHeader className="pb-3">
                    <CardTitle>Operational breakdown</CardTitle>
                    <CardDescription>
                      Status distribution across this customer&apos;s active and historical work.
                    </CardDescription>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    {statusData.length === 0 ? (
                      <EmptyState
                        title="No status data"
                        description="Status distribution will appear after this customer has cases."
                        className="px-0 py-8"
                      />
                    ) : (
                      <>
                        <ChartContainer config={statusChartConfig} className="h-56 w-full">
                          <BarChart accessibilityLayer data={statusData}>
                            <CartesianGrid vertical={false} />
                            <XAxis
                              dataKey="shortLabel"
                              tickLine={false}
                              axisLine={false}
                            />
                            <YAxis allowDecimals={false} />
                            <ChartTooltip
                              cursor={false}
                              content={<ChartTooltipContent indicator="dot" />}
                            />
                            <Bar dataKey="count" radius={6}>
                              {statusData.map((entry) => (
                                <Cell key={entry.key} fill={entry.fill} />
                              ))}
                            </Bar>
                          </BarChart>
                        </ChartContainer>

                        <div className="grid gap-2">
                          {statusData.map((item) => (
                            <div
                              key={item.key}
                              className="flex items-center justify-between rounded-xl border border-border/50 px-3 py-2 text-sm"
                            >
                              <div className="flex items-center gap-2">
                                <span
                                  className="h-2.5 w-2.5 rounded-full"
                                  style={{ backgroundColor: item.fill }}
                                />
                                <span>{item.shortLabel}</span>
                              </div>
                              <Badge variant="outline">{item.count}</Badge>
                            </div>
                          ))}
                        </div>
                      </>
                    )}
                  </CardContent>
                </Card>

                <Card className="border-border/60">
                  <CardHeader className="pb-3">
                    <CardTitle>Service mix</CardTitle>
                    <CardDescription>
                      Snapshot service distribution based on case service lines and quantities.
                    </CardDescription>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    {serviceMixData.length === 0 ? (
                      <EmptyState
                        title="No service mix yet"
                        description="Service distribution will appear after this customer has case service lines."
                        className="px-0 py-8"
                      />
                    ) : (
                      <>
                        <ChartContainer
                          config={serviceMixConfig}
                          className="mx-auto h-48 w-full max-w-[280px]"
                        >
                          <PieChart>
                            <ChartTooltip
                              cursor={false}
                              content={
                                <ChartTooltipContent hideLabel indicator="dot" />
                              }
                            />
                            <Pie
                              data={serviceMixData}
                              dataKey="count"
                              nameKey="label"
                              innerRadius={44}
                              outerRadius={72}
                              paddingAngle={2}
                            >
                              {serviceMixData.map((item, index) => (
                                <Cell key={item.key} fill={getPieColor(index)} />
                              ))}
                            </Pie>
                          </PieChart>
                        </ChartContainer>

                        <div className="space-y-2">
                          {serviceMixData.map((item, index) => (
                            <div
                              key={item.key}
                              className="flex items-center justify-between gap-3 rounded-xl border border-border/50 px-3 py-2"
                            >
                              <div className="flex items-center gap-2">
                                <span
                                  className="h-2.5 w-2.5 rounded-full"
                                  style={{ backgroundColor: getPieColor(index) }}
                                />
                                <span className="text-sm font-medium">{item.label}</span>
                              </div>
                              <Badge variant="outline">{item.count}</Badge>
                            </div>
                          ))}
                        </div>
                      </>
                    )}
                  </CardContent>
                </Card>
              </aside>
            </div>
          </>
        ) : null}
      </div>
    </>
  );
}
