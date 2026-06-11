import {
  CASE_STATUS,
  CASE_STATUS_OPTIONS,
  type CaseStatusValue,
} from "@/features/cases/constants";

export { CASE_STATUS, CASE_STATUS_OPTIONS, type CaseStatusValue };

export type ClientCompanyOption = {
  id: string;
  name: string;
};

export type DentalLabOption = {
  id: string;
  clientCompanyId: string;
  name: string;
};

export type LabCustomerOption = {
  id: string;
  dentalLabId: string;
  name: string;
};

export type CurrentUser = {
  id: string;
  name: string;
  role: string;
  clientCompanyId: string;
  activeDentalLabId: string;
  labs: DentalLabOption[];
};

export type DentistOption = {
  id: string;
  name: string;
};

export type CustomerOption = {
  id: string;
  dentalLabId: string;
  labCustomerId: string | null;
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
  dentalLabId: string;
  labCustomerId?: string | null;
  labCustomerName?: string;
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
  customerName: string;
  customerId: string | null;
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
  currentStatus: CaseStatusValue;
  customerName: string;
};

export type CaseFormValues = {
  patientName?: string;
  currentStatus?: CaseStatusValue;
  teeth?: string | null;
  elementsQty?: number | null;
  shade?: string | null;
  dueDate?: string | Date | null;
  observations?: string | null;
  pendingNote?: string | null;
  isUrgent?: boolean;
  customerId?: string | null;
  dentistId?: string | null;
  serviceTypeId?: string | null;
  cadDesignerId?: string | null;
};
