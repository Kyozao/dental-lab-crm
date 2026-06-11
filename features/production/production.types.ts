export type ProductionPriority = "rush" | "standard";

export type ProductionQueueItem = {
  id: string;
  caseCode: string;
  patientName: string;
  customerName: string;
  dueDate: string | null;
  restoration: string;
  assignee: string;
  priority: ProductionPriority;
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
