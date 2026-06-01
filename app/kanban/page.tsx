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
      // Optimized query: only fetch essential kanban columns, not nested relationships
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
          // Removed: caseComponentUsages, caseAttachments, millings
          // These will be loaded on-demand when a case detail is opened
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
        attachments: [], // Load on-demand when case is opened
        components: [], // Load on-demand when case is opened
        millings: [], // Load on-demand when case is opened
      }))}
      designers={cadDesigners}
      clinics={clinics}
      serviceTypes={serviceTypes}
      components={components}
    />
  );
}
