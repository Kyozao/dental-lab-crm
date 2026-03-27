import { z } from "zod";

export const createMillingSchema = z.object({
  caseId: z.string().min(1, "Case is required"),
  blockTypeId: z.string().min(1, "Block type is required"),
  millingDrillId: z.string().optional().nullable(),
  teethMilledQty: z
    .string()
    .transform((v) => (v ? parseInt(v) : 0))
    .default(0),
  status: z.enum(["SUCCESS", "FAILED"]).default("SUCCESS"),
  failureReason: z.string().trim().optional().nullable(),
  notes: z.string().trim().optional().nullable(),
  milledAt: z.string().datetime(),
});

export type CreateMillingInput = z.infer<typeof createMillingSchema>;
