import { api } from "@/lib/api";
import type {
  CaseServiceLineItem,
  CaseCommentItem,
  CaseProcessItem,
  CaseProcessHistoryItem,
  CaseStatusHistoryItem,
  CaseStatusValue,
  CaseWorkflow,
  ProcessOption,
} from "@/features/cases/types";

export type CaseListItem = {
  id: string;
  dentalLabId: string;
  code: string;
  patientName: string;
  patientDetail: string | null;
  customerId: string | null;
  customerName: string | null;
  serviceTypeId: string | null;
  serviceTypeName: string | null;
  serviceLineCount: number;
  dentistId: string | null;
  dentistName: string | null;
  createdByUserId: string | null;
  createdByUserName: string | null;
  currentStatus: CaseStatusValue;
  serviceBasePriceSnapshot: string | null;
  casePrice: string | null;
  isPriceOverridden: boolean;
  serviceLabel: string | null;
  labCurrency: string;
  teeth: string | null;
  elementsQty: number | null;
  shade: string | null;
  dueDate: string | null;
  priority: "urgent" | "high" | "normal" | "low";
  isUrgent: boolean;
  observations: string | null;
  currentCaseProcessId: string | null;
  currentProcessId: string | null;
  currentWorkflowStepId: string | null;
  currentProcessName: string | null;
  currentProcessStatus: string | null;
  currentProcessAssigneeName: string | null;
  currentProcessAssigneeId: string | null;
  progressPercent: number;
  completedSteps: number;
  totalSteps: number;
  createdAt: string;
  updatedAt: string;
  processes?: CaseProcessItem[];
  serviceLines?: CaseServiceLineItem[];
  availableProcesses?: ProcessOption[];
  comments?: CaseCommentItem[];
  statusHistory?: CaseStatusHistoryItem[];
  processHistory?: CaseProcessHistoryItem[];
};

export type CaseListQuery = {
  limit?: string;
  status?: string;
  customerId?: string;
  urgent?: string;
  priority?: string;
  q?: string;
  currentProcessIds?: string[];
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

type CaseProcessResponse = {
  data?: {
    process: CaseProcessItem;
    processes: CaseProcessItem[];
    processHistory?: CaseProcessHistoryItem[];
  };
  error?: string | null;
  fields?: Record<string, string[]>;
  meta?: Record<string, never>;
};

type CaseCommentsResponse = {
  data?: CaseCommentItem[];
  error?: string | null;
  fields?: Record<string, string[]>;
  meta?: Record<string, never>;
};

type CaseCommentResponse = {
  data?: CaseCommentItem;
  error?: string | null;
  fields?: Record<string, string[]>;
  meta?: Record<string, never>;
};

export type CaseMutationPayload = {
  patientName?: string;
  clientCaseCode?: string | null;
  customerId?: string | null;
  dentistId?: string | null;
  currentStatus?: CaseStatusValue;
  teeth?: string | null;
  elementsQty?: number | null;
  shade?: string | null;
  dueDate?: string | null;
  priority?: "LOW" | "NORMAL" | "HIGH" | "URGENT";
  isUrgent?: boolean;
  observations?: string | null;
  statusReason?: string | null;
  serviceLines?: Array<{
    id?: string;
    serviceTypeId: string;
    quantity: number;
    unitPrice?: string | null;
    isUnitPriceOverridden?: boolean;
    workflowJson?: CaseWorkflow;
  }>;
};

type CaseMutationApiPayload = {
  patient_name?: string;
  clientCaseCode?: string | null;
  customer_id?: string | null;
  dentist_id?: string | null;
  current_status?: CaseStatusValue;
  teeth?: string | null;
  elements_qty?: number | null;
  shade?: string | null;
  due_date?: string | null;
  priority?: "LOW" | "NORMAL" | "HIGH" | "URGENT";
  is_urgent?: boolean;
  observations?: string | null;
  status_reason?: string | null;
  service_lines?: Array<{
    id?: string;
    service_type_id: string;
    quantity: number;
    unit_price?: string | null;
    is_unit_price_overridden?: boolean;
    workflow_json?: CaseWorkflow;
  }>;
};

function buildCasesEndpoint(query?: CaseListQuery) {
  const params = new URLSearchParams();

  if (query?.limit) params.set("limit", query.limit);
  if (query?.status) params.set("status", query.status);
  if (query?.customerId) params.set("customer_id", query.customerId);
  if (query?.urgent) params.set("urgent", query.urgent);
  if (query?.priority) params.set("priority", query.priority);
  if (query?.q) params.set("q", query.q);
  query?.currentProcessIds?.forEach((processId) =>
    params.append("currentProcessId", processId),
  );

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

  if (payload.dentistId !== undefined) {
    apiPayload.dentist_id = payload.dentistId;
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

  if (payload.priority !== undefined) {
    apiPayload.priority = payload.priority;
  }

  if (payload.isUrgent !== undefined) {
    apiPayload.is_urgent = payload.isUrgent;
  }

  if (payload.observations !== undefined) {
    apiPayload.observations = payload.observations;
  }

  if (payload.statusReason !== undefined) {
    apiPayload.status_reason = payload.statusReason;
  }

  if (payload.serviceLines !== undefined) {
    apiPayload.service_lines = payload.serviceLines.map((serviceLine) => ({
      id: serviceLine.id,
      service_type_id: serviceLine.serviceTypeId,
      quantity: serviceLine.quantity,
      unit_price: serviceLine.unitPrice,
      is_unit_price_overridden: serviceLine.isUnitPriceOverridden,
      workflow_json: serviceLine.workflowJson,
    }));
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

  async delete(caseId: string) {
    return api<CaseResponse>(`/api/cases/${caseId}`, {
      method: "DELETE",
    });
  },

  async replaceWorkflow(
    caseId: string,
    caseServiceId: string,
    workflowJson: CaseWorkflow,
  ) {
    const response = await api<CaseResponse>(`/api/cases/${caseId}/workflow`, {
      method: "PUT",
      body: JSON.stringify({
        case_service_id: caseServiceId,
        workflow_json: workflowJson,
      }),
    });
    if (!response.data) throw new Error("Case response was empty.");
    return response.data;
  },

  async updateProcessStatus(caseProcessId: string, status: string) {
    const response = await api<CaseProcessResponse>(
      `/api/case-processes/${caseProcessId}`,
      {
        method: "PATCH",
        body: JSON.stringify({ status }),
      },
    );
    if (!response.data) throw new Error("Case process response was empty.");
    return response.data;
  },

  async updateProcessAssignee(
    caseProcessId: string,
    assignedLabMemberId: string | null,
  ) {
    const response = await api<CaseProcessResponse>(
      `/api/case-processes/${caseProcessId}`,
      {
        method: "PATCH",
        body: JSON.stringify({ assigned_lab_member_id: assignedLabMemberId }),
      },
    );
    if (!response.data) throw new Error("Case process response was empty.");
    return response.data;
  },

  async getComments(caseId: string) {
    const response = await api<CaseCommentsResponse>(
      `/api/cases/${caseId}/comments`,
    );
    return response.data ?? [];
  },

  async createComment(caseId: string, body: string) {
    const response = await api<CaseCommentResponse>(
      `/api/cases/${caseId}/comments`,
      {
        method: "POST",
        body: JSON.stringify({ body }),
      },
    );
    if (!response.data) throw new Error("Case comment response was empty.");
    return response.data;
  },

  async deleteComment(caseId: string, commentId: string) {
    return api(`/api/cases/${caseId}/comments/${commentId}`, {
      method: "DELETE",
    });
  },
};
