import { z } from "zod";

export const createCustomerSchema = z.object({
  name: z.string().trim().min(1, "customer name is required"),
  phone: z.string().trim().optional(),
  email: z.string().email("Invalid email").optional().or(z.literal("")),
  notes: z.string().trim().optional(),
});

export const createDentistSchema = z.object({
  customerId: z.string().min(1, "customer is required"),
  name: z.string().trim().min(1, "Dentist name is required"),
  phone: z.string().trim().optional(),
  email: z.string().email("Invalid email").optional().or(z.literal("")),
  notes: z.string().trim().optional(),
});

export const createComponentSchema = z.object({
  name: z.string().trim().min(1, "Component name is required"),
  category: z.string().trim().optional(),
  brand: z.string().trim().optional(),
  defaultCost: z
    .string()
    .optional()
    .transform((v) => (v && v.trim() ? parseFloat(v) : undefined)),
  defaultPrice: z
    .string()
    .optional()
    .transform((v) => (v && v.trim() ? parseFloat(v) : undefined)),
  isActive: z
    .union([z.literal("on"), z.literal("true"), z.literal("false"), z.undefined()])
    .transform((value) => value === "on" || value === "true")
    .default(true),
});

export const createBlockTypeSchema = z.object({
  name: z.string().trim().min(1, "Block type name is required"),
  material: z.string().trim().optional(),
  brand: z.string().trim().optional(),
  size: z.string().trim().optional(),
  shade: z.string().trim().optional(),
  defaultCost: z
    .string()
    .optional()
    .transform((v) => (v && v.trim() ? parseFloat(v) : undefined)),
  isActive: z
    .union([z.literal("on"), z.literal("true"), z.literal("false"), z.undefined()])
    .transform((value) => value === "on" || value === "true")
    .default(true),
});

export const createServiceTypeSchema = z.object({
  name: z.string().trim().min(1, "Service type name is required"),
  notes: z.string().trim().optional(),
  isActive: z
    .union([z.literal("on"), z.literal("true"), z.literal("false"), z.undefined()])
    .transform((value) => value === "on" || value === "true")
    .default(true),
});

export const createMillingDrillSchema = z.object({
  name: z.string().trim().min(1, "Drill name is required"),
  millingMachineId: z.string().trim().optional(),
  status: z.enum(["ACTIVE", "STORED", "RETIRED", "LOST"]),
  currentBlocksCount: z
    .string()
    .optional()
    .transform((v) => (v && v.trim() ? parseInt(v, 10) : 0)),
  estimatedMaxBlocks: z
    .string()
    .optional()
    .transform((v) => (v && v.trim() ? parseInt(v, 10) : undefined)),
  installedAt: z.string().trim().optional(),
  removedAt: z.string().trim().optional(),
  notes: z.string().trim().optional(),
}).superRefine((value, ctx) => {
  if (value.currentBlocksCount < 0) {
    ctx.addIssue({
      code: z.ZodIssueCode.custom,
      path: ["currentBlocksCount"],
      message: "Current blocks count cannot be negative",
    });
  }

  if (
    value.estimatedMaxBlocks !== undefined &&
    Number.isNaN(value.estimatedMaxBlocks)
  ) {
    ctx.addIssue({
      code: z.ZodIssueCode.custom,
      path: ["estimatedMaxBlocks"],
      message: "Estimated max blocks must be a whole number",
    });
  }

  if (Number.isNaN(value.currentBlocksCount)) {
    ctx.addIssue({
      code: z.ZodIssueCode.custom,
      path: ["currentBlocksCount"],
      message: "Current blocks count must be a whole number",
    });
  }

  const hasMachine = Boolean(value.millingMachineId && value.millingMachineId.trim());
  if (hasMachine && value.status !== "ACTIVE") {
    ctx.addIssue({
      code: z.ZodIssueCode.custom,
      path: ["millingMachineId"],
      message: "Only active drills can stay assigned to a machine",
    });
  }
});

export const updateCustomerSchema = createCustomerSchema.extend({
  id: z.string().min(1, "ID is required"),
});

export const updateDentistSchema = createDentistSchema.extend({
  id: z.string().min(1, "ID is required"),
});

export const updateComponentSchema = createComponentSchema.extend({
  id: z.string().min(1, "ID is required"),
});

export const updateBlockTypeSchema = createBlockTypeSchema.extend({
  id: z.string().min(1, "ID is required"),
});

export const updateServiceTypeSchema = createServiceTypeSchema.extend({
  id: z.string().min(1, "ID is required"),
});

export const updateMillingDrillSchema = createMillingDrillSchema.extend({
  id: z.string().min(1, "ID is required"),
});

export type CreateCustomerInput = z.infer<typeof createCustomerSchema>;
export type CreateDentistInput = z.infer<typeof createDentistSchema>;
export type CreateComponentInput = z.infer<typeof createComponentSchema>;
export type CreateBlockTypeInput = z.infer<typeof createBlockTypeSchema>;
export type CreateServiceTypeInput = z.infer<typeof createServiceTypeSchema>;
export type CreateMillingDrillInput = z.infer<typeof createMillingDrillSchema>;
