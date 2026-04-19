import { apiError, apiSuccess } from "@/lib/api/response";
import { requireAppUser, requireStaffUser } from "@/lib/api/auth";
import { prisma } from "@/lib/prisma";
import { createMillingSchema } from "@/lib/validators/production";

export async function GET(request: Request) {
  const { appUser, errorResponse } = await requireAppUser();

  if (errorResponse || !appUser) {
    return errorResponse;
  }

  const staffError = requireStaffUser(appUser.role);

  if (staffError) {
    return staffError;
  }

  const { searchParams } = new URL(request.url);
  const date = searchParams.get("date");
  const team = searchParams.get("team");

  const items = await prisma.case.findMany({
    where: {
      currentStatus: {
        in: ["DESIGN_READY", "MILLING_PRINTING", "DONE"],
      },
      ...(date
        ? {
            dueDate: {
              gte: new Date(`${date}T00:00:00`),
              lt: new Date(`${date}T23:59:59.999`),
            },
          }
        : {}),
    },
    orderBy: [{ isUrgent: "desc" }, { dueDate: "asc" }, { updatedAt: "desc" }],
    select: {
      id: true,
      code: true,
      patientName: true,
      currentStatus: true,
      dueDate: true,
      isUrgent: true,
      clinic: {
        select: {
          name: true,
        },
      },
      cadDesigner: {
        select: {
          name: true,
        },
      },
      millings: {
        orderBy: { milledAt: "desc" },
        take: 1,
        select: {
          status: true,
          milledAt: true,
          blockType: {
            select: {
              name: true,
            },
          },
          fineMillingDrill: {
            select: {
              name: true,
            },
          },
          coarseMillingDrill: {
            select: {
              name: true,
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

  return apiSuccess(
    items.map((item) => ({
      id: item.id,
      caseCode: item.code,
      patientName: item.patientName,
      clinicName: item.clinic?.name ?? null,
      currentStatus: item.currentStatus,
      dueDate: item.dueDate?.toISOString() ?? null,
      isUrgent: item.isUrgent,
      cadDesignerName: item.cadDesigner?.name ?? null,
      latestMillingStatus: item.millings[0]?.status ?? null,
      latestMilledAt: item.millings[0]?.milledAt.toISOString() ?? null,
      blockTypeName: item.millings[0]?.blockType.name ?? null,
      fineMillingDrillName: item.millings[0]?.fineMillingDrill?.name ?? null,
      coarseMillingDrillName: item.millings[0]?.coarseMillingDrill?.name ?? null,
      millingDrillName:
        item.millings[0]?.fineMillingDrill?.name ??
        item.millings[0]?.coarseMillingDrill?.name ??
        item.millings[0]?.millingDrill?.name ??
        null,
    })),
    {
      meta: {
        count: items.length,
        filters: {
          date,
          team,
        },
      },
    },
  );
}

export async function POST(request: Request) {
  const { appUser, errorResponse } = await requireAppUser();

  if (errorResponse || !appUser) {
    return errorResponse;
  }

  const staffError = requireStaffUser(appUser.role);

  if (staffError) {
    return staffError;
  }

  let payload: unknown;

  try {
    payload = await request.json();
  } catch {
    return apiError(400, "INVALID_JSON", "Request body must be valid JSON.");
  }

  const parsed = createMillingSchema.safeParse(payload);

  if (!parsed.success) {
    return apiError(400, "VALIDATION_ERROR", "Invalid milling payload.", {
      fields: parsed.error.flatten().fieldErrors,
    });
  }

  const milling = await prisma.caseMilling.create({
    data: {
      caseId: parsed.data.caseId,
      blockTypeId: parsed.data.blockTypeId,
      millingDrillId: parsed.data.millingDrillId,
      fineMillingDrillId:
        parsed.data.fineMillingDrillId ?? parsed.data.millingDrillId ?? null,
      coarseMillingDrillId: parsed.data.coarseMillingDrillId ?? null,
      teethMilledQty: parsed.data.teethMilledQty,
      status: parsed.data.status,
      failureReason: parsed.data.failureReason,
      notes: parsed.data.notes,
      milledAt: new Date(parsed.data.milledAt),
    },
    include: {
      case: { select: { id: true, code: true } },
      blockType: { select: { id: true, name: true } },
      millingDrill: { select: { id: true, name: true } },
      fineMillingDrill: { select: { id: true, name: true, type: true } },
      coarseMillingDrill: { select: { id: true, name: true, type: true } },
    },
  });

  return apiSuccess(milling, { status: 201 });
}
