import { NextResponse } from "next/server";

import { getCurrentSupabaseUser } from "../../_shared/current-user";
import {
  EmployeeInviteAccessError,
  EmployeeInviteNotFoundError,
  EmployeeInviteStateError,
  getEmployeeInviteForAuthenticatedUser,
} from "../employee-invites.service";

export async function GET(
  _request: Request,
  context: { params: Promise<{ id: string }> },
) {
  const user = await getCurrentSupabaseUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { id } = await context.params;

  try {
    const invite = await getEmployeeInviteForAuthenticatedUser(user, id);
    return NextResponse.json({ data: invite, error: null, meta: {} });
  } catch (error) {
    if (error instanceof EmployeeInviteAccessError) {
      return NextResponse.json({ error: error.message }, { status: 403 });
    }

    if (error instanceof EmployeeInviteNotFoundError) {
      return NextResponse.json({ error: error.message }, { status: 404 });
    }

    if (error instanceof EmployeeInviteStateError) {
      return NextResponse.json({ error: error.message }, { status: 409 });
    }

    console.error("[GET /api/employee-invites/:id]", error);
    return NextResponse.json(
      { error: "Failed to load employee invite." },
      { status: 500 },
    );
  }
}
