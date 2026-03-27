"use server";

import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/prisma";
import {
  createClinicSchema,
  createDentistSchema,
  createComponentSchema,
  createBlockTypeSchema,
  createServiceTypeSchema,
  createMillingDrillSchema,
  updateClinicSchema,
  updateDentistSchema,
  updateComponentSchema,
  updateBlockTypeSchema,
  updateServiceTypeSchema,
  updateMillingDrillSchema,
} from "@/lib/validators/registry";

export type RegistryActionState = {
  success: boolean;
  message: string;
  errors?: Record<string, string[]>;
  data?: { id: string };
};

// Clinic Actions
export async function createClinicAction(
  _prevState: RegistryActionState,
  formData: FormData,
): Promise<RegistryActionState> {
  const parsed = createClinicSchema.safeParse({
    name: formData.get("name"),
    phone: formData.get("phone") || undefined,
    email: formData.get("email") || undefined,
    notes: formData.get("notes") || undefined,
  });

  if (!parsed.success) {
    return {
      success: false,
      message: "Validation failed",
      errors: parsed.error.flatten().fieldErrors as Record<string, string[]>,
    };
  }

  try {
    const clinic = await prisma.clinic.create({
      data: parsed.data,
    });

    revalidatePath("/registry");

    return {
      success: true,
      message: "Clinic created successfully",
      data: { id: clinic.id },
    };
  } catch {
    return {
      success: false,
      message: "Failed to create clinic",
    };
  }
}

// Dentist Actions
export async function createDentistAction(
  _prevState: RegistryActionState,
  formData: FormData,
): Promise<RegistryActionState> {
  const parsed = createDentistSchema.safeParse({
    clinicId: formData.get("clinicId"),
    name: formData.get("name"),
    phone: formData.get("phone") || undefined,
    email: formData.get("email") || undefined,
    notes: formData.get("notes") || undefined,
  });

  if (!parsed.success) {
    return {
      success: false,
      message: "Validation failed",
      errors: parsed.error.flatten().fieldErrors as Record<string, string[]>,
    };
  }

  try {
    const dentist = await prisma.dentist.create({
      data: parsed.data,
    });

    revalidatePath("/registry");

    return {
      success: true,
      message: "Dentist created successfully",
      data: { id: dentist.id },
    };
  } catch {
    return {
      success: false,
      message: "Failed to create dentist",
    };
  }
}

// Component Actions
export async function createComponentAction(
  _prevState: RegistryActionState,
  formData: FormData,
): Promise<RegistryActionState> {
  const parsed = createComponentSchema.safeParse({
    name: formData.get("name"),
    category: formData.get("category") || undefined,
    brand: formData.get("brand") || undefined,
    defaultCost: formData.get("defaultCost") || undefined,
    defaultPrice: formData.get("defaultPrice") || undefined,
    isActive: formData.get("isActive") || undefined,
  });

  if (!parsed.success) {
    return {
      success: false,
      message: "Validation failed",
      errors: parsed.error.flatten().fieldErrors as Record<string, string[]>,
    };
  }

  try {
    const component = await prisma.component.create({
      data: parsed.data,
    });

    revalidatePath("/registry");

    return {
      success: true,
      message: "Component created successfully",
      data: { id: component.id },
    };
  } catch {
    return {
      success: false,
      message: "Failed to create component",
    };
  }
}

// BlockType Actions
export async function createBlockTypeAction(
  _prevState: RegistryActionState,
  formData: FormData,
): Promise<RegistryActionState> {
  const parsed = createBlockTypeSchema.safeParse({
    name: formData.get("name"),
    material: formData.get("material") || undefined,
    brand: formData.get("brand") || undefined,
    size: formData.get("size") || undefined,
    shade: formData.get("shade") || undefined,
    defaultCost: formData.get("defaultCost") || undefined,
    isActive: formData.get("isActive") || undefined,
  });

  if (!parsed.success) {
    return {
      success: false,
      message: "Validation failed",
      errors: parsed.error.flatten().fieldErrors as Record<string, string[]>,
    };
  }

  try {
    const blockType = await prisma.blockType.create({
      data: parsed.data,
    });

    revalidatePath("/registry");

    return {
      success: true,
      message: "Block type created successfully",
      data: { id: blockType.id },
    };
  } catch {
    return {
      success: false,
      message: "Failed to create block type",
    };
  }
}

// ServiceType Actions
export async function createServiceTypeAction(
  _prevState: RegistryActionState,
  formData: FormData,
): Promise<RegistryActionState> {
  const parsed = createServiceTypeSchema.safeParse({
    name: formData.get("name"),
    notes: formData.get("notes") || undefined,
    isActive: formData.get("isActive") || undefined,
  });

  if (!parsed.success) {
    return {
      success: false,
      message: "Validation failed",
      errors: parsed.error.flatten().fieldErrors as Record<string, string[]>,
    };
  }

  try {
    const serviceType = await prisma.serviceType.create({
      data: parsed.data,
    });

    revalidatePath("/registry");

    return {
      success: true,
      message: "Service type created successfully",
      data: { id: serviceType.id },
    };
  } catch {
    return {
      success: false,
      message: "Failed to create service type",
    };
  }
}

// MillingDrill Actions
export async function createMillingDrillAction(
  _prevState: RegistryActionState,
  formData: FormData,
): Promise<RegistryActionState> {
  const parsed = createMillingDrillSchema.safeParse({
    name: formData.get("name"),
    type: formData.get("type") || undefined,
    brand: formData.get("brand") || undefined,
    serialNumber: formData.get("serialNumber") || undefined,
    maxTeethRecommended: formData.get("maxTeethRecommended") || undefined,
    notes: formData.get("notes") || undefined,
    isActive: formData.get("isActive") || undefined,
  });

  if (!parsed.success) {
    return {
      success: false,
      message: "Validation failed",
      errors: parsed.error.flatten().fieldErrors as Record<string, string[]>,
    };
  }

  try {
    const drill = await prisma.millingDrill.create({
      data: parsed.data,
    });

    revalidatePath("/registry");

    return {
      success: true,
      message: "Milling drill created successfully",
      data: { id: drill.id },
    };
  } catch {
    return {
      success: false,
      message: "Failed to create milling drill",
    };
  }
}

export async function markMillingDrillChangedAction(drillId: string) {
  await prisma.millingDrill.update({
    where: { id: drillId },
    data: { changedAt: new Date() },
  });

  revalidatePath("/registry");
  revalidatePath("/production");
}

// ── Update actions ────────────────────────────────────────────────────────────

export async function updateClinicAction(
  _prevState: RegistryActionState,
  formData: FormData,
): Promise<RegistryActionState> {
  const parsed = updateClinicSchema.safeParse({
    id: formData.get("id"),
    name: formData.get("name"),
    phone: formData.get("phone") || undefined,
    email: formData.get("email") || undefined,
    notes: formData.get("notes") || undefined,
  });

  if (!parsed.success) {
    return {
      success: false,
      message: "Validation failed",
      errors: parsed.error.flatten().fieldErrors as Record<string, string[]>,
    };
  }

  try {
    await prisma.clinic.update({
      where: { id: parsed.data.id },
      data: {
        name: parsed.data.name,
        phone: parsed.data.phone || null,
        email: parsed.data.email || null,
        notes: parsed.data.notes || null,
      },
    });

    revalidatePath("/registry");
    return { success: true, message: "Clinic updated" };
  } catch {
    return { success: false, message: "Failed to update clinic" };
  }
}

export async function updateDentistAction(
  _prevState: RegistryActionState,
  formData: FormData,
): Promise<RegistryActionState> {
  const parsed = updateDentistSchema.safeParse({
    id: formData.get("id"),
    clinicId: formData.get("clinicId"),
    name: formData.get("name"),
    phone: formData.get("phone") || undefined,
    email: formData.get("email") || undefined,
    notes: formData.get("notes") || undefined,
  });

  if (!parsed.success) {
    return {
      success: false,
      message: "Validation failed",
      errors: parsed.error.flatten().fieldErrors as Record<string, string[]>,
    };
  }

  try {
    await prisma.dentist.update({
      where: { id: parsed.data.id },
      data: {
        clinicId: parsed.data.clinicId,
        name: parsed.data.name,
        phone: parsed.data.phone || null,
        email: parsed.data.email || null,
        notes: parsed.data.notes || null,
      },
    });

    revalidatePath("/registry");
    return { success: true, message: "Dentist updated" };
  } catch {
    return { success: false, message: "Failed to update dentist" };
  }
}

export async function updateComponentAction(
  _prevState: RegistryActionState,
  formData: FormData,
): Promise<RegistryActionState> {
  const parsed = updateComponentSchema.safeParse({
    id: formData.get("id"),
    name: formData.get("name"),
    category: formData.get("category") || undefined,
    brand: formData.get("brand") || undefined,
    defaultCost: formData.get("defaultCost") || undefined,
    defaultPrice: formData.get("defaultPrice") || undefined,
    isActive: formData.get("isActive") || undefined,
  });

  if (!parsed.success) {
    return {
      success: false,
      message: "Validation failed",
      errors: parsed.error.flatten().fieldErrors as Record<string, string[]>,
    };
  }

  try {
    await prisma.component.update({
      where: { id: parsed.data.id },
      data: {
        name: parsed.data.name,
        category: parsed.data.category ?? null,
        brand: parsed.data.brand ?? null,
        defaultCost: parsed.data.defaultCost ?? null,
        defaultPrice: parsed.data.defaultPrice ?? null,
        isActive: parsed.data.isActive,
      },
    });

    revalidatePath("/registry");
    return { success: true, message: "Component updated" };
  } catch {
    return { success: false, message: "Failed to update component" };
  }
}

export async function updateBlockTypeAction(
  _prevState: RegistryActionState,
  formData: FormData,
): Promise<RegistryActionState> {
  const parsed = updateBlockTypeSchema.safeParse({
    id: formData.get("id"),
    name: formData.get("name"),
    material: formData.get("material") || undefined,
    brand: formData.get("brand") || undefined,
    size: formData.get("size") || undefined,
    shade: formData.get("shade") || undefined,
    defaultCost: formData.get("defaultCost") || undefined,
    isActive: formData.get("isActive") || undefined,
  });

  if (!parsed.success) {
    return {
      success: false,
      message: "Validation failed",
      errors: parsed.error.flatten().fieldErrors as Record<string, string[]>,
    };
  }

  try {
    await prisma.blockType.update({
      where: { id: parsed.data.id },
      data: {
        name: parsed.data.name,
        material: parsed.data.material ?? null,
        brand: parsed.data.brand ?? null,
        size: parsed.data.size ?? null,
        shade: parsed.data.shade ?? null,
        defaultCost: parsed.data.defaultCost ?? null,
        isActive: parsed.data.isActive,
      },
    });

    revalidatePath("/registry");
    return { success: true, message: "Block type updated" };
  } catch {
    return { success: false, message: "Failed to update block type" };
  }
}

export async function updateServiceTypeAction(
  _prevState: RegistryActionState,
  formData: FormData,
): Promise<RegistryActionState> {
  const parsed = updateServiceTypeSchema.safeParse({
    id: formData.get("id"),
    name: formData.get("name"),
    notes: formData.get("notes") || undefined,
    isActive: formData.get("isActive") || undefined,
  });

  if (!parsed.success) {
    return {
      success: false,
      message: "Validation failed",
      errors: parsed.error.flatten().fieldErrors as Record<string, string[]>,
    };
  }

  try {
    await prisma.serviceType.update({
      where: { id: parsed.data.id },
      data: {
        name: parsed.data.name,
        notes: parsed.data.notes ?? null,
        isActive: parsed.data.isActive,
      },
    });

    revalidatePath("/registry");
    return { success: true, message: "Service type updated" };
  } catch {
    return { success: false, message: "Failed to update service type" };
  }
}

export async function updateMillingDrillAction(
  _prevState: RegistryActionState,
  formData: FormData,
): Promise<RegistryActionState> {
  const parsed = updateMillingDrillSchema.safeParse({
    id: formData.get("id"),
    name: formData.get("name"),
    type: formData.get("type") || undefined,
    brand: formData.get("brand") || undefined,
    serialNumber: formData.get("serialNumber") || undefined,
    maxTeethRecommended: formData.get("maxTeethRecommended") || undefined,
    notes: formData.get("notes") || undefined,
    isActive: formData.get("isActive") || undefined,
  });

  if (!parsed.success) {
    return {
      success: false,
      message: "Validation failed",
      errors: parsed.error.flatten().fieldErrors as Record<string, string[]>,
    };
  }

  try {
    await prisma.millingDrill.update({
      where: { id: parsed.data.id },
      data: {
        name: parsed.data.name,
        type: parsed.data.type ?? null,
        brand: parsed.data.brand ?? null,
        serialNumber: parsed.data.serialNumber ?? null,
        maxTeethRecommended: parsed.data.maxTeethRecommended ?? null,
        notes: parsed.data.notes ?? null,
        isActive: parsed.data.isActive,
      },
    });

    revalidatePath("/registry");
    revalidatePath("/production");
    return { success: true, message: "Drill updated" };
  } catch {
    return { success: false, message: "Failed to update drill" };
  }
}

// ── Delete actions ────────────────────────────────────────────────────────────

export async function deleteClinicAction(id: string): Promise<void> {
  await prisma.clinic.delete({ where: { id } });
  revalidatePath("/registry");
}

export async function deleteDentistAction(id: string): Promise<void> {
  await prisma.dentist.delete({ where: { id } });
  revalidatePath("/registry");
}

export async function deleteComponentAction(id: string): Promise<void> {
  await prisma.component.delete({ where: { id } });
  revalidatePath("/registry");
}

export async function deleteBlockTypeAction(id: string): Promise<void> {
  await prisma.blockType.delete({ where: { id } });
  revalidatePath("/registry");
}

export async function deleteServiceTypeAction(id: string): Promise<void> {
  await prisma.serviceType.delete({ where: { id } });
  revalidatePath("/registry");
}

export async function deleteMillingDrillAction(id: string): Promise<void> {
  await prisma.millingDrill.delete({ where: { id } });
  revalidatePath("/registry");
  revalidatePath("/production");
}

