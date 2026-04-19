import { getAuthenticatedAppUser } from "@/lib/auth/get-app-user";
import { apiError, apiSuccess } from "@/lib/api/response";
import { prisma } from "@/lib/prisma";
import {
  caseComponentsPayloadSchema,
  updateCaseSchema,
} from "@/lib/validators/case";

const partialUpdateCaseSchema = updateCaseSchema.omit({ id: true }).partial();

function normalizePartialCasePayload(payload: Record<string, unknown>) {
  return {
    code: payload.code,
    patientName: payload.patientName,
    caseScope: payload.caseScope,
    clinicId: payload.clinicId,
    serviceTypeId: payload.serviceTypeId,
    dentistId: payload.dentistId,
    cadDesignerId: payload.cadDesignerId,
    currentStatus: payload.currentStatus,
    pendingNote: payload.pendingNote,
    observations: payload.observations,
    teeth: payload.teeth,
    elementsQty: payload.elementsQty,
    shade: payload.shade,
    dueDate: payload.dueDate,
    isUrgent:
      payload.isUrgent === true
        ? "true"
        : payload.isUrgent === false
          ? "false"
          : payload.isUrgent,
  };
}

export async function GET(
  _request: Request,
  context: { params: Promise<{ id: string }> },
) {
  const appUser = await getAuthenticatedAppUser();

  if (!appUser) {
    return apiError(401, "UNAUTHORIZED", "Not authenticated.");
  }

  const { id } = await context.params;

  const caseItem = await prisma.case.findUnique({
    where: { id },
    select: {
      id: true,
      code: true,
      patientName: true,
      caseScope: true,
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
      cadDesignerId: true,
      clinic: {
        select: {
          id: true,
          name: true,
        },
      },
      dentist: {
        select: {
          id: true,
          name: true,
        },
      },
      serviceType: {
        select: {
          id: true,
          name: true,
        },
      },
      cadDesigner: {
        select: {
          id: true,
          name: true,
        },
      },
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
      statusHistory: {
        orderBy: { changedAt: "desc" },
        select: {
          id: true,
          fromStatus: true,
          toStatus: true,
          note: true,
          changedAt: true,
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
    return apiError(404, "CASE_NOT_FOUND", "Case not found.");
  }

  if (
    appUser.role === "CAD_DESIGNER" &&
    caseItem.cadDesignerId !== appUser.id
  ) {
    return apiError(403, "FORBIDDEN", "You cannot access this case.");
  }

  return apiSuccess({
    id: caseItem.id,
    code: caseItem.code,
    patientName: caseItem.patientName,
    caseScope: caseItem.caseScope,
    currentStatus: caseItem.currentStatus,
    teeth: caseItem.teeth,
    elementsQty: caseItem.elementsQty,
    shade: caseItem.shade,
    dueDate: caseItem.dueDate?.toISOString() ?? null,
    observations: caseItem.observations,
    pendingNote: caseItem.pendingNote,
    isUrgent: caseItem.isUrgent,
    createdAt: caseItem.createdAt.toISOString(),
    updatedAt: caseItem.updatedAt.toISOString(),
    clinic: caseItem.clinic,
    dentist: caseItem.dentist,
    serviceType: caseItem.serviceType,
    cadDesigner: caseItem.cadDesigner,
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
    attachments: caseItem.caseAttachments.map((attachment) => ({
      id: attachment.id,
      fileName: attachment.fileName,
      filePath: attachment.filePath,
      fileType: attachment.fileType,
      fileSize: attachment.fileSize,
      kind: attachment.kind,
      retentionUntil: attachment.retentionUntil?.toISOString() ?? null,
      createdAt: attachment.createdAt.toISOString(),
      uploadedByName: attachment.uploadedBy?.name ?? null,
    })),
    timeline: caseItem.statusHistory.map((entry) => ({
      id: entry.id,
      fromStatus: entry.fromStatus,
      toStatus: entry.toStatus,
      note: entry.note,
      changedAt: entry.changedAt.toISOString(),
    })),
    millings: caseItem.millings.map((milling) => ({
      id: milling.id,
      status: milling.status,
      teethMilledQty: milling.teethMilledQty,
      failureReason: milling.failureReason,
      notes: milling.notes,
      milledAt: milling.milledAt.toISOString(),
      blockTypeName: milling.blockType.name,
      blockTypeShade: milling.blockType.shade,
      millingDrillName: milling.millingDrill?.name ?? null,
    })),
  });
}

export async function PATCH(
  request: Request,
  context: { params: Promise<{ id: string }> },
) {
  const appUser = await getAuthenticatedAppUser();

  if (!appUser) {
    return apiError(401, "UNAUTHORIZED", "Not authenticated.");
  }

  const { id } = await context.params;

  let payload: Record<string, unknown>;

  try {
    payload = (await request.json()) as Record<string, unknown>;
  } catch {
    return apiError(400, "INVALID_JSON", "Request body must be valid JSON.");
  }

  const existingCase = await prisma.case.findUnique({
    where: { id },
    select: {
      id: true,
      code: true,
      currentStatus: true,
      cadDesignerId: true,
    },
  });

  if (!existingCase) {
    return apiError(404, "CASE_NOT_FOUND", "Case not found.");
  }

  if (
    appUser.role === "CAD_DESIGNER" &&
    existingCase.cadDesignerId !== appUser.id
  ) {
    return apiError(403, "FORBIDDEN", "You cannot update this case.");
  }

  if (appUser.role === "CAD_DESIGNER") {
    const forbiddenField = [
      "code",
      "patientName",
      "caseScope",
      "clinicId",
      "serviceTypeId",
      "dentistId",
      "cadDesignerId",
      "teeth",
      "elementsQty",
      "shade",
      "dueDate",
      "observations",
      "isUrgent",
      "currentStatus",
    ].find((field) => field in payload);

    if (forbiddenField) {
      return apiError(
        403,
        "FORBIDDEN",
        `CAD designers cannot change \`${forbiddenField}\` from this endpoint.`,
      );
    }
  }

  const parsed = partialUpdateCaseSchema.safeParse(
    normalizePartialCasePayload(payload),
  );
  const componentsProvided = Object.prototype.hasOwnProperty.call(
    payload,
    "components",
  );
  const parsedComponents = componentsProvided
    ? caseComponentsPayloadSchema.safeParse(payload.components ?? [])
    : { success: true as const, data: [] };

  if (!parsed.success || !parsedComponents.success) {
    return apiError(400, "VALIDATION_ERROR", "Invalid case update payload.", {
      fields: {
        ...(!parsed.success ? parsed.error.flatten().fieldErrors : {}),
        ...(!parsedComponents.success
          ? { components: ["Invalid component data."] }
          : {}),
      },
    });
  }

  const note = typeof payload.note === "string" ? payload.note.trim() : undefined;

  if (componentsProvided && parsedComponents.data.length) {
    const uniqueIds = [
      ...new Set(parsedComponents.data.map((item) => item.componentId)),
    ];
    const existingCount = await prisma.component.count({
      where: {
        id: {
          in: uniqueIds,
        },
      },
    });

    if (existingCount !== uniqueIds.length) {
      return apiError(400, "INVALID_COMPONENTS", "One or more components are invalid.");
    }
  }

  const updateData = {
    ...(parsed.data.code !== undefined ? { code: parsed.data.code } : {}),
    ...(parsed.data.patientName !== undefined
      ? { patientName: parsed.data.patientName }
      : {}),
    ...(parsed.data.caseScope !== undefined
      ? { caseScope: parsed.data.caseScope }
      : {}),
    ...(parsed.data.clinicId !== undefined
      ? { clinicId: parsed.data.clinicId || null }
      : {}),
    ...(parsed.data.serviceTypeId !== undefined
      ? { serviceTypeId: parsed.data.serviceTypeId || null }
      : {}),
    ...(parsed.data.dentistId !== undefined
      ? { dentistId: parsed.data.dentistId || null }
      : {}),
    ...(parsed.data.cadDesignerId !== undefined
      ? { cadDesignerId: parsed.data.cadDesignerId || null }
      : {}),
    ...(parsed.data.pendingNote !== undefined
      ? { pendingNote: parsed.data.pendingNote || null }
      : {}),
    ...(parsed.data.observations !== undefined
      ? { observations: parsed.data.observations || null }
      : {}),
    ...(parsed.data.teeth !== undefined ? { teeth: parsed.data.teeth || null } : {}),
    ...(parsed.data.elementsQty !== undefined
      ? { elementsQty: parsed.data.elementsQty ?? null }
      : {}),
    ...(parsed.data.shade !== undefined ? { shade: parsed.data.shade || null } : {}),
    ...(parsed.data.dueDate !== undefined
      ? {
          dueDate: parsed.data.dueDate
            ? new Date(`${parsed.data.dueDate}T00:00:00`)
            : null,
        }
      : {}),
    ...(parsed.data.isUrgent !== undefined ? { isUrgent: parsed.data.isUrgent } : {}),
    ...(parsed.data.currentStatus !== undefined
      ? {
          currentStatus: parsed.data.currentStatus,
          ...(existingCase.currentStatus !== parsed.data.currentStatus
            ? {
                statusHistory: {
                  create: {
                    fromStatus: existingCase.currentStatus,
                    toStatus: parsed.data.currentStatus,
                    note: note || "Case updated via API",
                  },
                },
              }
            : {}),
        }
      : {}),
    ...(componentsProvided
      ? {
          caseComponentUsages: {
            deleteMany: {},
            create: parsedComponents.data.map((component) => ({
              componentId: component.componentId,
              quantity: component.quantity,
              chargeClient: component.chargeClient,
              unitCost: component.unitCost ?? null,
              unitPrice: component.unitPrice ?? null,
              notes: component.notes || null,
            })),
          },
        }
      : {}),
  };

  const updatedCase = await prisma.case.update({
    where: { id },
    data: updateData,
    select: {
      id: true,
      code: true,
      currentStatus: true,
      updatedAt: true,
    },
  });

  return apiSuccess({
    ...updatedCase,
    updatedAt: updatedCase.updatedAt.toISOString(),
  });
}

export async function DELETE(
  _request: Request,
  context: { params: Promise<{ id: string }> },
) {
  const appUser = await getAuthenticatedAppUser();

  if (!appUser) {
    return apiError(401, "UNAUTHORIZED", "Not authenticated.");
  }

  const { id } = await context.params;

  const existingCase = await prisma.case.findUnique({
    where: { id },
    select: {
      id: true,
      cadDesignerId: true,
    },
  });

  if (!existingCase) {
    return apiError(404, "CASE_NOT_FOUND", "Case not found.");
  }

  if (appUser.role === "CAD_DESIGNER" || appUser.role === "PRODUCTION") {
    return apiError(403, "FORBIDDEN", "You cannot delete cases.");
  }

  const protectedAttachmentCount = await prisma.caseAttachment.count({
    where: {
      caseId: id,
      retentionUntil: {
        gt: new Date(),
      },
    },
  });

  if (protectedAttachmentCount > 0) {
    return apiError(
      400,
      "ATTACHMENT_RETENTION_ACTIVE",
      "This case still has files inside the 90-day history window and cannot be deleted yet.",
    );
  }

  await prisma.caseAttachment.deleteMany({
    where: { caseId: id },
  });

  await prisma.case.delete({
    where: { id },
  });

  return apiSuccess({ id, deleted: true });
}
