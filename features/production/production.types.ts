export type ProductionPriority = "urgent" | "high" | "normal" | "low";
export type ProductionQueueStatus =
  | "READY"
  | "IN_PROGRESS"
  | "COMPLETED"
  | "LOCKED"
  | "SKIPPED"
  | "CANCELLED";

export type ProductionQueueItem = {
  id: string;
  caseId: string;
  caseProcessId: string;
  workflowStepId: string;
  caseCode: string;
  patientName: string;
  patientDetail: string | null;
  customerName: string;
  dentistName: string | null;
  dueDate: string | null;
  serviceName: string;
  currentStage: string;
  status: ProductionQueueStatus;
  assignee: string;
  priority: ProductionPriority;
  progressPercent: number;
  completedSteps: number;
  totalSteps: number;
  notes?: string;
};

export type ProductionProcess = {
  id: string;
  name: string;
  description: string;
  owner: string;
  capacity: number;
  targetHours: number;
  queue: ProductionQueueItem[];
};

export type MillingDialogBlockType = {
  id: string;
  name: string;
  shade: string | null;
};

export type MillingDialogDrill = {
  id: string;
  name: string;
  brand: string | null;
  type?: string | null;
  status?: string;
  currentBlocksCount?: number | null;
  estimatedMaxBlocks?: number | null;
  millingMachineId?: string | null;
  millingMachineName?: string | null;
};

export type MillingMachineSlotPreset = {
  id: string;
  label: string;
  sortOrder: number;
};

export type MillingMachineInventoryRow = {
  id: string;
  name: string;
  serialNumber: string | null;
  model: string | null;
  status: "ACTIVE" | "INACTIVE" | "MAINTENANCE";
  statusReason: string | null;
  installedAt: string | null;
  removedAt: string | null;
  lastMaintenanceAt: string | null;
  nextMaintenanceDueAt: string | null;
  notes: string | null;
  createdAt: string;
  updatedAt: string;
  assignedDrillCount: number;
  slotPresets: MillingMachineSlotPreset[];
};

export type MillingDrillInventoryRow = {
  id: string;
  name: string;
  status: "ACTIVE" | "STORED" | "RETIRED" | "LOST";
  currentBlocksCount: number;
  estimatedMaxBlocks: number | null;
  millingMachineId: string | null;
  millingMachineName: string | null;
  installedAt: string | null;
  removedAt: string | null;
  notes: string | null;
  createdAt: string;
  updatedAt: string;
  wearPercent: number | null;
};

export type MillingOverviewSummary = {
  queuedTasks: number;
  activeMachines: number;
  nearLimitDrills: number;
  failedMillingsLast7Days: number;
  throughputLast7Days: number;
};

export type MillingOverviewIncident = {
  id: string;
  caseCode: string;
  patientName: string;
  status: "FAILED" | "REDO";
  detail: string;
  milledAt: string;
};

export type MillingOverview = {
  summary: MillingOverviewSummary;
  machineSnapshot: MillingMachineInventoryRow[];
  drillAlerts: MillingDrillInventoryRow[];
  recentIncidents: MillingOverviewIncident[];
};

export type MillingDialogCase = {
  id: string;
  code: string;
  patientName: string;
  caseProcessId?: string | null;
  processId?: string;
  customerName?: string;
  restoration?: string;
  dueDate?: string | null;
  status?: string;
};

export type MillingRecord = {
  id: string;
  caseId: string;
  caseCode: string;
  patientName: string;
  customerName: string;
  blockTypeId: string;
  blockTypeName: string;
  blockTypeShade: string | null;
  millingMachineId: string | null;
  millingMachineName: string | null;
  selectedDrillSlots: MillingRecordDrillSlot[];
  millingDrillId: string | null;
  millingDrillName: string | null;
  fineMillingDrillId: string | null;
  fineMillingDrillName: string | null;
  coarseMillingDrillId: string | null;
  coarseMillingDrillName: string | null;
  teethMilledQty: number;
  blocksUsedQty: number;
  status: "SUCCESS" | "FAILED";
  failureReason: string | null;
  notes: string | null;
  milledAt: string;
};

export type MillingRecordDrillSlot = {
  id: string;
  machineSlotId: string | null;
  label: string;
  sortOrder: number;
  drillId: string;
  drillName: string;
};

export type MillingWorkspace = {
  overview: MillingOverview;
  millings: MillingRecord[];
  blockTypes: MillingDialogBlockType[];
  millingDrills: MillingDialogDrill[];
  inventoryDrills: MillingDrillInventoryRow[];
  machines: MillingMachineInventoryRow[];
  readyCases: MillingDialogCase[];
};
