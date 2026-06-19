type CreateLabInput = {
  name: string;
};

export type UpdateLabCurrencyInput = {
  currency: string;
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

export function parseUpdateLabCurrencyInput(
  payload: Record<string, unknown>,
):
  | { success: true; data: UpdateLabCurrencyInput }
  | { success: false; errors: Record<string, string[]> } {
  const rawCurrency = typeof payload.currency === "string" ? payload.currency.trim() : "";
  const currency = rawCurrency.toUpperCase();

  if (!currency) {
    return {
      success: false,
      errors: { currency: ["Currency is required."] },
    };
  }

  if (!/^[A-Z]{3}$/.test(currency)) {
    return {
      success: false,
      errors: { currency: ["Currency must be a 3-letter ISO code."] },
    };
  }

  return {
    success: true,
    data: { currency },
  };
}
