import { CASE_STATUS, type CaseStatusValue } from "@/features/cases/types";

type Role = "ADMIN" | "MANAGER" | "CAD_DESIGNER";
type AttachmentKind = "SCAN_INPUT" | "DESIGN_OUTPUT" | "MODEL_OUTPUT" | "OTHER";
type MillingStatus = "SUCCESS" | "FAILED";

export type MockUser = {
  id: string;
  clientCompanyId: string;
  activeDentalLabId: string;
  labs: Array<{ id: string; clientCompanyId: string; name: string }>;
  name: string;
  email: string;
  role: Role;
  isActive: boolean;
  deletedAt?: string | null;
};

export type MockRegistryItem = {
  id: string;
  dentalLabId: string;
  name: string;
  labCustomerId?: string | null;
  phone?: string | null;
  email?: string | null;
  notes?: string | null;
  customerId?: string;
  category?: string | null;
  brand?: string | null;
  material?: string | null;
  size?: string | null;
  shade?: string | null;
  type?: string | null;
  serialNumber?: string | null;
  defaultCost?: string | null;
  defaultPrice?: string | null;
  maxTeethRecommended?: number | null;
  isActive?: boolean;
  deletedAt?: string | null;
};

export type MockCaseComponent = {
  id: string;
  componentId: string;
  quantity: number;
  chargeClient: boolean;
  unitCost: string | null;
  unitPrice: string | null;
  notes: string | null;
};

export type MockAttachment = {
  id: string;
  caseId: string;
  fileName: string;
  filePath: string;
  fileType: string | null;
  fileSize: number | null;
  kind: AttachmentKind;
  retentionUntil: string | null;
  createdAt: string;
  uploadedByName: string | null;
};

export type MockMilling = {
  id: string;
  dentalLabId: string;
  caseId: string;
  blockTypeId: string;
  millingDrillId: string | null;
  fineMillingDrillId: string | null;
  coarseMillingDrillId: string | null;
  teethMilledQty: number;
  status: MillingStatus;
  failureReason: string | null;
  notes: string | null;
  milledAt: string;
};

export type MockCase = {
  id: string;
  dentalLabId: string;
  labCustomerId: string | null;
  code: string;
  clientCaseCode: string | null;
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
  customerId: string | null;
  dentistId: string | null;
  serviceTypeId: string | null;
  components: MockCaseComponent[];
  attachments: MockAttachment[];
  statusHistory: Array<{
    id: string;
    fromStatus: CaseStatusValue | null;
    toStatus: CaseStatusValue;
    note: string;
    changedAt: string;
  }>;
};

type MockState = {
  clientCompanies: Array<{ id: string; name: string }>;
  dentalLabs: Array<{ id: string; clientCompanyId: string; name: string }>;
  labCustomers: MockRegistryItem[];
  users: MockUser[];
  customers: MockRegistryItem[];
  dentists: MockRegistryItem[];
  serviceTypes: MockRegistryItem[];
  components: MockRegistryItem[];
  blockTypes: MockRegistryItem[];
  millingDrills: MockRegistryItem[];
  cases: MockCase[];
  millings: MockMilling[];
  nextId: number;
};

const globalKey = "__dentalLabMockState";

function daysFromNow(days: number) {
  const date = new Date();
  date.setDate(date.getDate() + days);
  return date.toISOString();
}

function createInitialState(): MockState {
  const clientCompanies = [{ id: "client-company-1", name: "Vela Dental Group" }];
  const dentalLabs = [
    { id: "lab-vela-sao-paulo", clientCompanyId: "client-company-1", name: "Vela Sao Paulo" },
    { id: "lab-vela-rio", clientCompanyId: "client-company-1", name: "Vela Rio" },
  ];
  const labCustomers: MockRegistryItem[] = [
    { id: "lab-customer-1", dentalLabId: "lab-vela-sao-paulo", name: "Silva Group", phone: null, email: null, notes: null, isActive: true },
    { id: "lab-customer-2", dentalLabId: "lab-vela-sao-paulo", name: "Oral Prime Network", phone: null, email: null, notes: null, isActive: true },
    { id: "lab-customer-3", dentalLabId: "lab-vela-rio", name: "Rio Smile Network", phone: null, email: null, notes: null, isActive: true },
  ];
  const users: MockUser[] = [
    {
      id: "user-admin",
      clientCompanyId: "client-company-1",
      activeDentalLabId: "lab-vela-sao-paulo",
      labs: dentalLabs,
      name: "Demo Manager",
      email: "manager@demo.local",
      role: "ADMIN",
      isActive: true,
    },
    {
      id: "user-cad-ana",
      clientCompanyId: "client-company-1",
      activeDentalLabId: "lab-vela-sao-paulo",
      labs: dentalLabs,
      name: "Ana CAD",
      email: "ana@demo.local",
      role: "CAD_DESIGNER",
      isActive: true,
    },
    {
      id: "user-cad-joao",
      clientCompanyId: "client-company-1",
      activeDentalLabId: "lab-vela-sao-paulo",
      labs: dentalLabs,
      name: "Joao CAD",
      email: "joao@demo.local",
      role: "CAD_DESIGNER",
      isActive: true,
    },
  ];

  const customers: MockRegistryItem[] = [
    { id: "customer-1", dentalLabId: "lab-vela-sao-paulo", labCustomerId: "lab-customer-1", name: "Silva Dental", phone: "(11) 3456-7890", email: "contato@silvadental.local", notes: "Main demo customer", isActive: true },
    { id: "customer-2", dentalLabId: "lab-vela-sao-paulo", labCustomerId: "lab-customer-2", name: "Oral Prime", phone: "(21) 2222-1000", email: "ops@oralprime.local", notes: null, isActive: true },
    { id: "customer-3", dentalLabId: "lab-vela-rio", labCustomerId: "lab-customer-3", name: "Rio Smile", phone: "(21) 3333-3000", email: "ops@riosmile.local", notes: null, isActive: true },
  ];

  const dentists: MockRegistryItem[] = [
    { id: "dentist-1", dentalLabId: "lab-vela-sao-paulo", customerId: "customer-1", name: "Dr. Marcos Silva", phone: "(11) 98888-1111", email: "marcos@silvadental.local", notes: null, isActive: true },
    { id: "dentist-2", dentalLabId: "lab-vela-sao-paulo", customerId: "customer-2", name: "Dra. Carla Ramos", phone: "(21) 97777-2222", email: "carla@oralprime.local", notes: null, isActive: true },
    { id: "dentist-3", dentalLabId: "lab-vela-rio", customerId: "customer-3", name: "Dr. Felipe Rocha", phone: "(21) 96666-3333", email: "felipe@riosmile.local", notes: null, isActive: true },
  ];

  const serviceTypes: MockRegistryItem[] = [
    { id: "service-1", dentalLabId: "lab-vela-sao-paulo", name: "Crown", notes: "Single-unit crown", isActive: true },
    { id: "service-2", dentalLabId: "lab-vela-sao-paulo", name: "Bridge", notes: "Multi-unit bridge", isActive: true },
    { id: "service-3", dentalLabId: "lab-vela-rio", name: "Crown", notes: "Single-unit crown", isActive: true },
  ];

  const components: MockRegistryItem[] = [
    { id: "component-1", dentalLabId: "lab-vela-sao-paulo", name: "Ti Base", category: "Implant", brand: "DemoDent", defaultCost: "35", defaultPrice: "90", isActive: true },
    { id: "component-2", dentalLabId: "lab-vela-sao-paulo", name: "Analog", category: "Model", brand: "DemoDent", defaultCost: "12", defaultPrice: "30", isActive: true },
    { id: "component-3", dentalLabId: "lab-vela-rio", name: "Ti Base", category: "Implant", brand: "RioDent", defaultCost: "38", defaultPrice: "96", isActive: true },
  ];

  const blockTypes: MockRegistryItem[] = [
    { id: "block-1", dentalLabId: "lab-vela-sao-paulo", name: "Zirconia A2", material: "Zirconia", brand: "Vita", size: "98mm", shade: "A2", defaultCost: "48", isActive: true },
    { id: "block-2", dentalLabId: "lab-vela-sao-paulo", name: "PMMA Clear", material: "PMMA", brand: "DemoBlock", size: "98mm", shade: "Clear", defaultCost: "22", isActive: true },
    { id: "block-3", dentalLabId: "lab-vela-rio", name: "Zirconia A2", material: "Zirconia", brand: "RioBlock", size: "98mm", shade: "A2", defaultCost: "51", isActive: true },
  ];

  const millingDrills: MockRegistryItem[] = [
    { id: "drill-1", dentalLabId: "lab-vela-sao-paulo", name: "Diamond 1.0mm", type: "1.0mm", brand: "Roland", serialNumber: "D10-001", maxTeethRecommended: 120, notes: null, isActive: true },
    { id: "drill-2", dentalLabId: "lab-vela-sao-paulo", name: "Diamond 2.5mm", type: "2.5mm", brand: "Roland", serialNumber: "D25-001", maxTeethRecommended: 100, notes: null, isActive: true },
    { id: "drill-3", dentalLabId: "lab-vela-rio", name: "Diamond 1.0mm", type: "1.0mm", brand: "Roland", serialNumber: "RIO-D10-001", maxTeethRecommended: 120, notes: null, isActive: true },
  ];

  const cases: MockCase[] = [
    {
      id: "case-1",
      dentalLabId: "lab-vela-sao-paulo",
      labCustomerId: "lab-customer-1",
      code: "DL-1001",
      clientCaseCode: "SIL-449",
      patientName: "Maria Oliveira",
      currentStatus: CASE_STATUS.DESIGNING,
      teeth: "11, 12, 13",
      elementsQty: 3,
      shade: "A2",
      dueDate: daysFromNow(2),
      observations: "Anterior bridge, check emergence profile.",
      pendingNote: "",
      isUrgent: true,
      createdAt: daysFromNow(-4),
      updatedAt: daysFromNow(-1),
      customerId: "customer-1",
      dentistId: "dentist-1",
      serviceTypeId: "service-2",
      components: [{ id: "usage-1", componentId: "component-1", quantity: 2, chargeClient: true, unitCost: "35", unitPrice: "90", notes: null }],
      attachments: [{ id: "att-1", caseId: "case-1", fileName: "scan-maria.zip", filePath: "mock/case-1/scan-maria.zip", fileType: "application/zip", fileSize: 2048000, kind: "SCAN_INPUT", retentionUntil: daysFromNow(90), createdAt: daysFromNow(-4), uploadedByName: "Demo Manager" }],
      statusHistory: [{ id: "history-1", fromStatus: null, toStatus: CASE_STATUS.ENTRY, note: "Case created", changedAt: daysFromNow(-4) }],
    },
    {
      id: "case-2",
      dentalLabId: "lab-vela-sao-paulo",
      labCustomerId: "lab-customer-2",
      code: "DL-1002",
      clientCaseCode: "OP-881",
      patientName: "Rafael Costa",
      currentStatus: CASE_STATUS.DESIGN_READY,
      teeth: "36",
      elementsQty: 1,
      shade: "A3",
      dueDate: daysFromNow(1),
      observations: "Single crown.",
      pendingNote: "",
      isUrgent: false,
      createdAt: daysFromNow(-3),
      updatedAt: daysFromNow(-1),
      customerId: "customer-2",
      dentistId: "dentist-2",
      serviceTypeId: "service-1",
      components: [],
      attachments: [],
      statusHistory: [{ id: "history-2", fromStatus: CASE_STATUS.DESIGNING, toStatus: CASE_STATUS.DESIGN_READY, note: "Design approved", changedAt: daysFromNow(-1) }],
    },
    {
      id: "case-3",
      dentalLabId: "lab-vela-sao-paulo",
      labCustomerId: "lab-customer-1",
      code: "DL-1003",
      clientCaseCode: null,
      patientName: "Lucia Martins",
      currentStatus: CASE_STATUS.DONE,
      teeth: "21, 22",
      elementsQty: 2,
      shade: "B1",
      dueDate: daysFromNow(-2),
      observations: "Delivered.",
      pendingNote: "",
      isUrgent: false,
      createdAt: daysFromNow(-10),
      updatedAt: daysFromNow(-2),
      customerId: "customer-1",
      dentistId: "dentist-1",
      serviceTypeId: "service-1",
      components: [],
      attachments: [],
      statusHistory: [{ id: "history-3", fromStatus: CASE_STATUS.MILLING_PRINTING, toStatus: CASE_STATUS.DONE, note: "Completed", changedAt: daysFromNow(-2) }],
    },
    {
      id: "case-4",
      dentalLabId: "lab-vela-rio",
      labCustomerId: "lab-customer-3",
      code: "DL-1001",
      clientCaseCode: "RIO-144",
      patientName: "Paula Mendes",
      currentStatus: CASE_STATUS.DESIGNING,
      teeth: "14",
      elementsQty: 1,
      shade: "A1",
      dueDate: daysFromNow(3),
      observations: "Rio lab scoped case with code reused safely.",
      pendingNote: "",
      isUrgent: false,
      createdAt: daysFromNow(-2),
      updatedAt: daysFromNow(-1),
      customerId: "customer-3",
      dentistId: "dentist-3",
      serviceTypeId: "service-3",
      components: [],
      attachments: [],
      statusHistory: [{ id: "history-4", fromStatus: null, toStatus: CASE_STATUS.ENTRY, note: "Case created", changedAt: daysFromNow(-2) }],
    },
  ];

  const millings: MockMilling[] = [
    {
      id: "milling-1",
      dentalLabId: "lab-vela-sao-paulo",
      caseId: "case-3",
      blockTypeId: "block-1",
      millingDrillId: null,
      fineMillingDrillId: "drill-1",
      coarseMillingDrillId: "drill-2",
      teethMilledQty: 2,
      status: "SUCCESS",
      failureReason: null,
      notes: "Clean run.",
      milledAt: daysFromNow(-2),
    },
  ];

  return {
    clientCompanies,
    dentalLabs,
    labCustomers,
    users,
    customers,
    dentists,
    serviceTypes,
    components,
    blockTypes,
    millingDrills,
    cases,
    millings,
    nextId: 100,
  };
}

function state(): MockState {
  const root = globalThis as typeof globalThis & { [globalKey]?: MockState };
  root[globalKey] ??= createInitialState();
  return root[globalKey];
}

function id(prefix: string) {
  const store = state();
  store.nextId += 1;
  return `${prefix}-${store.nextId}`;
}

function now() {
  return new Date().toISOString();
}

function activeDentalLabId() {
  return getMockUser().activeDentalLabId;
}

function isActiveLabItem(item: { dentalLabId: string }) {
  return item.dentalLabId === activeDentalLabId();
}

function isActiveReference(item: { isActive?: boolean; deletedAt?: string | null }) {
  return item.isActive !== false && !item.deletedAt;
}

function normalizeCaseComponents(value: unknown): MockCaseComponent[] {
  if (!Array.isArray(value)) return [];

  return value
    .filter(
      (item): item is Record<string, unknown> =>
        typeof item === "object" && item !== null,
    )
    .filter((item) => typeof item.componentId === "string" && item.componentId)
    .map((item) => ({
      id: typeof item.id === "string" && item.id ? item.id : id("usage"),
      componentId: String(item.componentId),
      quantity: Math.max(Number(item.quantity || 1), 1),
      chargeClient:
        item.chargeClient === undefined ? true : Boolean(item.chargeClient),
      unitCost:
        typeof item.unitCost === "string" && item.unitCost
          ? item.unitCost
          : null,
      unitPrice:
        typeof item.unitPrice === "string" && item.unitPrice
          ? item.unitPrice
          : null,
      notes:
        typeof item.notes === "string" && item.notes ? item.notes : null,
    }));
}

export function getMockUser() {
  return state().users[0];
}

export function getCaseFormOptions() {
  const store = state();
  const dentalLabId = activeDentalLabId();
  return {
    customers: store.customers.filter((customer) => customer.dentalLabId === dentalLabId && isActiveReference(customer)).map((customer) => ({
      id: customer.id,
      dentalLabId: customer.dentalLabId,
      labCustomerId: customer.labCustomerId ?? null,
      name: customer.name,
      dentists: store.dentists
        .filter((dentist) => dentist.dentalLabId === dentalLabId && dentist.customerId === customer.id && isActiveReference(dentist))
        .map((dentist) => ({ id: dentist.id, name: dentist.name })),
    })),
    serviceTypes: store.serviceTypes
      .filter((item) => item.dentalLabId === dentalLabId && isActiveReference(item))
      .map((item) => ({ id: item.id, name: item.name })),
    components: store.components
      .filter((item) => item.dentalLabId === dentalLabId && isActiveReference(item))
      .map((item) => ({
        id: item.id,
        name: item.name,
        category: item.category ?? null,
        brand: item.brand ?? null,
        defaultCost: item.defaultCost ?? null,
        defaultPrice: item.defaultPrice ?? null,
      })),
  };
}

export function getRegistryBootstrap() {
  const store = state();
  const dentalLabId = activeDentalLabId();
  return {
    ...getCaseFormOptions(),
    blockTypes: store.blockTypes.filter((item) => item.dentalLabId === dentalLabId && isActiveReference(item)),
    millingDrills: store.millingDrills.filter((item) => item.dentalLabId === dentalLabId && isActiveReference(item)),
  };
}

function findCustomer(id: string | null) {
  return state().customers.find((item) => item.id === id) ?? null;
}

function dentist(id: string | null) {
  return state().dentists.find((item) => item.id === id) ?? null;
}

function serviceType(id: string | null) {
  return state().serviceTypes.find((item) => item.id === id) ?? null;
}

function component(id: string) {
  return state().components.find((item) => item.id === id) ?? null;
}

function labCustomer(id: string | null) {
  return state().labCustomers.find((item) => item.id === id) ?? null;
}

function blockType(id: string) {
  return state().blockTypes.find((item) => item.id === id) ?? null;
}

function drill(id: string | null) {
  return state().millingDrills.find((item) => item.id === id) ?? null;
}

function activeCustomer(id: string | null) {
  const item = findCustomer(id);
  return item && item.dentalLabId === activeDentalLabId() && isActiveReference(item) ? item : null;
}

function validateActiveCaseReferences(payload: Record<string, unknown>) {
  const dentalLabId = activeDentalLabId();
  const customerId = typeof payload.customerId === "string" && payload.customerId ? payload.customerId : null;
  const dentistId = typeof payload.dentistId === "string" && payload.dentistId ? payload.dentistId : null;
  const serviceTypeId = typeof payload.serviceTypeId === "string" && payload.serviceTypeId ? payload.serviceTypeId : null;

  const selectedCustomer = activeCustomer(customerId);
  const selectedDentist = dentist(dentistId);
  const selectedServiceType = serviceType(serviceTypeId);

  if (customerId && !selectedCustomer) throw new Error("customer is inactive, archived, or not in this lab.");
  if (dentistId && (!selectedDentist || selectedDentist.dentalLabId !== dentalLabId || !isActiveReference(selectedDentist))) {
    throw new Error("Dentist is inactive, archived, or not in this lab.");
  }
  if (customerId && selectedDentist && selectedDentist.customerId !== customerId) {
    throw new Error("Dentist does not belong to the selected customer.");
  }
  if (serviceTypeId && (!selectedServiceType || selectedServiceType.dentalLabId !== dentalLabId || !isActiveReference(selectedServiceType))) {
    throw new Error("Service type is inactive, archived, or not in this lab.");
  }
}

export function serializeCase(item: MockCase, detailed = false) {
  const store = state();
  const c = findCustomer(item.customerId);
  const d = dentist(item.dentistId);
  const s = serviceType(item.serviceTypeId);
  const customer = labCustomer(item.labCustomerId);
  const millings = store.millings.filter((milling) => milling.caseId === item.id);

  return {
    id: item.id,
    dentalLabId: item.dentalLabId,
    labCustomerId: item.labCustomerId,
    labCustomerName: customer?.name ?? "",
    code: item.code,
    patientName: item.patientName,
    currentStatus: item.currentStatus,
    teeth: item.teeth,
    elementsQty: item.elementsQty,
    shade: item.shade,
    dueDate: item.dueDate,
    observations: item.observations,
    pendingNote: item.pendingNote,
    isUrgent: item.isUrgent,
    createdAt: item.createdAt,
    updatedAt: item.updatedAt,
    customerId: item.customerId,
    dentistId: item.dentistId,
    serviceTypeId: item.serviceTypeId,
    customerName: c?.name ?? "",
    dentistName: d?.name ?? "",
    serviceTypeName: s?.name ?? "",
    customer: c ? { id: c.id, name: c.name } : null,
    dentist: d ? { id: d.id, name: d.name } : null,
    serviceType: s ? { id: s.id, name: s.name } : null,
    attachments: detailed ? item.attachments : [],
    components: detailed
      ? item.components.map((usage) => {
          const registryComponent = component(usage.componentId);
          return {
            id: usage.id,
            componentId: usage.componentId,
            componentName: registryComponent?.name ?? "Component",
            quantity: usage.quantity,
            chargeClient: usage.chargeClient,
            unitCost: usage.unitCost,
            unitPrice: usage.unitPrice,
            notes: usage.notes,
          };
        })
      : [],
    millings: detailed
      ? millings.map((milling) => {
          const block = blockType(milling.blockTypeId);
          return {
            id: milling.id,
            status: milling.status,
            teethMilledQty: milling.teethMilledQty,
            failureReason: milling.failureReason,
            notes: milling.notes,
            milledAt: milling.milledAt,
            blockTypeName: block?.name ?? "",
            blockTypeShade: block?.shade ?? null,
            millingDrillName:
              drill(milling.fineMillingDrillId)?.name ??
              drill(milling.coarseMillingDrillId)?.name ??
              drill(milling.millingDrillId)?.name ??
              null,
          };
        })
      : [],
  };
}

export function listCases(filters: URLSearchParams) {
  const page = Math.max(Number(filters.get("page") ?? 1), 1);
  const pageSize = Math.min(Math.max(Number(filters.get("pageSize") ?? 25), 1), 100);
  const q = (filters.get("q") ?? filters.get("search") ?? "").trim().toLowerCase();
  const status = filters.get("status") as CaseStatusValue | null;
  const urgent = filters.get("urgent");
  const customerId = filters.get("customerId");

  let items = state().cases.filter(isActiveLabItem);
  if (status) items = items.filter((item) => item.currentStatus === status);
  if (customerId) items = items.filter((item) => item.customerId === customerId);
  if (urgent === "urgent") items = items.filter((item) => item.isUrgent);
  if (urgent === "normal") items = items.filter((item) => !item.isUrgent);
  if (q) {
    items = items.filter((item) => {
      const values = [
        item.code,
        item.patientName,
        findCustomer(item.customerId)?.name,
        dentist(item.dentistId)?.name,
      ];
      return values.some((value) => value?.toLowerCase().includes(q));
    });
  }

  items.sort((a, b) => b.createdAt.localeCompare(a.createdAt));
  const total = items.length;
  const offset = (page - 1) * pageSize;
  return {
    cases: items.slice(offset, offset + pageSize).map((item) => serializeCase(item)),
    total,
    page,
    pageSize,
  };
}

export function getCase(idValue: string) {
  const item = state().cases.find((caseItem) => caseItem.id === idValue && isActiveLabItem(caseItem));
  return item ? serializeCase(item, true) : null;
}

export function createCase(payload: Record<string, unknown>) {
  const createdAt = now();
  const dentalLabId = activeDentalLabId();
  validateActiveCaseReferences(payload);
  const selectedCustomer = activeCustomer(typeof payload.customerId === "string" ? payload.customerId : null);
  const item: MockCase = {
    id: id("case"),
    dentalLabId,
    labCustomerId: selectedCustomer?.labCustomerId ?? null,
    code: String(payload.code || `DL-${state().nextId}`),
    clientCaseCode: null,
    patientName: String(payload.patientName || "New Patient"),
    currentStatus: (payload.currentStatus as CaseStatusValue) || CASE_STATUS.ENTRY,
    teeth: String(payload.teeth || ""),
    elementsQty: Number(payload.elementsQty || 0) || null,
    shade: String(payload.shade || ""),
    dueDate: typeof payload.dueDate === "string" && payload.dueDate ? new Date(payload.dueDate).toISOString() : null,
    observations: String(payload.observations || ""),
    pendingNote: String(payload.pendingNote || ""),
    isUrgent: Boolean(payload.isUrgent),
    createdAt,
    updatedAt: createdAt,
    customerId: selectedCustomer?.dentalLabId === dentalLabId ? selectedCustomer.id : null,
    dentistId: typeof payload.dentistId === "string" ? payload.dentistId : null,
    serviceTypeId: typeof payload.serviceTypeId === "string" ? payload.serviceTypeId : null,
    components: normalizeCaseComponents(payload.components),
    attachments: [],
    statusHistory: [{ id: id("history"), fromStatus: null, toStatus: CASE_STATUS.ENTRY, note: "Case created", changedAt: createdAt }],
  };
  state().cases.unshift(item);
  return serializeCase(item, true);
}

export function updateCase(idValue: string, payload: Record<string, unknown>) {
  const item = state().cases.find((caseItem) => caseItem.id === idValue && isActiveLabItem(caseItem));
  if (!item) return null;
  validateActiveCaseReferences(payload);
  const previousStatus = item.currentStatus;
  if (typeof payload.code === "string") item.code = payload.code;
  if (typeof payload.patientName === "string") item.patientName = payload.patientName;
  if (typeof payload.currentStatus === "string") item.currentStatus = payload.currentStatus as CaseStatusValue;
  if (typeof payload.status === "string") item.currentStatus = payload.status as CaseStatusValue;
  if (typeof payload.teeth === "string") item.teeth = payload.teeth;
  if ("elementsQty" in payload) item.elementsQty = Number(payload.elementsQty || 0) || null;
  if (typeof payload.shade === "string") item.shade = payload.shade;
  if ("dueDate" in payload) item.dueDate = typeof payload.dueDate === "string" && payload.dueDate ? new Date(payload.dueDate).toISOString() : null;
  if (typeof payload.observations === "string") item.observations = payload.observations;
  if (typeof payload.pendingNote === "string") item.pendingNote = payload.pendingNote;
  if ("isUrgent" in payload) item.isUrgent = Boolean(payload.isUrgent);
  if ("customerId" in payload) {
    const selectedCustomer = activeCustomer(typeof payload.customerId === "string" ? payload.customerId : null);
    item.customerId = selectedCustomer?.dentalLabId === item.dentalLabId ? selectedCustomer.id : null;
    item.labCustomerId = selectedCustomer?.labCustomerId ?? null;
  }
  if ("dentistId" in payload) item.dentistId = typeof payload.dentistId === "string" && payload.dentistId ? payload.dentistId : null;
  if ("serviceTypeId" in payload) item.serviceTypeId = typeof payload.serviceTypeId === "string" && payload.serviceTypeId ? payload.serviceTypeId : null;
  if ("components" in payload) item.components = normalizeCaseComponents(payload.components);
  item.updatedAt = now();
  if (previousStatus !== item.currentStatus) {
    item.statusHistory.unshift({
      id: id("history"),
      fromStatus: previousStatus,
      toStatus: item.currentStatus,
      note: typeof payload.note === "string" && payload.note ? payload.note : "Status updated via mock API",
      changedAt: item.updatedAt,
    });
  }
  return serializeCase(item, true);
}

export function deleteCase(idValue: string) {
  const store = state();
  const before = store.cases.length;
  store.cases = store.cases.filter((item) => item.id !== idValue || !isActiveLabItem(item));
  store.millings = store.millings.filter((item) => item.caseId !== idValue);
  return store.cases.length !== before;
}

export function addAttachment(caseId: string, file: File, kind: AttachmentKind) {
  const item = state().cases.find((caseItem) => caseItem.id === caseId && isActiveLabItem(caseItem));
  if (!item) return null;
  const attachment: MockAttachment = {
    id: id("attachment"),
    caseId,
    fileName: file.name,
    filePath: `mock/${caseId}/${Date.now()}-${file.name.replace(/[^a-zA-Z0-9._-]/g, "_")}`,
    fileType: file.type || null,
    fileSize: file.size || null,
    kind,
    retentionUntil: daysFromNow(90),
    createdAt: now(),
    uploadedByName: getMockUser().name,
  };
  item.attachments.unshift(attachment);
  item.updatedAt = now();
  return attachment;
}

export function deleteAttachment(caseId: string, attachmentId: string) {
  const item = state().cases.find((caseItem) => caseItem.id === caseId && isActiveLabItem(caseItem));
  if (!item) return false;
  const before = item.attachments.length;
  item.attachments = item.attachments.filter((attachment) => attachment.id !== attachmentId);
  return item.attachments.length !== before;
}

export function getDownloadItems(caseIds: string[], kind: AttachmentKind | "ALL" | "FINAL_OUTPUTS") {
  const allowedKinds =
    kind === "ALL"
      ? null
      : kind === "FINAL_OUTPUTS"
        ? new Set<AttachmentKind>(["DESIGN_OUTPUT", "MODEL_OUTPUT"])
        : new Set<AttachmentKind>([kind]);

  return state().cases
    .filter((item) => caseIds.includes(item.id) && isActiveLabItem(item))
    .flatMap((item) =>
      item.attachments
        .filter((attachment) => !allowedKinds || allowedKinds.has(attachment.kind))
        .map((attachment) => ({
          id: attachment.id,
          caseId: item.id,
          caseLabel: item.code || item.patientName,
          fileName: attachment.fileName,
          filePath: attachment.filePath,
          kind: attachment.kind,
          signedUrl: `mock-downloads/${attachment.id}`,
        })),
    );
}

export function getDashboardData() {
  const store = state();
  const allCases = store.cases.filter(isActiveLabItem);
  const nowDate = new Date();
  const monthStart = new Date(nowDate.getFullYear(), nowDate.getMonth(), 1);
  const weekStart = new Date(nowDate);
  weekStart.setDate(nowDate.getDate() - 6);
  weekStart.setHours(0, 0, 0, 0);
  const teethCount = (item: MockCase) => item.elementsQty ?? item.teeth.split(/[\s,;/]+/).filter(Boolean).length;
  const doneDate = (item: MockCase) => new Date(item.statusHistory.find((history) => history.toStatus === CASE_STATUS.DONE)?.changedAt ?? item.updatedAt);
  const designerStats = Object.values(CASE_STATUS).map((status) => {
    const assigned = allCases.filter((item) => item.currentStatus === status);
    const active = assigned.filter((item) => item.currentStatus !== CASE_STATUS.DONE);
    const completed = assigned.filter((item) => item.currentStatus === CASE_STATUS.DONE);
    return {
      id: status,
      name: status.replace(/_/g, " "),
      totalCases: assigned.length,
      totalTeethDesigned: assigned.reduce((sum, item) => sum + teethCount(item), 0),
      activeCases: active.length,
      activeTeeth: active.reduce((sum, item) => sum + teethCount(item), 0),
      completedCases: completed.length,
      completedTeeth: completed.reduce((sum, item) => sum + teethCount(item), 0),
      completedThisWeek: completed.filter((item) => doneDate(item) >= weekStart).length,
      completedThisMonth: completed.filter((item) => doneDate(item) >= monthStart).length,
      completedTeethThisMonth: completed.filter((item) => doneDate(item) >= monthStart).reduce((sum, item) => sum + teethCount(item), 0),
      urgentOpenCases: active.filter((item) => item.isUrgent).length,
      overdueCases: active.filter((item) => item.dueDate && new Date(item.dueDate) < nowDate).length,
      avgTurnaroundDays: completed.length
        ? Number((completed.reduce((sum, item) => sum + (doneDate(item).getTime() - new Date(item.createdAt).getTime()) / 86400000, 0) / completed.length).toFixed(1))
        : null,
      completionRate: assigned.length ? Math.round((completed.length / assigned.length) * 100) : 0,
    };
  }).filter((item) => item.totalCases > 0);
  const completed = allCases.filter((item) => item.currentStatus === CASE_STATUS.DONE);

  return {
    summary: {
      totalDesigners: designerStats.length,
      totalAssignedCases: allCases.length,
      totalTeethDesigned: allCases.reduce((sum, item) => sum + teethCount(item), 0),
      openCases: allCases.length - completed.length,
      openTeeth: allCases.filter((item) => item.currentStatus !== CASE_STATUS.DONE).reduce((sum, item) => sum + teethCount(item), 0),
      completedThisMonth: completed.filter((item) => doneDate(item) >= monthStart).length,
      urgentOpenCases: allCases.filter((item) => item.currentStatus !== CASE_STATUS.DONE && item.isUrgent).length,
      avgTurnaroundDays: completed.length
        ? Number((completed.reduce((sum, item) => sum + (doneDate(item).getTime() - new Date(item.createdAt).getTime()) / 86400000, 0) / completed.length).toFixed(1))
        : null,
    },
    designerStats,
    cases: allCases,
  };
}

export function getRegistryData() {
  const store = state();
  const dentalLabId = activeDentalLabId();
  return {
    labCustomers: store.labCustomers.filter((item) => item.dentalLabId === dentalLabId && isActiveReference(item)),
    customers: store.customers.filter((item) => item.dentalLabId === dentalLabId && isActiveReference(item)),
    dentists: store.dentists
      .filter((item) => item.dentalLabId === dentalLabId && isActiveReference(item))
      .map((item) => ({ ...item, customer: { name: findCustomer(item.customerId ?? null)?.name ?? "" } })),
    components: store.components.filter((item) => item.dentalLabId === dentalLabId && isActiveReference(item)),
    blockTypes: store.blockTypes.filter((item) => item.dentalLabId === dentalLabId && isActiveReference(item)),
    serviceTypes: store.serviceTypes.filter((item) => item.dentalLabId === dentalLabId && isActiveReference(item)),
    drills: store.millingDrills
      .filter((item) => item.dentalLabId === dentalLabId && isActiveReference(item))
      .map((item) => ({ ...item, fineMillings: [], coarseMillings: [] })),
  };
}

export function createRegistryEntity(entity: string, payload: Record<string, unknown>) {
  const store = state();
  const item = normalizeRegistryPayload(entity, id(entity.replace(/s$/, "")), payload);
  getRegistryArray(store, entity)?.unshift(item);
  return item;
}

export function updateRegistryEntity(entity: string, itemId: string, payload: Record<string, unknown>) {
  const array = getRegistryArray(state(), entity);
  const item = array?.find((entry) => entry.id === itemId && isActiveLabItem(entry));
  if (!item) return null;
  Object.assign(item, normalizeRegistryPayload(entity, itemId, payload));
  return item;
}

export function deleteRegistryEntity(entity: string, itemId: string) {
  const array = getRegistryArray(state(), entity);
  const item = array?.find((entry) => entry.id === itemId && isActiveLabItem(entry) && isActiveReference(entry));
  if (!item) return null;
  item.isActive = false;
  item.deletedAt = now();
  return item;
}

function getRegistryArray(store: MockState, entity: string) {
  if (entity === "lab-customers") return store.labCustomers;
  if (entity === "customers") return store.customers;
  if (entity === "dentists") return store.dentists;
  if (entity === "components") return store.components;
  if (entity === "block-types") return store.blockTypes;
  if (entity === "service-types") return store.serviceTypes;
  if (entity === "milling-drills") return store.millingDrills;
  return null;
}

function normalizeRegistryPayload(entity: string, itemId: string, payload: Record<string, unknown>): MockRegistryItem {
  const boolValue = payload.isActive === undefined ? true : payload.isActive === true || payload.isActive === "true" || payload.isActive === "on";
  const dentalLabId = activeDentalLabId();
  const base = {
    id: itemId,
    dentalLabId,
    name: String(payload.name || "Untitled"),
    notes: typeof payload.notes === "string" ? payload.notes : null,
    isActive: boolValue,
    deletedAt: boolValue ? null : now(),
  };
  if (entity === "customers") return { ...base, labCustomerId: typeof payload.labCustomerId === "string" && payload.labCustomerId ? payload.labCustomerId : null, phone: String(payload.phone || ""), email: String(payload.email || "") };
  if (entity === "dentists") return { ...base, customerId: String(payload.customerId || state().customers.find((item) => item.dentalLabId === dentalLabId)?.id || ""), phone: String(payload.phone || ""), email: String(payload.email || "") };
  if (entity === "components") return { ...base, category: String(payload.category || ""), brand: String(payload.brand || ""), defaultCost: String(payload.defaultCost || "0"), defaultPrice: String(payload.defaultPrice || "0") };
  if (entity === "block-types") return { ...base, material: String(payload.material || ""), brand: String(payload.brand || ""), size: String(payload.size || ""), shade: String(payload.shade || ""), defaultCost: String(payload.defaultCost || "0") };
  if (entity === "service-types" || entity === "lab-customers") return base;
  return { ...base, type: String(payload.type || ""), brand: String(payload.brand || ""), serialNumber: String(payload.serialNumber || ""), maxTeethRecommended: Number(payload.maxTeethRecommended || 0) || null };
}

export function getProductionData() {
  const store = state();
  const productionStatuses: CaseStatusValue[] = [
    CASE_STATUS.DESIGN_READY,
    CASE_STATUS.MILLING_PRINTING,
  ];
  const readyCases = store.cases
    .filter((item) => item.dentalLabId === activeDentalLabId() && productionStatuses.includes(item.currentStatus))
    .map((item) => ({ id: item.id, code: item.code, patientName: item.patientName }));

  const millings = store.millings
    .filter((milling) => milling.dentalLabId === activeDentalLabId())
    .map((milling) => {
      const caseItem = store.cases.find((item) => item.id === milling.caseId);
      return {
        ...milling,
        milledAt: milling.milledAt,
        case: caseItem
          ? {
              id: caseItem.id,
              code: caseItem.code,
              patientName: caseItem.patientName,
              customer: { name: findCustomer(caseItem.customerId)?.name ?? "" },
            }
          : null,
        blockType: blockType(milling.blockTypeId),
        millingDrill: drill(milling.millingDrillId),
        fineMillingDrill: drill(milling.fineMillingDrillId),
        coarseMillingDrill: drill(milling.coarseMillingDrillId),
      };
    })
    .sort((a, b) => b.milledAt.localeCompare(a.milledAt));

  return {
    millings,
    blockTypes: store.blockTypes.filter((item) => item.dentalLabId === activeDentalLabId() && isActiveReference(item)).map((item) => ({ id: item.id, name: item.name, shade: item.shade ?? null })),
    millingDrills: store.millingDrills.filter((item) => item.dentalLabId === activeDentalLabId() && isActiveReference(item)).map((item) => ({ id: item.id, name: item.name, brand: item.brand ?? null, type: item.type ?? null, maxTeethRecommended: item.maxTeethRecommended ?? null })),
    readyCases,
  };
}

export function createMilling(payload: Record<string, unknown>) {
  const dentalLabId = activeDentalLabId();
  const item: MockMilling = {
    id: id("milling"),
    dentalLabId,
    caseId: String(payload.caseId || ""),
    blockTypeId: String(payload.blockTypeId || ""),
    millingDrillId: typeof payload.millingDrillId === "string" && payload.millingDrillId ? payload.millingDrillId : null,
    fineMillingDrillId: typeof payload.fineMillingDrillId === "string" && payload.fineMillingDrillId ? payload.fineMillingDrillId : null,
    coarseMillingDrillId: typeof payload.coarseMillingDrillId === "string" && payload.coarseMillingDrillId ? payload.coarseMillingDrillId : null,
    teethMilledQty: Number(payload.teethMilledQty || 0),
    status: payload.status === "FAILED" ? "FAILED" : "SUCCESS",
    failureReason: typeof payload.failureReason === "string" && payload.failureReason ? payload.failureReason : null,
    notes: typeof payload.notes === "string" && payload.notes ? payload.notes : null,
    milledAt: typeof payload.milledAt === "string" ? new Date(payload.milledAt).toISOString() : now(),
  };
  state().millings.unshift(item);
  updateCase(item.caseId, { currentStatus: CASE_STATUS.MILLING_PRINTING });
  return item;
}

export function updateMilling(itemId: string, payload: Record<string, unknown>) {
  const item = state().millings.find((milling) => milling.id === itemId && isActiveLabItem(milling));
  if (!item) return null;
  Object.assign(item, {
    caseId: String(payload.caseId || item.caseId),
    blockTypeId: String(payload.blockTypeId || item.blockTypeId),
    fineMillingDrillId: typeof payload.fineMillingDrillId === "string" && payload.fineMillingDrillId ? payload.fineMillingDrillId : null,
    coarseMillingDrillId: typeof payload.coarseMillingDrillId === "string" && payload.coarseMillingDrillId ? payload.coarseMillingDrillId : null,
    teethMilledQty: Number(payload.teethMilledQty || item.teethMilledQty),
    status: payload.status === "FAILED" ? "FAILED" : "SUCCESS",
    failureReason: typeof payload.failureReason === "string" && payload.failureReason ? payload.failureReason : null,
    notes: typeof payload.notes === "string" && payload.notes ? payload.notes : null,
    milledAt: typeof payload.milledAt === "string" ? new Date(payload.milledAt).toISOString() : item.milledAt,
  });
  return item;
}

export function deleteMilling(itemId: string) {
  const store = state();
  const before = store.millings.length;
  store.millings = store.millings.filter((item) => item.id !== itemId || !isActiveLabItem(item));
  return store.millings.length !== before;
}
