import { prisma } from "@/lib/prisma";
import { getAuthenticatedAppUser } from "@/lib/auth/get-app-user";
import { getCaseFormOptions } from "@/lib/case-data";
import { redirect } from "next/navigation";
import { Badge } from "@/components/ui/badge";

import { EditCaseDialog } from "./components/edit-case-dialog";
import { AddCaseDialog } from "./components/add-case-dialog";

export default async function CasesPage() {
  const appUser = await getAuthenticatedAppUser();

  if (!appUser) {
    redirect("/login");
  }

  const [cases, { clinics, serviceTypes, cadDesigners, components }] =
    await Promise.all([
      prisma.case.findMany({
        orderBy: { createdAt: "desc" },
        include: {
          clinic: true,
          dentist: true,
          serviceType: true,
          cadDesigner: true,
          caseComponentUsages: {
            orderBy: { createdAt: "asc" },
            include: {
              component: {
                select: {
                  name: true,
                },
              },
            },
          },
          caseAttachments: {
            orderBy: { createdAt: "desc" },
            include: {
              uploadedBy: {
                select: {
                  name: true,
                },
              },
            },
          },
          millings: {
            orderBy: { milledAt: "desc" },
            include: {
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
    <main className="mx-auto w-full max-w-7xl space-y-6 px-4 py-6 sm:px-6 sm:py-8">
      <div className="space-y-2">
        <h1 className="text-3xl font-bold">Cases</h1>
        <p className="text-muted-foreground">Manage all dental lab cases</p>
      </div>

      <div className="mb-6">
        <AddCaseDialog
          clinics={clinics}
          serviceTypes={serviceTypes}
          cadDesigners={cadDesigners}
          components={components}
          currentUserRole={appUser.role}
        />
      </div>

      <div className="rounded-lg border border-border/40 bg-card shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full min-w-[900px] text-sm">
            <thead>
              <tr className="border-b border-border/40 bg-muted/50">
                <th className="px-6 py-4 text-left font-semibold">Code</th>
                <th className="px-6 py-4 text-left font-semibold">Patient</th>
                <th className="px-6 py-4 text-left font-semibold">Clinic</th>
                <th className="px-6 py-4 text-left font-semibold">Dentist</th>
                <th className="px-6 py-4 text-left font-semibold">Service</th>
                <th className="px-6 py-4 text-left font-semibold">
                  CAD Designer
                </th>
                <th className="px-6 py-4 text-left font-semibold">Status</th>
                <th className="px-6 py-4 text-left font-semibold">Urgent</th>
                <th className="px-6 py-4 text-right font-semibold">Actions</th>
              </tr>
            </thead>
            <tbody>
              {cases.map((item) => {
                const editableCase = {
                  id: item.id,
                  code: item.code ?? "",
                  patientName: item.patientName ?? "Sem nome",
                  currentStatus: item.currentStatus,
                  teeth: item.teeth ?? "",
                  elementsQty: item.elementsQty ?? null,
                  shade: item.shade ?? "",
                  dueDate: item.dueDate ? item.dueDate.toISOString() : null,
                  observations: item.observations ?? "",
                  pendingNote: item.pendingNote ?? "",
                  isUrgent: item.isUrgent,
                  createdAt: item.createdAt.toISOString(),
                  updatedAt: item.updatedAt.toISOString(),
                  clinicName: item.clinic?.name ?? "",
                  clinicId: item.clinicId ?? null,
                  dentistName: item.dentist?.name ?? "",
                  dentistId: item.dentistId ?? null,
                  serviceTypeId: item.serviceTypeId ?? null,
                  serviceTypeName: item.serviceType?.name ?? "",
                  cadDesignerId: item.cadDesignerId ?? null,
                  cadDesignerName: item.cadDesigner?.name ?? "",
                  attachments: item.caseAttachments.map((attachment) => ({
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
                  components: item.caseComponentUsages.map((usage) => ({
                    id: usage.id,
                    componentId: usage.componentId,
                    componentName: usage.component.name,
                    quantity: usage.quantity,
                    chargeClient: usage.chargeClient,
                    unitCost: usage.unitCost?.toString() ?? null,
                    unitPrice: usage.unitPrice?.toString() ?? null,
                    notes: usage.notes,
                  })),
                  millings: item.millings.map((milling) => ({
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

                const statusColors: Record<string, string> = {
                  ENTRY: "bg-slate-100 text-slate-900",
                  WAITING_INFO: "bg-yellow-100 text-yellow-900",
                  DESIGNING: "bg-blue-100 text-blue-900",
                  WAITING_APPROVAL: "bg-purple-100 text-purple-900",
                  DESIGN_READY: "bg-green-100 text-green-900",
                  MILLING_PRINTING: "bg-orange-100 text-orange-900",
                  DONE: "bg-emerald-100 text-emerald-900",
                };

                return (
                  <tr
                    key={item.id}
                    className="border-b border-border/40 hover:bg-muted/50 transition-colors"
                  >
                    <td className="px-6 py-4 font-medium text-foreground">
                      {item.code}
                    </td>
                    <td className="px-6 py-4 text-foreground">
                      {item.patientName}
                    </td>
                    <td className="px-6 py-4 text-muted-foreground">
                      {item.clinic?.name ?? "-"}
                    </td>
                    <td className="px-6 py-4 text-muted-foreground">
                      {item.dentist?.name ?? "-"}
                    </td>
                    <td className="px-6 py-4 text-muted-foreground">
                      {item.serviceType?.name ?? "-"}
                    </td>
                    <td className="px-6 py-4 text-muted-foreground">
                      {item.cadDesigner?.name ?? "-"}
                    </td>
                    <td className="px-6 py-4">
                      <Badge
                        className={`font-semibold ${
                          statusColors[item.currentStatus] ||
                          "bg-gray-100 text-gray-900"
                        }`}
                        variant="secondary"
                      >
                        {item.currentStatus.replace(/_/g, " ")}
                      </Badge>
                    </td>
                    <td className="px-6 py-4">
                      {item.isUrgent && (
                        <Badge variant="destructive">Urgent</Badge>
                      )}
                    </td>
                    <td className="px-6 py-4 text-right">
                      <EditCaseDialog
                        caseItem={editableCase}
                        clinics={clinics}
                        serviceTypes={serviceTypes}
                        cadDesigners={cadDesigners}
                        components={components}
                        currentUserRole={appUser.role}
                      />
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
        {cases.length === 0 && (
          <div className="px-6 py-12 text-center">
            <p className="text-muted-foreground">
              No cases found. Create one to get started.
            </p>
          </div>
        )}
      </div>
    </main>
  );
}
