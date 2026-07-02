import { NextResponse } from "next/server";

import { MissingLabMembershipError } from "../../../_shared/membership";
import { ReferenceValidationError } from "../../../_shared/reference-resource";
import { getAuthenticatedUserId, parseJsonObject } from "../../../_shared/request";
import {
  EmployeeAuthorizationError,
  EmployeeNotFoundError,
  updateEmployeeAvailabilityForLoggedLab,
} from "../../employees.service";
import { parseUpdateEmployeeAvailabilityInput } from "../../employees.schemas";

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

  const parsed = parseUpdateEmployeeAvailabilityInput(payload.data);
  if (!parsed.success) {
    return NextResponse.json(
      { error: "Validation failed.", fields: parsed.errors },
      { status: 400 },
    );
  }

  const { id } = await context.params;

  try {
    await updateEmployeeAvailabilityForLoggedLab(user_id, id, parsed.data);
    return NextResponse.json({ data: null, error: null, meta: {} });
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

    if (error instanceof ReferenceValidationError) {
      return NextResponse.json(
        { error: "Validation failed.", fields: error.fields },
        { status: 400 },
      );
    }

    console.error("[PUT /api/employees/:id/availability]", error);
    return NextResponse.json(
      { error: "Failed to update employee availability." },
      { status: 500 },
    );
  }
}
