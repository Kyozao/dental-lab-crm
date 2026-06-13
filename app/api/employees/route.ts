import { NextResponse } from "next/server";

import { MissingLabMembershipError } from "../_shared/membership";
import { getAuthenticatedUserId, parseJsonObject } from "../_shared/request";
import {
  EmployeeAuthorizationError,
  EmployeeConflictError,
  EmployeeInviteError,
  inviteEmployeeForLoggedLab,
  listEmployeesForLoggedLab,
  SupabaseAdminConfigError,
} from "./employees.service";
import { parseCreateEmployeeInput } from "./employees.schemas";

export async function GET() {
  const user_id = await getAuthenticatedUserId();
  if (!user_id) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  try {
    const result = await listEmployeesForLoggedLab(user_id);
    return NextResponse.json({
      data: result.employees,
      error: null,
      meta: {
        currentUserRole: result.currentUserRole,
        canInviteEmployees: result.canInviteEmployees,
      },
    });
  } catch (error) {
    if (
      error instanceof MissingLabMembershipError ||
      error instanceof EmployeeAuthorizationError
    ) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    console.error("[GET /api/employees]", error);
    return NextResponse.json({ error: "Failed to load employees." }, { status: 500 });
  }
}

export async function POST(request: Request) {
  const user_id = await getAuthenticatedUserId();
  if (!user_id) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const payload = await parseJsonObject(request);
  if (payload.data === null) return NextResponse.json({ error: payload.error }, { status: 400 });

  const parsed = parseCreateEmployeeInput(payload.data);
  if (!parsed.success) {
    return NextResponse.json({ error: "Validation failed.", fields: parsed.errors }, { status: 400 });
  }

  try {
    const employee = await inviteEmployeeForLoggedLab(user_id, parsed.data);
    return NextResponse.json({ data: employee, error: null, meta: {} }, { status: 201 });
  } catch (error) {
    if (
      error instanceof MissingLabMembershipError ||
      error instanceof EmployeeAuthorizationError
    ) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    if (error instanceof EmployeeConflictError) {
      return NextResponse.json({ error: error.message }, { status: 409 });
    }

    if (error instanceof SupabaseAdminConfigError) {
      return NextResponse.json(
        {
          error:
            "Employee invites are not configured. Set SUPABASE_SERVICE_ROLE_KEY on the server.",
        },
        { status: 503 },
      );
    }

    if (error instanceof EmployeeInviteError) {
      return NextResponse.json({ error: error.message }, { status: 502 });
    }

    console.error("[POST /api/employees]", error);
    return NextResponse.json({ error: "Failed to invite employee." }, { status: 500 });
  }
}
