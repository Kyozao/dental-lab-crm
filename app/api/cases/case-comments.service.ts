import { UserRole } from "@/generated/prisma/enums";
import { prisma } from "@/lib/prisma";

import { getLabMember } from "../_shared/membership";
import type { CreateCaseCommentInput } from "./case-comments.schemas";
import {
  buildAccessibleCasesWhere,
  CaseAuthorizationError,
  CaseNotFoundError,
  type LabMembershipContext,
} from "./cases.service";

const commentSelect = {
  id: true,
  case_id: true,
  author_user_id: true,
  author_lab_member_id: true,
  body: true,
  created_at: true,
  authorUser: {
    select: {
      name: true,
      email: true,
    },
  },
  authorLabMember: {
    select: {
      role: true,
    },
  },
} as const;

type CaseCommentRecord = {
  id: string;
  case_id: string;
  author_user_id: string;
  author_lab_member_id: string;
  body: string;
  created_at: Date;
  authorUser: {
    name: string;
    email: string;
  };
  authorLabMember: {
    role: UserRole;
  };
};

function canManageAnyComment(role: UserRole) {
  return (
    role === UserRole.OWNER ||
    role === UserRole.ADMIN ||
    role === UserRole.MANAGER
  );
}

function mapCaseComment(
  comment: CaseCommentRecord,
  currentUserId: string,
  currentUserRole: UserRole,
) {
  return {
    id: comment.id,
    caseId: comment.case_id,
    authorUserId: comment.author_user_id,
    authorLabMemberId: comment.author_lab_member_id,
    authorName: comment.authorUser.name || comment.authorUser.email,
    authorRole: comment.authorLabMember.role,
    body: comment.body,
    createdAt: comment.created_at.toISOString(),
    deletedAt: null,
    deletedByUserId: null,
    canDelete:
      comment.author_user_id === currentUserId ||
      canManageAnyComment(currentUserRole),
  };
}

async function assertCanAccessCase(
  membership: LabMembershipContext,
  case_id: string,
) {
  const caseItem = await prisma.cases.findFirst({
    where: buildAccessibleCasesWhere(membership, case_id),
    select: { id: true },
  });

  if (!caseItem) throw new CaseNotFoundError();
}

export async function listCaseCommentsForLoggedLab(
  user_id: string,
  case_id: string,
) {
  const membership = await getLabMember(user_id);
  await assertCanAccessCase(membership, case_id);

  const comments = await prisma.case_comments.findMany({
    where: { case_id, deleted_at: null },
    select: commentSelect,
    orderBy: { created_at: "asc" },
  });

  return comments.map((comment) =>
    mapCaseComment(comment, user_id, membership.role),
  );
}

export async function createCaseCommentForLoggedLab(
  user_id: string,
  case_id: string,
  input: CreateCaseCommentInput,
) {
  const membership = await getLabMember(user_id);
  await assertCanAccessCase(membership, case_id);

  const comment = await prisma.case_comments.create({
    data: {
      case_id,
      author_user_id: user_id,
      author_lab_member_id: membership.id,
      body: input.body,
    },
    select: commentSelect,
  });

  return mapCaseComment(comment, user_id, membership.role);
}

export async function deleteCaseCommentForLoggedLab(
  user_id: string,
  case_id: string,
  comment_id: string,
) {
  const membership = await getLabMember(user_id);
  await assertCanAccessCase(membership, case_id);

  const comment = await prisma.case_comments.findFirst({
    where: {
      id: comment_id,
      case_id,
    },
    select: {
      id: true,
      author_user_id: true,
    },
  });

  if (!comment) throw new CaseNotFoundError();

  if (
    comment.author_user_id !== user_id &&
    !canManageAnyComment(membership.role)
  ) {
    throw new CaseAuthorizationError();
  }

  await prisma.case_comments.delete({
    where: { id: comment.id },
  });

  return true;
}
