import { NextResponse } from "next/server";

import {
  createCaseForLoggedLab,
  getCasesForLoggedLab,
  MissingLabMembershipError,
} from "./services";
import { parseCreateCaseInput } from "./schemas";
import { createClient } from "@/lib/supabase/server";

export async function GET() {
  const supabase = await createClient();
  const {
    data: { user },
    error,
  } = await supabase.auth.getUser();

  if (error || !user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const cases = await getCasesForLoggedLab(user.id);
    return NextResponse.json({ cases });
  } catch (error) {
    if (error instanceof MissingLabMembershipError) {
      return NextResponse.json(
        { error: "No dental lab membership found for this user." },
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
  const supabase = await createClient();
  const {
    data: { user },
    error,
  } = await supabase.auth.getUser();

  if (error || !user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  let payload: unknown;

  try {
    payload = await request.json();
  } catch {
    return NextResponse.json(
      { error: "Request body must be valid JSON." },
      { status: 400 },
    );
  }

  const parsed = parseCreateCaseInput(payload);

  if (!parsed.success) {
    return NextResponse.json(
      { error: "Validation failed.", fields: parsed.errors },
      { status: 400 },
    );
  }

  try {
    const createdCase = await createCaseForLoggedLab(user.id, parsed.data);
    return NextResponse.json({ case: createdCase }, { status: 201 });
  } catch (error) {
    if (error instanceof MissingLabMembershipError) {
      return NextResponse.json(
        { error: "No dental lab membership found for this user." },
        { status: 403 },
      );
    }

    console.error("[POST /api/cases]", error);
    return NextResponse.json(
      { error: "Failed to create case." },
      { status: 500 },
    );
  }
}
