import { NextResponse } from "next/server";

import { getAuthenticatedUserId } from "../../../../_shared/request";
import { deleteCaseCommentForLoggedLab } from "../../../../cases/case-comments.service";
import {
  CaseAuthorizationError,
  CaseNotFoundError,
  MissingLabMembershipError,
} from "../../../../cases/cases.service";

type RouteContext = {
  params: Promise<{ id: string; commentId: string }>;
};

export async function DELETE(_request: Request, context: RouteContext) {
  const user_id = await getAuthenticatedUserId();
  if (!user_id) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { id, commentId } = await context.params;

  try {
    await deleteCaseCommentForLoggedLab(user_id, id, commentId);
    return NextResponse.json({ data: true, error: null, meta: {} });
  } catch (error) {
    if (error instanceof MissingLabMembershipError) {
      return NextResponse.json({ error: "No lab membership found for this user." }, { status: 403 });
    }

    if (error instanceof CaseAuthorizationError) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    if (error instanceof CaseNotFoundError) {
      return NextResponse.json({ error: "Comment not found." }, { status: 404 });
    }

    console.error("[DELETE /api/cases/:id/comments/:commentId]", error);
    return NextResponse.json({ error: "Failed to delete case comment." }, { status: 500 });
  }
}
