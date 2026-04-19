import { AttachmentKind } from "@/app/generated/prisma/client";
import { getAuthenticatedAppUser } from "@/lib/auth/get-app-user";
import { apiError, apiSuccess } from "@/lib/api/response";
import { prisma } from "@/lib/prisma";
import { createClient } from "@/lib/supabase/server";

const MAX_UPLOAD_SIZE = 100 * 1024 * 1024;

const VALID_ATTACHMENT_KINDS: ReadonlyArray<AttachmentKind> = [
  "SCAN_INPUT",
  "DESIGN_OUTPUT",
  "MODEL_OUTPUT",
  "OTHER",
];

function isValidAttachmentKind(kind: string): kind is AttachmentKind {
  return VALID_ATTACHMENT_KINDS.includes(kind as AttachmentKind);
}

export async function POST(
  request: Request,
  context: { params: Promise<{ id: string }> },
) {
  const appUser = await getAuthenticatedAppUser();

  if (!appUser) {
    return apiError(401, "UNAUTHORIZED", "Not authenticated.");
  }

  const { id: caseId } = await context.params;

  const formData = await request.formData();
  const file = formData.get("file");
  const kindRaw = String(formData.get("kind") ?? "OTHER").trim();

  if (!(file instanceof File)) {
    return apiError(400, "MISSING_FILE", "Missing file.");
  }

  if (!file.size) {
    return apiError(400, "EMPTY_FILE", "Empty file.");
  }

  if (file.size > MAX_UPLOAD_SIZE) {
    return apiError(400, "FILE_TOO_LARGE", "File too large. Limit is 100 MB per file.");
  }

  if (!isValidAttachmentKind(kindRaw)) {
    return apiError(400, "INVALID_ATTACHMENT_TYPE", "Invalid attachment type.");
  }

  const isArchiveUpload =
    kindRaw === "SCAN_INPUT" ||
    kindRaw === "DESIGN_OUTPUT" ||
    kindRaw === "MODEL_OUTPUT";
  const allowedExtensions = isArchiveUpload
    ? [".zip", ".rar", ".7z"]
    : [
        ".html",
        ".htm",
        ".zip",
        ".pdf",
        ".png",
        ".jpg",
        ".jpeg",
        ".webp",
        ".stl",
        ".obj",
        ".ply",
        ".rar",
        ".7z",
      ];
  const lowerName = file.name.toLowerCase();

  if (!allowedExtensions.some((ext) => lowerName.endsWith(ext))) {
    return apiError(
      400,
      "INVALID_FILE_TYPE",
      isArchiveUpload
        ? "Use a .zip, .rar, or .7z archive for scans and final deliveries."
        : "Unsupported file type.",
    );
  }

  const existingCase = await prisma.case.findUnique({
    where: { id: caseId },
    select: { id: true, cadDesignerId: true },
  });

  if (!existingCase) {
    return apiError(404, "CASE_NOT_FOUND", "Case not found.");
  }

  if (
    appUser.role === "CAD_DESIGNER" &&
    existingCase.cadDesignerId !== appUser.id
  ) {
    return apiError(403, "FORBIDDEN", "Unauthorized.");
  }

  if (appUser.role === "CAD_DESIGNER" && kindRaw === "SCAN_INPUT") {
    return apiError(
      403,
      "FORBIDDEN",
      "CAD designers can only upload the final archive.",
    );
  }

  const supabase = await createClient();
  const bytes = await file.arrayBuffer();
  const buffer = Buffer.from(bytes);

  const safeName = file.name.replace(/[^a-zA-Z0-9._-]/g, "_");
  const storageFolder = kindRaw.toLowerCase();
  const filePath = `${caseId}/${storageFolder}/${Date.now()}-${safeName}`;

  const { error: uploadError } = await supabase.storage
    .from("case-files")
    .upload(filePath, buffer, {
      contentType: file.type || "application/octet-stream",
      upsert: false,
    });

  if (uploadError) {
    return apiError(500, "UPLOAD_FAILED", uploadError.message);
  }

  const attachment = await prisma.caseAttachment.create({
    data: {
      caseId,
      fileName: file.name,
      filePath,
      fileType: file.type || null,
      fileSize: file.size,
      kind: kindRaw,
      retentionUntil: new Date(Date.now() + 90 * 24 * 60 * 60 * 1000),
      uploadedById: appUser.id,
    },
    select: {
      id: true,
      fileName: true,
      filePath: true,
      fileType: true,
      fileSize: true,
      kind: true,
      retentionUntil: true,
      createdAt: true,
    },
  });

  return apiSuccess(
    {
      ...attachment,
      retentionUntil: attachment.retentionUntil?.toISOString() ?? null,
      createdAt: attachment.createdAt.toISOString(),
    },
    { status: 201 },
  );
}
