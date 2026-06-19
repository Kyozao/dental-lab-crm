import { NextResponse } from "next/server";

import { RoleAuthorizationError } from "../_shared/authorization";
import { MissingLabMembershipError } from "../_shared/membership";
import {
  ReferenceValidationError,
} from "../_shared/reference-resource";
import { getAuthenticatedUserId, parseJsonObject } from "../_shared/request";
import {
  createDentistForLoggedLab,
  listDentistsForLoggedLab,
} from "./dentists.service";
import {
  parseCreateDentistInput,
  parseDentistListQuery,
} from "./dentists.schemas";

export async function GET(request: Request) {
  const user_id = await getAuthenticatedUserId();
  if (!user_id) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  try {
    const dentists = await listDentistsForLoggedLab(
      user_id,
      parseDentistListQuery(new URL(request.url).searchParams),
    );
    return NextResponse.json({ data: dentists, error: null, meta: {} });
  } catch (error) {
    if (error instanceof RoleAuthorizationError) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    if (error instanceof MissingLabMembershipError) {
      return NextResponse.json({ error: "No lab membership found for this user." }, { status: 403 });
    }

    if (error instanceof ReferenceValidationError) {
      return NextResponse.json({ error: "Validation failed.", fields: error.fields }, { status: 400 });
    }

    console.error("[GET /api/dentists]", error);
    return NextResponse.json({ error: "Failed to load dentists." }, { status: 500 });
  }
}

export async function POST(request: Request) {
  const user_id = await getAuthenticatedUserId();
  if (!user_id) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const payload = await parseJsonObject(request);
  if (payload.data === null) return NextResponse.json({ error: payload.error }, { status: 400 });

  const parsed = parseCreateDentistInput(payload.data);
  if (!parsed.success) {
    return NextResponse.json({ error: "Validation failed.", fields: parsed.errors }, { status: 400 });
  }

  try {
    const dentist = await createDentistForLoggedLab(user_id, parsed.data);
    return NextResponse.json({ data: dentist, error: null, meta: {} }, { status: 201 });
  } catch (error) {
    if (error instanceof RoleAuthorizationError) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    if (error instanceof MissingLabMembershipError) {
      return NextResponse.json({ error: "No lab membership found for this user." }, { status: 403 });
    }

    if (error instanceof ReferenceValidationError) {
      return NextResponse.json({ error: "Validation failed.", fields: error.fields }, { status: 400 });
    }

    console.error("[POST /api/dentists]", error);
    return NextResponse.json({ error: "Failed to create dentist." }, { status: 500 });
  }
}
