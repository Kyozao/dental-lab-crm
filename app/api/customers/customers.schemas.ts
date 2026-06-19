import { optionalString } from "../_shared/reference-resource";

export type CustomerInput = {
  name?: string | null;
  phone?: string | null;
  email?: string | null;
  notes?: string | null;
  price_table_id?: string | null;
  is_active?: unknown;
};

type ValidationResult =
  | { success: true; data: CustomerInput }
  | { success: false; errors: Record<string, string[]> };

function parseCustomerInput(
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
      phone: optionalString(payload.phone),
      email: optionalString(payload.email),
      notes: optionalString(payload.notes),
      price_table_id:
        payload.price_table_id === null || payload.price_table_id === ""
          ? null
          : optionalString(payload.price_table_id),
      is_active: payload.is_active,
    },
  };
}

export function parseCreateCustomerInput(payload: Record<string, unknown>) {
  return parseCustomerInput(payload, { requireName: true });
}

export function parseUpdateCustomerInput(payload: Record<string, unknown>) {
  return parseCustomerInput(payload, { requireName: false });
}
