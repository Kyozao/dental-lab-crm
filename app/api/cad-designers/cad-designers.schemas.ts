import { optionalString } from "../_shared/reference-resource";

export type CadDesignerInput = {
  name?: string | null;
  email?: string | null;
  is_active?: unknown;
};

type ValidationResult =
  | { success: true; data: CadDesignerInput }
  | { success: false; errors: Record<string, string[]> };

function parseCadDesignerInput(
  payload: Record<string, unknown>,
  options: { requireName: boolean; requireEmail: boolean },
): ValidationResult {
  const errors: Record<string, string[]> = {};
  const name = optionalString(payload.name);
  const email = optionalString(payload.email);

  if (options.requireName && !name) {
    errors.name = ["This field is required."];
  }

  if (options.requireEmail && !email) {
    errors.email = ["This field is required."];
  }

  if (Object.keys(errors).length > 0) {
    return { success: false, errors };
  }

  return {
    success: true,
    data: {
      name,
      email,
      is_active: payload.is_active,
    },
  };
}

export function parseCreateCadDesignerInput(payload: Record<string, unknown>) {
  return parseCadDesignerInput(payload, {
    requireName: true,
    requireEmail: true,
  });
}

export function parseUpdateCadDesignerInput(payload: Record<string, unknown>) {
  return parseCadDesignerInput(payload, {
    requireName: false,
    requireEmail: false,
  });
}
