import { CaseStatus } from "@/generated/prisma/enums";

type CustomerCaseServiceRecord = {
  service_name_snapshot: string;
  quantity: number;
  unit_price: { toString(): string } | number | string;
};

export type CustomerDashboardCaseRecord = {
  id: string;
  code: string;
  patient_name: string;
  current_status: CaseStatus;
  due_date: Date | null;
  updated_at: Date;
  case_price: { toString(): string } | number | string | null;
  case_services: CustomerCaseServiceRecord[];
  service_types: {
    name: string;
  } | null;
};

export type CustomerDashboardSummary = {
  dentistCount: number;
  totalCases: number;
  openCases: number;
  overdueCases: number;
  dueSoonCases: number;
  totalSnapshotValue: string;
  currency: string;
};

export type CustomerDashboardBreakdownItem = {
  key: string;
  label: string;
  count: number;
};

export type CustomerRecentCaseItem = {
  id: string;
  code: string;
  patientName: string;
  currentStatus: CaseStatus;
  dueDate: string | null;
  updatedAt: string;
  snapshotValue: string;
  serviceSummary: string;
};

export type CustomerDetailDashboard = {
  summary: CustomerDashboardSummary;
  statusBreakdown: CustomerDashboardBreakdownItem[];
  serviceMix: CustomerDashboardBreakdownItem[];
  recentCases: CustomerRecentCaseItem[];
};

function toDecimalNumber(value: { toString(): string } | number | string | null) {
  if (value === null) return 0;
  return Number(value.toString());
}

function formatMoney(value: number) {
  return value.toFixed(2);
}

function getCaseSnapshotValue(caseItem: CustomerDashboardCaseRecord) {
  if (caseItem.case_services.length > 0) {
    return caseItem.case_services.reduce((total, serviceLine) => {
      return total + toDecimalNumber(serviceLine.unit_price) * serviceLine.quantity;
    }, 0);
  }

  return toDecimalNumber(caseItem.case_price);
}

function getCaseServiceSummary(caseItem: CustomerDashboardCaseRecord) {
  if (caseItem.case_services.length > 0) {
    const names = [...new Set(caseItem.case_services.map((item) => item.service_name_snapshot))];

    if (names.length <= 2) {
      return names.join(", ");
    }

    return `${names.slice(0, 2).join(", ")} +${names.length - 2}`;
  }

  return caseItem.service_types?.name ?? "No service";
}

export function buildCustomerDashboard(
  caseItems: CustomerDashboardCaseRecord[],
  options: {
    dentistCount: number;
    currency: string;
    now?: Date;
  },
): CustomerDetailDashboard {
  const now = options.now ?? new Date();
  const nowTime = now.getTime();
  const dueSoonLimit = nowTime + 7 * 24 * 60 * 60 * 1000;
  const statusCounts = new Map<string, number>();
  const serviceMixCounts = new Map<string, number>();

  let openCases = 0;
  let overdueCases = 0;
  let dueSoonCases = 0;
  let totalSnapshotValue = 0;

  for (const caseItem of caseItems) {
    const isClosed =
      caseItem.current_status === CaseStatus.DONE ||
      caseItem.current_status === CaseStatus.CANCELLED;
    const dueTime = caseItem.due_date?.getTime() ?? null;
    const caseSnapshotValue = getCaseSnapshotValue(caseItem);

    totalSnapshotValue += caseSnapshotValue;
    statusCounts.set(
      caseItem.current_status,
      (statusCounts.get(caseItem.current_status) ?? 0) + 1,
    );

    if (!isClosed) {
      openCases += 1;

      if (dueTime !== null && dueTime < nowTime) {
        overdueCases += 1;
      } else if (
        dueTime !== null &&
        dueTime >= nowTime &&
        dueTime <= dueSoonLimit
      ) {
        dueSoonCases += 1;
      }
    }

    if (caseItem.case_services.length > 0) {
      for (const serviceLine of caseItem.case_services) {
        serviceMixCounts.set(
          serviceLine.service_name_snapshot,
          (serviceMixCounts.get(serviceLine.service_name_snapshot) ?? 0) +
            serviceLine.quantity,
        );
      }
    } else if (caseItem.service_types?.name) {
      serviceMixCounts.set(
        caseItem.service_types.name,
        (serviceMixCounts.get(caseItem.service_types.name) ?? 0) + 1,
      );
    }
  }

  const recentCases = [...caseItems]
    .sort((left, right) => right.updated_at.getTime() - left.updated_at.getTime())
    .slice(0, 5)
    .map((caseItem) => ({
      id: caseItem.id,
      code: caseItem.code,
      patientName: caseItem.patient_name,
      currentStatus: caseItem.current_status,
      dueDate: caseItem.due_date?.toISOString() ?? null,
      updatedAt: caseItem.updated_at.toISOString(),
      snapshotValue: formatMoney(getCaseSnapshotValue(caseItem)),
      serviceSummary: getCaseServiceSummary(caseItem),
    }));

  return {
    summary: {
      dentistCount: options.dentistCount,
      totalCases: caseItems.length,
      openCases,
      overdueCases,
      dueSoonCases,
      totalSnapshotValue: formatMoney(totalSnapshotValue),
      currency: options.currency,
    },
    statusBreakdown: [...statusCounts.entries()]
      .map(([key, count]) => ({
        key,
        label: key,
        count,
      }))
      .sort((left, right) => right.count - left.count),
    serviceMix: [...serviceMixCounts.entries()]
      .map(([key, count]) => ({
        key,
        label: key,
        count,
      }))
      .sort((left, right) => right.count - left.count),
    recentCases,
  };
}
