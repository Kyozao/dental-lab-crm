export type ApproveScheduleProposalInput = {
  changes: Array<{
    caseProcessId: string;
    assignedLabMemberId: string | null;
  }>;
};

type ApproveScheduleProposalValidationResult =
  | { success: true; data: ApproveScheduleProposalInput }
  | { success: false; errors: Record<string, string[]> };

function optionalString(value: unknown) {
  if (value === undefined || value === null) return value;
  if (typeof value !== "string") return undefined;

  const trimmed = value.trim();
  return trimmed.length > 0 ? trimmed : null;
}

function addError(
  errors: Record<string, string[]>,
  field: string,
  message: string,
) {
  errors[field] = [...(errors[field] ?? []), message];
}

export function parseApproveScheduleProposalInput(
  payload: Record<string, unknown>,
): ApproveScheduleProposalValidationResult {
  if (!Array.isArray(payload.changes)) {
    return {
      success: false,
      errors: {
        changes: ["Changes must be an array."],
      },
    };
  }

  const errors: Record<string, string[]> = {};
  const seenCaseProcessIds = new Set<string>();

  const changes = payload.changes
    .map((entry, index) => {
      if (!entry || typeof entry !== "object" || Array.isArray(entry)) {
        addError(errors, `changes.${index}`, "Change must be an object.");
        return null;
      }

      const item = entry as Record<string, unknown>;
      const caseProcessId = optionalString(item.caseProcessId);
      const assignedLabMemberId = optionalString(item.assignedLabMemberId);

      if (!caseProcessId) {
        addError(
          errors,
          `changes.${index}.caseProcessId`,
          "Case process id is required.",
        );
      } else if (seenCaseProcessIds.has(caseProcessId)) {
        addError(
          errors,
          `changes.${index}.caseProcessId`,
          "Case process id is duplicated.",
        );
      } else {
        seenCaseProcessIds.add(caseProcessId);
      }

      if (
        assignedLabMemberId === undefined &&
        item.assignedLabMemberId !== undefined
      ) {
        addError(
          errors,
          `changes.${index}.assignedLabMemberId`,
          "Assigned lab member id is invalid.",
        );
      }

      if (!caseProcessId) {
        return null;
      }

      return {
        caseProcessId,
        assignedLabMemberId: assignedLabMemberId ?? null,
      };
    })
    .filter(
      (
        change,
      ): change is {
        caseProcessId: string;
        assignedLabMemberId: string | null;
      } => Boolean(change),
    );

  if (Object.keys(errors).length > 0) {
    return { success: false, errors };
  }

  return {
    success: true,
    data: {
      changes,
    },
  };
}
