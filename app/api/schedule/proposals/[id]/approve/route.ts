import { NextResponse } from "next/server";

import { getAuthenticatedUserId } from "../../../../_shared/request";
import {
  approveScheduleProposalForLoggedLab,
  MissingLabMembershipError,
  RoleAuthorizationError,
  ScheduleProposalConflictError,
  ScheduleProposalNotFoundError,
  ScheduleProposalValidationError,
} from "../../../schedule.service";
import { parseApproveScheduleProposalInput } from "../../../schedule.schemas";

export async function POST(
  request: Request,
  context: { params: Promise<{ id: string }> },
) {
  const user_id = await getAuthenticatedUserId();
  if (!user_id) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  try {
    const requestBody = await request.json().catch(() => ({}));
    if (!requestBody || typeof requestBody !== "object" || Array.isArray(requestBody)) {
      return NextResponse.json(
        {
          error: "Invalid approval payload.",
          details: { changes: ["Changes must be an array."] },
        },
        { status: 422 },
      );
    }

    const parsed = parseApproveScheduleProposalInput(requestBody as Record<string, unknown>);
    if (!parsed.success) {
      return NextResponse.json(
        {
          error: "Invalid approval payload.",
          details: parsed.errors,
        },
        { status: 422 },
      );
    }

    const { id } = await context.params;
    const proposal = await approveScheduleProposalForLoggedLab(user_id, id, parsed.data);
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

    if (error instanceof ScheduleProposalValidationError) {
      return NextResponse.json(
        { error: error.message, details: error.errors },
        { status: 422 },
      );
    }

    console.error("[POST /api/schedule/proposals/:id/approve]", error);
    return NextResponse.json({ error: "Failed to approve schedule proposal." }, { status: 500 });
  }
}
