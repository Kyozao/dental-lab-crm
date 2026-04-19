import { AttachmentKind } from "@/app/generated/prisma/client";
import { getAuthenticatedAppUser } from "@/lib/auth/get-app-user";
import { apiError, apiSuccess } from "@/lib/api/response";
import { prisma } from "@/lib/prisma";
import { createClient } from "@/lib/supabase/server";

type DownloadKind = AttachmentKind | "ALL" | "FINAL_OUTPUTS";

export async function POST(request: Request) {
  const appUser = await getAuthenticatedAppUser();

  if (!appUser) {
    return apiError(401, "UNAUTHORIZED", "Not authenticated.");
  }

  let payload: { caseIds?: string[]; kind?: DownloadKind };

  try {
    payload = (await request.json()) as { caseIds?: string[]; kind?: DownloadKind };
  } catch {
    return apiError(400, "INVALID_JSON", "Request body must be valid JSON.");
  }

  const caseIds = Array.isArray(payload.caseIds) ? payload.caseIds : [];
  const kind = payload.kind ?? "ALL";

  const uniqueCaseIds = [...new Set(caseIds.filter(Boolean))];

  if (!uniqueCaseIds.length) {
    return apiSuccess([]);
  }

  const allowedCases = await prisma.case.findMany({
    where: {
      id: { in: uniqueCaseIds },
      ...(appUser.role === "CAD_DESIGNER" ? { cadDesignerId: appUser.id } : {}),
    },
    select: { id: true },
  });

  if (allowedCases.length !== uniqueCaseIds.length) {
    return apiError(403, "FORBIDDEN", "Unauthorized.");
  }

  const attachments = await prisma.caseAttachment.findMany({
    where: {
      caseId: { in: uniqueCaseIds },
      ...(kind === "FINAL_OUTPUTS"
        ? { kind: { in: ["DESIGN_OUTPUT", "MODEL_OUTPUT"] } }
        : kind !== "ALL"
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

  return apiSuccess(signedDownloads.filter((item): item is NonNullable<typeof item> => Boolean(item)));
}
