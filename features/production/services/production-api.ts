import { api } from "@/lib/api";
import { CaseProcessStatus } from "@/generated/prisma/enums";
import type {
  MillingDrillInventoryRow,
  MillingMachineInventoryRow,
  MillingMachineSlotPreset,
  MillingWorkspace,
  ProductionProcess,
} from "@/features/production/production.types";
import type { CreateMillingInput } from "@/features/production/schemas/production";

type ProductionResponse = {
  data: ProductionProcess[];
  error: string | null;
  meta: Record<string, unknown>;
};

type MillingWorkspaceResponse = {
  data: MillingWorkspace;
  error: string | null;
  meta: Record<string, unknown>;
};

type MillingMachinePayload = {
  name: string;
  serialNumber?: string;
  model?: string;
  status: "ACTIVE" | "INACTIVE" | "MAINTENANCE";
  statusReason?: string;
  installedAt?: string;
  removedAt?: string;
  lastMaintenanceAt?: string;
  nextMaintenanceDueAt?: string;
  notes?: string;
  slotPresets: Array<
    Omit<Pick<MillingMachineSlotPreset, "id" | "label" | "sortOrder">, "id"> & {
      id?: string;
    }
  >;
};

type MillingDrillPayload = {
  name: string;
  millingMachineId?: string;
  status: "ACTIVE" | "STORED" | "RETIRED" | "LOST";
  currentBlocksCount: number;
  estimatedMaxBlocks?: number | null;
  installedAt?: string;
  removedAt?: string;
  notes?: string;
};

type MillingMachineResponse = {
  data: MillingMachineInventoryRow;
  error: string | null;
  meta: Record<string, unknown>;
};

type MillingDrillResponse = {
  data: MillingDrillInventoryRow;
  error: string | null;
  meta: Record<string, unknown>;
};

export async function getProductionProcessesApi() {
  const response = await api<ProductionResponse>("/api/production");
  return response.data;
}

export async function getMillingWorkspaceApi() {
  const response = await api<MillingWorkspaceResponse>("/api/millings");
  return response.data;
}

export async function completeCaseProcess(
  caseProcessId: string,
  status: CaseProcessStatus,
) {
  return api(`/api/case-processes/${caseProcessId}`, {
    method: "PATCH",
    body: JSON.stringify({ status }),
  });
}

export async function createMilling(payload: CreateMillingInput) {
  return api("/api/millings", {
    method: "POST",
    body: JSON.stringify(payload),
  });
}

export async function updateMilling(
  millingId: string,
  payload: Partial<CreateMillingInput>,
) {
  return api(`/api/millings/${millingId}`, {
    method: "PATCH",
    body: JSON.stringify(payload),
  });
}

export async function deleteMilling(millingId: string) {
  return api(`/api/millings/${millingId}`, {
    method: "DELETE",
  });
}

export async function createMillingMachine(payload: MillingMachinePayload) {
  const response = await api<MillingMachineResponse>("/api/milling-machines", {
    method: "POST",
    body: JSON.stringify(payload),
  });

  return response.data;
}

export async function updateMillingMachine(
  machineId: string,
  payload: Partial<MillingMachinePayload>,
) {
  const response = await api<MillingMachineResponse>(
    `/api/milling-machines/${machineId}`,
    {
      method: "PATCH",
      body: JSON.stringify(payload),
    },
  );

  return response.data;
}

export async function deleteMillingMachine(machineId: string) {
  return api(`/api/milling-machines/${machineId}`, {
    method: "DELETE",
  });
}

export async function createMillingDrill(payload: MillingDrillPayload) {
  const response = await api<MillingDrillResponse>("/api/milling-drills", {
    method: "POST",
    body: JSON.stringify(payload),
  });

  return response.data;
}

export async function updateMillingDrill(
  drillId: string,
  payload: Partial<MillingDrillPayload>,
) {
  const response = await api<MillingDrillResponse>(
    `/api/milling-drills/${drillId}`,
    {
      method: "PATCH",
      body: JSON.stringify(payload),
    },
  );

  return response.data;
}

export async function deleteMillingDrill(drillId: string) {
  return api(`/api/milling-drills/${drillId}`, {
    method: "DELETE",
  });
}
