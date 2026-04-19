import { getAuthenticatedAppUser } from "@/lib/auth/get-app-user";
import { apiError, apiSuccess } from "@/lib/api/response";
import { prisma } from "@/lib/prisma";
import { createClient } from "@/lib/supabase/server";

export async function DELETE(
  _request: Request,
  context: { params: Promise<{ id: string; attachmentId: string }> },
) {
  const appUser = await getAuthenticatedAppUser();

  if (!appUser) {
    return apiError(401, "UNAUTHORIZED", "Not authenticated.");
  }

  const { id: caseId, attachmentId } = await context.params;

  const attachment = await prisma.caseAttachment.findUnique({
    where: { id: attachmentId },
    select: {
      id: true,
      filePath: true,
      caseId: true,
      case: {
        select: {
          cadDesignerId: true,
        },
      },
    },
  });

  if (!attachment || attachment.caseId !== caseId) {
    return apiError(404, "ATTACHMENT_NOT_FOUND", "File not found.");
  }

  if (
    appUser.role === "CAD_DESIGNER" &&
    attachment.case.cadDesignerId !== appUser.id
  ) {
    return apiError(403, "FORBIDDEN", "Unauthorized.");
  }

  const supabase = await createClient();
  const { error } = await supabase.storage
    .from("case-files")
    .remove([attachment.filePath]);

  if (error) {
    return apiError(500, "STORAGE_DELETE_FAILED", error.message);
  }

  await prisma.caseAttachment.delete({
    where: { id: attachmentId },
  });

  return apiSuccess({ id: attachmentId, deleted: true });
}
