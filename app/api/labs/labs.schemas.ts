type CreateLabInput = {
  name: string;
};

type ValidationResult =
  | { success: true; data: CreateLabInput }
  | { success: false; errors: Record<string, string[]> };

function requiredString(value: unknown) {
  return typeof value === "string" ? value.trim() : "";
}

export function parseCreateLabInput(
  payload: Record<string, unknown>,
): ValidationResult {
  const name = requiredString(payload.name);

  if (!name) {
    return {
      success: false,
      errors: { name: ["This field is required."] },
    };
  }

  if (name.length > 120) {
    return {
      success: false,
      errors: { name: ["Use 120 characters or fewer."] },
    };
  }

  return {
    success: true,
    data: { name },
  };
}
