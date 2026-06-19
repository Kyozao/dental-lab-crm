import type { EmailOtpType } from "@supabase/supabase-js";
import type { NextRequest } from "next/server";
import { NextResponse } from "next/server";

import { createClient } from "@/lib/supabase/server";

export async function GET(request: NextRequest) {
  const requestUrl = new URL(request.url);
  const tokenHash = requestUrl.searchParams.get("token_hash");
  const type = requestUrl.searchParams.get("type") as EmailOtpType | null;
  const next = getSafeNextPath(requestUrl);
  const successRedirectUrl = new URL(next, requestUrl.origin);
  const failureRedirectUrl = new URL(
    type === "recovery" ? "/reset-password" : "/login",
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
  const { error } = await supabase.auth.verifyOtp({
    type,
    token_hash: tokenHash,
  });

  if (error) {
    failureRedirectUrl.searchParams.set("error", "access_denied");
    failureRedirectUrl.searchParams.set("error_description", error.message);
    return NextResponse.redirect(failureRedirectUrl);
  }

  return NextResponse.redirect(successRedirectUrl);
}

function getSafeNextPath(requestUrl: URL) {
  const nextParam = requestUrl.searchParams.get("next");

  if (!nextParam) {
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
