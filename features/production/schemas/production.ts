import { z } from "zod";

const selectedDrillSlotSchema = z.object({
  machineSlotId: z.string().min(1, "Machine slot is required"),
  drillId: z.string().min(1, "Drill is required"),
});

export const createMillingSchema = z.object({
  caseId: z.string().min(1, "Case is required"),
  caseProcessId: z.string().optional().nullable(),
  blockTypeId: z.string().min(1, "Block type is required"),
  millingMachineId: z.string().min(1, "Milling machine is required"),
  selectedDrillSlots: z
    .array(selectedDrillSlotSchema)
    .min(1, "At least one drill slot is required"),
  teethMilledQty: z
    .string()
    .transform((v) => (v ? parseInt(v, 10) : 0))
    .default(0),
  blocksUsedQty: z
    .string()
    .transform((v) => (v ? parseInt(v, 10) : 1))
    .default(1),
  status: z.enum(["SUCCESS", "FAILED"]).default("SUCCESS"),
  failureReason: z.string().trim().optional().nullable(),
  notes: z.string().trim().optional().nullable(),
  milledAt: z.string().datetime(),
}).superRefine((value, ctx) => {
  const drillIds = new Set<string>();

  value.selectedDrillSlots.forEach((slot, index) => {
    if (drillIds.has(slot.drillId)) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: "The same drill cannot fill multiple slots.",
        path: ["selectedDrillSlots", index, "drillId"],
      });
      return;
    }

    drillIds.add(slot.drillId);
  });
});

export type CreateMillingInput = z.infer<typeof createMillingSchema>;
