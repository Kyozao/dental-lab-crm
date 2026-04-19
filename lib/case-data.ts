import { cache } from "react";
import type { UserRole } from "@/app/generated/prisma/client";
import type {
  CadDesignerOption,
  ClinicOption,
  ComponentOption,
  SearchCaseItem,
  ServiceTypeOption,
} from "@/app/cases/case.shared";
import { prisma } from "@/lib/prisma";

export const getCaseFormOptions = cache(
  async (): Promise<{
    clinics: ClinicOption[];
    serviceTypes: ServiceTypeOption[];
    cadDesigners: CadDesignerOption[];
    components: ComponentOption[];
  }> => {
    const [clinics, serviceTypes, cadDesigners, components] =
      await Promise.all([
        prisma.clinic.findMany({
          orderBy: { name: "asc" },
          include: {
            dentists: {
              orderBy: { name: "asc" },
              select: {
                id: true,
                name: true,
              },
            },
          },
        }),
        prisma.serviceType.findMany({
          where: { isActive: true },
          orderBy: { name: "asc" },
          select: {
            id: true,
            name: true,
          },
        }),
        prisma.user.findMany({
          where: {
            role: "CAD_DESIGNER",
            isActive: true,
          },
          orderBy: { name: "asc" },
          select: {
            id: true,
            name: true,
          },
        }),
        prisma.component.findMany({
          where: {
            isActive: true,
          },
          orderBy: { name: "asc" },
          select: {
            id: true,
            name: true,
            category: true,
            brand: true,
            defaultCost: true,
            defaultPrice: true,
          },
        }),
      ]);

    return {
      clinics,
      serviceTypes,
      cadDesigners,
      components: components.map(
        (component): ComponentOption => ({
          id: component.id,
          name: component.name,
          category: component.category,
          brand: component.brand,
          defaultCost: component.defaultCost?.toString() ?? null,
          defaultPrice: component.defaultPrice?.toString() ?? null,
        }),
      ),
    };
  },
);

export const getNavCaseSearchItems = cache(
  async (userId: string, role: UserRole): Promise<SearchCaseItem[]> => {
    const cases = await prisma.case.findMany({
      where: role === "CAD_DESIGNER" ? { cadDesignerId: userId } : {},
      orderBy: { updatedAt: "desc" },
      select: {
        id: true,
        code: true,
        patientName: true,
        currentStatus: true,
        clinic: {
          select: {
            name: true,
          },
        },
      },
    });

    return cases.map((caseItem) => ({
      id: caseItem.id,
      code: caseItem.code ?? "",
      patientName: caseItem.patientName ?? "Sem nome",
      caseScope: "LAB",
      currentStatus: caseItem.currentStatus,
      clinicName: caseItem.clinic?.name ?? "",
    }));
  },
);
