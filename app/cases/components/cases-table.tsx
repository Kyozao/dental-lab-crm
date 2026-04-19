"use client";

import { useEffect, useState } from "react";
import { createPortal } from "react-dom";
import { CaseDetailsDialog } from "@/components/cases/case-details-dialog";
import { getCaseDetailsApi } from "@/lib/api/cases-client";
import type {
  CadDesignerOption,
  ClinicOption,
  ComponentOption,
  EditableCase,
  ServiceTypeOption,
} from "../case.shared";

type CaseListItem = {
  id: string;
  code: string | null;
  patientName: string | null;
  currentStatus: string;
  isUrgent: boolean;
  clinicName: string;
  dentistName: string;
  serviceTypeName: string;
  cadDesignerName: string;
};

type Props = {
  cases: CaseListItem[];
  clinics: ClinicOption[];
  serviceTypes: ServiceTypeOption[];
  cadDesigners: CadDesignerOption[];
  components: ComponentOption[];
  currentUserRole: string;
};

const statusColors: Record<string, { badge: string; dot: string }> = {
  ENTRY: {
    badge: "bg-slate-50 text-slate-700 border-slate-200",
    dot: "bg-slate-400",
  },
  WAITING_INFO: {
    badge: "bg-amber-50 text-amber-700 border-amber-200",
    dot: "bg-amber-400",
  },
  DESIGNING: {
    badge: "bg-blue-50 text-blue-700 border-blue-200",
    dot: "bg-blue-400",
  },
  WAITING_APPROVAL: {
    badge: "bg-purple-50 text-purple-700 border-purple-200",
    dot: "bg-purple-400",
  },
  DESIGN_READY: {
    badge: "bg-green-50 text-green-700 border-green-200",
    dot: "bg-green-400",
  },
  MILLING_PRINTING: {
    badge: "bg-orange-50 text-orange-700 border-orange-200",
    dot: "bg-orange-400",
  },
  DONE: {
    badge: "bg-emerald-50 text-emerald-700 border-emerald-200",
    dot: "bg-emerald-400",
  },
};

export function CasesTable({
  cases,
  clinics,
  serviceTypes,
  cadDesigners,
  components,
  currentUserRole,
}: Props) {
  const [open, setOpen] = useState(false);
  const [selectedCase, setSelectedCase] = useState<EditableCase | null>(null);
  const [loadingCaseId, setLoadingCaseId] = useState<string | null>(null);
  const isOpeningCase = Boolean(loadingCaseId);

  async function handleRowClick(caseId: string) {
    if (loadingCaseId) return;

    try {
      setLoadingCaseId(caseId);
      const details = await getCaseDetailsApi(caseId);
      setSelectedCase(details);
      setOpen(true);
    } catch (error) {
      const message =
        error instanceof Error
          ? error.message
          : "Nao foi possivel carregar os detalhes do caso.";
      window.alert(message);
    } finally {
      setLoadingCaseId(null);
    }
  }

  function handleOpenChange(nextOpen: boolean) {
    setOpen(nextOpen);
    if (!nextOpen) {
      setSelectedCase(null);
    }
  }

  return (
    <>
      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-border/50 bg-muted/50">
              <th className="px-6 py-4 text-left font-semibold text-foreground">
                Code
              </th>
              <th className="px-6 py-4 text-left font-semibold text-foreground">
                Patient
              </th>
              <th className="px-6 py-4 text-left font-semibold text-foreground">
                Clinic
              </th>
              <th className="px-6 py-4 text-left font-semibold text-foreground">
                Dentist
              </th>
              <th className="px-6 py-4 text-left font-semibold text-foreground">
                Service
              </th>
              <th className="px-6 py-4 text-left font-semibold text-foreground">
                Designer
              </th>
              <th className="px-6 py-4 text-left font-semibold text-foreground">
                Status
              </th>
              <th className="px-6 py-4 text-center font-semibold text-foreground">
                Priority
              </th>
            </tr>
          </thead>
          <tbody className="divide-y divide-border/50">
            {cases.map((item) =>
              (() => {
                const isLoading = loadingCaseId === item.id;

                return (
                  <tr
                    key={item.id}
                    role="button"
                    tabIndex={0}
                    onClick={() => void handleRowClick(item.id)}
                    onKeyDown={(event) => {
                      if (isLoading) return;
                      if (event.key === "Enter" || event.key === " ") {
                        event.preventDefault();
                        void handleRowClick(item.id);
                      }
                    }}
                    aria-busy={isLoading}
                    className={`group transition-all duration-200 focus-visible:bg-muted/60 focus-visible:outline-none ${
                      isOpeningCase
                        ? "cursor-progress"
                        : "cursor-pointer hover:bg-muted/60 active:bg-muted/80"
                    }`}
                  >
                    {/* Code */}
                    <td className="px-6 py-4 font-semibold text-foreground group-hover:text-primary transition-colors">
                      <span>{item.code}</span>
                    </td>

                    {/* Patient */}
                    <td className="px-6 py-4 text-foreground">
                      {item.patientName}
                    </td>

                    {/* Clinic */}
                    <td className="px-6 py-4 text-sm text-muted-foreground">
                      {item.clinicName}
                    </td>

                    {/* Dentist */}
                    <td className="px-6 py-4 text-sm text-muted-foreground">
                      {item.dentistName}
                    </td>

                    {/* Service */}
                    <td className="px-6 py-4 text-sm text-muted-foreground">
                      {item.serviceTypeName}
                    </td>

                    {/* Designer */}
                    <td className="px-6 py-4 text-sm text-muted-foreground">
                      {item.cadDesignerName}
                    </td>

                    {/* Status */}
                    <td className="px-6 py-4">
                      <div
                        className={`inline-flex items-center gap-2 rounded-full border px-3 py-1.5 text-xs font-medium transition-all ${
                          statusColors[item.currentStatus]?.badge ||
                          "bg-gray-50 text-gray-700 border-gray-200"
                        }`}
                      >
                        <span
                          className={`h-1.5 w-1.5 rounded-full ${
                            statusColors[item.currentStatus]?.dot ||
                            "bg-gray-400"
                          }`}
                        ></span>
                        {item.currentStatus.replace(/_/g, " ")}
                      </div>
                    </td>

                    {/* Priority */}
                    <td className="px-6 py-4 text-center">
                      {item.isUrgent ? (
                        <div className="inline-flex items-center justify-center h-7 w-7 rounded-lg bg-red-100 group-hover:bg-red-200 transition-colors">
                          <svg
                            className="h-4 w-4 text-red-600"
                            xmlns="http://www.w3.org/2000/svg"
                            viewBox="0 0 24 24"
                            fill="currentColor"
                          >
                            <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm1 15h-2v-2h2v2zm0-4h-2V7h2v6z" />
                          </svg>
                        </div>
                      ) : (
                        <span className="text-xs text-muted-foreground">—</span>
                      )}
                    </td>
                  </tr>
                );
              })(),
            )}
          </tbody>
        </table>
      </div>

      <CaseOpeningOverlay open={isOpeningCase} />

      <CaseDetailsDialog
        open={open}
        onOpenChange={handleOpenChange}
        item={selectedCase}
        currentUserRole={currentUserRole}
        clinics={clinics}
        serviceTypes={serviceTypes}
        cadDesigners={cadDesigners}
        components={components}
      />
    </>
  );
}

function CaseOpeningOverlay({ open }: { open: boolean }) {
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
    return () => setMounted(false);
  }, []);

  if (!open || !mounted) {
    return null;
  }

  return createPortal(
    <div className="fixed inset-0 isolate z-50 flex items-center justify-center bg-black/10 supports-backdrop-filter:backdrop-blur-xs">
      <div className="rounded-xl border border-border/60 bg-card px-6 py-4 shadow-lg">
        <div className="flex items-center gap-3">
          <div className="h-5 w-5 rounded-full border-2 border-muted-foreground/40 border-t-primary animate-spin" />
          <span className="text-sm font-medium text-foreground">
            Opening case...
          </span>
        </div>
      </div>
    </div>,
    document.body,
  );
}
