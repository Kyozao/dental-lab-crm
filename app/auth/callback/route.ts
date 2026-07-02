import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

import { syncCurrentAppUser } from "@/app/api/_shared/current-user";
import {
  PASSWORD_SETUP_FLOW_COOKIE,
  PASSWORD_SETUP_TARGET_COOKIE,
} from "@/lib/auth/password-setup-flow";
import { createClient } from "@/lib/supabase/server";

export async function GET(request: NextRequest) {
  const requestUrl = new URL(request.url);
  const code = requestUrl.searchParams.get("code");
  const nextParam = requestUrl.searchParams.get("next");
  const next = nextParam?.startsWith("/") ? nextParam : "/cases";
  const redirectUrl = new URL(next, requestUrl.origin);

  if (!code) {
    redirectUrl.pathname = "/login";
    redirectUrl.searchParams.set("error", "access_denied");
    redirectUrl.searchParams.set("error_description", "Missing authentication code.");
    return createAuthRedirect(redirectUrl, null);
  }

  const supabase = await createClient();
  const { data, error } = await supabase.auth.exchangeCodeForSession(code);

  if (error) {
    redirectUrl.pathname = "/reset-password";
    redirectUrl.searchParams.set("error", "access_denied");
    redirectUrl.searchParams.set("error_description", error.message);
    return createAuthRedirect(redirectUrl, null);
  }

  if (data.user?.email) {
    await syncCurrentAppUser({
      id: data.user.id,
      email: data.user.email,
      name: getUserDisplayName(data.user.user_metadata),
    });
  }

  return createAuthRedirect(
    redirectUrl,
    getFlowTypeForPathname(redirectUrl.pathname),
    data.user?.id ?? data.session?.user.id ?? null,
  );
}

function createAuthRedirect(
  targetUrl: URL,
  flowType: "invite" | "recovery" | null,
  targetUserId?: string | null,
) {
  const response = NextResponse.redirect(targetUrl);

  if (isEmployeeAuthFlowPath(targetUrl.pathname) && flowType) {
    response.cookies.set(PASSWORD_SETUP_FLOW_COOKIE, flowType, {
      httpOnly: false,
      sameSite: "lax",
      path: "/",
      maxAge: 60 * 10,
    });
    response.cookies.set(PASSWORD_SETUP_TARGET_COOKIE, targetUserId ?? "", {
      httpOnly: false,
      sameSite: "lax",
      path: "/",
      maxAge: 60 * 10,
    });
  }

  return response;
}

function getFlowTypeForPathname(pathname: string) {
  if (pathname === "/employee-invite/accept") {
    return "invite";
  }

  if (pathname === "/reset-password") {
    return "recovery";
  }

  return null;
}

function isEmployeeAuthFlowPath(pathname: string) {
  return pathname === "/reset-password" || pathname === "/employee-invite/accept";
}

function getUserDisplayName(metadata: Record<string, unknown> | null | undefined) {
  const candidate = metadata?.name;
  return typeof candidate === "string" && candidate.trim().length > 0
    ? candidate.trim()
    : null;
}
