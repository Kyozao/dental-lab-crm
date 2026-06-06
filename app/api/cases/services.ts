import { prisma } from "@/lib/prisma";
import { Prisma, type cases } from "@/generated/prisma/client";
import type { CreateCaseInput } from "./schemas";

export class MissingLabMembershipError extends Error {
  constructor(userId: string) {
    super(`User ${userId} does not have a dental lab membership.`);
    this.name = "MissingLabMembershipError";
  }
}

const CREATE_CASE_MAX_RETRIES = 3;

type CaseWithRelations = cases & {
  clinics: { id: string; name: string } | null;
  dentists: { id: string; name: string } | null;
  service_types: { id: string; name: string } | null;
  cadDesigner: { id: string; name: string | null } | null;
  createdByUser: { id: string; name: string } | null;
};

const caseInclude = {
  clinics: {
    select: {
      id: true,
      name: true,
    },
  },
  dentists: {
    select: {
      id: true,
      name: true,
    },
  },
  service_types: {
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
  createdByUser: {
    select: {
      id: true,
      name: true,
    },
  },
} satisfies Prisma.casesInclude;

function mapCase(caseItem: CaseWithRelations) {
  return {
    id: caseItem.id,
    dentalLabId: caseItem.dentalLabId,
    code: caseItem.code,
    clientCaseCode: caseItem.clientCaseCode,
    patientName: caseItem.patientName,
    clinicId: caseItem.clinicId,
    clinicName: caseItem.clinics?.name ?? null,
    serviceTypeId: caseItem.serviceTypeId,
    serviceTypeName: caseItem.service_types?.name ?? null,
    dentistId: caseItem.dentistId,
    dentistName: caseItem.dentists?.name ?? null,
    cadDesignerId: caseItem.cadDesignerId,
    cadDesignerName: caseItem.cadDesigner?.name ?? null,
    createdByUserId: caseItem.createdByUserId,
    createdByUserName: caseItem.createdByUser?.name ?? null,
    currentStatus: caseItem.currentStatus,
    teeth: caseItem.teeth,
    elementsQty: caseItem.elementsQty,
    shade: caseItem.shade,
    dueDate: caseItem.dueDate,
    isUrgent: caseItem.isUrgent,
    observations: caseItem.observations,
    pendingNote: caseItem.pendingNote,
    createdAt: caseItem.createdAt,
    updatedAt: caseItem.updatedAt,
  };
}

async function getSingleLabMembership(userId: string) {
  const membership = await prisma.user_lab_memberships.findUnique({
    where: { userId },
    select: { dentalLabId: true },
  });

  if (!membership) {
    throw new MissingLabMembershipError(userId);
  }

  return membership;
}

async function generateNextCaseCode(dentalLabId: string) {
  const [result] = await prisma.$queryRaw<{ maxCode: string | null }[]>`
    SELECT MAX(("code")::numeric)::text AS "maxCode"
    FROM "cases"
    WHERE "dentalLabId" = ${dentalLabId}
      AND "code" ~ '^[0-9]+$'
  `;

  const next = Number(result?.maxCode ?? 0) + 1;
  return String(next).padStart(4, "0");
}

function isCaseCodeCollision(error: unknown) {
  if (
    !(error instanceof Prisma.PrismaClientKnownRequestError) ||
    error.code !== "P2002"
  ) {
    return false;
  }

  const target = error.meta?.target;

  if (Array.isArray(target)) {
    return target.includes("dentalLabId") && target.includes("code");
  }

  return typeof target === "string" && target.includes("code");
}

export async function getCasesForLoggedLab(userId: string) {
  const membership = await getSingleLabMembership(userId);

  const cases = await prisma.cases.findMany({
    where: {
      dentalLabId: membership.dentalLabId,
    },
    include: caseInclude,
    orderBy: {
      createdAt: "desc",
    },
  });

  return cases.map(mapCase);
}

export async function createCaseForLoggedLab(
  userId: string,
  input: CreateCaseInput,
) {
  const membership = await getSingleLabMembership(userId);

  for (let attempt = 1; attempt <= CREATE_CASE_MAX_RETRIES; attempt += 1) {
    const code = await generateNextCaseCode(membership.dentalLabId);

    try {
      const createdCase = await prisma.cases.create({
        data: {
          dentalLabId: membership.dentalLabId,
          code,
          clientCaseCode: input.clientCaseCode,
          patientName: input.patientName,
          clinicId: input.clinicId,
          serviceTypeId: input.serviceTypeId,
          dentistId: input.dentistId,
          cadDesignerId: input.cadDesignerId,
          createdByUserId: userId,
          currentStatus: input.currentStatus,
          teeth: input.teeth,
          elementsQty: input.elementsQty,
          shade: input.shade,
          dueDate: input.dueDate,
          isUrgent: input.isUrgent,
          observations: input.observations,
          pendingNote: input.pendingNote,
        },
        include: caseInclude,
      });

      return mapCase(createdCase);
    } catch (error) {
      if (attempt < CREATE_CASE_MAX_RETRIES && isCaseCodeCollision(error)) {
        continue;
      }

      throw error;
    }
  }

  throw new Error("Failed to create case after retrying case code generation.");
}
