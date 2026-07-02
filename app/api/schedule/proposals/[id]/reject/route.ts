import { NextResponse } from "next/server";

import { getAuthenticatedUserId } from "../../../../_shared/request";
import {
  rejectScheduleProposalForLoggedLab,
  MissingLabMembershipError,
  RoleAuthorizationError,
  ScheduleProposalConflictError,
  ScheduleProposalNotFoundError,
} from "../../../schedule.service";

export async function POST(
  _request: Request,
  context: { params: Promise<{ id: string }> },
) {
  const user_id = await getAuthenticatedUserId();
  if (!user_id) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  try {
    const { id } = await context.params;
    const proposal = await rejectScheduleProposalForLoggedLab(user_id, id);
    return NextResponse.json({ data: proposal, error: null, meta: {} });
  } catch (error) {
    if (error instanceof MissingLabMembershipError) {
      return NextResponse.json({ error: "No lab membership found for this user." }, { status: 403 });
    }

    if (error instanceof RoleAuthorizationError) {
      return NextResponse.json({ error: error.message }, { status: 403 });
    }

    if (error instanceof ScheduleProposalNotFoundError) {
      return NextResponse.json({ error: "Schedule proposal not found." }, { status: 404 });
    }

    if (error instanceof ScheduleProposalConflictError) {
      return NextResponse.json({ error: error.message }, { status: 409 });
    }

    console.error("[POST /api/schedule/proposals/:id/reject]", error);
    return NextResponse.json({ error: "Failed to reject schedule proposal." }, { status: 500 });
  }
}
