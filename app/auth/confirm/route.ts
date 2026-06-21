import type { EmailOtpType } from "@supabase/supabase-js";
import type { NextRequest } from "next/server";
import { NextResponse } from "next/server";

import {
  PASSWORD_SETUP_FLOW_COOKIE,
  PASSWORD_SETUP_TARGET_COOKIE,
  type PasswordSetupFlowType,
} from "@/lib/auth/password-setup-flow";
import { createClient } from "@/lib/supabase/server";

export async function GET(request: NextRequest) {
  const requestUrl = new URL(request.url);
  const tokenHash = requestUrl.searchParams.get("token_hash");
  const type = requestUrl.searchParams.get("type") as EmailOtpType | null;
  const next = getSafeNextPath(requestUrl, type);
  const successRedirectUrl = new URL(next, requestUrl.origin);
  const failureRedirectUrl = new URL(
    getFailureRedirectPath(next, type),
    requestUrl.origin,
  );

  if (!tokenHash || !type) {
    failureRedirectUrl.searchParams.set("error", "access_denied");
    failureRedirectUrl.searchParams.set(
      "error_description",
      "Missing or invalid confirmation link.",
    );
    return NextResponse.redirect(failureRedirectUrl);
  }

  const supabase = await createClient();
  const { data, error } = await supabase.auth.verifyOtp({
    type,
    token_hash: tokenHash,
  });
  const flowType = getPasswordSetupFlowType(type);

  if (error) {
    failureRedirectUrl.searchParams.set("error", "access_denied");
    failureRedirectUrl.searchParams.set("error_description", error.message);
    return createAuthRedirect(failureRedirectUrl, flowType);
  }

  return createAuthRedirect(
    successRedirectUrl,
    flowType,
    data.user?.id ?? data.session?.user.id ?? null,
  );
}

function getSafeNextPath(requestUrl: URL, type: EmailOtpType | null) {
  const nextParam = requestUrl.searchParams.get("next");

  if (!nextParam) {
    if (type === "recovery") {
      return "/reset-password";
    }

    return "/cases";
  }

  if (nextParam.startsWith("/")) {
    return nextParam;
  }

  try {
    const absoluteNext = new URL(nextParam);
    if (absoluteNext.origin !== requestUrl.origin) {
      return "/cases";
    }

    return `${absoluteNext.pathname}${absoluteNext.search}${absoluteNext.hash}`;
  } catch {
    return "/cases";
  }
}

function getFailureRedirectPath(next: string, type: EmailOtpType | null) {
  if (type === "invite" && next.startsWith("/employee-invite/accept")) {
    return next;
  }

  if (type === "recovery") {
    return "/reset-password";
  }

  return "/login";
}

function getPasswordSetupFlowType(
  type: EmailOtpType | null,
): PasswordSetupFlowType | null {
  if (type === "invite") {
    return "invite";
  }

  if (type === "recovery") {
    return "recovery";
  }

  return null;
}

function createAuthRedirect(
  targetUrl: URL,
  flowType: PasswordSetupFlowType | null,
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

function isEmployeeAuthFlowPath(pathname: string) {
  return pathname === "/reset-password" || pathname === "/employee-invite/accept";
}
