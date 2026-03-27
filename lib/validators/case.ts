import { z } from "zod";

const optionalPositiveInt = z.preprocess((value) => {
  if (value === undefined || value === null || value === "") {
    return undefined;
  }

  if (typeof value === "number") {
    return value;
  }

  if (typeof value === "string") {
    const trimmed = value.trim();

    if (!trimmed) {
      return undefined;
    }

    return Number(trimmed);
  }

  return value;
}, z.number().int("Quantity must be a whole number").min(1, "Quantity must be at least 1").optional());

export const caseStatusEnum = z.enum([
  "ENTRY",
  "WAITING_INFO",
  "DESIGNING",
  "WAITING_APPROVAL",
  "MILLING_PRINTING",
  "DONE",
]);

export const createCaseSchema = z.object({
  code: z.string().trim().min(1, "Code is required"),
  patientName: z.string().trim().min(1, "Patient name is required"),
  clinicId: z.string().trim().min(1, "Clinic is required"),
  serviceTypeId: z.string().trim().optional(),
  dentistId: z.string().trim().optional(),
  cadDesignerId: z.string().trim().optional(),
  currentStatus: caseStatusEnum.default("ENTRY"),
  pendingNote: z.string().trim().optional(),
  observations: z.string().trim().optional(),
  teeth: z.string().trim().optional(),
  elementsQty: optionalPositiveInt,
  shade: z.string().trim().optional(),
  dueDate: z.string().trim().optional(),
  isUrgent: z
    .union([z.literal("on"), z.literal("true"), z.literal("false"), z.undefined()])
    .transform((value) => value === "on" || value === "true"),
});

export const updateCaseSchema = z.object({
  id: z.string().trim().min(1, "Case id is required"),
  code: z.string().trim().min(1, "Code is required"),
  patientName: z.string().trim().min(1, "Patient name is required"),
  clinicId: z.string().trim().min(1, "Clinic is required"),
  serviceTypeId: z.string().trim().optional(),
  dentistId: z.string().trim().optional(),
  cadDesignerId: z.string().trim().optional(),
  currentStatus: caseStatusEnum,
  pendingNote: z.string().trim().optional(),
  observations: z.string().trim().optional(),
  teeth: z.string().trim().optional(),
  elementsQty: optionalPositiveInt,
  shade: z.string().trim().optional(),
  dueDate: z.string().trim().optional(),
  isUrgent: z
    .union([z.literal("on"), z.literal("true"), z.literal("false"), z.undefined()])
    .transform((value) => value === "on" || value === "true"),
});

const optionalMoney = z.preprocess((value) => {
  if (value === undefined || value === null || value === "") {
    return undefined;
  }

  if (typeof value === "number") {
    return value;
  }

  if (typeof value === "string") {
    const trimmed = value.trim();

    if (!trimmed) {
      return undefined;
    }

    return Number(trimmed);
  }

  return value;
}, z.number().min(0, "Value cannot be negative").optional());

export const caseComponentInputSchema = z.object({
  componentId: z.string().trim().min(1, "Component is required"),
  quantity: z
    .number()
    .int("Quantity must be a whole number")
    .min(1, "Quantity must be at least 1"),
  chargeClient: z.boolean(),
  unitCost: optionalMoney,
  unitPrice: optionalMoney,
  notes: z.string().trim().optional(),
});

const caseComponentsPayloadSchema = z.array(caseComponentInputSchema);

export function parseCaseComponentsPayload(payload: FormDataEntryValue | null) {
  if (typeof payload !== "string" || !payload.trim()) {
    return caseComponentsPayloadSchema.safeParse([]);
  }

  try {
    const parsedJson = JSON.parse(payload) as unknown;
    return caseComponentsPayloadSchema.safeParse(parsedJson);
  } catch {
    return caseComponentsPayloadSchema.safeParse(Symbol("invalid-json"));
  }
}

export type CreateCaseInput = z.infer<typeof createCaseSchema>;
export type UpdateCaseInput = z.infer<typeof updateCaseSchema>;
export type CaseComponentInput = z.infer<typeof caseComponentInputSchema>;