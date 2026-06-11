import { NextResponse } from "next/server";

import { MissingLabMembershipError } from "../_shared/membership";
import { ReferenceValidationError } from "../_shared/reference-resource";
import { getAuthenticatedUserId, parseJsonObject } from "../_shared/request";
import {
  createCadDesignerForLoggedLab,
  listCadDesignersForLoggedLab,
} from "./cad-designers.service";
import { parseCreateCadDesignerInput } from "./cad-designers.schemas";

export async function GET() {
  const user_id = await getAuthenticatedUserId();
  if (!user_id) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  try {
    const designers = await listCadDesignersForLoggedLab(user_id);
    return NextResponse.json({ data: designers, error: null, meta: {} });
  } catch (error) {
    if (error instanceof MissingLabMembershipError) {
      return NextResponse.json({ error: "No lab membership found for this user." }, { status: 403 });
    }

    console.error("[GET /api/cad-designers]", error);
    return NextResponse.json({ error: "Failed to load CAD designers." }, { status: 500 });
  }
}

export async function POST(request: Request) {
  const user_id = await getAuthenticatedUserId();
  if (!user_id) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const payload = await parseJsonObject(request);
  if (payload.data === null) return NextResponse.json({ error: payload.error }, { status: 400 });

  const parsed = parseCreateCadDesignerInput(payload.data);
  if (!parsed.success) {
    return NextResponse.json({ error: "Validation failed.", fields: parsed.errors }, { status: 400 });
  }

  try {
    const designer = await createCadDesignerForLoggedLab(user_id, parsed.data);
    return NextResponse.json({ data: designer, error: null, meta: {} }, { status: 201 });
  } catch (error) {
    if (error instanceof MissingLabMembershipError) {
      return NextResponse.json({ error: "No lab membership found for this user." }, { status: 403 });
    }

    if (error instanceof ReferenceValidationError) {
      return NextResponse.json({ error: "Validation failed.", fields: error.fields }, { status: 400 });
    }

    console.error("[POST /api/cad-designers]", error);
    return NextResponse.json({ error: "Failed to create CAD designer." }, { status: 500 });
  }
}
