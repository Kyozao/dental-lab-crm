import { NextResponse } from "next/server";

import { RoleAuthorizationError } from "../../_shared/authorization";
import { MissingLabMembershipError } from "../../_shared/membership";
import {
  ReferenceNotFoundError,
  ReferenceValidationError,
} from "../../_shared/reference-resource";
import { getAuthenticatedUserId, parseJsonObject } from "../../_shared/request";
import {
  archiveDentistForLoggedLab,
  updateDentistForLoggedLab,
} from "../dentists.service";
import { parseUpdateDentistInput } from "../dentists.schemas";

export async function PATCH(
  request: Request,
  context: { params: Promise<{ id: string }> },
) {
  const user_id = await getAuthenticatedUserId();
  if (!user_id) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const payload = await parseJsonObject(request);
  if (payload.data === null) return NextResponse.json({ error: payload.error }, { status: 400 });

  const parsed = parseUpdateDentistInput(payload.data);
  if (!parsed.success) {
    return NextResponse.json({ error: "Validation failed.", fields: parsed.errors }, { status: 400 });
  }

  const { id } = await context.params;

  try {
    const dentist = await updateDentistForLoggedLab(user_id, id, parsed.data);
    return NextResponse.json({ data: dentist, error: null, meta: {} });
  } catch (error) {
    if (error instanceof RoleAuthorizationError) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    if (error instanceof MissingLabMembershipError) {
      return NextResponse.json({ error: "No lab membership found for this user." }, { status: 403 });
    }

    if (error instanceof ReferenceNotFoundError) {
      return NextResponse.json({ error: "dentist not found." }, { status: 404 });
    }

    if (error instanceof ReferenceValidationError) {
      return NextResponse.json({ error: "Validation failed.", fields: error.fields }, { status: 400 });
    }

    console.error("[PATCH /api/dentists/:id]", error);
    return NextResponse.json({ error: "Failed to update dentist." }, { status: 500 });
  }
}

export async function DELETE(
  _request: Request,
  context: { params: Promise<{ id: string }> },
) {
  const user_id = await getAuthenticatedUserId();
  if (!user_id) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { id } = await context.params;

  try {
    const dentist = await archiveDentistForLoggedLab(user_id, id);
    return NextResponse.json({ data: dentist, error: null, meta: {} });
  } catch (error) {
    if (error instanceof RoleAuthorizationError) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    if (error instanceof MissingLabMembershipError) {
      return NextResponse.json({ error: "No lab membership found for this user." }, { status: 403 });
    }

    if (error instanceof ReferenceNotFoundError) {
      return NextResponse.json({ error: "dentist not found." }, { status: 404 });
    }

    console.error("[DELETE /api/dentists/:id]", error);
    return NextResponse.json({ error: "Failed to archive dentist." }, { status: 500 });
  }
}
