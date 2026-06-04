import { apiError, apiSuccess } from "@/lib/api/response";
import { deleteAttachment } from "@/lib/mock-data/store";

export async function DELETE(
  _request: Request,
  context: { params: Promise<{ id: string; attachmentId: string }> },
) {
  const { id, attachmentId } = await context.params;

  if (!deleteAttachment(id, attachmentId)) {
    return apiError(404, "ATTACHMENT_NOT_FOUND", "File not found.");
  }

  return apiSuccess({ id: attachmentId, deleted: true });
}
