import { z } from "zod";

export const createClinicSchema = z.object({
  name: z.string().trim().min(1, "Clinic name is required"),
  phone: z.string().trim().optional(),
  email: z.string().email("Invalid email").optional().or(z.literal("")),
  notes: z.string().trim().optional(),
});

export const createDentistSchema = z.object({
  clinicId: z.string().min(1, "Clinic is required"),
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
  type: z.enum(["1.0MM", "2.5MM"], {
    error: "Drill type must be 1.0mm or 2.5mm",
  }),
  brand: z.string().trim().optional(),
  serialNumber: z.string().trim().optional(),
  maxTeethRecommended: z
    .string()
    .optional()
    .transform((v) => (v && v.trim() ? parseInt(v) : undefined)),
  notes: z.string().trim().optional(),
  isActive: z
    .union([z.literal("on"), z.literal("true"), z.literal("false"), z.undefined()])
    .transform((value) => value === "on" || value === "true")
    .default(true),
});

export const updateClinicSchema = createClinicSchema.extend({
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

export type CreateClinicInput = z.infer<typeof createClinicSchema>;
export type CreateDentistInput = z.infer<typeof createDentistSchema>;
export type CreateComponentInput = z.infer<typeof createComponentSchema>;
export type CreateBlockTypeInput = z.infer<typeof createBlockTypeSchema>;
export type CreateServiceTypeInput = z.infer<typeof createServiceTypeSchema>;
export type CreateMillingDrillInput = z.infer<typeof createMillingDrillSchema>;
