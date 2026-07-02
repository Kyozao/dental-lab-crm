import { Prisma } from "@/generated/prisma/client";
import {
  CaseProcessStatus,
  MillingDrillStatus,
  MillingStatus,
  UserRole,
} from "@/generated/prisma/enums";
import { prisma } from "@/lib/prisma";

import { activeReferenceWhere } from "../_shared/archive";
import { RoleAuthorizationError } from "../_shared/authorization";
import { getLabMember } from "../_shared/membership";
import {
  ReferenceNotFoundError,
  ReferenceValidationError,
} from "../_shared/reference-resource";
import { updateCaseProcessForLoggedLab } from "../case-processes/case-processes.service";
import type {
  CreateMillingInput,
  SelectedDrillSlotInput,
  UpdateMillingInput,
} from "./millings.schemas";

const DEFAULT_MACHINE_SLOT_PRESETS = [
  { label: "1.0mm", sortOrder: 1 },
  { label: "2.5mm", sortOrder: 2 },
] as const;

const machineSlotSelect = {
  id: true,
  label: true,
  sort_order: true,
} as const;

const millingRecordSelect = {
  id: true,
  case_id: true,
  status: true,
  teeth_milled_qty: true,
  blocks_used_qty: true,
  failure_reason: true,
  notes: true,
  milled_at: true,
  block_type_id: true,
  milling_machine_id: true,
  milling_drill_id: true,
  fine_milling_drill_id: true,
  coarse_milling_drill_id: true,
  redone_from_milling_id: true,
  cases: {
    select: {
      id: true,
      code: true,
      patient_name: true,
      customers: {
        select: {
          name: true,
        },
      },
    },
  },
  block_types: {
    select: {
      name: true,
      shade: true,
    },
  },
  milling_machines: {
    select: {
      name: true,
      machine_slots: {
        orderBy: { sort_order: "asc" },
        select: machineSlotSelect,
      },
    },
  },
  milling_drills: {
    select: {
      name: true,
    },
  },
  fineMillingDrill: {
    select: {
      name: true,
    },
  },
  coarseMillingDrill: {
    select: {
      name: true,
    },
  },
  selected_drill_slots: {
    orderBy: { slot_order_snapshot: "asc" },
    select: {
      id: true,
      milling_machine_slot_id: true,
      slot_label_snapshot: true,
      slot_order_snapshot: true,
      milling_drill_id: true,
      milling_drills: {
        select: {
          name: true,
        },
      },
    },
  },
  redos: {
    select: {
      id: true,
    },
  },
} as const;

const machineSelect = {
  id: true,
  name: true,
  serial_number: true,
  model: true,
  status: true,
  status_reason: true,
  installed_at: true,
  removed_at: true,
  last_maintenance_at: true,
  next_maintenance_due_at: true,
  notes: true,
  created_at: true,
  updated_at: true,
  machine_slots: {
    orderBy: { sort_order: "asc" },
    select: machineSlotSelect,
  },
  _count: {
    select: {
      milling_drills: true,
    },
  },
} as const;

const inventoryDrillSelect = {
  id: true,
  name: true,
  status: true,
  current_blocks_count: true,
  estimated_max_blocks: true,
  milling_machine_id: true,
  installed_at: true,
  removed_at: true,
  notes: true,
  created_at: true,
  updated_at: true,
  milling_machines: {
    select: {
      name: true,
    },
  },
} as const;

type MillingRecordWithRelations = Prisma.case_millingsGetPayload<{
  select: typeof millingRecordSelect;
}>;

type MillingMachineRecord = Prisma.milling_machinesGetPayload<{
  select: typeof machineSelect;
}>;

type MillingDrillInventoryRecord = Prisma.milling_drillsGetPayload<{
  select: typeof inventoryDrillSelect;
}>;

type ResolvedSelectedDrillSlot = {
  machineSlotId: string;
  drillId: string;
  slotLabelSnapshot: string;
  slotOrderSnapshot: number;
};

async function assertProductionCanManageMillingCase(
  membership: { id: string; lab_id: string; role: UserRole },
  caseId: string,
) {
  if (membership.role !== UserRole.PRODUCTION) {
    return;
  }

  const assignedMillingProcess = await prisma.case_processes.findFirst({
    where: {
      workflow_step_id: "milling",
      assigned_lab_member_id: membership.id,
      case_id: caseId,
      cases: {
        lab_id: membership.lab_id,
      },
    },
    select: { id: true },
  });

  if (!assignedMillingProcess) {
    throw new RoleAuthorizationError(
      "Production users can only manage milling records for assigned cases.",
    );
  }
}

function countCaseTeeth(caseItem: { elements_qty: number | null; teeth: string | null }) {
  if (caseItem.elements_qty && caseItem.elements_qty > 0) {
    return caseItem.elements_qty;
  }

  if (!caseItem.teeth) {
    return 0;
  }

  return caseItem.teeth.split(/[\s,;/]+/).filter(Boolean).length;
}

async function resolveTeethMilledQty(
  lab_id: string,
  caseId: string,
  explicitTeethMilledQty?: number,
) {
  if (explicitTeethMilledQty !== undefined) {
    return explicitTeethMilledQty;
  }

  const caseItem = await prisma.cases.findFirst({
    where: {
      id: caseId,
      lab_id,
    },
    select: {
      elements_qty: true,
      teeth: true,
    },
  });

  if (!caseItem) {
    throw new ReferenceValidationError({
      caseId: ["Case not found in this lab."],
    });
  }

  return countCaseTeeth(caseItem);
}

function mapSelectedDrillSlots(record: MillingRecordWithRelations) {
  if (record.selected_drill_slots.length > 0) {
    return record.selected_drill_slots.map((slot) => ({
      id: slot.id,
      machineSlotId: slot.milling_machine_slot_id,
      label: slot.slot_label_snapshot,
      sortOrder: slot.slot_order_snapshot,
      drillId: slot.milling_drill_id,
      drillName: slot.milling_drills.name,
    }));
  }

  const machineSlots = record.milling_machines?.machine_slots ?? [];
  const legacySlots = [
    {
      label: "1.0mm",
      sortOrder: 1,
      drillId: record.fine_milling_drill_id,
      drillName: record.fineMillingDrill?.name ?? null,
    },
    {
      label: "2.5mm",
      sortOrder: 2,
      drillId: record.coarse_milling_drill_id,
      drillName: record.coarseMillingDrill?.name ?? null,
    },
    {
      label: "Legacy drill",
      sortOrder: 3,
      drillId: record.milling_drill_id,
      drillName: record.milling_drills?.name ?? null,
    },
  ];

  return legacySlots
    .filter((slot) => slot.drillId && slot.drillName)
    .map((slot) => {
      const matchedMachineSlot =
        machineSlots.find((machineSlot) => machineSlot.sort_order === slot.sortOrder) ??
        machineSlots.find(
          (machineSlot) =>
            machineSlot.label.trim().toLowerCase() ===
            slot.label.trim().toLowerCase(),
        ) ??
        null;

      return {
        id: `legacy-${record.id}-${slot.sortOrder}`,
        machineSlotId: matchedMachineSlot?.id ?? null,
        label: matchedMachineSlot?.label ?? slot.label,
        sortOrder: matchedMachineSlot?.sort_order ?? slot.sortOrder,
        drillId: slot.drillId!,
        drillName: slot.drillName!,
      };
    });
}

function mapMillingRecord(record: MillingRecordWithRelations) {
  const selectedDrillSlots = mapSelectedDrillSlots(record);

  return {
    id: record.id,
    caseId: record.case_id,
    caseCode: record.cases.code,
    patientName: record.cases.patient_name,
    customerName: record.cases.customers?.name ?? "No customer",
    blockTypeId: record.block_type_id,
    blockTypeName: record.block_types.name,
    blockTypeShade: record.block_types.shade,
    millingMachineId: record.milling_machine_id,
    millingMachineName: record.milling_machines?.name ?? null,
    selectedDrillSlots,
    millingDrillId: record.milling_drill_id,
    millingDrillName: record.milling_drills?.name ?? null,
    fineMillingDrillId: record.fine_milling_drill_id,
    fineMillingDrillName: record.fineMillingDrill?.name ?? null,
    coarseMillingDrillId: record.coarse_milling_drill_id,
    coarseMillingDrillName: record.coarseMillingDrill?.name ?? null,
    teethMilledQty: record.teeth_milled_qty,
    blocksUsedQty: record.blocks_used_qty,
    status: record.status,
    failureReason: record.failure_reason,
    notes: record.notes,
    milledAt: record.milled_at.toISOString(),
  };
}

function mapMachine(record: MillingMachineRecord) {
  return {
    id: record.id,
    name: record.name,
    serialNumber: record.serial_number,
    model: record.model,
    status: record.status,
    statusReason: record.status_reason,
    installedAt: record.installed_at?.toISOString() ?? null,
    removedAt: record.removed_at?.toISOString() ?? null,
    lastMaintenanceAt: record.last_maintenance_at?.toISOString() ?? null,
    nextMaintenanceDueAt: record.next_maintenance_due_at?.toISOString() ?? null,
    notes: record.notes,
    createdAt: record.created_at.toISOString(),
    updatedAt: record.updated_at.toISOString(),
    assignedDrillCount: record._count.milling_drills,
    slotPresets: record.machine_slots.map((slot) => ({
      id: slot.id,
      label: slot.label,
      sortOrder: slot.sort_order,
    })),
  };
}

function mapInventoryDrill(record: MillingDrillInventoryRecord) {
  const wearPercent =
    record.estimated_max_blocks && record.estimated_max_blocks > 0
      ? Math.min(
          999,
          Math.round(
            (record.current_blocks_count / record.estimated_max_blocks) * 100,
          ),
        )
      : null;

  return {
    id: record.id,
    name: record.name,
    status: record.status,
    currentBlocksCount: record.current_blocks_count,
    estimatedMaxBlocks: record.estimated_max_blocks,
    millingMachineId: record.milling_machine_id,
    millingMachineName: record.milling_machines?.name ?? null,
    installedAt: record.installed_at?.toISOString() ?? null,
    removedAt: record.removed_at?.toISOString() ?? null,
    notes: record.notes,
    createdAt: record.created_at.toISOString(),
    updatedAt: record.updated_at.toISOString(),
    wearPercent,
  };
}

const NEAR_LIMIT_WEAR_PERCENT = 80;
const OVERVIEW_WINDOW_DAYS = 7;

async function ensureMachineSlots(
  lab_id: string,
  machineIds?: string[],
) {
  const machines = await prisma.milling_machines.findMany({
    where: {
      lab_id,
      ...(machineIds ? { id: { in: machineIds } } : {}),
    },
    select: {
      id: true,
      machine_slots: { select: { id: true } },
    },
  });

  await Promise.all(
    machines
      .filter((machine) => machine.machine_slots.length === 0)
      .map((machine) =>
        prisma.milling_machine_slots.createMany({
          data: DEFAULT_MACHINE_SLOT_PRESETS.map((slot) => ({
            milling_machine_id: machine.id,
            label: slot.label,
            sort_order: slot.sortOrder,
          })),
        }),
      ),
  );
}

async function resolveMillingReferences(
  lab_id: string,
  payload: {
    caseId?: string;
    caseProcessId?: string | null;
    blockTypeId?: string;
    millingMachineId?: string | null;
    selectedDrillSlots?: SelectedDrillSlotInput[];
  },
) {
  const errors: Record<string, string[]> = {};

  if (payload.caseId) {
    const caseItem = await prisma.cases.findFirst({
      where: {
        id: payload.caseId,
        lab_id,
      },
      select: { id: true },
    });

    if (!caseItem) {
      errors.caseId = ["Case not found in this lab."];
    }
  }

  if (payload.caseProcessId) {
    const caseProcess = await prisma.case_processes.findFirst({
      where: {
        id: payload.caseProcessId,
        workflow_step_id: "milling",
        cases: { lab_id },
      },
      select: {
        id: true,
        case_id: true,
      },
    });

    if (!caseProcess) {
      errors.caseProcessId = ["Milling task not found in this lab."];
    } else if (payload.caseId && caseProcess.case_id !== payload.caseId) {
      errors.caseProcessId = ["Milling task does not belong to the selected case."];
    }
  }

  if (payload.blockTypeId) {
    const blockType = await prisma.block_types.findFirst({
      where: {
        id: payload.blockTypeId,
        lab_id,
        ...activeReferenceWhere,
      },
      select: { id: true },
    });

    if (!blockType) {
      errors.blockTypeId = ["Block type is inactive, archived, or outside this lab."];
    }
  }

  if (!payload.millingMachineId) {
    errors.millingMachineId = ["Milling machine is required."];
  }

  if (!payload.selectedDrillSlots || payload.selectedDrillSlots.length === 0) {
    errors.selectedDrillSlots = [
      "Select a drill for every required machine slot.",
    ];
  }

  let machine:
    | Prisma.milling_machinesGetPayload<{
        select: {
          id: true;
          name: true;
          machine_slots: {
            orderBy: { sort_order: "asc" };
            select: typeof machineSlotSelect;
          };
        };
      }>
    | null = null;

  if (payload.millingMachineId) {
    await ensureMachineSlots(lab_id, [payload.millingMachineId]);
    machine = await prisma.milling_machines.findFirst({
      where: {
        id: payload.millingMachineId,
        lab_id,
      },
      select: {
        id: true,
        name: true,
        machine_slots: {
          orderBy: { sort_order: "asc" },
          select: machineSlotSelect,
        },
      },
    });

    if (!machine) {
      errors.millingMachineId = ["Milling machine not found in this lab."];
    }
  }

  const resolvedSelectedDrillSlots: ResolvedSelectedDrillSlot[] = [];
  if (machine && payload.selectedDrillSlots && payload.selectedDrillSlots.length > 0) {
    const machineSlotsById = new Map(
      machine.machine_slots.map((slot) => [slot.id, slot]),
    );
    const selectedSlotIds = new Set(
      payload.selectedDrillSlots.map((slot) => slot.machineSlotId),
    );

    const missingMachineSlots = machine.machine_slots.filter(
      (slot) => !selectedSlotIds.has(slot.id),
    );
    if (missingMachineSlots.length > 0) {
      errors.selectedDrillSlots = [
        "Select a drill for every required machine slot.",
      ];
    }

    if (payload.selectedDrillSlots.length !== machine.machine_slots.length) {
      errors.selectedDrillSlots = [
        "Selected drill slots do not match this machine preset.",
      ];
    }

    const duplicateDrillIds = new Set<string>();
    for (const [index, slot] of payload.selectedDrillSlots.entries()) {
      const machineSlot = machineSlotsById.get(slot.machineSlotId);
      if (!machineSlot) {
        errors[`selectedDrillSlots.${index}.machineSlotId`] = [
          "Machine slot does not belong to the selected machine.",
        ];
        continue;
      }

      if (duplicateDrillIds.has(slot.drillId)) {
        errors[`selectedDrillSlots.${index}.drillId`] = [
          "The same drill cannot fill multiple slots.",
        ];
        continue;
      }
      duplicateDrillIds.add(slot.drillId);

      const drill = await prisma.milling_drills.findFirst({
        where: {
          id: slot.drillId,
          lab_id,
          status: MillingDrillStatus.ACTIVE,
        },
        select: {
          id: true,
          milling_machine_id: true,
        },
      });

      if (!drill) {
        errors[`selectedDrillSlots.${index}.drillId`] = [
          "Milling drill must be active and belong to this lab.",
        ];
        continue;
      }

      if (
        drill.milling_machine_id &&
        drill.milling_machine_id !== payload.millingMachineId
      ) {
        errors[`selectedDrillSlots.${index}.drillId`] = [
          "Assigned drill belongs to a different milling machine.",
        ];
        continue;
      }

      resolvedSelectedDrillSlots.push({
        machineSlotId: machineSlot.id,
        drillId: drill.id,
        slotLabelSnapshot: machineSlot.label,
        slotOrderSnapshot: machineSlot.sort_order,
      });
    }
  }

  if (Object.keys(errors).length > 0) {
    throw new ReferenceValidationError(errors);
  }

  return {
    resolvedSelectedDrillSlots,
  };
}

export async function listMillingsForLoggedLab(user_id: string) {
  const membership = await getLabMember(user_id);
  const { lab_id } = membership;
  await ensureMachineSlots(lab_id);

  const [blockTypes, machines, drills, readyCases] = await Promise.all([
    prisma.block_types.findMany({
      where: {
        lab_id,
        ...activeReferenceWhere,
      },
      orderBy: { name: "asc" },
      select: {
        id: true,
        name: true,
        shade: true,
      },
    }),
    prisma.milling_machines.findMany({
      where: { lab_id },
      orderBy: [{ status: "asc" }, { name: "asc" }],
      select: machineSelect,
    }),
    prisma.milling_drills.findMany({
      where: { lab_id },
      orderBy: [{ status: "asc" }, { name: "asc" }],
      select: inventoryDrillSelect,
    }),
    prisma.case_processes.findMany({
      where: {
        workflow_step_id: "milling",
        status: {
          in: [CaseProcessStatus.READY, CaseProcessStatus.IN_PROGRESS],
        },
        assigned_lab_member_id:
          membership.role === UserRole.PRODUCTION ? membership.id : undefined,
        cases: {
          lab_id,
        },
      },
      orderBy: [{ cases: { due_date: "asc" } }, { created_at: "asc" }],
      select: {
        id: true,
        case_id: true,
        process_id: true,
        status: true,
        case_services: {
          select: {
            service_name_snapshot: true,
          },
        },
        cases: {
          select: {
            code: true,
            patient_name: true,
            due_date: true,
            customers: {
              select: {
                name: true,
              },
            },
          },
        },
      },
    }),
  ]);

  const records = await prisma.case_millings.findMany({
    where: { lab_id },
    select: millingRecordSelect,
    orderBy: { milled_at: "desc" },
  });

  const machineItems = machines.map(mapMachine);
  const inventoryDrills = drills.map(mapInventoryDrill);
  const recentWindowStart = new Date();
  recentWindowStart.setDate(recentWindowStart.getDate() - OVERVIEW_WINDOW_DAYS);

  const readyCaseItems = readyCases.map((item) => ({
    id: item.case_id,
    code: item.cases.code,
    patientName: item.cases.patient_name,
    caseProcessId: item.id,
    processId: item.process_id,
    customerName: item.cases.customers?.name ?? "No customer",
    restoration: item.case_services.service_name_snapshot,
    dueDate: item.cases.due_date?.toISOString() ?? null,
    status: item.status,
  }));

  const millingItems = records.map(mapMillingRecord);
  const recentMillings = records.filter(
    (record) => record.milled_at >= recentWindowStart,
  );
  const recentIncidents = records
    .filter(
      (record) =>
        record.status === MillingStatus.FAILED ||
        record.redone_from_milling_id !== null ||
        record.redos.length > 0,
    )
    .slice(0, 5)
    .map((record) => ({
      id: record.id,
      caseCode: record.cases.code,
      patientName: record.cases.patient_name,
      status:
        record.status === MillingStatus.FAILED ? "FAILED" : ("REDO" as const),
      detail:
        record.status === MillingStatus.FAILED
          ? record.failure_reason ?? "Failure recorded"
          : "Redo activity detected on this milling record.",
      milledAt: record.milled_at.toISOString(),
    }));

  return {
    overview: {
      summary: {
        queuedTasks: readyCaseItems.length,
        activeMachines: machineItems.filter((machine) => machine.status === "ACTIVE")
          .length,
        nearLimitDrills: inventoryDrills.filter(
          (drill) =>
            drill.wearPercent !== null &&
            drill.wearPercent >= NEAR_LIMIT_WEAR_PERCENT &&
            drill.status === MillingDrillStatus.ACTIVE,
        ).length,
        failedMillingsLast7Days: recentMillings.filter(
          (record) => record.status === MillingStatus.FAILED,
        ).length,
        throughputLast7Days: recentMillings.filter(
          (record) => record.status === MillingStatus.SUCCESS,
        ).length,
      },
      machineSnapshot: machineItems.slice(0, 6),
      drillAlerts: [...inventoryDrills]
        .filter(
          (drill) =>
            drill.wearPercent !== null &&
            drill.status === MillingDrillStatus.ACTIVE,
        )
        .sort((a, b) => (b.wearPercent ?? 0) - (a.wearPercent ?? 0))
        .slice(0, 6),
      recentIncidents,
    },
    millings: millingItems,
    blockTypes,
    millingDrills: drills
      .filter(
        (drill) =>
          drill.status === MillingDrillStatus.ACTIVE ||
          drill.status === MillingDrillStatus.STORED,
      )
      .map((drill) => ({
        id: drill.id,
        name: drill.name,
        brand: null,
        type: null,
        status: drill.status,
        currentBlocksCount: drill.current_blocks_count,
        estimatedMaxBlocks: drill.estimated_max_blocks,
        millingMachineId: drill.milling_machine_id,
        millingMachineName: drill.milling_machines?.name ?? null,
      })),
    inventoryDrills,
    machines: machineItems,
    readyCases: readyCaseItems,
  };
}

export async function createMillingForLoggedLab(
  user_id: string,
  payload: CreateMillingInput,
) {
  const membership = await getLabMember(user_id);
  const { lab_id } = membership;
  const { resolvedSelectedDrillSlots } = await resolveMillingReferences(lab_id, payload);

  await assertProductionCanManageMillingCase(membership, payload.caseId);

  if (membership.role === UserRole.PRODUCTION && payload.caseProcessId) {
    const assignedProcess = await prisma.case_processes.findFirst({
      where: {
        id: payload.caseProcessId,
        assigned_lab_member_id: membership.id,
        cases: { lab_id },
      },
      select: { id: true },
    });

    if (!assignedProcess) {
      throw new ReferenceValidationError({
        caseProcessId: ["Production users can only complete assigned milling tasks."],
      });
    }
  }

  const teethMilledQty = await resolveTeethMilledQty(
    lab_id,
    payload.caseId,
    payload.teethMilledQty,
  );

  const milling = await prisma.case_millings.create({
    data: {
      lab_id,
      case_id: payload.caseId,
      block_type_id: payload.blockTypeId,
      milling_machine_id: payload.millingMachineId,
      teeth_milled_qty: teethMilledQty,
      blocks_used_qty: payload.blocksUsedQty,
      status: payload.status,
      failure_reason: payload.failureReason ?? null,
      notes: payload.notes ?? null,
      milled_at: new Date(payload.milledAt),
      selected_drill_slots: {
        create: resolvedSelectedDrillSlots.map((slot) => ({
          milling_machine_slot_id: slot.machineSlotId,
          milling_drill_id: slot.drillId,
          slot_label_snapshot: slot.slotLabelSnapshot,
          slot_order_snapshot: slot.slotOrderSnapshot,
        })),
      },
    },
    select: millingRecordSelect,
  });

  let processUpdate = null;
  if (payload.caseProcessId) {
    processUpdate = await updateCaseProcessForLoggedLab(user_id, payload.caseProcessId, {
      status:
        payload.status === MillingStatus.SUCCESS
          ? CaseProcessStatus.COMPLETED
          : CaseProcessStatus.IN_PROGRESS,
    });
  }

  return {
    milling: mapMillingRecord(milling),
    processUpdate,
  };
}

export async function updateMillingForLoggedLab(
  user_id: string,
  milling_id: string,
  payload: UpdateMillingInput,
) {
  const membership = await getLabMember(user_id);
  const { lab_id } = membership;
  const existing = await prisma.case_millings.findFirst({
    where: {
      id: milling_id,
      lab_id,
    },
    select: millingRecordSelect,
  });

  if (!existing) {
    throw new ReferenceNotFoundError("Milling record");
  }

  await assertProductionCanManageMillingCase(membership, existing.case_id);

  const existingMapped = mapMillingRecord(existing);
  const nextMachineId = payload.millingMachineId ?? existingMapped.millingMachineId;
  const nextSelectedDrillSlots =
    payload.selectedDrillSlots ??
    existingMapped.selectedDrillSlots
      .filter((slot) => slot.machineSlotId !== null)
      .map((slot) => ({
        machineSlotId: slot.machineSlotId!,
        drillId: slot.drillId,
      }));

  const { resolvedSelectedDrillSlots } = await resolveMillingReferences(lab_id, {
    caseId: payload.caseId ?? existing.case_id,
    caseProcessId: payload.caseProcessId,
    blockTypeId: payload.blockTypeId ?? existing.block_type_id,
    millingMachineId: nextMachineId,
    selectedDrillSlots: nextSelectedDrillSlots,
  });

  const nextCaseId = payload.caseId ?? existing.case_id;
  const teethMilledQty = await resolveTeethMilledQty(
    lab_id,
    nextCaseId,
    payload.teethMilledQty,
  );

  const milling = await prisma.case_millings.update({
    where: { id: milling_id },
    data: {
      case_id: payload.caseId,
      block_type_id: payload.blockTypeId,
      milling_machine_id: nextMachineId,
      teeth_milled_qty: teethMilledQty,
      blocks_used_qty: payload.blocksUsedQty,
      status: payload.status,
      failure_reason:
        payload.failureReason === undefined ? undefined : payload.failureReason,
      notes: payload.notes === undefined ? undefined : payload.notes,
      milled_at: payload.milledAt ? new Date(payload.milledAt) : undefined,
      selected_drill_slots: {
        deleteMany: {},
        create: resolvedSelectedDrillSlots.map((slot) => ({
          milling_machine_slot_id: slot.machineSlotId,
          milling_drill_id: slot.drillId,
          slot_label_snapshot: slot.slotLabelSnapshot,
          slot_order_snapshot: slot.slotOrderSnapshot,
        })),
      },
    },
    select: millingRecordSelect,
  });

  return mapMillingRecord(milling);
}

export async function deleteMillingForLoggedLab(
  user_id: string,
  milling_id: string,
) {
  const membership = await getLabMember(user_id);
  const { lab_id } = membership;
  const existing = await prisma.case_millings.findFirst({
    where: {
      id: milling_id,
      lab_id,
    },
    select: { id: true, case_id: true },
  });

  if (!existing) {
    throw new ReferenceNotFoundError("Milling record");
  }

  await assertProductionCanManageMillingCase(membership, existing.case_id);

  await prisma.case_millings.delete({
    where: { id: milling_id },
  });
}
