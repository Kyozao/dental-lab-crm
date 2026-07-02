import { NextResponse } from "next/server";

import { getAuthenticatedUserId } from "../../_shared/request";
import {
  createScheduleProposalForLoggedLab,
  MissingLabMembershipError,
  RoleAuthorizationError,
} from "../schedule.service";

export async function POST() {
  const user_id = await getAuthenticatedUserId();
  if (!user_id) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  try {
    const proposal = await createScheduleProposalForLoggedLab(user_id);
    return NextResponse.json({ data: proposal, error: null, meta: {} }, { status: 201 });
  } catch (error) {
    if (error instanceof MissingLabMembershipError) {
      return NextResponse.json({ error: "No lab membership found for this user." }, { status: 403 });
    }

    if (error instanceof RoleAuthorizationError) {
      return NextResponse.json({ error: error.message }, { status: 403 });
    }

    console.error("[POST /api/schedule/proposals]", error);
    return NextResponse.json({ error: "Failed to create schedule proposal." }, { status: 500 });
  }
}
