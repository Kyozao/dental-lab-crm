import { NextResponse } from "next/server";

import {
  createCase,
  InactiveReferenceError,
  listCases,
  MissingLabMembershipError,
  MissingServiceTypeWorkflowError,
} from "./cases.service";
import { parseCreateCaseInput, parseListCasesInput } from "./cases.schemas";
import { getAuthenticatedUserId, parseJsonObject } from "../_shared/request";

export async function GET(request: Request) {
  const user_id = await getAuthenticatedUserId();

  if (!user_id) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const parsed = parseListCasesInput(new URL(request.url).searchParams);
  if (!parsed.success) {
    return NextResponse.json(
      { error: "Validation failed.", fields: parsed.errors },
      { status: 400 },
    );
  }

  try {
    const cases = await listCases(user_id, parsed.data);
    return NextResponse.json({
      data: cases,
      error: null,
      meta: { limit: parsed.data.limit },
    });
  } catch (error) {
    if (error instanceof MissingLabMembershipError) {
      return NextResponse.json(
        { error: "No lab membership found for this user." },
        { status: 403 },
      );
    }

    console.error("[GET /api/cases]", error);
    return NextResponse.json(
      { error: "Failed to load cases." },
      { status: 500 },
    );
  }
}

export async function POST(request: Request) {
  const user_id = await getAuthenticatedUserId();
  if (!user_id) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const payload = await parseJsonObject(request);
  if (payload.data === null) return NextResponse.json({ error: payload.error }, { status: 400 });

  const parsed = parseCreateCaseInput(payload.data);

  if (!parsed.success) {
    return NextResponse.json(
      { error: "Validation failed.", fields: parsed.errors },
      { status: 400 },
    );
  }

  try {
    const createdCase = await createCase(user_id, parsed.data);
    return NextResponse.json(
      { data: createdCase, error: null, meta: {} },
      { status: 201 },
    );
  } catch (error) {
    if (error instanceof MissingLabMembershipError) {
      return NextResponse.json(
        { error: "No lab membership found for this user." },
        { status: 403 },
      );
    }

    if (error instanceof InactiveReferenceError) {
      return NextResponse.json(
        { error: "Validation failed.", fields: error.fields },
        { status: 400 },
      );
    }

    if (error instanceof MissingServiceTypeWorkflowError) {
      return NextResponse.json(
        {
          error: "Validation failed.",
          fields: {
            service_type_id: [
              "Selected service type does not have a workflow. Rerun the default catalog seed or configure the workflow.",
            ],
          },
        },
        { status: 400 },
      );
    }

    console.error("[POST /api/cases]", error);
    return NextResponse.json(
      { error: "Failed to create case." },
      { status: 500 },
    );
  }
}
