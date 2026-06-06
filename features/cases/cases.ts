import { api } from "@/lib/api";
import type { CaseStatusValue } from "@/features/cases/types";

export type CaseListItem = {
  id: string;
  dentalLabId: string;
  code: string;
  clientCaseCode: string | null;
  patientName: string;
  clinicId: string | null;
  clinicName: string | null;
  serviceTypeId: string | null;
  serviceTypeName: string | null;
  dentistId: string | null;
  dentistName: string | null;
  cadDesignerId: string | null;
  cadDesignerName: string | null;
  createdByUserId: string | null;
  createdByUserName: string | null;
  currentStatus: CaseStatusValue;
  teeth: string | null;
  elementsQty: number | null;
  shade: string | null;
  dueDate: string | null;
  isUrgent: boolean;
  observations: string | null;
  pendingNote: string | null;
  createdAt: string;
  updatedAt: string;
};

type CasesResponse = {
  cases: CaseListItem[];
};

export const casesApi = {
  async getAll() {
    const response = await api<CasesResponse>("/api/cases");
    return response.cases;
  },
};
