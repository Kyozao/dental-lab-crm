export const CASE_STATUS = {
  ENTRY: "ENTRY",
  WAITING_INFO: "WAITING_INFO",
  DESIGNING: "DESIGNING",
  WAITING_APPROVAL: "WAITING_APPROVAL",
  DESIGN_READY: "DESIGN_READY",
  MILLING_PRINTING: "MILLING_PRINTING",
  DONE: "DONE",
} as const;

export type CaseStatusValue =
  (typeof CASE_STATUS)[keyof typeof CASE_STATUS];

export type CaseStatusTone =
  | "neutral"
  | "warning"
  | "info"
  | "success"
  | "danger";

export const CASE_STATUS_META: Record<
  CaseStatusValue,
  {
    label: string;
    shortLabel: string;
    tone: CaseStatusTone;
    chartColor: string;
    dotClassName: string;
  }
> = {
  ENTRY: {
    label: "Entrada",
    shortLabel: "Entry",
    tone: "neutral",
    chartColor: "#64748b",
    dotClassName: "bg-slate-400",
  },
  WAITING_INFO: {
    label: "Aguardando Informacoes",
    shortLabel: "Waiting info",
    tone: "warning",
    chartColor: "#eab308",
    dotClassName: "bg-amber-400",
  },
  DESIGNING: {
    label: "Desenhando",
    shortLabel: "Designing",
    tone: "info",
    chartColor: "#2563eb",
    dotClassName: "bg-blue-400",
  },
  WAITING_APPROVAL: {
    label: "Aguardando Aprovacao",
    shortLabel: "Approval",
    tone: "info",
    chartColor: "#8b5cf6",
    dotClassName: "bg-violet-400",
  },
  DESIGN_READY: {
    label: "Design Pronto",
    shortLabel: "Ready",
    tone: "success",
    chartColor: "#22c55e",
    dotClassName: "bg-green-400",
  },
  MILLING_PRINTING: {
    label: "Impressao/Fresagem",
    shortLabel: "Milling",
    tone: "warning",
    chartColor: "#f97316",
    dotClassName: "bg-orange-400",
  },
  DONE: {
    label: "Concluido",
    shortLabel: "Done",
    tone: "success",
    chartColor: "#14b8a6",
    dotClassName: "bg-teal-400",
  },
};

export const CASE_STATUS_OPTIONS = Object.entries(CASE_STATUS_META).map(
  ([value, meta]) => ({
    value: value as CaseStatusValue,
    label: meta.label,
  }),
);

export function getCaseStatusMeta(status: string) {
  return CASE_STATUS_META[status as CaseStatusValue] ?? null;
}
