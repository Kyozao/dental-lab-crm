"use client";

import Link from "next/link";
import { useEffect, useState } from "react";

import { EmptyState } from "@/components/app/empty-state";
import { Panel, PanelHeader } from "@/components/app/panel";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { RefreshButton } from "@/components/ui/refresh-button";
import { Spinner } from "@/components/ui/spinner";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  formatCustomerDate,
  summarizeDentists,
} from "@/features/customers/customers-ui";
import { listCustomersApi } from "@/features/customers/services/customers-api";
import type { Customer } from "@/features/customers/types";

import { AddCustomerButton, AddCustomerDialog } from "./add-customer-dialog";

export function CustomersPageClient() {
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [hydrated, setHydrated] = useState(false);
  const [loading, setLoading] = useState(true);
  const [addDialogOpen, setAddDialogOpen] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);

  async function refreshCustomers() {
    setLoading(true);
    setError(null);

    try {
      const nextCustomers = await listCustomersApi();
      setCustomers(nextCustomers);
    } catch (loadError) {
      setError(
        loadError instanceof Error
          ? loadError.message
          : "Failed to load customers.",
      );
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    setHydrated(true);
    void refreshCustomers();
  }, []);

  return (
    <>
      <AddCustomerDialog
        open={addDialogOpen}
        onOpenChange={setAddDialogOpen}
        onCreated={async () => {
          setNotice("Customer created.");
          await refreshCustomers();
        }}
      />

      <Panel>
        <PanelHeader>
          <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
            <div>
              <h2 className="text-base font-semibold">Customer directory</h2>
              <p className="text-sm text-muted-foreground">
                {loading ? (
                  <span className="inline-flex items-center gap-2">
                    <Spinner className="size-4" />
                    <span className="sr-only">Loading customers</span>
                  </span>
                ) : (
                  `${customers.length} ${customers.length === 1 ? "customer" : "customers"}`
                )}
              </p>
            </div>
            <div className="flex flex-wrap items-center gap-2">
              {notice ? <Badge variant="success">{notice}</Badge> : null}
              <RefreshButton
                onClick={() => void refreshCustomers()}
                disabled={!hydrated || loading}
                label="Refresh customers"
                spinning={loading}
              />
              <AddCustomerButton
                disabled={!hydrated || loading}
                onClick={() => setAddDialogOpen(true)}
              />
            </div>
          </div>
        </PanelHeader>

        {error ? (
          <div className="border-b border-border/40 bg-destructive/5 px-4 py-3 text-sm text-destructive sm:px-6">
            {error}
          </div>
        ) : null}

        <div className="overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Name</TableHead>
                <TableHead>Email</TableHead>
                <TableHead>Phone</TableHead>
                <TableHead>Dentists</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Added</TableHead>
                <TableHead className="w-[120px] text-right">Open</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {loading ? (
                <TableRow>
                  <TableCell colSpan={7} className="py-8 text-center text-sm text-muted-foreground">
                    <div className="flex items-center justify-center">
                      <Spinner className="size-4" />
                      <span className="sr-only">Loading customers</span>
                    </div>
                  </TableCell>
                </TableRow>
              ) : null}

              {!loading && customers.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={7}>
                    <EmptyState
                      title="No customers registered yet"
                      description="Add the first customer to start organizing dentists and cases."
                    />
                  </TableCell>
                </TableRow>
              ) : null}

              {!loading
                ? customers.map((customer) => (
                    <TableRow key={customer.id}>
                      <TableCell className="font-medium">{customer.name}</TableCell>
                      <TableCell>{customer.email ?? "-"}</TableCell>
                      <TableCell>{customer.phone ?? "-"}</TableCell>
                      <TableCell>{summarizeDentists(customer.dentists)}</TableCell>
                      <TableCell>
                        <Badge variant={customer.is_active ? "success" : "neutral"}>
                          {customer.is_active ? "Active" : "Inactive"}
                        </Badge>
                      </TableCell>
                      <TableCell>{formatCustomerDate(customer.created_at)}</TableCell>
                      <TableCell className="text-right">
                        <Button type="button" variant="outline" size="sm" asChild>
                          <Link href={`/customers/${customer.id}`}>Open</Link>
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))
                : null}
            </TableBody>
          </Table>
        </div>
      </Panel>
    </>
  );
}
