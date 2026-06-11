import { api } from "@/lib/api";
import type { CaseStatusValue } from "@/features/cases/types";

export type CaseListItem = {
  id: string;
  dentalLabId: string;
  code: string;
  patientName: string;
  customerId: string | null;
  customerName: string | null;
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

export type CaseListQuery = {
  limit?: string;
  status?: string;
  customerId?: string;
  urgent?: string;
  q?: string;
};

type CasesResponse = {
  data: CaseListItem[];
  error: null;
  meta: {
    limit: number;
  };
};

type CaseResponse = {
  data?: CaseListItem;
  case?: CaseListItem;
  error?: string | null;
  fields?: Record<string, string[]>;
  meta?: Record<string, never>;
};

export type CaseMutationPayload = {
  patientName?: string;
  clientCaseCode?: string | null;
  customerId?: string | null;
  serviceTypeId?: string | null;
  dentistId?: string | null;
  cadDesignerId?: string | null;
  currentStatus?: CaseStatusValue;
  teeth?: string | null;
  elementsQty?: number | null;
  shade?: string | null;
  dueDate?: string | null;
  isUrgent?: boolean;
  observations?: string | null;
  pendingNote?: string | null;
};

type CaseMutationApiPayload = {
  patient_name?: string;
  clientCaseCode?: string | null;
  customer_id?: string | null;
  service_type_id?: string | null;
  dentist_id?: string | null;
  cad_designer_id?: string | null;
  current_status?: CaseStatusValue;
  teeth?: string | null;
  elements_qty?: number | null;
  shade?: string | null;
  due_date?: string | null;
  is_urgent?: boolean;
  observations?: string | null;
  pending_note?: string | null;
};

function buildCasesEndpoint(query?: CaseListQuery) {
  const params = new URLSearchParams();

  if (query?.limit) params.set("limit", query.limit);
  if (query?.status) params.set("status", query.status);
  if (query?.customerId) params.set("customer_id", query.customerId);
  if (query?.urgent) params.set("urgent", query.urgent);
  if (query?.q) params.set("q", query.q);

  const queryString = params.toString();
  return queryString ? `/api/cases?${queryString}` : "/api/cases?limit=25";
}

function toCaseMutationApiPayload(payload: CaseMutationPayload) {
  const apiPayload: CaseMutationApiPayload = {};

  if (payload.patientName !== undefined) {
    apiPayload.patient_name = payload.patientName;
  }

  if (payload.clientCaseCode !== undefined) {
    apiPayload.clientCaseCode = payload.clientCaseCode;
  }

  if (payload.customerId !== undefined) {
    apiPayload.customer_id = payload.customerId;
  }

  if (payload.serviceTypeId !== undefined) {
    apiPayload.service_type_id = payload.serviceTypeId;
  }

  if (payload.dentistId !== undefined) {
    apiPayload.dentist_id = payload.dentistId;
  }

  if (payload.cadDesignerId !== undefined) {
    apiPayload.cad_designer_id = payload.cadDesignerId;
  }

  if (payload.currentStatus !== undefined) {
    apiPayload.current_status = payload.currentStatus;
  }

  if (payload.teeth !== undefined) {
    apiPayload.teeth = payload.teeth;
  }

  if (payload.elementsQty !== undefined) {
    apiPayload.elements_qty = payload.elementsQty;
  }

  if (payload.shade !== undefined) {
    apiPayload.shade = payload.shade;
  }

  if (payload.dueDate !== undefined) {
    apiPayload.due_date = payload.dueDate;
  }

  if (payload.isUrgent !== undefined) {
    apiPayload.is_urgent = payload.isUrgent;
  }

  if (payload.observations !== undefined) {
    apiPayload.observations = payload.observations;
  }

  if (payload.pendingNote !== undefined) {
    apiPayload.pending_note = payload.pendingNote;
  }

  return apiPayload;
}

export const casesApi = {
  async getAll(query?: CaseListQuery) {
    const response = await api<CasesResponse>(buildCasesEndpoint(query));
    return response.data;
  },

  async getById(caseId: string) {
    const response = await api<CaseResponse>(`/api/cases/${caseId}`);
    if (!response.data) throw new Error("Case response was empty.");
    return response.data;
  },

  async create(payload: CaseMutationPayload) {
    const response = await api<CaseResponse>("/api/cases", {
      method: "POST",
      body: JSON.stringify(toCaseMutationApiPayload(payload)),
    });
    const createdCase = response.data ?? response.case;
    if (!createdCase) throw new Error("Case response was empty.");
    return createdCase;
  },

  async update(caseId: string, payload: CaseMutationPayload) {
    const response = await api<CaseResponse>(`/api/cases/${caseId}`, {
      method: "PUT",
      body: JSON.stringify(toCaseMutationApiPayload(payload)),
    });
    if (!response.data) throw new Error("Case response was empty.");
    return response.data;
  },
};
