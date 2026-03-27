export const CASE_STATUS = {
  ENTRY: "ENTRY",
  WAITING_INFO: "WAITING_INFO",
  DESIGNING: "DESIGNING",
  WAITING_APPROVAL: "WAITING_APPROVAL",
  DESIGN_READY: "DESIGN_READY",
  MILLING_PRINTING: "MILLING_PRINTING",
  DONE: "DONE",
} as const;

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

export type CaseAttachmentItem = {
  id: string;
  fileName: string;
  filePath: string;
  fileType: string | null;
  fileSize: number | null;
  createdAt: string;
  uploadedByName: string | null;
};

export type EditableCase = {
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
};

export type CaseFormValues = {
  code?: string;
  patientName?: string;
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