import { getAuthenticatedAppUser } from "@/lib/auth/get-app-user";
import { getCaseFormOptions } from "@/lib/case-data";
import { apiError, apiSuccess } from "@/lib/api/response";
import { prisma } from "@/lib/prisma";

export async function GET() {
  const appUser = await getAuthenticatedAppUser();

  if (!appUser) {
    return apiError(401, "UNAUTHORIZED", "Not authenticated.");
  }

  const [formOptions, blockTypes, millingDrills] = await Promise.all([
    getCaseFormOptions(),
    prisma.blockType.findMany({
      where: { isActive: true },
      orderBy: { name: "asc" },
      select: {
        id: true,
        name: true,
        material: true,
        brand: true,
        size: true,
        shade: true,
        defaultCost: true,
      },
    }),
    prisma.millingDrill.findMany({
      where: { isActive: true },
      orderBy: { name: "asc" },
      select: {
        id: true,
        name: true,
        brand: true,
        type: true,
      },
    }),
  ]);

  return apiSuccess({
    ...formOptions,
    blockTypes: blockTypes.map((item) => ({
      ...item,
      defaultCost: item.defaultCost?.toString() ?? null,
    })),
    millingDrills,
  });
}
