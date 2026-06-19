import { optionalString } from "../_shared/reference-resource";

export type DentistInput = {
  customer_id?: string | null;
  name?: string | null;
  phone?: string | null;
  email?: string | null;
  notes?: string | null;
  is_active?: unknown;
};

export type DentistListQuery = {
  customer_id?: string;
};

type ValidationResult =
  | { success: true; data: DentistInput }
  | { success: false; errors: Record<string, string[]> };

function parseDentistInput(
  payload: Record<string, unknown>,
  options: { requireName: boolean; requireCustomerId: boolean },
): ValidationResult {
  const name = optionalString(payload.name);
  const customer_id = optionalString(payload.customer_id);
  const errors: Record<string, string[]> = {};

  if (options.requireCustomerId && !customer_id) {
    errors.customer_id = ["Customer is required."];
  }

  if (options.requireName && !name) {
    errors.name = ["This field is required."];
  }

  if (Object.keys(errors).length > 0) {
    return {
      success: false,
      errors,
    };
  }

  return {
    success: true,
    data: {
      customer_id,
      name,
      phone: optionalString(payload.phone),
      email: optionalString(payload.email),
      notes: optionalString(payload.notes),
      is_active: payload.is_active,
    },
  };
}

export function parseDentistListQuery(searchParams: URLSearchParams) {
  return {
    customer_id: optionalString(searchParams.get("customer_id")) ?? undefined,
  } satisfies DentistListQuery;
}

export function parseCreateDentistInput(payload: Record<string, unknown>) {
  return parseDentistInput(payload, {
    requireName: true,
    requireCustomerId: true,
  });
}

export function parseUpdateDentistInput(payload: Record<string, unknown>) {
  return parseDentistInput(payload, {
    requireName: false,
    requireCustomerId: false,
  });
}
