import { redirect } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { getAuthenticatedAppUser } from "@/lib/auth/get-app-user";
import { getCaseFormOptions } from "@/lib/case-data";
import { KanbanBoardWrapper } from "./components/kanban-board-wrapper";

export default async function KanbanPage() {
  const appUser = await getAuthenticatedAppUser();

  if (!appUser) {
    redirect("/login");
  }

  const [cases, { cadDesigners, clinics, serviceTypes, components }] =
    await Promise.all([
      prisma.case.findMany({
        where: {
          ...(appUser.role === "CAD_DESIGNER"
            ? { cadDesignerId: appUser.id }
            : {}),
          currentStatus: { not: "DONE" },
        },
        orderBy: { updatedAt: "desc" },
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
              createdAt: true,
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
      }),
      getCaseFormOptions(),
    ]);

  return (
    <KanbanBoardWrapper
      currentUser={{
        id: appUser.id,
        name: appUser.name ?? "Usuário",
        role: appUser.role,
      }}
      initialCases={cases.map((c) => ({
        id: c.id,
        code: c.code ?? "",
        patientName: c.patientName ?? "Sem nome",
        currentStatus: c.currentStatus,
        teeth: c.teeth ?? "",
        elementsQty: c.elementsQty ?? null,
        shade: c.shade ?? "",
        dueDate: c.dueDate ? c.dueDate.toISOString() : null,
        observations: c.observations ?? "",
        pendingNote: c.pendingNote ?? "",
        isUrgent: c.isUrgent,
        createdAt: c.createdAt.toISOString(),
        updatedAt: c.updatedAt.toISOString(),
        clinicName: c.clinic?.name ?? "",
        clinicId: c.clinicId ?? null,
        dentistName: c.dentist?.name ?? "",
        dentistId: c.dentistId ?? null,
        serviceTypeId: c.serviceTypeId ?? null,
        serviceTypeName: c.serviceType?.name ?? "",
        cadDesignerId: c.cadDesignerId ?? null,
        cadDesignerName: c.cadDesigner?.name ?? "",
        attachments: c.caseAttachments.map((a) => ({
          id: a.id,
          fileName: a.fileName,
          filePath: a.filePath,
          fileType: a.fileType ?? null,
          fileSize: a.fileSize ?? null,
          createdAt: a.createdAt.toISOString(),
          uploadedByName: null,
        })),
        components: c.caseComponentUsages.map((usage) => ({
          id: usage.id,
          componentId: usage.componentId,
          componentName: usage.component.name,
          quantity: usage.quantity,
          chargeClient: usage.chargeClient,
          unitCost: usage.unitCost?.toString() ?? null,
          unitPrice: usage.unitPrice?.toString() ?? null,
          notes: usage.notes,
        })),
        millings: c.millings.map((milling) => ({
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
      }))}
      designers={cadDesigners}
      clinics={clinics}
      serviceTypes={serviceTypes}
      components={components}
    />
  );
}
