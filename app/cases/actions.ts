"use server";

import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/prisma";
import {
  createCaseSchema,
  parseCaseComponentsPayload,
} from "@/lib/validators/case";

export type CreateCaseState = {
  success: boolean;
  message: string;
  errors?: Partial<
    Record<
      | "code"
      | "patientName"
      | "clinicId"
      | "serviceTypeId"
      | "dentistId"
      | "currentStatus"
      | "pendingNote"
      | "observations"
      | "teeth"
      | "elementsQty"
      | "shade"
      | "dueDate"
      | "isUrgent"
      | "componentsPayload",
      string[]
    >
  >;
};

export async function createCaseAction(
  _prevState: CreateCaseState,
  formData: FormData,
): Promise<CreateCaseState> {
  const parsed = createCaseSchema.safeParse({
    code: formData.get("code"),
    patientName: formData.get("patientName"),
    clinicId: formData.get("clinicId"),
    serviceTypeId: formData.get("serviceTypeId") || undefined,
    dentistId: formData.get("dentistId") || undefined,
    cadDesignerId: formData.get("cadDesignerId") || undefined,
    currentStatus: formData.get("currentStatus") || "ENTRY",
    pendingNote: formData.get("pendingNote") || undefined,
    observations: formData.get("observations") || undefined,
    teeth: formData.get("teeth") || undefined,
    elementsQty: formData.get("elementsQty") || undefined,
    shade: formData.get("shade") || undefined,
    dueDate: formData.get("dueDate") || undefined,
    isUrgent: formData.get("isUrgent") || undefined,
  });

  if (!parsed.success) {
    return {
      success: false,
      message: "Please fix the form errors.",
      errors: parsed.error.flatten().fieldErrors,
    };
  }

  const data = parsed.data;
  const parsedComponents = parseCaseComponentsPayload(
    formData.get("componentsPayload"),
  );

  if (!parsedComponents.success) {
    return {
      success: false,
      message: "Please fix the form errors.",
      errors: {
        componentsPayload: ["Invalid component data."],
      },
    };
  }

  const components = parsedComponents.data;

  if (components.length) {
    const uniqueIds = [...new Set(components.map((item) => item.componentId))];
    const existingCount = await prisma.component.count({
      where: {
        id: {
          in: uniqueIds,
        },
      },
    });

    if (existingCount !== uniqueIds.length) {
      return {
        success: false,
        message: "Please fix the form errors.",
        errors: {
          componentsPayload: ["One or more components are invalid."],
        },
      };
    }
  }

  try {
    await prisma.case.create({
      data: {
        code: data.code,
        patientName: data.patientName,
        clinicId: data.clinicId,
        serviceTypeId: data.serviceTypeId || null,
        dentistId: data.dentistId || null,
        cadDesignerId: data.cadDesignerId || null,
        currentStatus: data.currentStatus,
        pendingNote: data.pendingNote || null,
        observations: data.observations || null,
        teeth: data.teeth || null,
        elementsQty: data.elementsQty ?? null,
        shade: data.shade || null,
        dueDate: data.dueDate ? new Date(data.dueDate) : null,
        isUrgent: data.isUrgent,
        caseComponentUsages: components.length
          ? {
              create: components.map((component) => ({
                componentId: component.componentId,
                quantity: component.quantity,
                chargeClient: component.chargeClient,
                unitCost: component.unitCost ?? null,
                unitPrice: component.unitPrice ?? null,
                notes: component.notes || null,
              })),
            }
          : undefined,
      },
    });

    revalidatePath("/cases");

    return {
      success: true,
      message: "Case created successfully.",
    };
  } catch (error) {
    console.error(error);

    return {
      success: false,
      message: "Failed to create case.",
    };
  }
}