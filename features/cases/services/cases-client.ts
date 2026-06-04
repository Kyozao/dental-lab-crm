import type {
  AttachmentKindValue,
  CaseStatusValue,
  EditableCase,
} from "@/features/cases/types";
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
  _caseId: string,
  _payload: Record<string, unknown>,
) {
  void _caseId;
  void _payload;
  return;
}

export async function getCaseDetailsApi(caseId: string): Promise<EditableCase> {
  const item = mockCases.find((caseItem) => caseItem.id === caseId);

  if (!item) {
    throw new Error("Could not load mock case details.");
  }

  return item;
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
