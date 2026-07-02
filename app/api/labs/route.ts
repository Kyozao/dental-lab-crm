import { NextResponse } from "next/server";

import { syncCurrentAppUser } from "../_shared/current-user";
import { getAuthenticatedUser, parseJsonObject } from "../_shared/request";
import { createLabForUser, UserAlreadyHasLabError } from "./labs.service";
import { parseCreateLabInput } from "./labs.schemas";

export async function POST(request: Request) {
  const user = await getAuthenticatedUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const payload = await parseJsonObject(request);
  if (payload.data === null) {
    return NextResponse.json({ error: payload.error }, { status: 400 });
  }

  const parsed = parseCreateLabInput(payload.data);
  if (!parsed.success) {
    return NextResponse.json(
      { error: "Validation failed.", fields: parsed.errors },
      { status: 400 },
    );
  }

  try {
    await syncCurrentAppUser(user);
    const lab = await createLabForUser(user.id, parsed.data);
    return NextResponse.json({ data: lab, error: null, meta: {} }, { status: 201 });
  } catch (error) {
    if (error instanceof UserAlreadyHasLabError) {
      return NextResponse.json(
        { error: "This user already has a lab membership." },
        { status: 409 },
      );
    }

    console.error("[POST /api/labs]", error);
    return NextResponse.json({ error: "Failed to create lab." }, { status: 500 });
  }
}
