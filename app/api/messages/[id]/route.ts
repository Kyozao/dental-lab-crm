import { NextResponse } from "next/server";

import { getAuthenticatedUserId } from "../../_shared/request";
import { MissingLabMembershipError } from "../../_shared/membership";
import { CaseNotFoundError } from "../../cases/cases.service";
import { getMessageThreadForLoggedLab } from "../messages.service";

type RouteContext = {
  params: Promise<{ id: string }>;
};

export async function GET(_request: Request, context: RouteContext) {
  const user_id = await getAuthenticatedUserId();
  if (!user_id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { id } = await context.params;

  try {
    const thread = await getMessageThreadForLoggedLab(user_id, id);
    return NextResponse.json({ data: thread, error: null, meta: {} });
  } catch (error) {
    if (error instanceof MissingLabMembershipError) {
      return NextResponse.json(
        { error: "No lab membership found for this user." },
        { status: 403 },
      );
    }

    if (error instanceof CaseNotFoundError) {
      return NextResponse.json({ error: "Case thread not found." }, { status: 404 });
    }

    console.error("[GET /api/messages/:id]", error);
    return NextResponse.json(
      { error: "Failed to load message thread." },
      { status: 500 },
    );
  }
}
