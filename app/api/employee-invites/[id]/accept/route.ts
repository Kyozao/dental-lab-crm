import { NextResponse } from "next/server";

import { getCurrentSupabaseUser } from "../../../_shared/current-user";
import { parseJsonObject } from "../../../_shared/request";
import {
  acceptEmployeeInviteForAuthenticatedUser,
  EmployeeInviteAccessError,
  EmployeeInviteNotFoundError,
  EmployeeInviteStateError,
} from "../../employee-invites.service";
import { parseAcceptEmployeeInviteInput } from "../../employee-invites.schemas";

export async function POST(
  request: Request,
  context: { params: Promise<{ id: string }> },
) {
  const user = await getCurrentSupabaseUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const payload = await parseJsonObject(request);
  if (payload.data === null) {
    return NextResponse.json({ error: payload.error }, { status: 400 });
  }

  const parsed = parseAcceptEmployeeInviteInput(payload.data);
  if (!parsed.success) {
    return NextResponse.json(
      { error: "Validation failed.", fields: parsed.errors },
      { status: 400 },
    );
  }

  const { id } = await context.params;

  try {
    const result = await acceptEmployeeInviteForAuthenticatedUser(
      user,
      id,
      parsed.data,
    );
    return NextResponse.json({ data: result, error: null, meta: {} });
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

    console.error("[POST /api/employee-invites/:id/accept]", error);
    return NextResponse.json(
      { error: "Failed to accept employee invite." },
      { status: 500 },
    );
  }
}
