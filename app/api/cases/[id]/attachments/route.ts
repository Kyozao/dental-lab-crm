import { apiError, apiSuccess } from "@/lib/api/response";
import { addAttachment } from "@/lib/mock-data/store";

const VALID_ATTACHMENT_KINDS = [
  "SCAN_INPUT",
  "DESIGN_OUTPUT",
  "MODEL_OUTPUT",
  "OTHER",
] as const;

type AttachmentKind = (typeof VALID_ATTACHMENT_KINDS)[number];

function isAttachmentKind(value: string): value is AttachmentKind {
  return VALID_ATTACHMENT_KINDS.includes(value as AttachmentKind);
}

export async function POST(
  request: Request,
  context: { params: Promise<{ id: string }> },
) {
  const { id } = await context.params;
  const formData = await request.formData();
  const file = formData.get("file");
  const kindRaw = String(formData.get("kind") ?? "OTHER");

  if (!(file instanceof File)) {
    return apiError(400, "MISSING_FILE", "Missing file.");
  }

  if (!isAttachmentKind(kindRaw)) {
    return apiError(400, "INVALID_ATTACHMENT_TYPE", "Invalid attachment type.");
  }

  const attachment = addAttachment(id, file, kindRaw);

  if (!attachment) {
    return apiError(404, "CASE_NOT_FOUND", "Case not found.");
  }

  return apiSuccess(attachment, { status: 201 });
}
