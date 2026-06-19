import { NextResponse } from "next/server";

import { getAuthenticatedUserId, parseJsonObject } from "../../_shared/request";
import {
  CaseAuthorizationError,
  CaseNotFoundError,
  getCaseById,
  InactiveReferenceError,
  MissingLabMembershipError,
  updateCase,
} from "../cases.service";
import { parseUpdateCaseInput } from "../cases.schemas";

type RouteContext = {
  params: Promise<{ id: string }>;
};

export async function GET(_request: Request, context: RouteContext) {
  const user_id = await getAuthenticatedUserId();
  if (!user_id) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { id } = await context.params;

  try {
    const caseItem = await getCaseById(user_id, id);
    return NextResponse.json({ data: caseItem, error: null, meta: {} });
  } catch (error) {
    if (error instanceof MissingLabMembershipError) {
      return NextResponse.json(
        { error: "No lab membership found for this user." },
        { status: 403 },
      );
    }

    if (error instanceof CaseNotFoundError) {
      return NextResponse.json({ error: "Case not found." }, { status: 404 });
    }

    console.error("[GET /api/cases/:id]", error);
    return NextResponse.json(
      { error: "Failed to load case." },
      { status: 500 },
    );
  }
}

export async function PUT(request: Request, context: RouteContext) {
  const user_id = await getAuthenticatedUserId();
  if (!user_id) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const payload = await parseJsonObject(request);
  if (payload.data === null) {
    return NextResponse.json({ error: payload.error }, { status: 400 });
  }

  const parsed = parseUpdateCaseInput(payload.data);
  if (!parsed.success) {
    return NextResponse.json(
      { error: "Validation failed.", fields: parsed.errors },
      { status: 400 },
    );
  }

  const { id } = await context.params;

  try {
    const caseItem = await updateCase(user_id, id, parsed.data);
    return NextResponse.json({ data: caseItem, error: null, meta: {} });
  } catch (error) {
    if (error instanceof MissingLabMembershipError) {
      return NextResponse.json(
        { error: "No lab membership found for this user." },
        { status: 403 },
      );
    }

    if (error instanceof CaseNotFoundError) {
      return NextResponse.json({ error: "Case not found." }, { status: 404 });
    }

    if (error instanceof InactiveReferenceError) {
      return NextResponse.json(
        { error: "Validation failed.", fields: error.fields },
        { status: 400 },
      );
    }

    if (error instanceof CaseAuthorizationError) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    console.error("[PUT /api/cases/:id]", error);
    return NextResponse.json(
      { error: "Failed to update case." },
      { status: 500 },
    );
  }
}
