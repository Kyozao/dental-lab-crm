import type { CaseStatusValue } from "@/features/cases/types";
import { getApiErrorMessage, parseApiEnvelope } from "@/lib/api/client";
import type {
  AttachmentKindValue,
  EditableCase,
} from "@/features/cases/types";

type DownloadKind = AttachmentKindValue | "ALL" | "FINAL_OUTPUTS";

type DownloadItem = {
  id: string;
  caseId: string;
  caseLabel: string | null;
  fileName: string;
  filePath: string;
  kind: AttachmentKindValue;
  signedUrl: string;
};

type CaseDetailsResponse = {
  id: string;
  code: string;
  patientName: string;
  currentStatus: CaseStatusValue;
  teeth: string;
  elementsQty: number | null;
  shade: string;
  dueDate: string | null;
  observations: string;
  pendingNote: string;
  isUrgent: boolean;
  createdAt: string;
  updatedAt: string;
  clinic: { id: string; name: string } | null;
  dentist: { id: string; name: string } | null;
  serviceType: { id: string; name: string } | null;
  cadDesigner: { id: string; name: string | null } | null;
  components: EditableCase["components"];
  attachments: EditableCase["attachments"];
  millings: EditableCase["millings"];
};

export async function updateCaseStatusApi(caseId: string, status: CaseStatusValue) {
  const response = await fetch(`/api/kanban/cases/${caseId}/status`, {
    method: "PATCH",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ status }),
  });

  const body = await parseApiEnvelope<unknown>(response);

  if (!response.ok) {
    throw new Error(getApiErrorMessage(body, "Could not update status."));
  }
}

export async function updateCaseApi(caseId: string, payload: Record<string, unknown>) {
  const response = await fetch(`/api/cases/${caseId}`, {
    method: "PATCH",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify(payload),
  });

  const body = await parseApiEnvelope<unknown>(response);

  if (!response.ok) {
    throw new Error(getApiErrorMessage(body, "Could not save case."));
  }
}

export async function getCaseDetailsApi(caseId: string): Promise<EditableCase> {
  const response = await fetch(`/api/cases/${caseId}`);

  const body = await parseApiEnvelope<CaseDetailsResponse>(response);

  if (!response.ok || !body?.data) {
    throw new Error(getApiErrorMessage(body, "Could not load case details."));
  }

  const data = body.data;

  return {
    id: data.id,
    code: data.code,
    patientName: data.patientName,
    currentStatus: data.currentStatus,
    teeth: data.teeth,
    elementsQty: data.elementsQty,
    shade: data.shade,
    dueDate: data.dueDate,
    observations: data.observations,
    pendingNote: data.pendingNote,
    isUrgent: data.isUrgent,
    createdAt: data.createdAt,
    updatedAt: data.updatedAt,
    clinicName: data.clinic?.name ?? "",
    clinicId: data.clinic?.id ?? null,
    dentistName: data.dentist?.name ?? "",
    dentistId: data.dentist?.id ?? null,
    serviceTypeId: data.serviceType?.id ?? null,
    serviceTypeName: data.serviceType?.name ?? "",
    cadDesignerId: data.cadDesigner?.id ?? null,
    cadDesignerName: data.cadDesigner?.name ?? "",
    components: data.components,
    attachments: data.attachments,
    millings: data.millings,
  };
}

export async function deleteCaseApi(caseId: string) {
  const response = await fetch(`/api/cases/${caseId}`, {
    method: "DELETE",
  });

  const body = await parseApiEnvelope<unknown>(response);

  if (!response.ok) {
    throw new Error(getApiErrorMessage(body, "Could not delete case."));
  }
}

export async function uploadCaseAttachmentApi(
  caseId: string,
  kind: AttachmentKindValue,
  file: File,
) {
  const formData = new FormData();
  formData.append("kind", kind);
  formData.append("file", file);

  const response = await fetch(`/api/cases/${caseId}/attachments`, {
    method: "POST",
    body: formData,
  });

  const body = await parseApiEnvelope<unknown>(response);

  if (!response.ok) {
    throw new Error(getApiErrorMessage(body, "Upload failed."));
  }
}

export async function deleteCaseAttachmentApi(caseId: string, attachmentId: string) {
  const response = await fetch(
    `/api/cases/${caseId}/attachments/${attachmentId}`,
    { method: "DELETE" },
  );

  const body = await parseApiEnvelope<unknown>(response);

  if (!response.ok) {
    throw new Error(getApiErrorMessage(body, "Could not delete file."));
  }
}

export async function getColumnDownloadUrlsApi(caseIds: string[], kind: DownloadKind) {
  const response = await fetch("/api/cases/downloads", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ caseIds, kind }),
  });

  const body = await parseApiEnvelope<DownloadItem[]>(response);

  if (!response.ok) {
    throw new Error(getApiErrorMessage(body, "Could not get download links."));
  }

  return body?.data ?? [];
}
