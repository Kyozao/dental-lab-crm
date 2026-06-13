import type {
  AttachmentKindValue,
  CaseStatusValue,
  EditableCase,
} from "@/features/cases/types";
import { casesApi, type CaseListItem, type CaseMutationPayload } from "@/features/cases/cases";
import { mockCases } from "@/lib/mock-data/pages";

type DownloadKind = AttachmentKindValue | "ALL" | "FINAL_OUTPUTS";

export async function updateCaseStatusApi(
  _caseId: string,
  _status: CaseStatusValue,
) {
  void _caseId;
  void _status;
  return;
}

export async function updateCaseApi(
  caseId: string,
  payload: CaseMutationPayload,
) {
  return mapApiCaseToEditableCase(await casesApi.update(caseId, payload));
}

export async function getCaseDetailsApi(caseId: string): Promise<EditableCase> {
  return mapApiCaseToEditableCase(await casesApi.getById(caseId));
}

export async function deleteCaseApi(_caseId: string) {
  void _caseId;
  return;
}

export async function uploadCaseAttachmentApi(
  _caseId: string,
  _kind: AttachmentKindValue,
  _file: File,
) {
  void _caseId;
  void _kind;
  void _file;
  return;
}

export async function deleteCaseAttachmentApi(
  _caseId: string,
  _attachmentId: string,
) {
  void _caseId;
  void _attachmentId;
  return;
}

export async function getColumnDownloadUrlsApi(
  _caseIds: string[],
  _kind: DownloadKind,
) {
  void _caseIds;
  void _kind;
  return [];
}

export function mapApiCaseToEditableCase(item: CaseListItem): EditableCase {
  const mockCase = mockCases.find((caseItem) => caseItem.id === item.id);

  return {
    id: item.id,
    dentalLabId: item.dentalLabId,
    code: item.code,
    patientName: item.patientName,
    currentStatus: item.currentStatus,
    teeth: item.teeth ?? "",
    elementsQty: item.elementsQty,
    shade: item.shade ?? "",
    dueDate: item.dueDate,
    observations: item.observations ?? "",
    pendingNote: item.pendingNote ?? "",
    isUrgent: item.isUrgent,
    createdAt: item.createdAt,
    updatedAt: item.updatedAt,
    customerName: item.customerName ?? "",
    customerId: item.customerId,
    dentistName: item.dentistName ?? "",
    dentistId: item.dentistId,
    serviceTypeId: item.serviceTypeId,
    serviceTypeName: item.serviceTypeName ?? "",
    attachments: mockCase?.attachments ?? [],
    components: mockCase?.components ?? [],
    millings: mockCase?.millings ?? [],
    processes: item.processes ?? [],
    availableProcesses: item.availableProcesses ?? [],
  };
}
