import { CASE_STATUS, CASE_STATUS_META } from "@/features/cases/constants";
import type {
  CaseStatusValue,
  CustomerOption,
  ComponentOption,
  CurrentUser,
  DentalLabOption,
  EditableCase,
  LabCustomerOption,
  ServiceTypeOption,
} from "@/features/cases/types";

export const mockClientCompanies = [
  {
    id: "client-company-1",
    name: "Vela Dental Group",
  },
];

export const mockDentalLabs: DentalLabOption[] = [
  {
    id: "lab-vela-sao-paulo",
    clientCompanyId: "client-company-1",
    name: "Vela Sao Paulo",
  },
  {
    id: "lab-vela-rio",
    clientCompanyId: "client-company-1",
    name: "Vela Rio",
  },
];

export const mockLabCustomers: LabCustomerOption[] = [
  {
    id: "lab-customer-1",
    dentalLabId: "lab-vela-sao-paulo",
    name: "Silva Group",
  },
  {
    id: "lab-customer-2",
    dentalLabId: "lab-vela-sao-paulo",
    name: "Oral Prime Network",
  },
  {
    id: "lab-customer-3",
    dentalLabId: "lab-vela-rio",
    name: "Rio Smile Network",
  },
];

export const mockUser: CurrentUser = {
  id: "user-admin",
  name: "Demo Manager",
  role: "ADMIN",
  clientCompanyId: "client-company-1",
  activeDentalLabId: "lab-vela-sao-paulo",
  labs: mockDentalLabs,
};

const activeDentalLabId = mockUser.activeDentalLabId;

const allMockCustomers: CustomerOption[] = [
  {
    id: "customer-1",
    dentalLabId: "lab-vela-sao-paulo",
    labCustomerId: "lab-customer-1",
    name: "Silva Dental",
    dentists: [{ id: "dentist-1", name: "Dr. Marcos Silva" }],
    price_table: null,
  },
  {
    id: "customer-2",
    dentalLabId: "lab-vela-sao-paulo",
    labCustomerId: "lab-customer-2",
    name: "Oral Prime",
    dentists: [{ id: "dentist-2", name: "Dra. Carla Ramos" }],
    price_table: null,
  },
  {
    id: "customer-3",
    dentalLabId: "lab-vela-rio",
    labCustomerId: "lab-customer-3",
    name: "Rio Smile",
    dentists: [{ id: "dentist-3", name: "Dr. Felipe Rocha" }],
    price_table: null,
  },
];

const allMockServiceTypes: Array<ServiceTypeOption & { dentalLabId: string }> = [
  {
    id: "service-1",
    dentalLabId: "lab-vela-sao-paulo",
    name: "Crown",
    base_price: "180.00",
    currency: "BRL",
  },
  {
    id: "service-2",
    dentalLabId: "lab-vela-sao-paulo",
    name: "Bridge",
    base_price: "420.00",
    currency: "BRL",
  },
  {
    id: "service-3",
    dentalLabId: "lab-vela-rio",
    name: "Crown",
    base_price: "200.00",
    currency: "BRL",
  },
];

const allMockComponents: Array<ComponentOption & { dentalLabId: string }> = [
  {
    id: "component-1",
    dentalLabId: "lab-vela-sao-paulo",
    name: "Ti Base",
    category: "Implant",
    brand: "DemoDent",
    defaultCost: "35",
    defaultPrice: "90",
  },
  {
    id: "component-2",
    dentalLabId: "lab-vela-sao-paulo",
    name: "Analog",
    category: "Model",
    brand: "DemoDent",
    defaultCost: "12",
    defaultPrice: "30",
  },
  {
    id: "component-3",
    dentalLabId: "lab-vela-rio",
    name: "Ti Base",
    category: "Implant",
    brand: "RioDent",
    defaultCost: "38",
    defaultPrice: "96",
  },
];

const allMockCases: EditableCase[] = [
  {
    id: "case-1",
    dentalLabId: "lab-vela-sao-paulo",
    labCustomerId: "lab-customer-1",
    labCustomerName: "Silva Group",
    code: "DL-1001",
    patientName: "Maria Oliveira",
    currentStatus: CASE_STATUS.IN_PRODUCTION,
    teeth: "11, 12, 13",
    elementsQty: 3,
    shade: "A2",
    dueDate: new Date(Date.now() + 2 * 86400000).toISOString(),
    observations: "Anterior bridge, check emergence profile.",
    isUrgent: true,
    createdAt: new Date(Date.now() - 4 * 86400000).toISOString(),
    updatedAt: new Date(Date.now() - 1 * 86400000).toISOString(),
    customerName: "Silva Dental",
    customerId: "customer-1",
    dentistName: "Dr. Marcos Silva",
    dentistId: "dentist-1",
    serviceTypeId: "service-2",
    serviceTypeName: "Bridge",
    serviceBasePriceSnapshot: "420.00",
    casePrice: "420.00",
    isPriceOverridden: false,
    labCurrency: "BRL",
    attachments: [],
    serviceLineCount: 1,
    serviceLines: [],
    components: [
      {
        id: "usage-1",
        componentId: "component-1",
        componentName: "Ti Base",
        quantity: 2,
        chargeClient: true,
        unitCost: "35",
        unitPrice: "90",
        notes: null,
      },
    ],
    millings: [],
    comments: [],
    statusHistory: [],
  },
  {
    id: "case-2",
    dentalLabId: "lab-vela-sao-paulo",
    labCustomerId: "lab-customer-2",
    labCustomerName: "Oral Prime Network",
    code: "DL-1002",
    patientName: "Rafael Costa",
    currentStatus: CASE_STATUS.IN_PRODUCTION,
    teeth: "36",
    elementsQty: 1,
    shade: "A3",
    dueDate: new Date(Date.now() + 1 * 86400000).toISOString(),
    observations: "Single crown.",
    isUrgent: false,
    createdAt: new Date(Date.now() - 3 * 86400000).toISOString(),
    updatedAt: new Date(Date.now() - 1 * 86400000).toISOString(),
    customerName: "Oral Prime",
    customerId: "customer-2",
    dentistName: "Dra. Carla Ramos",
    dentistId: "dentist-2",
    serviceTypeId: "service-1",
    serviceTypeName: "Crown",
    serviceBasePriceSnapshot: "180.00",
    casePrice: "210.00",
    isPriceOverridden: true,
    labCurrency: "BRL",
    attachments: [],
    serviceLineCount: 1,
    serviceLines: [],
    components: [],
    millings: [],
    comments: [],
    statusHistory: [],
  },
  {
    id: "case-3",
    dentalLabId: "lab-vela-sao-paulo",
    labCustomerId: "lab-customer-1",
    labCustomerName: "Silva Group",
    code: "DL-1003",
    patientName: "Lucia Martins",
    currentStatus: CASE_STATUS.DONE,
    teeth: "21, 22",
    elementsQty: 2,
    shade: "B1",
    dueDate: new Date(Date.now() - 2 * 86400000).toISOString(),
    observations: "Delivered.",
    isUrgent: false,
    createdAt: new Date(Date.now() - 10 * 86400000).toISOString(),
    updatedAt: new Date(Date.now() - 2 * 86400000).toISOString(),
    customerName: "Silva Dental",
    customerId: "customer-1",
    dentistName: "Dr. Marcos Silva",
    dentistId: "dentist-1",
    serviceTypeId: "service-1",
    serviceTypeName: "Crown",
    serviceBasePriceSnapshot: "180.00",
    casePrice: "180.00",
    isPriceOverridden: false,
    labCurrency: "BRL",
    attachments: [],
    serviceLineCount: 1,
    serviceLines: [],
    components: [],
    millings: [
      {
        id: "milling-1",
        status: "SUCCESS",
        teethMilledQty: 2,
        blocksUsedQty: 1,
        failureReason: null,
        notes: "Clean run.",
        milledAt: new Date(Date.now() - 2 * 86400000).toISOString(),
        blockTypeName: "Zirconia A2",
        blockTypeShade: "A2",
        millingDrillName: "Diamond 1.0mm",
      },
    ],
    comments: [],
    statusHistory: [],
  },
  {
    id: "case-4",
    dentalLabId: "lab-vela-rio",
    labCustomerId: "lab-customer-3",
    labCustomerName: "Rio Smile Network",
    code: "DL-1001",
    patientName: "Paula Mendes",
    currentStatus: CASE_STATUS.IN_PRODUCTION,
    teeth: "14",
    elementsQty: 1,
    shade: "A1",
    dueDate: new Date(Date.now() + 3 * 86400000).toISOString(),
    observations: "Rio lab scoped case with code reused safely.",
    isUrgent: false,
    createdAt: new Date(Date.now() - 2 * 86400000).toISOString(),
    updatedAt: new Date(Date.now() - 1 * 86400000).toISOString(),
    customerName: "Rio Smile",
    customerId: "customer-3",
    dentistName: "Dr. Felipe Rocha",
    dentistId: "dentist-3",
    serviceTypeId: "service-3",
    serviceTypeName: "Crown",
    serviceBasePriceSnapshot: "200.00",
    casePrice: "200.00",
    isPriceOverridden: false,
    labCurrency: "BRL",
    attachments: [],
    serviceLineCount: 1,
    serviceLines: [],
    components: [],
    millings: [],
    comments: [],
    statusHistory: [],
  },
];

const allMockBlockTypes = [
  {
    id: "block-1",
    dentalLabId: "lab-vela-sao-paulo",
    name: "Zirconia A2",
    material: "Zirconia",
    brand: "Vita",
    size: "98mm",
    shade: "A2",
    defaultCost: "48",
    isActive: true,
  },
  {
    id: "block-2",
    dentalLabId: "lab-vela-sao-paulo",
    name: "PMMA Clear",
    material: "PMMA",
    brand: "DemoBlock",
    size: "98mm",
    shade: "Clear",
    defaultCost: "22",
    isActive: true,
  },
  {
    id: "block-3",
    dentalLabId: "lab-vela-rio",
    name: "Zirconia A2",
    material: "Zirconia",
    brand: "RioBlock",
    size: "98mm",
    shade: "A2",
    defaultCost: "51",
    isActive: true,
  },
];

const allMockMillingDrills = [
  {
    id: "drill-1",
    dentalLabId: "lab-vela-sao-paulo",
    name: "Diamond 1.0mm",
    millingMachineId: "machine-1",
    status: "ACTIVE",
    currentBlocksCount: 42,
    estimatedMaxBlocks: 120,
    installedAt: new Date(Date.now() - 45 * 86400000).toISOString(),
    removedAt: null,
    notes: null,
  },
  {
    id: "drill-2",
    dentalLabId: "lab-vela-sao-paulo",
    name: "Diamond 2.5mm",
    millingMachineId: "machine-1",
    status: "ACTIVE",
    currentBlocksCount: 31,
    estimatedMaxBlocks: 100,
    installedAt: new Date(Date.now() - 30 * 86400000).toISOString(),
    removedAt: null,
    notes: null,
  },
  {
    id: "drill-3",
    dentalLabId: "lab-vela-rio",
    name: "Diamond 1.0mm",
    millingMachineId: null,
    status: "STORED",
    currentBlocksCount: 118,
    estimatedMaxBlocks: 120,
    installedAt: new Date(Date.now() - 180 * 86400000).toISOString(),
    removedAt: new Date(Date.now() - 7 * 86400000).toISOString(),
    notes: "Stored after preventive replacement.",
  },
];

export const mockMillingMachines = [
  {
    id: "machine-1",
    dentalLabId: "lab-vela-sao-paulo",
    name: "imes-icore 350i",
    status: "ACTIVE" as const,
    installedAt: new Date(Date.now() - 120 * 86400000).toISOString(),
    notes: "Primary demo machine for Sao Paulo drill assignments.",
  },
  {
    id: "machine-2",
    dentalLabId: "lab-vela-rio",
    name: "vhf K5+",
    status: "MAINTENANCE" as const,
    installedAt: new Date(Date.now() - 240 * 86400000).toISOString(),
    notes: "Rio demo machine currently under maintenance.",
  },
].filter((item) => item.dentalLabId === activeDentalLabId);

const allMockMillings = [
  {
    id: "milling-1",
    dentalLabId: "lab-vela-sao-paulo",
    caseCode: "DL-1003",
    patientName: "Lucia Martins",
    customerName: "Silva Dental",
    blockTypeName: "Zirconia A2",
    blockTypeShade: "A2",
    fineMillingDrillName: "Diamond 1.0mm",
    coarseMillingDrillName: "Diamond 2.5mm",
    teethMilledQty: 2,
    status: "SUCCESS" as const,
    failureReason: null,
    milledAt: new Date(Date.now() - 2 * 86400000).toISOString(),
  },
];

export const mockCustomers = allMockCustomers.filter(
  (customer) => customer.dentalLabId === activeDentalLabId,
);
export const mockServiceTypes = allMockServiceTypes.filter(
  (item) => item.dentalLabId === activeDentalLabId,
);
export const mockComponents = allMockComponents.filter(
  (item) => item.dentalLabId === activeDentalLabId,
);
export const mockCases = allMockCases.filter(
  (caseItem) => caseItem.dentalLabId === activeDentalLabId,
);
export const mockBlockTypes = allMockBlockTypes.filter(
  (item) => item.dentalLabId === activeDentalLabId,
);
export const mockMillingDrills = allMockMillingDrills.filter(
  (item) => item.dentalLabId === activeDentalLabId,
);
export const mockMillings = allMockMillings.filter(
  (item) => item.dentalLabId === activeDentalLabId,
);

export const mockRegistry = {
  customers: mockCustomers.map((customer) => ({
    id: customer.id,
    name: customer.name,
    phone: customer.id === "customer-1" ? "(11) 3456-7890" : "(21) 2222-1000",
    email:
      customer.id === "customer-1"
        ? "contato@silvadental.local"
        : "ops@oralprime.local",
    notes: null,
  })),
  dentists: [
    {
      id: "dentist-1",
      customerId: "customer-1",
      name: "Dr. Marcos Silva",
      customerName: "Silva Dental",
      phone: "(11) 98888-1111",
      email: "marcos@silvadental.local",
    },
    {
      id: "dentist-2",
      customerId: "customer-2",
      name: "Dra. Carla Ramos",
      customerName: "Oral Prime",
      phone: "(21) 97777-2222",
      email: "carla@oralprime.local",
    },
  ],
  components: mockComponents,
  blockTypes: mockBlockTypes,
  serviceTypes: mockServiceTypes.map((item) => ({
    ...item,
    notes: null,
    isActive: true,
  })),
  drills: mockMillingDrills,
};

function getCaseTeethCount(caseItem: EditableCase) {
  return caseItem.elementsQty ?? caseItem.teeth.split(/[\s,;/]+/).filter(Boolean).length;
}

export function getMockDashboardData() {
  const openCases = mockCases.filter(
    (caseItem) =>
      caseItem.currentStatus !== CASE_STATUS.DONE &&
      caseItem.currentStatus !== CASE_STATUS.CANCELLED,
  );
  const completedCases = mockCases.filter(
    (caseItem) =>
      caseItem.currentStatus === CASE_STATUS.DONE ||
      caseItem.currentStatus === CASE_STATUS.CANCELLED,
  );
  const statusStats = Object.entries(CASE_STATUS_META).map(([status, meta]) => {
    const assigned = mockCases.filter((item) => item.currentStatus === status);
    const active = assigned.filter(
      (item) =>
        item.currentStatus !== CASE_STATUS.DONE &&
        item.currentStatus !== CASE_STATUS.CANCELLED,
    );
    const completed = assigned.filter(
      (item) =>
        item.currentStatus === CASE_STATUS.DONE ||
        item.currentStatus === CASE_STATUS.CANCELLED,
    );

    return {
      id: status,
      name: meta.label,
      totalCases: assigned.length,
      totalTeethDesigned: assigned.reduce((sum, item) => sum + getCaseTeethCount(item), 0),
      activeCases: active.length,
      activeTeeth: active.reduce((sum, item) => sum + getCaseTeethCount(item), 0),
      completedCases: completed.length,
      completedTeeth: completed.reduce((sum, item) => sum + getCaseTeethCount(item), 0),
      completedThisWeek: completed.length,
      completedThisMonth: completed.length,
      completedTeethThisMonth: completed.reduce((sum, item) => sum + getCaseTeethCount(item), 0),
      urgentOpenCases: active.filter((item) => item.isUrgent).length,
      overdueCases: active.filter((item) => item.dueDate && new Date(item.dueDate) < new Date()).length,
      avgTurnaroundDays: completed.length ? 6.5 : null,
      completionRate: assigned.length ? Math.round((completed.length / assigned.length) * 100) : 0,
    };
  }).filter((item) => item.totalCases > 0);

  return {
    summary: {
      totalDesigners: statusStats.length,
      totalAssignedCases: mockCases.length,
      totalTeethDesigned: mockCases.reduce((sum, item) => sum + getCaseTeethCount(item), 0),
      openCases: openCases.length,
      openTeeth: openCases.reduce((sum, item) => sum + getCaseTeethCount(item), 0),
      completedThisMonth: completedCases.length,
      urgentOpenCases: openCases.filter((item) => item.isUrgent).length,
      avgTurnaroundDays: 6.5,
    },
    designerStats: statusStats,
    statusData: Object.entries(CASE_STATUS_META)
      .map(([status, meta]) => ({
        status,
        label: meta.shortLabel,
        fill: meta.chartColor,
        value: mockCases.filter((caseItem) => caseItem.currentStatus === status as CaseStatusValue).length,
      }))
      .filter((item) => item.value > 0),
  };
}
