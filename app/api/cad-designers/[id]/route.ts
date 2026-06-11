import { NextResponse } from "next/server";

import { MissingLabMembershipError } from "../../_shared/membership";
import { ReferenceNotFoundError } from "../../_shared/reference-resource";
import { getAuthenticatedUserId, parseJsonObject } from "../../_shared/request";
import {
  archiveCadDesignerForLoggedLab,
  updateCadDesignerForLoggedLab,
} from "../cad-designers.service";
import { parseUpdateCadDesignerInput } from "../cad-designers.schemas";

export async function PATCH(
  request: Request,
  context: { params: Promise<{ id: string }> },
) {
  const user_id = await getAuthenticatedUserId();
  if (!user_id) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const payload = await parseJsonObject(request);
  if (payload.data === null) return NextResponse.json({ error: payload.error }, { status: 400 });
  const parsed = parseUpdateCadDesignerInput(payload.data);
  if (!parsed.success) {
    return NextResponse.json({ error: "Validation failed.", fields: parsed.errors }, { status: 400 });
  }

  const { id } = await context.params;

  try {
    const designer = await updateCadDesignerForLoggedLab(user_id, id, parsed.data);
    return NextResponse.json({ data: designer, error: null, meta: {} });
  } catch (error) {
    if (error instanceof MissingLabMembershipError) {
      return NextResponse.json({ error: "No lab membership found for this user." }, { status: 403 });
    }

    if (error instanceof ReferenceNotFoundError) {
      return NextResponse.json({ error: "CAD designer not found." }, { status: 404 });
    }

    console.error("[PATCH /api/cad-designers/:id]", error);
    return NextResponse.json({ error: "Failed to update CAD designer." }, { status: 500 });
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
    const designer = await archiveCadDesignerForLoggedLab(user_id, id);
    return NextResponse.json({ data: designer, error: null, meta: {} });
  } catch (error) {
    if (error instanceof MissingLabMembershipError) {
      return NextResponse.json({ error: "No lab membership found for this user." }, { status: 403 });
    }

    if (error instanceof ReferenceNotFoundError) {
      return NextResponse.json({ error: "CAD designer not found." }, { status: 404 });
    }

    console.error("[DELETE /api/cad-designers/:id]", error);
    return NextResponse.json({ error: "Failed to archive CAD designer." }, { status: 500 });
  }
}
