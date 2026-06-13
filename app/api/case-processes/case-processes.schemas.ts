import { CaseProcessStatus } from "@/generated/prisma/enums";

export type UpdateCaseProcessInput = {
  status?: CaseProcessStatus;
  assigned_lab_member_id?: string | null;
};

type ValidationResult =
  | { success: true; data: UpdateCaseProcessInput }
  | { success: false; errors: Record<string, string[]> };

const statusValues = new Set<string>(Object.values(CaseProcessStatus));

function optionalString(value: unknown) {
  if (value === undefined || value === null) return value;
  if (typeof value !== "string") return undefined;

  const trimmed = value.trim();
  return trimmed || null;
}

function addError(
  errors: Record<string, string[]>,
  field: string,
  message: string,
) {
  errors[field] = [...(errors[field] ?? []), message];
}

export function parseUpdateCaseProcessInput(
  payload: Record<string, unknown>,
): ValidationResult {
  const errors: Record<string, string[]> = {};
  const status = optionalString(payload.status);
  const assigned_lab_member_id = optionalString(payload.assigned_lab_member_id);

  if (status !== undefined && status !== null && !statusValues.has(status)) {
    addError(errors, "status", "Status is invalid.");
  }

  if (
    assigned_lab_member_id === undefined &&
    payload.assigned_lab_member_id !== undefined
  ) {
    addError(
      errors,
      "assigned_lab_member_id",
      "Assigned lab member id is invalid.",
    );
  }

  if (Object.keys(errors).length > 0) {
    return { success: false, errors };
  }

  return {
    success: true,
    data: {
      status: status ? (status as CaseProcessStatus) : undefined,
      assigned_lab_member_id,
    },
  };
}
