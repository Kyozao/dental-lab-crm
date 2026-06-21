export type AcceptEmployeeInviteInput = {
  name: string;
};

type AcceptInviteValidationResult =
  | { success: true; data: AcceptEmployeeInviteInput }
  | { success: false; errors: Record<string, string[]> };

function optionalString(value: unknown) {
  if (typeof value !== "string") return undefined;
  const trimmed = value.trim();
  return trimmed.length > 0 ? trimmed : undefined;
}

export function parseAcceptEmployeeInviteInput(
  payload: Record<string, unknown>,
): AcceptInviteValidationResult {
  const name = optionalString(payload.name);

  if (!name) {
    return {
      success: false,
      errors: {
        name: ["Name is required."],
      },
    };
  }

  return {
    success: true,
    data: {
      name,
    },
  };
}
