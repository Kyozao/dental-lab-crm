export const CASE_STATUS = {
  ENTRY: "ENTRY",
  WAITING_INFO: "WAITING_INFO",
  DESIGNING: "DESIGNING",
  WAITING_APPROVAL: "WAITING_APPROVAL",
  DESIGN_READY: "DESIGN_READY",
  MILLING_PRINTING: "MILLING_PRINTING",
  DONE: "DONE",
} as const;

export const CASE_SCOPE = {
  LAB: "LAB",
  AGENCY: "AGENCY",
} as const;

export type CaseScopeValue = (typeof CASE_SCOPE)[keyof typeof CASE_SCOPE];

export const CASE_SCOPE_OPTIONS: ReadonlyArray<{
  value: CaseScopeValue;
  label: string;
}> = [
  { value: CASE_SCOPE.LAB, label: "Lab" },
  { value: CASE_SCOPE.AGENCY, label: "Agency" },
];

export type CaseStatusValue =
  (typeof CASE_STATUS)[keyof typeof CASE_STATUS];

export const CASE_STATUS_OPTIONS: ReadonlyArray<{
  value: CaseStatusValue;
  label: string;
}> = [
  { value: CASE_STATUS.ENTRY, label: "Entrada" },
  { value: CASE_STATUS.WAITING_INFO, label: "Aguardando Informações" },
  { value: CASE_STATUS.DESIGNING, label: "Desenhando" },
  { value: CASE_STATUS.WAITING_APPROVAL, label: "Aguardando Aprovação" },
  { value: CASE_STATUS.DESIGN_READY, label: "Design Pronto" },
  { value: CASE_STATUS.MILLING_PRINTING, label: "Impressão/Fresagem" },
  { value: CASE_STATUS.DONE, label: "Concluído" },
];

export type DentistOption = {
  id: string;
  name: string;
};

export type ClinicOption = {
  id: string;
  name: string;
  dentists: DentistOption[];
};

export type ServiceTypeOption = {
  id: string;
  name: string;
};

export type CadDesignerOption = {
  id: string;
  name: string | null;
};

export type ComponentOption = {
  id: string;
  name: string;
  category: string | null;
  brand: string | null;
  defaultCost: string | null;
  defaultPrice: string | null;
};

export type CaseComponentItem = {
  id: string;
  componentId: string;
  componentName: string;
  quantity: number;
  chargeClient: boolean;
  unitCost: string | null;
  unitPrice: string | null;
  notes: string | null;
};

export type AttachmentKindValue =
  | "SCAN_INPUT"
  | "DESIGN_OUTPUT"
  | "MODEL_OUTPUT"
  | "OTHER";

export type CaseAttachmentItem = {
  id: string;
  fileName: string;
  filePath: string;
  fileType: string | null;
  fileSize: number | null;
  kind: AttachmentKindValue;
  retentionUntil: string | null;
  createdAt: string;
  uploadedByName: string | null;
};

export type CaseMillingItem = {
  id: string;
  status: "SUCCESS" | "FAILED";
  teethMilledQty: number;
  failureReason: string | null;
  notes: string | null;
  milledAt: string;
  blockTypeName: string;
  blockTypeShade: string | null;
  millingDrillName: string | null;
};

export type EditableCase = {
  id: string;
  code: string;
  patientName: string;
  caseScope: CaseScopeValue;
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
  clinicName: string;
  clinicId: string | null;
  dentistName: string;
  dentistId: string | null;
  serviceTypeId: string | null;
  serviceTypeName: string;
  cadDesignerId: string | null;
  cadDesignerName: string;
  attachments: CaseAttachmentItem[];
  components: CaseComponentItem[];
  millings: CaseMillingItem[];
};

export type SearchCaseItem = {
  id: string;
  code: string;
  patientName: string;
  caseScope: CaseScopeValue;
  currentStatus: CaseStatusValue;
  clinicName: string;
};

export type CaseFormValues = {
  code?: string;
  patientName?: string;
  caseScope?: CaseScopeValue;
  currentStatus?: CaseStatusValue;
  teeth?: string | null;
  elementsQty?: number | null;
  shade?: string | null;
  dueDate?: string | Date | null;
  observations?: string | null;
  pendingNote?: string | null;
  isUrgent?: boolean;
  clinicId?: string | null;
  dentistId?: string | null;
  serviceTypeId?: string | null;
  cadDesignerId?: string | null;
};