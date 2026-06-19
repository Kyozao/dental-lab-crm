import { NextResponse } from "next/server";

import { getAuthenticatedUserId } from "../_shared/request";
import { MissingLabMembershipError } from "../_shared/membership";
import { parseListMessageThreadsInput } from "./messages.schemas";
import { listMessageThreadsForLoggedLab } from "./messages.service";

export async function GET(request: Request) {
  const user_id = await getAuthenticatedUserId();
  if (!user_id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const parsed = parseListMessageThreadsInput(
    new URL(request.url).searchParams,
  );
  if (!parsed.success) {
    return NextResponse.json(
      { error: "Validation failed.", fields: parsed.errors },
      { status: 400 },
    );
  }

  try {
    const result = await listMessageThreadsForLoggedLab(user_id, parsed.data);
    return NextResponse.json({ data: result, error: null, meta: {} });
  } catch (error) {
    if (error instanceof MissingLabMembershipError) {
      return NextResponse.json(
        { error: "No lab membership found for this user." },
        { status: 403 },
      );
    }

    console.error("[GET /api/messages]", error);
    return NextResponse.json(
      { error: "Failed to load message threads." },
      { status: 500 },
    );
  }
}
