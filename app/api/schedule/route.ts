import { NextResponse } from "next/server";

import { getAuthenticatedUserId } from "../_shared/request";
import {
  listScheduleForLoggedLab,
  MissingLabMembershipError,
  RoleAuthorizationError,
} from "./schedule.service";

export async function GET() {
  const user_id = await getAuthenticatedUserId();
  if (!user_id) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  try {
    const schedule = await listScheduleForLoggedLab(user_id);
    return NextResponse.json({ data: schedule, error: null, meta: {} });
  } catch (error) {
    if (error instanceof MissingLabMembershipError) {
      return NextResponse.json({ error: "No lab membership found for this user." }, { status: 403 });
    }

    if (error instanceof RoleAuthorizationError) {
      return NextResponse.json({ error: error.message }, { status: 403 });
    }

    console.error("[GET /api/schedule]", error);
    return NextResponse.json({ error: "Failed to load schedule." }, { status: 500 });
  }
}
