import { type ProcessOption, type ServiceTypeOption } from "@/features/cases/types";
import { formatCurrency } from "@/lib/currency";

export function formatWorkflowDuration(service: ServiceTypeOption) {
  const steps = service.workflow_json?.steps ?? [];
  if (steps.length === 0) return "-";

  const totalDays = steps.reduce(
    (sum, step) => sum + (step.expected_duration_days ?? 0),
    0,
  );
  const totalMinutes = steps.reduce(
    (sum, step) => sum + (step.fixed_minutes ?? 0),
    0,
  );
  const hours = Math.floor(totalMinutes / 60);
  const minutes = totalMinutes % 60;

  if (totalDays === 0 && hours === 0) {
    return `${minutes}m`;
  }

  if (minutes === 0) {
    return `${totalDays}d ${hours}h`;
  }

  return `${totalDays}d ${hours}h ${minutes}m`;
}

export function downloadCsv(filename: string, rows: string[][]) {
  const csv = rows
    .map((row) =>
      row
        .map((value) => `"${value.replaceAll('"', '""')}"`)
        .join(","),
    )
    .join("\n");

  const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.setAttribute("download", filename);
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}

export function buildServicesCsvRows(
  services: ServiceTypeOption[],
  currency: string,
) {
  return [
    [
      "Service",
      "Base price",
      "Status",
      "Workflow steps",
      "Avg. lab time",
      "Notes",
    ],
    ...services.map((service) => [
      service.name,
      formatCurrency(service.base_price, currency),
      service.is_active ?? true ? "Active" : "Inactive",
      String(service.workflow_json?.steps.length ?? 0),
      formatWorkflowDuration(service),
      service.notes?.trim() || "",
    ]),
  ];
}

export function buildProcessesCsvRows(
  processes: ProcessOption[],
  currency: string,
) {
  return [
    [
      "Process",
      "Status",
      "Fixed minutes",
      "Duration days",
      "Labor cost",
      "Milling required",
      "Description",
    ],
    ...processes.map((process) => [
      process.name,
      process.is_active ?? true ? "Active" : "Inactive",
      String(process.default_fixed_minutes ?? 1),
      String(process.default_expected_duration_days ?? 1),
      formatCurrency(process.default_labor_cost ?? "0.00", currency),
      process.default_requires_milling_machine ? "Yes" : "No",
      process.description?.trim() || "",
    ]),
  ];
}

export function buildPriceTablesCsvRows(
  priceTables: Array<{
    assigned_customer_count: number;
    is_active: boolean;
    name: string;
    service_price_count: number;
  }>,
) {
  return [
    ["Price table", "Service prices", "Assigned customers", "Status"],
    ...priceTables.map((priceTable) => [
      priceTable.name,
      String(priceTable.service_price_count),
      String(priceTable.assigned_customer_count),
      priceTable.is_active ? "Active" : "Inactive",
    ]),
  ];
}
