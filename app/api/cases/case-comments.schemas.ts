export type CreateCaseCommentInput = {
  body: string;
};

type ValidationResult =
  | { success: true; data: CreateCaseCommentInput }
  | { success: false; errors: Record<string, string[]> };

const MAX_COMMENT_LENGTH = 4000;

export function parseCreateCaseCommentInput(payload: unknown): ValidationResult {
  if (!payload || typeof payload !== "object" || Array.isArray(payload)) {
    return {
      success: false,
      errors: { body: ["Request body must be a JSON object."] },
    };
  }

  const rawBody = (payload as Record<string, unknown>).body;
  const body = typeof rawBody === "string" ? rawBody.trim() : "";

  if (!body) {
    return {
      success: false,
      errors: { body: ["Comment is required."] },
    };
  }

  if (body.length > MAX_COMMENT_LENGTH) {
    return {
      success: false,
      errors: { body: [`Comment must be ${MAX_COMMENT_LENGTH} characters or less.`] },
    };
  }

  return {
    success: true,
    data: { body },
  };
}
