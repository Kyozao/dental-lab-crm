import { NextResponse } from "next/server";

import { RoleAuthorizationError } from "../../_shared/authorization";
import { MissingLabMembershipError } from "../../_shared/membership";
import {
  ReferenceNotFoundError,
  ReferenceValidationError,
} from "../../_shared/reference-resource";
import { getAuthenticatedUserId, parseJsonObject } from "../../_shared/request";
import {
  deleteMillingForLoggedLab,
  updateMillingForLoggedLab,
} from "../millings.service";
import { parseUpdateMillingInput } from "../millings.schemas";

export async function PATCH(
  request: Request,
  context: { params: Promise<{ id: string }> },
) {
  const user_id = await getAuthenticatedUserId();
  if (!user_id) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const payload = await parseJsonObject(request);
  if (payload.data === null) return NextResponse.json({ error: payload.error }, { status: 400 });

  const parsed = parseUpdateMillingInput(payload.data);
  if (!parsed.success) {
    return NextResponse.json({ error: "Validation failed.", fields: parsed.errors }, { status: 400 });
  }

  const { id } = await context.params;

  try {
    const milling = await updateMillingForLoggedLab(user_id, id, parsed.data);
    return NextResponse.json({ data: milling, error: null, meta: {} });
  } catch (error) {
    if (error instanceof RoleAuthorizationError) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    if (error instanceof MissingLabMembershipError) {
      return NextResponse.json({ error: "No lab membership found for this user." }, { status: 403 });
    }

    if (error instanceof ReferenceNotFoundError) {
      return NextResponse.json({ error: "Milling record not found." }, { status: 404 });
    }

    if (error instanceof ReferenceValidationError) {
      return NextResponse.json({ error: "Validation failed.", fields: error.fields }, { status: 400 });
    }

    console.error("[PATCH /api/millings/:id]", error);
    return NextResponse.json({ error: "Failed to update milling record." }, { status: 500 });
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
    await deleteMillingForLoggedLab(user_id, id);
    return NextResponse.json({ data: true, error: null, meta: {} });
  } catch (error) {
    if (error instanceof RoleAuthorizationError) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    if (error instanceof MissingLabMembershipError) {
      return NextResponse.json({ error: "No lab membership found for this user." }, { status: 403 });
    }

    if (error instanceof ReferenceNotFoundError) {
      return NextResponse.json({ error: "Milling record not found." }, { status: 404 });
    }

    console.error("[DELETE /api/millings/:id]", error);
    return NextResponse.json({ error: "Failed to delete milling record." }, { status: 500 });
  }
}
