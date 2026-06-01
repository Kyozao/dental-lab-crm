"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { Search, X } from "lucide-react";
import { Panel } from "@/components/app/panel";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { NativeSelect } from "@/components/ui/native-select";
import { CASE_STATUS_OPTIONS } from "../case.shared";
import type { ClinicOption } from "../case.shared";

type Props = {
  clinics: ClinicOption[];
  totalCases: number;
  onSearchChange?: (query: string) => void;
};

const PAGE_SIZE_OPTIONS = [25, 50, 100] as const;

export function CasesSearchBar({ clinics, totalCases, onSearchChange }: Props) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const debounceTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  // Local state for instant feedback
  const [localQuery, setLocalQuery] = useState(searchParams.get("q") || "");
  const [status, setStatus] = useState(searchParams.get("status") || "");
  const [urgent, setUrgent] = useState(searchParams.get("urgent") || "");
  const [clinicId, setClinicId] = useState(searchParams.get("clinicId") || "");
  const [pageSize, setPageSize] = useState(
    searchParams.get("pageSize") || "25",
  );

  // Debounced search handler
  const debouncedSearch = useCallback(
    (query: string, st: string, urg: string, cid: string, ps: string) => {
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
        if (cid) params.set("clinicId", cid);
        params.set("page", "1"); // Reset to page 1 on search
        params.set("pageSize", ps);

        router.push(`/cases?${params.toString()}`);
      }, 300);
    },
    [router, onSearchChange],
  );

  // Handle query changes
  const handleQueryChange = (value: string) => {
    setLocalQuery(value);
    debouncedSearch(value, status, urgent, clinicId, pageSize);
  };

  const handleStatusChange = (value: string) => {
    setStatus(value);
    debouncedSearch(localQuery, value, urgent, clinicId, pageSize);
  };

  const handleUrgentChange = (value: string) => {
    setUrgent(value);
    debouncedSearch(localQuery, status, value, clinicId, pageSize);
  };

  const handleClinicChange = (value: string) => {
    setClinicId(value);
    debouncedSearch(localQuery, status, urgent, value, pageSize);
  };

  const handlePageSizeChange = (value: string) => {
    setPageSize(value);
    debouncedSearch(localQuery, status, urgent, clinicId, value);
  };

  const handleClear = () => {
    setLocalQuery("");
    setStatus("");
    setUrgent("");
    setClinicId("");
    setPageSize("25");

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
            placeholder="Search by code, patient, clinic, dentist..."
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
              value={clinicId}
              onChange={(e) => handleClinicChange(e.target.value)}
            >
              <option value="">All clinics</option>
              {clinics.map((clinic) => (
                <option key={clinic.id} value={clinic.id}>
                  {clinic.name}
                </option>
              ))}
          </NativeSelect>

          <NativeSelect
            className="w-full"
              value={pageSize}
              onChange={(e) => handlePageSizeChange(e.target.value)}
            >
              {PAGE_SIZE_OPTIONS.map((size) => (
                <option key={size} value={size}>
                  {size} per page
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
          <span>
            Total:{" "}
            <span className="font-semibold text-foreground">{totalCases}</span>{" "}
            cases
          </span>
          {localQuery && (
            <span className="text-primary">
              Searching for <span className="font-medium">{localQuery}</span>
            </span>
          )}
        </div>
    </Panel>
  );
}
