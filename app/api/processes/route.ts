import { NextResponse } from "next/server";

import { MissingLabMembershipError } from "../_shared/membership";
import { ReferenceValidationError } from "../_shared/reference-resource";
import { getAuthenticatedUserId, parseJsonObject } from "../_shared/request";
import {
  createProcessForLoggedLab,
  listProcessesForLoggedLab,
} from "./processes.service";
import { parseCreateProcessInput } from "./processes.schemas";

export async function GET() {
  const user_id = await getAuthenticatedUserId();
  if (!user_id) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  try {
    const processes = await listProcessesForLoggedLab(user_id);
    return NextResponse.json({ data: processes, error: null, meta: {} });
  } catch (error) {
    if (error instanceof MissingLabMembershipError) {
      return NextResponse.json({ error: "No lab membership found for this user." }, { status: 403 });
    }

    console.error("[GET /api/processes]", error);
    return NextResponse.json({ error: "Failed to load processes." }, { status: 500 });
  }
}

export async function POST(request: Request) {
  const user_id = await getAuthenticatedUserId();
  if (!user_id) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const payload = await parseJsonObject(request);
  if (payload.data === null) return NextResponse.json({ error: payload.error }, { status: 400 });

  const parsed = parseCreateProcessInput(payload.data);
  if (!parsed.success) {
    return NextResponse.json({ error: "Validation failed.", fields: parsed.errors }, { status: 400 });
  }

  try {
    const process = await createProcessForLoggedLab(user_id, parsed.data);
    return NextResponse.json({ data: process, error: null, meta: {} }, { status: 201 });
  } catch (error) {
    if (error instanceof MissingLabMembershipError) {
      return NextResponse.json({ error: "No lab membership found for this user." }, { status: 403 });
    }

    if (error instanceof ReferenceValidationError) {
      return NextResponse.json({ error: "Validation failed.", fields: error.fields }, { status: 400 });
    }

    console.error("[POST /api/processes]", error);
    return NextResponse.json({ error: "Failed to create process." }, { status: 500 });
  }
}
