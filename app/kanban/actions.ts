"use server";

import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/prisma";
import { createClient } from "@/lib/supabase/server";
import { getAuthenticatedAppUser } from "@/lib/auth/get-app-user";
import type { CaseStatusValue, EditableCase } from "@/app/cases/case.shared";
import {
  AttachmentKind,
  CaseStatus,
} from "@/app/generated/prisma/client";
import { parseCaseComponentsPayload } from "@/lib/validators/case";
import {
  notifyCaseAssignment,
  notifyCaseFileUpload,
  notifyCaseStatusChange,
} from "@/lib/notifications";

type UpdateCaseStatusInput = {
  caseId: string;
  status: CaseStatusValue;
};

const VALID_CASE_STATUSES: ReadonlyArray<CaseStatus> = [
  "ENTRY",
  "WAITING_INFO",
  "DESIGNING",
  "WAITING_APPROVAL",
  "DESIGN_READY",
  "MILLING_PRINTING",
  "DONE",
];

const VALID_ATTACHMENT_KINDS: ReadonlyArray<AttachmentKind> = [
  "SCAN_INPUT",
  "DESIGN_OUTPUT",
  "MODEL_OUTPUT",
  "OTHER",
];

const MAX_UPLOAD_SIZE = 100 * 1024 * 1024;

function isValidCaseStatus(status: string): status is CaseStatus {
  return VALID_CASE_STATUSES.includes(status as CaseStatus);
}

function isValidAttachmentKind(kind: string): kind is AttachmentKind {
  return VALID_ATTACHMENT_KINDS.includes(kind as AttachmentKind);
}

function toEditableCase(caseItem: {
  id: string;
  code: string | null;
  patientName: string | null;
  currentStatus: CaseStatus;
  teeth: string | null;
  elementsQty: number | null;
  shade: string | null;
  dueDate: Date | null;
  observations: string | null;
  pendingNote: string | null;
  isUrgent: boolean;
  createdAt: Date;
  updatedAt: Date;
  clinicId: string | null;
  dentistId: string | null;
  serviceTypeId: string | null;
  cadDesignerId: string | null;
  clinic: { name: string } | null;
  dentist: { name: string } | null;
  serviceType: { name: string } | null;
  cadDesigner: { name: string | null } | null;
  caseComponentUsages: Array<{
    id: string;
    componentId: string;
    quantity: number;
    chargeClient: boolean;
    unitCost: unknown;
    unitPrice: unknown;
    notes: string | null;
    component: { name: string };
  }>;
  caseAttachments: Array<{
    id: string;
    fileName: string;
    filePath: string;
    fileType: string | null;
    fileSize: number | null;
    kind: AttachmentKind;
    retentionUntil: Date | null;
    createdAt: Date;
    uploadedBy: { name: string | null } | null;
  }>;
  millings: Array<{
    id: string;
    status: "SUCCESS" | "FAILED";
    teethMilledQty: number;
    failureReason: string | null;
    notes: string | null;
    milledAt: Date;
    blockType: { name: string; shade: string | null };
    millingDrill: { name: string } | null;
  }>;
}): EditableCase {
  return {
    id: caseItem.id,
    code: caseItem.code ?? "",
    patientName: caseItem.patientName ?? "Sem nome",
    currentStatus: caseItem.currentStatus,
    teeth: caseItem.teeth ?? "",
    elementsQty: caseItem.elementsQty ?? null,
    shade: caseItem.shade ?? "",
    dueDate: caseItem.dueDate ? caseItem.dueDate.toISOString() : null,
    observations: caseItem.observations ?? "",
    pendingNote: caseItem.pendingNote ?? "",
    isUrgent: caseItem.isUrgent,
    createdAt: caseItem.createdAt.toISOString(),
    updatedAt: caseItem.updatedAt.toISOString(),
    clinicName: caseItem.clinic?.name ?? "",
    clinicId: caseItem.clinicId ?? null,
    dentistName: caseItem.dentist?.name ?? "",
    dentistId: caseItem.dentistId ?? null,
    serviceTypeId: caseItem.serviceTypeId ?? null,
    serviceTypeName: caseItem.serviceType?.name ?? "",
    cadDesignerId: caseItem.cadDesignerId ?? null,
    cadDesignerName: caseItem.cadDesigner?.name ?? "",
    attachments: caseItem.caseAttachments.map((attachment) => ({
      id: attachment.id,
      fileName: attachment.fileName,
      filePath: attachment.filePath,
      fileType: attachment.fileType ?? null,
      fileSize: attachment.fileSize ?? null,
      kind: attachment.kind,
      retentionUntil: attachment.retentionUntil
        ? attachment.retentionUntil.toISOString()
        : null,
      createdAt: attachment.createdAt.toISOString(),
      uploadedByName: attachment.uploadedBy?.name ?? null,
    })),
    components: caseItem.caseComponentUsages.map((usage) => ({
      id: usage.id,
      componentId: usage.componentId,
      componentName: usage.component.name,
      quantity: usage.quantity,
      chargeClient: usage.chargeClient,
      unitCost: usage.unitCost?.toString() ?? null,
      unitPrice: usage.unitPrice?.toString() ?? null,
      notes: usage.notes,
    })),
    millings: caseItem.millings.map((milling) => ({
      id: milling.id,
      status: milling.status,
      teethMilledQty: milling.teethMilledQty,
      failureReason: milling.failureReason,
      notes: milling.notes,
      milledAt: milling.milledAt.toISOString(),
      blockTypeName: milling.blockType.name,
      blockTypeShade: milling.blockType.shade ?? null,
      millingDrillName: milling.millingDrill?.name ?? null,
    })),
  };
}

export async function getCaseDetailsAction(caseId: string): Promise<EditableCase> {
  const appUser = await getAuthenticatedAppUser();

  if (!appUser) throw new Error("Not authenticated.");
  if (!caseId) throw new Error("Case id is required.");

  const caseItem = await prisma.case.findUnique({
    where: { id: caseId },
    select: {
      id: true,
      code: true,
      patientName: true,
      currentStatus: true,
      teeth: true,
      elementsQty: true,
      shade: true,
      dueDate: true,
      observations: true,
      pendingNote: true,
      isUrgent: true,
      createdAt: true,
      updatedAt: true,
      clinicId: true,
      dentistId: true,
      serviceTypeId: true,
      cadDesignerId: true,
      clinic: { select: { name: true } },
      dentist: { select: { name: true } },
      serviceType: { select: { name: true } },
      cadDesigner: { select: { name: true } },
      caseComponentUsages: {
        orderBy: { createdAt: "asc" },
        select: {
          id: true,
          componentId: true,
          quantity: true,
          chargeClient: true,
          unitCost: true,
          unitPrice: true,
          notes: true,
          component: {
            select: {
              name: true,
            },
          },
        },
      },
      caseAttachments: {
        orderBy: { createdAt: "desc" },
        select: {
          id: true,
          fileName: true,
          filePath: true,
          fileType: true,
          fileSize: true,
          kind: true,
          retentionUntil: true,
          createdAt: true,
          uploadedBy: {
            select: {
              name: true,
            },
          },
        },
      },
      millings: {
        orderBy: { milledAt: "desc" },
        select: {
          id: true,
          status: true,
          teethMilledQty: true,
          failureReason: true,
          notes: true,
          milledAt: true,
          blockType: {
            select: {
              name: true,
              shade: true,
            },
          },
          millingDrill: {
            select: {
              name: true,
            },
          },
        },
      },
    },
  });

  if (!caseItem) {
    throw new Error("Case not found.");
  }

  if (
    appUser.role === "CAD_DESIGNER" &&
    caseItem.cadDesignerId !== appUser.id
  ) {
    throw new Error("Unauthorized.");
  }

  return toEditableCase(caseItem);
}

export async function updateCaseStatusAction({
  caseId,
  status,
}: UpdateCaseStatusInput) {
  const appUser = await getAuthenticatedAppUser();

  if (!appUser) throw new Error("Not authenticated.");
  if (!isValidCaseStatus(status)) throw new Error("Invalid case status.");

  const existingCase = await prisma.case.findUnique({
    where: { id: caseId },
    select: {
      id: true,
      cadDesignerId: true,
      currentStatus: true,
    },
  });

  if (!existingCase) throw new Error("Case not found.");

  if (
    appUser.role === "CAD_DESIGNER" &&
    existingCase.cadDesignerId !== appUser.id
  ) {
    throw new Error("Unauthorized.");
  }

  await prisma.case.update({
    where: { id: caseId },
    data: {
      currentStatus: status,
      statusHistory: {
        create: {
          fromStatus: existingCase.currentStatus,
          toStatus: status,
        },
      },
    },
  });

  if (existingCase.currentStatus !== status) {
    await notifyCaseStatusChange({
      caseId,
      toStatus: status,
      changedByUserId: appUser.id,
    });
  }

  revalidatePath("/");
  revalidatePath("/kanban");
}

export async function uploadCaseAttachmentAction(formData: FormData) {
  const appUser = await getAuthenticatedAppUser();
  if (!appUser) throw new Error("Not authenticated.");

  const caseId = String(formData.get("caseId") ?? "");
  const file = formData.get("file");
  const kindRaw = String(formData.get("kind") ?? "OTHER").trim();

  if (!caseId) throw new Error("Missing caseId.");
  if (!(file instanceof File)) throw new Error("Missing file.");
  if (!file.size) throw new Error("Empty file.");
  if (file.size > MAX_UPLOAD_SIZE) {
    throw new Error("File too large. Limit is 100 MB per file.");
  }
  if (!isValidAttachmentKind(kindRaw)) {
    throw new Error("Invalid attachment type.");
  }

  const isArchiveUpload =
    kindRaw === "SCAN_INPUT" ||
    kindRaw === "DESIGN_OUTPUT" ||
    kindRaw === "MODEL_OUTPUT";
  const allowedExtensions = isArchiveUpload
    ? [".zip", ".rar", ".7z"]
    : [
        ".html",
        ".htm",
        ".zip",
        ".pdf",
        ".png",
        ".jpg",
        ".jpeg",
        ".webp",
        ".stl",
        ".obj",
        ".ply",
        ".rar",
        ".7z",
      ];
  const lowerName = file.name.toLowerCase();

  if (!allowedExtensions.some((ext) => lowerName.endsWith(ext))) {
    throw new Error(
      isArchiveUpload
        ? "Use a .zip, .rar, or .7z archive for scans and final deliveries."
        : "Unsupported file type.",
    );
  }

  const existingCase = await prisma.case.findUnique({
    where: { id: caseId },
    select: { id: true, cadDesignerId: true },
  });

  if (!existingCase) throw new Error("Case not found.");

  if (
    appUser.role === "CAD_DESIGNER" &&
    existingCase.cadDesignerId !== appUser.id
  ) {
    throw new Error("Unauthorized.");
  }

  if (appUser.role === "CAD_DESIGNER" && kindRaw === "SCAN_INPUT") {
    throw new Error("CAD designers can only upload the final archive.");
  }

  const supabase = await createClient();

  const bytes = await file.arrayBuffer();
  const buffer = Buffer.from(bytes);

  const safeName = file.name.replace(/[^a-zA-Z0-9._-]/g, "_");
  const storageFolder = kindRaw.toLowerCase();
  const filePath = `${caseId}/${storageFolder}/${Date.now()}-${safeName}`;

  const { error: uploadError } = await supabase.storage
    .from("case-files")
    .upload(filePath, buffer, {
      contentType: file.type || "application/octet-stream",
      upsert: false,
    });

  if (uploadError) {
    throw new Error(uploadError.message);
  }

  await prisma.caseAttachment.create({
    data: {
      caseId,
      fileName: file.name,
      filePath,
      fileType: file.type || null,
      fileSize: file.size,
      kind: kindRaw,
      retentionUntil: new Date(Date.now() + 90 * 24 * 60 * 60 * 1000),
      uploadedById: appUser.id,
    },
  });

  await notifyCaseFileUpload({
    caseId,
    fileName: file.name,
    kind: kindRaw,
    uploadedById: appUser.id,
    uploadedByName: appUser.name,
  });

  revalidatePath("/");
  revalidatePath("/kanban");
}

export async function deleteCaseAttachmentAction(attachmentId: string) {
  const appUser = await getAuthenticatedAppUser();
  if (!appUser) throw new Error("Not authenticated.");
  if (!attachmentId) throw new Error("Attachment id is required.");

  const attachment = await prisma.caseAttachment.findUnique({
    where: { id: attachmentId },
    select: {
      id: true,
      filePath: true,
      case: {
        select: {
          cadDesignerId: true,
        },
      },
    },
  });

  if (!attachment) throw new Error("File not found.");

  if (
    appUser.role === "CAD_DESIGNER" &&
    attachment.case.cadDesignerId !== appUser.id
  ) {
    throw new Error("Unauthorized.");
  }

  const supabase = await createClient();
  const { error } = await supabase.storage
    .from("case-files")
    .remove([attachment.filePath]);

  if (error) {
    throw new Error(error.message);
  }

  await prisma.caseAttachment.delete({
    where: { id: attachmentId },
  });

  revalidatePath("/");
  revalidatePath("/cases");
  revalidatePath("/kanban");
}

export async function getCaseAttachmentUrlAction(filePath: string) {
  const appUser = await getAuthenticatedAppUser();
  if (!appUser) throw new Error("Not authenticated.");

  const supabase = await createClient();

  const { data, error } = await supabase.storage
    .from("case-files")
    .createSignedUrl(filePath, 60 * 10);

  if (error || !data?.signedUrl) {
    throw new Error(error?.message ?? "Could not create file url.");
  }

  return data.signedUrl;  
}

export async function deleteKanbanCaseAction(caseId: string) {
  if (!caseId) {
    throw new Error("Case id is required.");
  }

  const protectedAttachmentCount = await prisma.caseAttachment.count({
    where: {
      caseId,
      retentionUntil: {
        gt: new Date(),
      },
    },
  });

  if (protectedAttachmentCount > 0) {
    throw new Error(
      "This case still has files inside the 90-day history window and cannot be deleted yet.",
    );
  }

  await prisma.caseAttachment.deleteMany({
    where: { caseId },
  });

  await prisma.case.delete({
    where: { id: caseId },
  });

  revalidatePath("/cases");
  revalidatePath("/kanban");
}

export async function getColumnDownloadUrlsAction({
  caseIds,
  kind,
}: {
  caseIds: string[];
  kind?: AttachmentKind | "ALL" | "FINAL_OUTPUTS";
}) {
  const appUser = await getAuthenticatedAppUser();
  if (!appUser) throw new Error("Not authenticated.");

  const uniqueCaseIds = [...new Set(caseIds.filter(Boolean))];

  if (!uniqueCaseIds.length) {
    return [];
  }

  const allowedCases = await prisma.case.findMany({
    where: {
      id: { in: uniqueCaseIds },
      ...(appUser.role === "CAD_DESIGNER" ? { cadDesignerId: appUser.id } : {}),
    },
    select: { id: true },
  });

  if (allowedCases.length !== uniqueCaseIds.length) {
    throw new Error("Unauthorized.");
  }

  const attachments = await prisma.caseAttachment.findMany({
    where: {
      caseId: { in: uniqueCaseIds },
      ...(kind === "FINAL_OUTPUTS"
        ? { kind: { in: ["DESIGN_OUTPUT", "MODEL_OUTPUT"] } }
        : kind && kind !== "ALL"
          ? { kind }
          : {}),
    },
    orderBy: [{ caseId: "asc" }, { createdAt: "desc" }],
    select: {
      id: true,
      caseId: true,
      fileName: true,
      filePath: true,
      kind: true,
      case: {
        select: {
          code: true,
          patientName: true,
        },
      },
    },
  });

  const supabase = await createClient();
  const signedDownloads = await Promise.all(
    attachments.map(async (attachment) => {
      const { data, error } = await supabase.storage
        .from("case-files")
        .createSignedUrl(attachment.filePath, 60 * 10);

      if (error || !data?.signedUrl) {
        return null;
      }

      return {
        id: attachment.id,
        caseId: attachment.caseId,
        caseLabel: attachment.case.code || attachment.case.patientName,
        fileName: attachment.fileName,
        filePath: attachment.filePath,
        kind: attachment.kind,
        signedUrl: data.signedUrl,
      };
    }),
  );

  return signedDownloads.filter((item): item is NonNullable<typeof item> => Boolean(item));
}

export async function updateKanbanCaseAction(formData: FormData) {
  const appUser = await getAuthenticatedAppUser();
  if (!appUser) throw new Error("Not authenticated.");

  const caseId = String(formData.get("id") ?? "");
  if (!caseId) throw new Error("Missing case id.");

  const existingCase = await prisma.case.findUnique({
    where: { id: caseId },
    select: {
      id: true,
      code: true,
      patientName: true,
      cadDesignerId: true,
      currentStatus: true,
    },
  });

  if (!existingCase) {
    throw new Error("Case not found.");
  }

  const pendingNote = String(formData.get("pendingNote") ?? "").trim();
  const parsedComponents = parseCaseComponentsPayload(
    formData.get("componentsPayload"),
  );

  if (!parsedComponents.success) {
    throw new Error("Invalid component data.");
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
      throw new Error("One or more components are invalid.");
    }
  }

  if (appUser.role === "CAD_DESIGNER") {
    if (existingCase.cadDesignerId !== appUser.id) {
      throw new Error("Unauthorized.");
    }

    const existingUsages = await prisma.caseComponentUsage.findMany({
      where: { caseId },
      orderBy: { createdAt: "asc" },
      select: {
        componentId: true,
        quantity: true,
        chargeClient: true,
        unitCost: true,
        unitPrice: true,
        notes: true,
      },
    });

    const existingByComponentId = new Map<string, typeof existingUsages>();

    for (const usage of existingUsages) {
      const usages = existingByComponentId.get(usage.componentId) ?? [];
      usages.push(usage);
      existingByComponentId.set(usage.componentId, usages);
    }

    const nextComponents = components.map((component) => {
      const available = existingByComponentId.get(component.componentId);
      const matched = available?.shift();

      return {
        componentId: component.componentId,
        quantity: matched?.quantity ?? 1,
        chargeClient: matched?.chargeClient ?? true,
        unitCost: matched?.unitCost ?? null,
        unitPrice: matched?.unitPrice ?? null,
        notes: matched?.notes ?? null,
      };
    });

    await prisma.case.update({
      where: { id: caseId },
      data: {
        pendingNote: pendingNote || null,
        caseComponentUsages: {
          deleteMany: {},
          create: nextComponents,
        },
      },
    });

    revalidatePath("/");
    revalidatePath("/kanban");
    return;
  }
  

  const code = String(formData.get("code") ?? "").trim();
  const patientName = String(formData.get("patientName") ?? "").trim();
  const clinicIdRaw = String(formData.get("clinicId") ?? "").trim();
  const dentistIdRaw = String(formData.get("dentistId") ?? "").trim();
  const serviceTypeIdRaw = String(formData.get("serviceTypeId") ?? "").trim();
  const cadDesignerIdRaw = String(formData.get("cadDesignerId") ?? "").trim();
  const currentStatusRaw = String(formData.get("currentStatus") ?? "").trim();
  const teeth = String(formData.get("teeth") ?? "").trim();
  const elementsQtyRaw = String(formData.get("elementsQty") ?? "").trim();
  const shade = String(formData.get("shade") ?? "").trim();
  const dueDateRaw = String(formData.get("dueDate") ?? "").trim();
  const observations = String(formData.get("observations") ?? "").trim();
  const isUrgentRaw = String(formData.get("isUrgent") ?? "");
  const isUrgent = isUrgentRaw === "on";
  const parsedElementsQty = elementsQtyRaw ? Number(elementsQtyRaw) : NaN;
  const elementsQty = elementsQtyRaw ? parsedElementsQty : null;

  if (!code) throw new Error("Code is required.");
  if (!patientName) throw new Error("Patient name is required.");
  if (!isValidCaseStatus(currentStatusRaw)) {
    throw new Error("Invalid case status.");
  }
  if (
    elementsQtyRaw &&
    (!Number.isInteger(parsedElementsQty) || parsedElementsQty < 1)
  ) {
    throw new Error("Elements quantity must be a whole number greater than 0.");
  }

  await prisma.case.update({
    where: { id: caseId },
    data: {
      code,
      patientName,
      clinicId: clinicIdRaw || null,
      dentistId: dentistIdRaw || null,
      serviceTypeId: serviceTypeIdRaw || null,
      cadDesignerId: cadDesignerIdRaw || null,
      currentStatus: currentStatusRaw,
      teeth: teeth || null,
      elementsQty,
      shade: shade || null,
      dueDate: dueDateRaw ? new Date(`${dueDateRaw}T00:00:00`) : null,
      isUrgent,
      pendingNote: pendingNote || null,
      observations: observations || null,
      statusHistory:
        existingCase.currentStatus !== currentStatusRaw
          ? {
              create: {
                fromStatus: existingCase.currentStatus,
                toStatus: currentStatusRaw,
              },
            }
          : undefined,
      caseComponentUsages: {
        deleteMany: {},
        create: components.map((component) => ({
          componentId: component.componentId,
          quantity: component.quantity,
          chargeClient: component.chargeClient,
          unitCost: component.unitCost ?? null,
          unitPrice: component.unitPrice ?? null,
          notes: component.notes || null,
        })),
      },
    },
  });

  if ((existingCase.cadDesignerId ?? "") !== cadDesignerIdRaw && cadDesignerIdRaw) {
    await notifyCaseAssignment({
      recipientUserId: cadDesignerIdRaw,
      caseId,
      caseCode: code,
      patientName,
      assignedByName: appUser.name,
    });
  }

  if (existingCase.currentStatus !== currentStatusRaw) {
    await notifyCaseStatusChange({
      caseId,
      toStatus: currentStatusRaw,
      changedByUserId: appUser.id,
    });
  }

  revalidatePath("/");
  revalidatePath("/kanban");
}