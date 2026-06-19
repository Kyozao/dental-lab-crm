import { NextResponse } from "next/server";

import { MissingLabMembershipError } from "../../_shared/membership";
import { getAuthenticatedUserId, parseJsonObject } from "../../_shared/request";
import {
  EmployeeAuthorizationError,
  EmployeeNotFoundError,
  EmployeeRoleUpdateError,
  getEmployeeForLoggedLab,
  updateEmployeeRoleForLoggedLab,
} from "../employees.service";
import { parseUpdateEmployeeRoleInput } from "../employees.schemas";

export async function GET(
  _request: Request,
  context: { params: Promise<{ id: string }> },
) {
  const user_id = await getAuthenticatedUserId();
  if (!user_id) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { id } = await context.params;

  try {
    const result = await getEmployeeForLoggedLab(user_id, id);
    return NextResponse.json({
      data: result.employee,
      error: null,
      meta: {
        currentUserRole: result.currentUserRole,
        canAssignProcesses: result.canAssignProcesses,
        canEditRole: result.canEditRole,
      },
    });
  } catch (error) {
    if (
      error instanceof MissingLabMembershipError ||
      error instanceof EmployeeAuthorizationError
    ) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    if (error instanceof EmployeeNotFoundError) {
      return NextResponse.json({ error: error.message }, { status: 404 });
    }

    console.error("[GET /api/employees/:id]", error);
    return NextResponse.json({ error: "Failed to load employee." }, { status: 500 });
  }
}

export async function PUT(
  request: Request,
  context: { params: Promise<{ id: string }> },
) {
  const user_id = await getAuthenticatedUserId({ ensureAppUser: false });
  if (!user_id) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const payload = await parseJsonObject(request);
  if (payload.data === null) {
    return NextResponse.json({ error: payload.error }, { status: 400 });
  }

  const parsed = parseUpdateEmployeeRoleInput(payload.data);
  if (!parsed.success) {
    return NextResponse.json(
      { error: "Validation failed.", fields: parsed.errors },
      { status: 400 },
    );
  }

  const { id } = await context.params;

  try {
    const employee = await updateEmployeeRoleForLoggedLab(user_id, id, parsed.data);
    return NextResponse.json({ data: employee, error: null, meta: {} });
  } catch (error) {
    if (
      error instanceof MissingLabMembershipError ||
      error instanceof EmployeeAuthorizationError
    ) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    if (
      error instanceof EmployeeNotFoundError ||
      error instanceof EmployeeRoleUpdateError
    ) {
      return NextResponse.json({ error: error.message }, { status: 400 });
    }

    console.error("[PUT /api/employees/:id]", error);
    return NextResponse.json(
      { error: "Failed to update employee role." },
      { status: 500 },
    );
  }
}
