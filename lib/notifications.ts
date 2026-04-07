import { prisma } from "@/lib/prisma";
import type {
  AttachmentKind,
  CaseStatus,
  NotificationType,
  UserRole,
  Prisma,
} from "@/app/generated/prisma/client";

async function createNotifications({
  recipientIds,
  caseId,
  type,
  title,
  message,
  payload,
}: {
  recipientIds: string[];
  caseId?: string | null;
  type: NotificationType;
  title: string;
  message: string;
  payload?: Prisma.InputJsonValue;
}) {
  const uniqueRecipientIds = [...new Set(recipientIds.filter(Boolean))];

  if (!uniqueRecipientIds.length) {
    return;
  }

  await prisma.notification.createMany({
    data: uniqueRecipientIds.map((recipientUserId) => ({
      recipientUserId,
      caseId: caseId ?? null,
      type,
      title,
      message,
      payload,
    })),
  });
}

export async function notifyCaseAssignment({
  recipientUserId,
  caseId,
  caseCode,
  patientName,
  assignedByName,
}: {
  recipientUserId?: string | null;
  caseId: string;
  caseCode: string;
  patientName: string;
  assignedByName?: string | null;
}) {
  if (!recipientUserId) {
    return;
  }

  await createNotifications({
    recipientIds: [recipientUserId],
    caseId,
    type: "CASE_ASSIGNED",
    title: "Novo caso atribuído",
    message: `${caseCode || patientName} foi atribuído para você${assignedByName ? ` por ${assignedByName}` : ""}.`,
    payload: {
      caseId,
      caseCode,
      patientName,
    },
  });
}

export async function notifyCaseFileUpload({
  caseId,
  fileName,
  kind,
  uploadedById,
  uploadedByName,
}: {
  caseId: string;
  fileName: string;
  kind: AttachmentKind;
  uploadedById?: string | null;
  uploadedByName?: string | null;
}) {
  const caseItem = await prisma.case.findUnique({
    where: { id: caseId },
    select: {
      id: true,
      code: true,
      patientName: true,
      cadDesignerId: true,
      createdByUserId: true,
    },
  });

  if (!caseItem) {
    return;
  }

  const recipientIds = new Set<string>();
  let type: NotificationType = "SCAN_UPLOADED";
  let title = "Novo scan disponível";
  let message = `${uploadedByName ?? "Um usuário"} enviou ${fileName} para o caso ${caseItem.code || caseItem.patientName}.`;

  if (kind === "SCAN_INPUT") {
    if (caseItem.cadDesignerId) {
      recipientIds.add(caseItem.cadDesignerId);
    }
  } else {
    type = "DESIGN_UPLOADED";
    title = kind === "MODEL_OUTPUT" ? "Modelos enviados" : "Design enviado";
    message = `${uploadedByName ?? "Um usuário"} enviou arquivo(s) finais para o caso ${caseItem.code || caseItem.patientName}.`;

    if (caseItem.createdByUserId) {
      recipientIds.add(caseItem.createdByUserId);
    }

    const staffRoles: UserRole[] = ["ADMIN", "MANAGER", "PRODUCTION"];
    const staffUsers = await prisma.user.findMany({
      where: {
        role: { in: staffRoles },
        isActive: true,
      },
      select: { id: true },
    });

    for (const user of staffUsers) {
      recipientIds.add(user.id);
    }
  }

  if (uploadedById) {
    recipientIds.delete(uploadedById);
  }

  await createNotifications({
    recipientIds: [...recipientIds],
    caseId,
    type,
    title,
    message,
    payload: {
      caseId,
      caseCode: caseItem.code,
      patientName: caseItem.patientName,
      fileName,
      kind,
    },
  });
}

export async function notifyCaseStatusChange({
  caseId,
  toStatus,
  changedByUserId,
}: {
  caseId: string;
  toStatus: CaseStatus;
  changedByUserId?: string | null;
}) {
  const caseItem = await prisma.case.findUnique({
    where: { id: caseId },
    select: {
      id: true,
      code: true,
      patientName: true,
      cadDesignerId: true,
      createdByUserId: true,
    },
  });

  if (!caseItem) {
    return;
  }

  const recipients = new Set<string>();

  if (toStatus === "DESIGN_READY" || toStatus === "DONE") {
    if (caseItem.createdByUserId) {
      recipients.add(caseItem.createdByUserId);
    }
  }

  if (toStatus === "WAITING_INFO" && caseItem.cadDesignerId) {
    recipients.add(caseItem.cadDesignerId);
  }

  if (changedByUserId) {
    recipients.delete(changedByUserId);
  }

  await createNotifications({
    recipientIds: [...recipients],
    caseId,
    type: "CASE_STATUS_CHANGED",
    title: "Status do caso atualizado",
    message: `${caseItem.code || caseItem.patientName} mudou para ${toStatus}.`,
    payload: {
      caseId,
      toStatus,
    },
  });
}
