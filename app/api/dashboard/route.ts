import { NextResponse } from "next/server";

import { MissingLabMembershipError } from "../_shared/membership";
import { getAuthenticatedUserId } from "../_shared/request";
import { getDashboardForLoggedLab } from "./dashboard.service";

export async function GET() {
  const user_id = await getAuthenticatedUserId();
  if (!user_id) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  try {
    const dashboard = await getDashboardForLoggedLab(user_id);
    return NextResponse.json({ data: dashboard, error: null, meta: {} });
  } catch (error) {
    if (error instanceof MissingLabMembershipError) {
      return NextResponse.json({ error: "No lab membership found for this user." }, { status: 403 });
    }

    console.error("[GET /api/dashboard]", error);
    return NextResponse.json({ error: "Failed to load dashboard." }, { status: 500 });
  }
}
