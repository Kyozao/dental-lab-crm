import { optionalString } from "../_shared/reference-resource";

export type ProcessInput = {
  name?: string | null;
  description?: string | null;
  is_active?: unknown;
};

type ValidationResult =
  | { success: true; data: ProcessInput }
  | { success: false; errors: Record<string, string[]> };

function parseProcessInput(
  payload: Record<string, unknown>,
  options: { requireName: boolean },
): ValidationResult {
  const name = optionalString(payload.name);

  if (options.requireName && !name) {
    return {
      success: false,
      errors: { name: ["This field is required."] },
    };
  }

  return {
    success: true,
    data: {
      name,
      description: optionalString(payload.description),
      is_active: payload.is_active,
    },
  };
}

export function parseCreateProcessInput(payload: Record<string, unknown>) {
  return parseProcessInput(payload, { requireName: true });
}

export function parseUpdateProcessInput(payload: Record<string, unknown>) {
  return parseProcessInput(payload, { requireName: false });
}
