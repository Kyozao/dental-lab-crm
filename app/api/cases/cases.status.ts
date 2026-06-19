import { CaseStatus } from "@/generated/prisma/enums";

export function getCaseStatusTransitionHistoryEntry(input: {
  previousStatus: CaseStatus | null;
  nextStatus?: CaseStatus | null;
  statusReason?: string | null;
}) {
  if (!input.nextStatus) {
    return null;
  }

  if (input.previousStatus === input.nextStatus) {
    return null;
  }

  return {
    fromStatus: input.previousStatus,
    toStatus: input.nextStatus,
    note: input.statusReason ?? null,
  };
}
