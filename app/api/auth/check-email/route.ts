import { NextResponse } from "next/server";

import { parseJsonObject } from "../../_shared/request";
import {
  emailExistsForAuth,
  SupabaseAdminConfigError,
} from "../auth.service";

function normalizeEmail(value: unknown) {
  if (typeof value !== "string") {
    return null;
  }

  const trimmed = value.trim().toLowerCase();
  return trimmed || null;
}

function isValidEmail(email: string) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
}

export async function POST(request: Request) {
  const payload = await parseJsonObject(request);
  if (payload.data === null) {
    return NextResponse.json({ error: payload.error }, { status: 400 });
  }

  const email = normalizeEmail(payload.data.email);
  if (!email || !isValidEmail(email)) {
    return NextResponse.json(
      {
        error: "Validation failed.",
        fields: {
          email: ["Email must be valid."],
        },
      },
      { status: 400 },
    );
  }

  try {
    const exists = await emailExistsForAuth(email);
    return NextResponse.json({ data: { exists }, error: null, meta: {} });
  } catch (error) {
    if (error instanceof SupabaseAdminConfigError) {
      return NextResponse.json(
        {
          error:
            "Signup email checks are not configured. Set SUPABASE_SERVICE_ROLE_KEY on the server.",
        },
        { status: 503 },
      );
    }

    console.error("[POST /api/auth/check-email]", error);
    return NextResponse.json(
      { error: "Failed to check whether the email already exists." },
      { status: 500 },
    );
  }
}
