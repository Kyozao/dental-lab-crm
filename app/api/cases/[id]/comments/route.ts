import { NextResponse } from "next/server";

import { getAuthenticatedUserId, parseJsonObject } from "../../../_shared/request";
import {
  createCaseCommentForLoggedLab,
  listCaseCommentsForLoggedLab,
} from "../../../cases/case-comments.service";
import { parseCreateCaseCommentInput } from "../../../cases/case-comments.schemas";
import {
  CaseAuthorizationError,
  CaseNotFoundError,
  MissingLabMembershipError,
} from "../../../cases/cases.service";

type RouteContext = {
  params: Promise<{ id: string }>;
};

export async function GET(_request: Request, context: RouteContext) {
  const user_id = await getAuthenticatedUserId();
  if (!user_id) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { id } = await context.params;

  try {
    const comments = await listCaseCommentsForLoggedLab(user_id, id);
    return NextResponse.json({ data: comments, error: null, meta: {} });
  } catch (error) {
    if (error instanceof MissingLabMembershipError) {
      return NextResponse.json({ error: "No lab membership found for this user." }, { status: 403 });
    }

    if (error instanceof CaseNotFoundError) {
      return NextResponse.json({ error: "Case not found." }, { status: 404 });
    }

    console.error("[GET /api/cases/:id/comments]", error);
    return NextResponse.json({ error: "Failed to load case comments." }, { status: 500 });
  }
}

export async function POST(request: Request, context: RouteContext) {
  const user_id = await getAuthenticatedUserId();
  if (!user_id) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const payload = await parseJsonObject(request);
  if (payload.data === null) return NextResponse.json({ error: payload.error }, { status: 400 });

  const parsed = parseCreateCaseCommentInput(payload.data);
  if (!parsed.success) {
    return NextResponse.json({ error: "Validation failed.", fields: parsed.errors }, { status: 400 });
  }

  const { id } = await context.params;

  try {
    const comment = await createCaseCommentForLoggedLab(user_id, id, parsed.data);
    return NextResponse.json({ data: comment, error: null, meta: {} }, { status: 201 });
  } catch (error) {
    if (error instanceof MissingLabMembershipError) {
      return NextResponse.json({ error: "No lab membership found for this user." }, { status: 403 });
    }

    if (error instanceof CaseAuthorizationError) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    if (error instanceof CaseNotFoundError) {
      return NextResponse.json({ error: "Case not found." }, { status: 404 });
    }

    console.error("[POST /api/cases/:id/comments]", error);
    return NextResponse.json({ error: "Failed to create case comment." }, { status: 500 });
  }
}
