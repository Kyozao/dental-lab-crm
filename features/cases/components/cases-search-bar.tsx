"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { Search, X } from "lucide-react";
import { Panel } from "@/components/app/panel";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { NativeSelect } from "@/components/ui/native-select";
import { CASE_STATUS_OPTIONS } from "@/features/cases/types";
import type { CustomerOption } from "@/features/cases/types";

type Props = {
  customers: CustomerOption[];
  totalCases?: number;
  onSearchChange?: (query: string) => void;
};

const LIMIT_OPTIONS = [25, 50, 100, 200] as const;

export function CasesSearchBar({ customers, totalCases, onSearchChange }: Props) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const debounceTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  // Local state for instant feedback
  const [localQuery, setLocalQuery] = useState(searchParams.get("q") || "");
  const [status, setStatus] = useState(searchParams.get("status") || "");
  const [urgent, setUrgent] = useState(searchParams.get("urgent") || "");
  const [customerId, setCustomerId] = useState(searchParams.get("customerId") || "");
  const [limit, setLimit] = useState(searchParams.get("limit") || "100");

  // Debounced search handler
  const debouncedSearch = useCallback(
    (query: string, st: string, urg: string, cid: string, rowLimit: string) => {
      if (debounceTimeoutRef.current) {
        clearTimeout(debounceTimeoutRef.current);
      }

      // Call the callback for instant local filtering
      onSearchChange?.(query);

      // After 500ms, update server
      debounceTimeoutRef.current = setTimeout(() => {
        const params = new URLSearchParams();
        if (query) params.set("q", query);
        if (st) params.set("status", st);
        if (urg) params.set("urgent", urg);
        if (cid) params.set("customerId", cid);
        params.set("limit", rowLimit);

        router.push(`/cases?${params.toString()}`);
      }, 300);
    },
    [router, onSearchChange],
  );

  // Handle query changes
  const handleQueryChange = (value: string) => {
    setLocalQuery(value);
    debouncedSearch(value, status, urgent, customerId, limit);
  };

  const handleStatusChange = (value: string) => {
    setStatus(value);
    debouncedSearch(localQuery, value, urgent, customerId, limit);
  };

  const handleUrgentChange = (value: string) => {
    setUrgent(value);
    debouncedSearch(localQuery, status, value, customerId, limit);
  };

  const handleCustomerChange = (value: string) => {
    setCustomerId(value);
    debouncedSearch(localQuery, status, urgent, value, limit);
  };

  const handleLimitChange = (value: string) => {
    setLimit(value);
    debouncedSearch(localQuery, status, urgent, customerId, value);
  };

  const handleClear = () => {
    setLocalQuery("");
    setStatus("");
    setUrgent("");
    setCustomerId("");
    setLimit("100");

    if (debounceTimeoutRef.current) {
      clearTimeout(debounceTimeoutRef.current);
    }

    router.push(`/cases`);
  };

  // Cleanup timeout on unmount
  useEffect(() => {
    return () => {
      if (debounceTimeoutRef.current) {
        clearTimeout(debounceTimeoutRef.current);
      }
    };
  }, []);

  return (
    <Panel className="p-5">
        <div className="flex items-center gap-3 rounded-md border border-input bg-background px-3 shadow-xs transition-[color,box-shadow] focus-within:border-ring focus-within:ring-3 focus-within:ring-ring/50">
          <Search className="h-4 w-4 shrink-0 text-muted-foreground" />
          <Input
            type="text"
            value={localQuery}
            onChange={(e) => handleQueryChange(e.target.value)}
            placeholder="Search by code, patient, customer, dentist..."
            className="h-10 border-0 bg-transparent px-0 shadow-none focus-visible:ring-0"
          />
          {localQuery && (
            <Button
              type="button"
              variant="ghost"
              size="icon-sm"
              onClick={() => handleQueryChange("")}
              aria-label="Clear search"
            >
              <X className="h-4 w-4" />
            </Button>
          )}
        </div>

        <div className="mt-4 grid gap-3 sm:grid-cols-2 lg:grid-cols-5">
          <NativeSelect
            className="w-full"
              value={status}
              onChange={(e) => handleStatusChange(e.target.value)}
            >
              <option value="">All status</option>
              {CASE_STATUS_OPTIONS.map((opt) => (
                <option key={opt.value} value={opt.value}>
                  {opt.label}
                </option>
              ))}
          </NativeSelect>

          <NativeSelect
            className="w-full"
              value={urgent}
              onChange={(e) => handleUrgentChange(e.target.value)}
            >
              <option value="">Urgency: all</option>
              <option value="urgent">Urgent only</option>
              <option value="normal">Non-urgent only</option>
          </NativeSelect>

          <NativeSelect
            className="w-full"
              value={customerId}
              onChange={(e) => handleCustomerChange(e.target.value)}
            >
              <option value="">All customers</option>
              {customers.map((customer) => (
                <option key={customer.id} value={customer.id}>
                  {customer.name}
                </option>
              ))}
          </NativeSelect>

          <NativeSelect
            className="w-full"
              value={limit}
              onChange={(e) => handleLimitChange(e.target.value)}
            >
              {LIMIT_OPTIONS.map((size) => (
                <option key={size} value={size}>
                  {size} recent cases
                </option>
              ))}
          </NativeSelect>

          <div className="flex items-center gap-2">
            <Button
              type="button"
              variant="outline"
              onClick={handleClear}
              className="flex-1"
            >
              Clear
            </Button>
          </div>
        </div>

        <div className="mt-4 flex items-center justify-between text-xs text-muted-foreground">
          {typeof totalCases === "number" ? (
            <span>
              Total:{" "}
              <span className="font-semibold text-foreground">
                {totalCases}
              </span>{" "}
              cases
            </span>
          ) : (
            <span />
          )}
          {localQuery && (
            <span className="text-primary">
              Searching for <span className="font-medium">{localQuery}</span>
            </span>
          )}
        </div>
    </Panel>
  );
}
