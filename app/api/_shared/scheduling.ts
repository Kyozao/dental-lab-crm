import type { Prisma } from "@/generated/prisma/client";
import { CasePriority } from "@/generated/prisma/enums";

export function normalizeCasePriorityInput(
  priority?: CasePriority | null,
  isUrgent?: boolean,
) {
  if (priority) {
    return priority;
  }

  if (isUrgent === true) {
    return CasePriority.URGENT;
  }

  if (isUrgent === false) {
    return CasePriority.NORMAL;
  }

  return undefined;
}

export function resolveCasePriority(
  priority: CasePriority | null | undefined,
  isUrgent: boolean,
  dueDate: Date | null,
) {
  if (priority) {
    return priority.toLowerCase() as "low" | "normal" | "high" | "urgent";
  }

  if (isUrgent) return "urgent" as const;
  if (!dueDate) return "normal" as const;

  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const target = new Date(dueDate);
  target.setHours(0, 0, 0, 0);
  const diffDays = Math.round(
    (target.getTime() - today.getTime()) / (1000 * 60 * 60 * 24),
  );

  if (diffDays <= 1) return "high" as const;
  if (diffDays >= 5) return "low" as const;
  return "normal" as const;
}

export async function bumpLabScheduleRevision(
  tx: Prisma.TransactionClient,
  lab_id: string,
) {
  await tx.labs.update({
    where: { id: lab_id },
    data: {
      schedule_revision: {
        increment: 1,
      },
    },
  });
}
