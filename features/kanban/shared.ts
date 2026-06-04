import { CASE_STATUS, type CaseStatusValue } from "@/features/cases/types";

export type CurrentUser = {
  id: string;
  name: string;
  role: string;
};

export const KANBAN_COLUMNS: ReadonlyArray<{
  id: CaseStatusValue;
  title: string;
  hint: string;
}> = [
  { id: CASE_STATUS.ENTRY, title: "Entrada", hint: "Casos recebidos" },
  {
    id: CASE_STATUS.WAITING_INFO,
    title: "Aguardando Informações",
    hint: "Pendências",
  },
  { id: CASE_STATUS.DESIGNING, title: "Desenhando", hint: "Em CAD" },
  {
    id: CASE_STATUS.WAITING_APPROVAL,
    title: "Aguardando Aprovação",
    hint: "Esperando confirmação",
  },
  {
    id: CASE_STATUS.DESIGN_READY,
    title: "Design Pronto",
    hint: "Pronto para produção",
  },
  {
    id: CASE_STATUS.MILLING_PRINTING,
    title: "Impressão/Fresagem",
    hint: "Produção",
  },
  { id: CASE_STATUS.DONE, title: "Concluído", hint: "Finalizados" },
];

export const FILTER_OPTIONS = {
  ALL: "ALL",
  OVERDUE: "OVERDUE",
  DUE_TODAY: "DUE_TODAY",
  URGENT: "URGENT",
  WAITING: "WAITING",
} as const;

export type FilterOption =
  (typeof FILTER_OPTIONS)[keyof typeof FILTER_OPTIONS];

export function formatKanbanDate(date: string | null) {
  if (!date) return "Sem prazo";
  return new Intl.DateTimeFormat("pt-BR").format(new Date(date));
}

export function isCaseOverdue(date: string | null) {
  if (!date) return false;
  const due = new Date(date);
  return due.getTime() < Date.now();
}

export function isCaseDueToday(date: string | null) {
  if (!date) return false;

  const d = new Date(date);
  const now = new Date();

  return (
    d.getFullYear() === now.getFullYear() &&
    d.getMonth() === now.getMonth() &&
    d.getDate() === now.getDate()
  );
}