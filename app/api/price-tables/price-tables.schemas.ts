import { optionalString } from "../_shared/reference-resource";

export type PriceTableServicePriceInput = {
  service_type_id: string;
  price: string;
};

export type PriceTableInput = {
  name?: string | null;
  is_active?: unknown;
  service_prices?: PriceTableServicePriceInput[];
};

type ValidationResult =
  | { success: true; data: PriceTableInput }
  | { success: false; errors: Record<string, string[]> };

function addError(
  errors: Record<string, string[]>,
  field: string,
  message: string,
) {
  errors[field] = [...(errors[field] ?? []), message];
}

function parseMoney(
  value: unknown,
  field: string,
  errors: Record<string, string[]>,
) {
  const rawValue =
    typeof value === "number"
      ? String(value)
      : typeof value === "string"
        ? value.trim()
        : null;

  if (!rawValue) {
    addError(errors, field, "Price is required.");
    return undefined;
  }

  if (!/^\d+(\.\d{1,2})?$/.test(rawValue)) {
    addError(errors, field, "Price must be a valid amount with up to 2 decimals.");
    return undefined;
  }

  const parsed = Number(rawValue);
  if (!Number.isFinite(parsed) || parsed < 0) {
    addError(errors, field, "Price must be zero or greater.");
    return undefined;
  }

  return parsed.toFixed(2);
}

function parseServicePrices(
  value: unknown,
  errors: Record<string, string[]>,
) {
  if (value === undefined) return undefined;

  if (!Array.isArray(value)) {
    addError(errors, "service_prices", "Service prices must be an array.");
    return undefined;
  }

  const seenServiceTypeIds = new Set<string>();
  const parsedRows: PriceTableServicePriceInput[] = [];

  value.forEach((item, index) => {
    const field = `service_prices.${index}`;
    if (!item || typeof item !== "object" || Array.isArray(item)) {
      addError(errors, field, "Service price row must be an object.");
      return;
    }

    const row = item as Record<string, unknown>;
    const service_type_id = optionalString(row.service_type_id);
    if (!service_type_id) {
      addError(errors, `${field}.service_type_id`, "Service type is required.");
    } else if (seenServiceTypeIds.has(service_type_id)) {
      addError(errors, `${field}.service_type_id`, "Service type is duplicated.");
    } else {
      seenServiceTypeIds.add(service_type_id);
    }

    const price = parseMoney(row.price, `${field}.price`, errors);
    if (!service_type_id || !price) return;

    parsedRows.push({
      service_type_id,
      price,
    });
  });

  return parsedRows;
}

function parsePriceTableInput(
  payload: Record<string, unknown>,
  options: { requireName: boolean },
): ValidationResult {
  const errors: Record<string, string[]> = {};
  const name = optionalString(payload.name);

  if (options.requireName && !name) {
    addError(errors, "name", "This field is required.");
  }

  const service_prices = parseServicePrices(payload.service_prices, errors);

  if (Object.keys(errors).length > 0) {
    return { success: false, errors };
  }

  return {
    success: true,
    data: {
      name,
      is_active: payload.is_active,
      service_prices,
    },
  };
}

export function parseCreatePriceTableInput(payload: Record<string, unknown>) {
  return parsePriceTableInput(payload, { requireName: true });
}

export function parseUpdatePriceTableInput(payload: Record<string, unknown>) {
  return parsePriceTableInput(payload, { requireName: false });
}
