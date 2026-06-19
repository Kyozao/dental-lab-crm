export const CASE_STATUS = {
  IN_PRODUCTION: "IN_PRODUCTION",
  STANDBY: "STANDBY",
  DONE: "DONE",
  CANCELLED: "CANCELLED",
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
  IN_PRODUCTION: {
    label: "Em producao",
    shortLabel: "Production",
    tone: "info",
    chartColor: "#2563eb",
    dotClassName: "bg-blue-400",
  },
  STANDBY: {
    label: "Stand by",
    shortLabel: "Standby",
    tone: "warning",
    chartColor: "#eab308",
    dotClassName: "bg-amber-400",
  },
  DONE: {
    label: "Concluido",
    shortLabel: "Done",
    tone: "success",
    chartColor: "#14b8a6",
    dotClassName: "bg-teal-400",
  },
  CANCELLED: {
    label: "Cancelado",
    shortLabel: "Cancelled",
    tone: "danger",
    chartColor: "#ef4444",
    dotClassName: "bg-red-400",
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
