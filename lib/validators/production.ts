import { z } from "zod";

export const createMillingSchema = z.object({
  caseId: z.string().min(1, "Case is required"),
  blockTypeId: z.string().min(1, "Block type is required"),
  millingDrillId: z.string().optional().nullable(),
  fineMillingDrillId: z.string().min(1, "1.0mm drill is required"),
  coarseMillingDrillId: z.string().min(1, "2.5mm drill is required"),
  teethMilledQty: z
    .string()
    .transform((v) => (v ? parseInt(v) : 0))
    .default(0),
  status: z.enum(["SUCCESS", "FAILED"]).default("SUCCESS"),
  failureReason: z.string().trim().optional().nullable(),
  notes: z.string().trim().optional().nullable(),
  milledAt: z.string().datetime(),
}).superRefine((value, ctx) => {
  if (value.fineMillingDrillId === value.coarseMillingDrillId) {
    ctx.addIssue({
      code: z.ZodIssueCode.custom,
      message: "1.0mm and 2.5mm drills must be different tools.",
      path: ["coarseMillingDrillId"],
    });
  }
});

export type CreateMillingInput = z.infer<typeof createMillingSchema>;
