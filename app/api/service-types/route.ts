import { NextResponse } from "next/server";

import { RoleAuthorizationError } from "../_shared/authorization";
import { MissingLabMembershipError } from "../_shared/membership";
import { ReferenceValidationError } from "../_shared/reference-resource";
import { getAuthenticatedUserId, parseJsonObject } from "../_shared/request";
import {
  createServiceTypeForLoggedLab,
  listServiceTypesForLoggedLab,
} from "./service-types.service";
import { parseCreateServiceTypeInput } from "./service-types.schemas";

export async function GET() {
  const user_id = await getAuthenticatedUserId();
  if (!user_id) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  try {
    const serviceTypes = await listServiceTypesForLoggedLab(user_id);
    return NextResponse.json({
      data: serviceTypes.items,
      error: null,
      meta: { currency: serviceTypes.currency },
    });
  } catch (error) {
    if (error instanceof RoleAuthorizationError) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    if (error instanceof MissingLabMembershipError) {
      return NextResponse.json({ error: "No lab membership found for this user." }, { status: 403 });
    }

    console.error("[GET /api/service-types]", error);
    return NextResponse.json({ error: "Failed to load service types." }, { status: 500 });
  }
}

export async function POST(request: Request) {
  const user_id = await getAuthenticatedUserId();
  if (!user_id) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const payload = await parseJsonObject(request);
  if (payload.data === null) return NextResponse.json({ error: payload.error }, { status: 400 });

  const parsed = parseCreateServiceTypeInput(payload.data);
  if (!parsed.success) {
    return NextResponse.json({ error: "Validation failed.", fields: parsed.errors }, { status: 400 });
  }

  try {
    const serviceType = await createServiceTypeForLoggedLab(user_id, parsed.data);
    return NextResponse.json({ data: serviceType, error: null, meta: {} }, { status: 201 });
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

    console.error("[POST /api/service-types]", error);
    return NextResponse.json({ error: "Failed to create service type." }, { status: 500 });
  }
}
