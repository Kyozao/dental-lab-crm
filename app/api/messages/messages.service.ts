import type { Prisma } from "@/generated/prisma/client";
import { CaseStatus, UserRole } from "@/generated/prisma/enums";
import { prisma } from "@/lib/prisma";

import { getLabMember } from "../_shared/membership";
import { listCaseCommentsForLoggedLab } from "../cases/case-comments.service";
import { buildCasePatientDetail, selectCurrentCaseProcess } from "../cases/cases.list-utils";
import {
  buildAccessibleCasesWhere,
  CaseNotFoundError,
  type LabMembershipContext,
} from "../cases/cases.service";
import type {
  ListMessageThreadsInput,
  MessageThreadScope,
} from "./messages.schemas";

export const MESSAGE_THREAD_EXCLUDED_STATUSES = [
  CaseStatus.DONE,
  CaseStatus.CANCELLED,
] as const;

const messageThreadCaseSelect = {
  id: true,
  code: true,
  patient_name: true,
  current_status: true,
  teeth: true,
  shade: true,
  elements_qty: true,
  updated_at: true,
  customers: {
    select: {
      id: true,
      name: true,
    },
  },
  case_services: {
    select: {
      id: true,
      service_name_snapshot: true,
      case_processes: {
        select: {
          id: true,
          process_id: true,
          workflow_step_id: true,
          status: true,
          created_at: true,
          processes: {
            select: {
              name: true,
            },
          },
          assignedLabMember: {
            select: {
              id: true,
              users: {
                select: {
                  name: true,
                },
              },
            },
          },
        },
        orderBy: { created_at: "asc" },
      },
    },
    orderBy: { created_at: "asc" },
  },
  case_comments: {
    where: { deleted_at: null },
    select: {
      id: true,
      body: true,
      created_at: true,
      author_user_id: true,
    },
    orderBy: { created_at: "desc" },
  },
  case_thread_reads: {
    select: {
      last_read_at: true,
      last_read_comment_id: true,
    },
  },
} satisfies Prisma.casesSelect;

type MessageThreadCaseRecord = Prisma.casesGetPayload<{
  select: typeof messageThreadCaseSelect;
}>;

function isManagementRole(role: UserRole) {
  return (
    role === UserRole.OWNER ||
    role === UserRole.ADMIN ||
    role === UserRole.MANAGER
  );
}

function buildAssignedCasesWhere(
  membership: LabMembershipContext,
): Prisma.casesWhereInput {
  return {
    case_processes: {
      some: {
        assigned_lab_member_id: membership.id,
      },
    },
  };
}

function buildActiveThreadCasesWhere(): Prisma.casesWhereInput {
  return {
    current_status: {
      notIn: [...MESSAGE_THREAD_EXCLUDED_STATUSES],
    },
  };
}

function buildAccessibleActiveThreadWhere(
  membership: LabMembershipContext,
  case_id?: string,
): Prisma.casesWhereInput {
  return {
    ...buildAccessibleCasesWhere(membership, case_id),
    ...buildActiveThreadCasesWhere(),
  };
}

export function canUseAllThreadScope(role: UserRole) {
  return isManagementRole(role);
}

export function resolveRequestedThreadScope(
  role: UserRole,
  requestedScope: MessageThreadScope,
): MessageThreadScope {
  if (requestedScope === "all" && canUseAllThreadScope(role)) {
    return "all";
  }

  return "assigned";
}

export function buildMessageThreadsWhere(
  membership: LabMembershipContext,
  input: ListMessageThreadsInput,
): Prisma.casesWhereInput {
  const scope = resolveRequestedThreadScope(membership.role, input.scope);

  return {
    ...buildAccessibleActiveThreadWhere(membership),
    ...(scope === "assigned" ? buildAssignedCasesWhere(membership) : {}),
    ...(input.q
      ? {
          OR: [
            { code: { contains: input.q, mode: "insensitive" } },
            { patient_name: { contains: input.q, mode: "insensitive" } },
            {
              customers: {
                is: {
                  name: { contains: input.q, mode: "insensitive" },
                },
              },
            },
            {
              case_comments: {
                some: {
                  deleted_at: null,
                  body: { contains: input.q, mode: "insensitive" },
                },
              },
            },
          ],
        }
      : {}),
  };
}

function getReadStateForMembership(caseItem: MessageThreadCaseRecord) {
  return (
    caseItem.case_thread_reads.find((readState) => Boolean(readState)) ??
    null
  );
}

function computeUnreadCount(
  caseItem: MessageThreadCaseRecord,
  currentUserId: string,
) {
  const readState = getReadStateForMembership(caseItem);

  return caseItem.case_comments.filter((comment) => {
    if (comment.author_user_id === currentUserId) return false;
    if (!readState?.last_read_at) return true;

    return comment.created_at > readState.last_read_at;
  }).length;
}

function canReplyInThread(status: CaseStatus) {
  return status !== CaseStatus.DONE && status !== CaseStatus.CANCELLED;
}

function mapThreadSummary(
  caseItem: MessageThreadCaseRecord,
  currentUserId: string,
) {
  const latestComment = caseItem.case_comments[0] ?? null;
  const currentProcess = selectCurrentCaseProcess(caseItem);
  const unreadCount = computeUnreadCount(caseItem, currentUserId);

  return {
    caseId: caseItem.id,
    caseCode: caseItem.code,
    patientName: caseItem.patient_name,
    patientDetail: buildCasePatientDetail(caseItem),
    customerId: caseItem.customers?.id ?? null,
    customerName: caseItem.customers?.name ?? null,
    currentStatus: caseItem.current_status,
    currentProcessName: currentProcess?.processName ?? null,
    currentProcessStatus: currentProcess?.status ?? null,
    currentProcessAssigneeId: currentProcess?.assignedLabMemberId ?? null,
    currentProcessAssigneeName: currentProcess?.assignedLabMemberName ?? null,
    serviceLabel: currentProcess?.serviceLabel ?? null,
    latestMessageId: latestComment?.id ?? null,
    latestMessagePreview: latestComment?.body ?? null,
    latestMessageAt:
      latestComment?.created_at.toISOString() ?? caseItem.updated_at.toISOString(),
    unreadCount,
    canReply: canReplyInThread(caseItem.current_status),
  };
}

export async function listMessageThreadsForLoggedLab(
  user_id: string,
  input: ListMessageThreadsInput,
) {
  const membership = await getLabMember(user_id);
  const scope = resolveRequestedThreadScope(membership.role, input.scope);
  const cases = await prisma.cases.findMany({
    where: buildMessageThreadsWhere(membership, input),
    select: {
      ...messageThreadCaseSelect,
      case_thread_reads: {
        where: { lab_member_id: membership.id },
        select: {
          last_read_at: true,
          last_read_comment_id: true,
        },
      },
    },
  });

  const threads = cases
    .map((caseItem) => mapThreadSummary(caseItem, user_id))
    .sort((left, right) =>
      right.latestMessageAt.localeCompare(left.latestMessageAt),
    );

  return {
    scope,
    canViewAll: canUseAllThreadScope(membership.role),
    threads,
  };
}

export async function getMessageThreadForLoggedLab(
  user_id: string,
  case_id: string,
) {
  const membership = await getLabMember(user_id);
  const caseItem = await prisma.cases.findFirst({
    where: buildAccessibleActiveThreadWhere(membership, case_id),
    select: {
      ...messageThreadCaseSelect,
      case_thread_reads: {
        where: { lab_member_id: membership.id },
        select: {
          last_read_at: true,
          last_read_comment_id: true,
        },
      },
    },
  });

  if (!caseItem) {
    throw new CaseNotFoundError();
  }

  const summary = mapThreadSummary(caseItem, user_id);
  const comments = await listCaseCommentsForLoggedLab(user_id, case_id);

  return {
    ...summary,
    comments,
  };
}

export async function markMessageThreadReadForLoggedLab(
  user_id: string,
  case_id: string,
) {
  const membership = await getLabMember(user_id);
  const caseItem = await prisma.cases.findFirst({
    where: buildAccessibleActiveThreadWhere(membership, case_id),
    select: {
      id: true,
      case_comments: {
        where: { deleted_at: null },
        orderBy: { created_at: "desc" },
        take: 1,
        select: {
          id: true,
          created_at: true,
        },
      },
    },
  });

  if (!caseItem) {
    throw new CaseNotFoundError();
  }

  const latestComment = caseItem.case_comments[0] ?? null;

  await prisma.case_thread_reads.upsert({
    where: {
      case_id_lab_member_id: {
        case_id,
        lab_member_id: membership.id,
      },
    },
    create: {
      case_id,
      user_id,
      lab_member_id: membership.id,
      last_read_comment_id: latestComment?.id ?? null,
      last_read_at: latestComment?.created_at ?? new Date(),
    },
    update: {
      user_id,
      last_read_comment_id: latestComment?.id ?? null,
      last_read_at: latestComment?.created_at ?? new Date(),
    },
  });

  return {
    caseId: case_id,
    lastReadCommentId: latestComment?.id ?? null,
    lastReadAt: (latestComment?.created_at ?? new Date()).toISOString(),
  };
}
