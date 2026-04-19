"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { CASE_STATUS_OPTIONS } from "../case.shared";
import type { ClinicOption } from "../case.shared";

type Props = {
  clinics: ClinicOption[];
  totalCases: number;
  scope: "LAB" | "AGENCY";
  onSearchChange?: (query: string) => void;
};

const PAGE_SIZE_OPTIONS = [25, 50, 100] as const;

export function CasesSearchBar({
  clinics,
  totalCases,
  scope,
  onSearchChange,
}: Props) {
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
        params.set("scope", scope);
        if (st) params.set("status", st);
        if (urg) params.set("urgent", urg);
        if (cid) params.set("clinicId", cid);
        params.set("page", "1"); // Reset to page 1 on search
        params.set("pageSize", ps);

        router.push(`/cases?${params.toString()}`);
      }, 300);
    },
    [router, onSearchChange, scope],
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

    router.push(`/cases?scope=${scope}`);
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
    <div className="mb-8 space-y-4">
      <div className="flex flex-col gap-4 rounded-xl border border-border/50 bg-card/50 backdrop-blur-sm p-5 shadow-sm">
        {/* Search Bar */}
        <div className="flex items-center gap-3 rounded-lg border border-border/50 bg-background px-4 py-3 focus-within:border-primary/50 focus-within:ring-1 focus-within:ring-primary/20 transition-all">
          <svg
            className="h-5 w-5 shrink-0 text-muted-foreground"
            xmlns="http://www.w3.org/2000/svg"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
          >
            <circle cx="11" cy="11" r="8"></circle>
            <path d="m21 21-4.35-4.35"></path>
          </svg>
          <input
            type="text"
            value={localQuery}
            onChange={(e) => handleQueryChange(e.target.value)}
            placeholder="Search by code, patient, clinic, dentist..."
            className="flex-1 bg-transparent text-sm outline-none placeholder:text-muted-foreground"
          />
          {localQuery && (
            <button
              type="button"
              onClick={() => handleQueryChange("")}
              className="text-muted-foreground hover:text-foreground transition-colors"
              aria-label="Clear search"
            >
              <svg
                className="h-4 w-4"
                xmlns="http://www.w3.org/2000/svg"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
              >
                <path d="M18 6l-12 12M6 6l12 12"></path>
              </svg>
            </button>
          )}
        </div>

        {/* Filter Row */}
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-5">
          <div className="relative">
            <select
              value={status}
              onChange={(e) => handleStatusChange(e.target.value)}
              className="w-full h-10 rounded-lg border border-border/50 bg-background px-3 text-sm appearance-none cursor-pointer hover:border-border/70 transition-colors"
            >
              <option value="">All statuses</option>
              {CASE_STATUS_OPTIONS.map((opt) => (
                <option key={opt.value} value={opt.value}>
                  {opt.label}
                </option>
              ))}
            </select>
          </div>

          <div className="relative">
            <select
              value={urgent}
              onChange={(e) => handleUrgentChange(e.target.value)}
              className="w-full h-10 rounded-lg border border-border/50 bg-background px-3 text-sm appearance-none cursor-pointer hover:border-border/70 transition-colors"
            >
              <option value="">Urgency: all</option>
              <option value="urgent">Urgent only</option>
              <option value="normal">Non-urgent only</option>
            </select>
          </div>

          <div className="relative">
            <select
              value={clinicId}
              onChange={(e) => handleClinicChange(e.target.value)}
              className="w-full h-10 rounded-lg border border-border/50 bg-background px-3 text-sm appearance-none cursor-pointer hover:border-border/70 transition-colors"
            >
              <option value="">All clinics</option>
              {clinics.map((clinic) => (
                <option key={clinic.id} value={clinic.id}>
                  {clinic.name}
                </option>
              ))}
            </select>
          </div>

          <div className="relative">
            <select
              value={pageSize}
              onChange={(e) => handlePageSizeChange(e.target.value)}
              className="w-full h-10 rounded-lg border border-border/50 bg-background px-3 text-sm appearance-none cursor-pointer hover:border-border/70 transition-colors"
            >
              {PAGE_SIZE_OPTIONS.map((size) => (
                <option key={size} value={size}>
                  {size} per page
                </option>
              ))}
            </select>
          </div>

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={handleClear}
              className="flex-1 rounded-lg border border-border/50 px-4 py-2.5 text-sm font-medium hover:bg-muted/50 transition-colors"
            >
              Clear
            </button>
          </div>
        </div>

        {/* Filter Info */}
        <div className="flex items-center justify-between text-xs text-muted-foreground pt-1">
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
      </div>
    </div>
  );
}
