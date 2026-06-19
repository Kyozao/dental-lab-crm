import type { CustomerDentist } from "@/features/customers/types";
import { getCaseStatusMeta } from "@/features/cases/constants";

export function formatCustomerDate(value: string) {
  return new Intl.DateTimeFormat("en", {
    month: "short",
    day: "2-digit",
    year: "numeric",
  }).format(new Date(value));
}

export function summarizeDentists(dentists: CustomerDentist[]) {
  if (dentists.length === 0) return "No dentists";
  if (dentists.length <= 2) return dentists.map((dentist) => dentist.name).join(", ");
  return `${dentists.slice(0, 2).map((dentist) => dentist.name).join(", ")} +${dentists.length - 2}`;
}

export function formatCustomerMoney(value: string | number, currency: string) {
  return new Intl.NumberFormat("en", {
    style: "currency",
    currency,
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(Number(value));
}

export function statusBadgeVariant(status: string): "neutral" | "warning" | "info" | "success" | "danger" {
  const tone = getCaseStatusMeta(status)?.tone;

  switch (tone) {
    case "warning":
      return "warning";
    case "info":
      return "info";
    case "success":
      return "success";
    case "danger":
      return "danger";
    default:
      return "neutral";
  }
}
