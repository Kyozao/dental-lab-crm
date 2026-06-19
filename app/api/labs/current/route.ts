import { NextResponse } from "next/server";

import { RoleAuthorizationError } from "../../_shared/authorization";
import { MissingLabMembershipError } from "../../_shared/membership";
import { getAuthenticatedUserId, parseJsonObject } from "../../_shared/request";
import {
  getCurrentLabForUser,
  updateCurrentLabCurrencyForUser,
} from "../labs.service";
import { parseUpdateLabCurrencyInput } from "../labs.schemas";

export async function GET() {
  const user_id = await getAuthenticatedUserId();
  if (!user_id) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  try {
    const lab = await getCurrentLabForUser(user_id);
    return NextResponse.json({ data: lab, error: null, meta: {} });
  } catch (error) {
    if (error instanceof RoleAuthorizationError) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    if (error instanceof MissingLabMembershipError) {
      return NextResponse.json({ error: "No lab membership found for this user." }, { status: 403 });
    }

    console.error("[GET /api/labs/current]", error);
    return NextResponse.json({ error: "Failed to load lab settings." }, { status: 500 });
  }
}

export async function PATCH(request: Request) {
  const user_id = await getAuthenticatedUserId();
  if (!user_id) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const payload = await parseJsonObject(request);
  if (payload.data === null) {
    return NextResponse.json({ error: payload.error }, { status: 400 });
  }

  const parsed = parseUpdateLabCurrencyInput(payload.data);
  if (!parsed.success) {
    return NextResponse.json(
      { error: "Validation failed.", fields: parsed.errors },
      { status: 400 },
    );
  }

  try {
    const lab = await updateCurrentLabCurrencyForUser(user_id, parsed.data.currency);
    return NextResponse.json({ data: lab, error: null, meta: {} });
  } catch (error) {
    if (error instanceof RoleAuthorizationError) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    if (error instanceof MissingLabMembershipError) {
      return NextResponse.json({ error: "No lab membership found for this user." }, { status: 403 });
    }

    console.error("[PATCH /api/labs/current]", error);
    return NextResponse.json({ error: "Failed to update lab currency." }, { status: 500 });
  }
}
