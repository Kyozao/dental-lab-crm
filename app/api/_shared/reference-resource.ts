import { archiveData, restoreData } from "./archive";

export class ReferenceNotFoundError extends Error {
  constructor(public readonly label: string) {
    super(`${label} not found.`);
    this.name = "ReferenceNotFoundError";
  }
}

export class ReferenceValidationError extends Error {
  constructor(public readonly fields: Record<string, string[]>) {
    super("Validation failed.");
    this.name = "ReferenceValidationError";
  }
}

export function optionalString(value: unknown) {
  if (value === undefined || value === null) return undefined;
  if (typeof value !== "string") return undefined;

  const trimmed = value.trim();
  return trimmed || null;
}

export function requiredString(
  payload: Record<string, unknown>,
  field: string,
) {
  const value = optionalString(payload[field]);
  if (!value) {
    throw new ReferenceValidationError({
      [field]: ["This field is required."],
    });
  }

  return value;
}

export function activeStateData(payload: Record<string, unknown>) {
  if (
    payload.is_active === true ||
    payload.is_active === "true" ||
    payload.is_active === "on"
  ) {
    return restoreData();
  }

  if (payload.is_active === false || payload.is_active === "false") {
    return archiveData();
  }

  return {};
}

export function mapReferenceDates<
  T extends { created_at: Date; updated_at: Date; deleted_at: Date | null },
>(item: T) {
  return {
    ...item,
    created_at: item.created_at.toISOString(),
    updated_at: item.updated_at.toISOString(),
    deleted_at: item.deleted_at?.toISOString() ?? null,
  };
}
