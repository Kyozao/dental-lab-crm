import { NextResponse } from "next/server";

import { RoleAuthorizationError } from "../_shared/authorization";
import { MissingLabMembershipError } from "../_shared/membership";
import { ReferenceValidationError } from "../_shared/reference-resource";
import { getAuthenticatedUserId, parseJsonObject } from "../_shared/request";
import {
  createCustomerForLoggedLab,
  listCustomersForLoggedLab,
} from "./customers.service";
import { parseCreateCustomerInput } from "./customers.schemas";

export async function GET() {
  const user_id = await getAuthenticatedUserId();
  if (!user_id) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  try {
    const customers = await listCustomersForLoggedLab(user_id);
    return NextResponse.json({ data: customers, error: null, meta: {} });
  } catch (error) {
    if (error instanceof RoleAuthorizationError) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    if (error instanceof MissingLabMembershipError) {
      return NextResponse.json({ error: "No lab membership found for this user." }, { status: 403 });
    }

    console.error("[GET /api/customers]", error);
    return NextResponse.json({ error: "Failed to load customers." }, { status: 500 });
  }
}

export async function POST(request: Request) {
  const user_id = await getAuthenticatedUserId();
  if (!user_id) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const payload = await parseJsonObject(request);
  if (payload.data === null) return NextResponse.json({ error: payload.error }, { status: 400 });

  const parsed = parseCreateCustomerInput(payload.data);
  if (!parsed.success) {
    return NextResponse.json({ error: "Validation failed.", fields: parsed.errors }, { status: 400 });
  }

  try {
    const customer = await createCustomerForLoggedLab(user_id, parsed.data);
    return NextResponse.json({ data: customer, error: null, meta: {} }, { status: 201 });
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

    console.error("[POST /api/customers]", error);
    return NextResponse.json({ error: "Failed to create customer." }, { status: 500 });
  }
}
