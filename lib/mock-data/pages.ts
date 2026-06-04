import { CASE_STATUS, CASE_STATUS_META } from "@/features/cases/constants";
import type {
  CadDesignerOption,
  CaseStatusValue,
  ClinicOption,
  ComponentOption,
  EditableCase,
  ServiceTypeOption,
} from "@/features/cases/types";

export const mockUser = {
  id: "user-admin",
  name: "Demo Manager",
  role: "ADMIN",
};

export const mockClinics: ClinicOption[] = [
  {
    id: "clinic-1",
    name: "Silva Dental",
    dentists: [{ id: "dentist-1", name: "Dr. Marcos Silva" }],
  },
  {
    id: "clinic-2",
    name: "Oral Prime",
    dentists: [{ id: "dentist-2", name: "Dra. Carla Ramos" }],
  },
];

export const mockServiceTypes: ServiceTypeOption[] = [
  { id: "service-1", name: "Crown" },
  { id: "service-2", name: "Bridge" },
];

export const mockCadDesigners: CadDesignerOption[] = [
  { id: "user-cad-ana", name: "Ana CAD" },
  { id: "user-cad-joao", name: "Joao CAD" },
];

export const mockComponents: ComponentOption[] = [
  {
    id: "component-1",
    name: "Ti Base",
    category: "Implant",
    brand: "DemoDent",
    defaultCost: "35",
    defaultPrice: "90",
  },
  {
    id: "component-2",
    name: "Analog",
    category: "Model",
    brand: "DemoDent",
    defaultCost: "12",
    defaultPrice: "30",
  },
];

export const mockCases: EditableCase[] = [
  {
    id: "case-1",
    code: "DL-1001",
    patientName: "Maria Oliveira",
    currentStatus: CASE_STATUS.DESIGNING,
    teeth: "11, 12, 13",
    elementsQty: 3,
    shade: "A2",
    dueDate: new Date(Date.now() + 2 * 86400000).toISOString(),
    observations: "Anterior bridge, check emergence profile.",
    pendingNote: "",
    isUrgent: true,
    createdAt: new Date(Date.now() - 4 * 86400000).toISOString(),
    updatedAt: new Date(Date.now() - 1 * 86400000).toISOString(),
    clinicName: "Silva Dental",
    clinicId: "clinic-1",
    dentistName: "Dr. Marcos Silva",
    dentistId: "dentist-1",
    serviceTypeId: "service-2",
    serviceTypeName: "Bridge",
    cadDesignerId: "user-cad-ana",
    cadDesignerName: "Ana CAD",
    attachments: [],
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
  },
  {
    id: "case-2",
    code: "DL-1002",
    patientName: "Rafael Costa",
    currentStatus: CASE_STATUS.DESIGN_READY,
    teeth: "36",
    elementsQty: 1,
    shade: "A3",
    dueDate: new Date(Date.now() + 1 * 86400000).toISOString(),
    observations: "Single crown.",
    pendingNote: "",
    isUrgent: false,
    createdAt: new Date(Date.now() - 3 * 86400000).toISOString(),
    updatedAt: new Date(Date.now() - 1 * 86400000).toISOString(),
    clinicName: "Oral Prime",
    clinicId: "clinic-2",
    dentistName: "Dra. Carla Ramos",
    dentistId: "dentist-2",
    serviceTypeId: "service-1",
    serviceTypeName: "Crown",
    cadDesignerId: "user-cad-joao",
    cadDesignerName: "Joao CAD",
    attachments: [],
    components: [],
    millings: [],
  },
  {
    id: "case-3",
    code: "DL-1003",
    patientName: "Lucia Martins",
    currentStatus: CASE_STATUS.DONE,
    teeth: "21, 22",
    elementsQty: 2,
    shade: "B1",
    dueDate: new Date(Date.now() - 2 * 86400000).toISOString(),
    observations: "Delivered.",
    pendingNote: "",
    isUrgent: false,
    createdAt: new Date(Date.now() - 10 * 86400000).toISOString(),
    updatedAt: new Date(Date.now() - 2 * 86400000).toISOString(),
    clinicName: "Silva Dental",
    clinicId: "clinic-1",
    dentistName: "Dr. Marcos Silva",
    dentistId: "dentist-1",
    serviceTypeId: "service-1",
    serviceTypeName: "Crown",
    cadDesignerId: "user-cad-ana",
    cadDesignerName: "Ana CAD",
    attachments: [],
    components: [],
    millings: [
      {
        id: "milling-1",
        status: "SUCCESS",
        teethMilledQty: 2,
        failureReason: null,
        notes: "Clean run.",
        milledAt: new Date(Date.now() - 2 * 86400000).toISOString(),
        blockTypeName: "Zirconia A2",
        blockTypeShade: "A2",
        millingDrillName: "Diamond 1.0mm",
      },
    ],
  },
];

export const mockBlockTypes = [
  {
    id: "block-1",
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
    name: "PMMA Clear",
    material: "PMMA",
    brand: "DemoBlock",
    size: "98mm",
    shade: "Clear",
    defaultCost: "22",
    isActive: true,
  },
];

export const mockMillingDrills = [
  {
    id: "drill-1",
    name: "Diamond 1.0mm",
    brand: "Roland",
    type: "1.0mm",
    serialNumber: "D10-001",
    maxTeethRecommended: 120,
    notes: null,
    isActive: true,
  },
  {
    id: "drill-2",
    name: "Diamond 2.5mm",
    brand: "Roland",
    type: "2.5mm",
    serialNumber: "D25-001",
    maxTeethRecommended: 100,
    notes: null,
    isActive: true,
  },
];

export const mockMillings = [
  {
    id: "milling-1",
    caseCode: "DL-1003",
    patientName: "Lucia Martins",
    clinicName: "Silva Dental",
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

export const mockRegistry = {
  clinics: mockClinics.map((clinic) => ({
    id: clinic.id,
    name: clinic.name,
    phone: clinic.id === "clinic-1" ? "(11) 3456-7890" : "(21) 2222-1000",
    email:
      clinic.id === "clinic-1"
        ? "contato@silvadental.local"
        : "ops@oralprime.local",
    notes: null,
  })),
  dentists: [
    {
      id: "dentist-1",
      clinicId: "clinic-1",
      name: "Dr. Marcos Silva",
      clinicName: "Silva Dental",
      phone: "(11) 98888-1111",
      email: "marcos@silvadental.local",
    },
    {
      id: "dentist-2",
      clinicId: "clinic-2",
      name: "Dra. Carla Ramos",
      clinicName: "Oral Prime",
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
  const designers = mockCadDesigners;
  const openCases = mockCases.filter((caseItem) => caseItem.currentStatus !== CASE_STATUS.DONE);
  const completedCases = mockCases.filter((caseItem) => caseItem.currentStatus === CASE_STATUS.DONE);

  return {
    summary: {
      totalDesigners: designers.length,
      totalAssignedCases: mockCases.length,
      totalTeethDesigned: mockCases.reduce((sum, item) => sum + getCaseTeethCount(item), 0),
      openCases: openCases.length,
      openTeeth: openCases.reduce((sum, item) => sum + getCaseTeethCount(item), 0),
      completedThisMonth: completedCases.length,
      urgentOpenCases: openCases.filter((item) => item.isUrgent).length,
      avgTurnaroundDays: 6.5,
    },
    designerStats: designers.map((designer) => {
      const assigned = mockCases.filter((item) => item.cadDesignerId === designer.id);
      const active = assigned.filter((item) => item.currentStatus !== CASE_STATUS.DONE);
      const completed = assigned.filter((item) => item.currentStatus === CASE_STATUS.DONE);

      return {
        id: designer.id,
        name: designer.name ?? "Unassigned",
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
    }),
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
