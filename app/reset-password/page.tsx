"use client";

import Link from "next/link";
import type { FormEvent } from "react";
import { Suspense, useEffect, useMemo, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  PASSWORD_SETUP_FLOW_COOKIE,
  PASSWORD_SETUP_TARGET_COOKIE,
  type PasswordSetupFlowType,
} from "@/lib/auth/password-setup-flow";
import { createClient } from "@/lib/supabase/client";

export default function ResetPasswordPage() {
  return (
    <Suspense fallback={<ResetPasswordSkeleton />}>
      <ResetPasswordContent />
    </Suspense>
  );
}

function ResetPasswordContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const supabase = useMemo(() => createClient(), []);

  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [recoveryReady, setRecoveryReady] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;

    async function initializeRecovery() {
      const hash = typeof window !== "undefined" ? window.location.hash : "";
      const hashParams = new URLSearchParams(hash.startsWith("#") ? hash.slice(1) : hash);
      const authError = getAuthErrorMessage(searchParams, hashParams);
      const flowContext = readPasswordSetupFlowContext();

      if (authError) {
        setRecoveryReady(false);
        setError(authError);
        return;
      }

      if (hash.includes("type=recovery")) {
        const accessToken = hashParams.get("access_token");
        const refreshToken = hashParams.get("refresh_token");

        if (!accessToken || !refreshToken) {
          if (cancelled) return;

          setRecoveryReady(false);
          setError(hashParams.get("error_description") ?? "Invalid password reset link.");
          return;
        }

        const { error: sessionError } = await supabase.auth.setSession({
          access_token: accessToken,
          refresh_token: refreshToken,
        });

        if (cancelled) return;

        if (sessionError) {
          setRecoveryReady(false);
          setError(sessionError.message);
          return;
        }

        setRecoveryReady(true);
        setError(null);
        setMessage("Choose a new password for your account.");
        return;
      }

      const {
        data: { session },
      } = await supabase.auth.getSession();

      if (cancelled) return;

      if (!flowContext || !session?.user) {
        setRecoveryReady(false);
        setError("Open this page from the latest password reset email link.");
        return;
      }

      if (flowContext.targetUserId && session.user.id !== flowContext.targetUserId) {
        setRecoveryReady(false);
        setError(getSessionCollisionMessage(flowContext.type));
        return;
      }

      setRecoveryReady(true);
      setError(null);
      setMessage("Choose a new password for your account.");
    }

    void initializeRecovery();

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((event) => {
      if (event === "PASSWORD_RECOVERY") {
        setRecoveryReady(true);
        setError(null);
        setMessage("Choose a new password for your account.");
      }
    });

    return () => {
      cancelled = true;
      subscription.unsubscribe();
    };
  }, [searchParams, supabase]);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    try {
      setSubmitting(true);
      setError(null);
      setMessage(null);

      if (!recoveryReady) {
        throw new Error("Open this page from the password reset email link.");
      }

      if (password.length < 8) {
        throw new Error("Password must be at least 8 characters.");
      }

      if (password !== confirmPassword) {
        throw new Error("Passwords do not match.");
      }

      const { error: updateError } = await supabase.auth.updateUser({
        password,
      });

      if (updateError) {
        throw updateError;
      }

      const { error: signOutError } = await supabase.auth.signOut();

      if (signOutError) {
        throw new Error(
          "Password updated, but we could not sign you out automatically. Close this tab and log in again with your new password.",
        );
      }

      clearPasswordSetupFlowCookies();
      setMessage("Password updated. Redirecting you back to login.");
      setPassword("");
      setConfirmPassword("");
      window.setTimeout(() => {
        router.push("/login");
      }, 1200);
    } catch (submitError) {
      setError(
        submitError instanceof Error
          ? submitError.message
          : "Failed to reset password.",
      );
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <main className="flex min-h-screen items-center justify-center bg-muted/20 p-6">
      <div className="w-full max-w-md rounded-xl border border-border/60 bg-background p-6 shadow-sm">
        <div className="mb-6 space-y-2">
          <h1 className="text-2xl font-semibold">Choose a new password</h1>
          <p className="text-sm text-muted-foreground">
            Set a new password to recover access to your dental lab workspace.
          </p>
        </div>

        <form className="space-y-4" onSubmit={(event) => void handleSubmit(event)}>
          <div className="space-y-2">
            <Label htmlFor="reset-password">New password</Label>
            <Input
              id="reset-password"
              type="password"
              value={password}
              onChange={(event) => setPassword(event.target.value)}
              placeholder="********"
              autoComplete="new-password"
              disabled={!recoveryReady || submitting}
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="reset-password-confirm">Confirm password</Label>
            <Input
              id="reset-password-confirm"
              type="password"
              value={confirmPassword}
              onChange={(event) => setConfirmPassword(event.target.value)}
              placeholder="********"
              autoComplete="new-password"
              disabled={!recoveryReady || submitting}
            />
          </div>

          <Button type="submit" className="w-full" disabled={!recoveryReady || submitting}>
            {submitting ? "Updating password..." : "Update password"}
          </Button>
        </form>

        {error ? <p className="mt-3 text-sm text-destructive">{error}</p> : null}
        {message ? <p className="mt-3 text-sm text-emerald-700">{message}</p> : null}

        {!recoveryReady ? (
          <div className="mt-4 space-y-2 text-sm text-muted-foreground">
            <p>This page works only from a valid, unused password reset email link.</p>
            <Link href="/login" className="inline-flex underline underline-offset-4">
              Request a new reset link
            </Link>
          </div>
        ) : null}

        <p className="mt-6 text-center text-xs text-muted-foreground">
          <Link href="/login" className="underline underline-offset-4">
            Back to login
          </Link>
        </p>
      </div>
    </main>
  );
}

function readPasswordSetupFlowContext() {
  if (typeof document === "undefined") {
    return null;
  }

  const flowType = getCookieValue(PASSWORD_SETUP_FLOW_COOKIE);
  if (flowType !== "invite" && flowType !== "recovery") {
    return null;
  }

  return {
    type: flowType as PasswordSetupFlowType,
    targetUserId: getCookieValue(PASSWORD_SETUP_TARGET_COOKIE) || null,
  };
}

function getCookieValue(name: string) {
  const cookiePrefix = `${name}=`;

  for (const cookie of document.cookie.split(";")) {
    const trimmedCookie = cookie.trim();
    if (trimmedCookie.startsWith(cookiePrefix)) {
      return decodeURIComponent(trimmedCookie.slice(cookiePrefix.length));
    }
  }

  return "";
}

function clearPasswordSetupFlowCookies() {
  document.cookie = `${PASSWORD_SETUP_FLOW_COOKIE}=; Max-Age=0; path=/; SameSite=Lax`;
  document.cookie = `${PASSWORD_SETUP_TARGET_COOKIE}=; Max-Age=0; path=/; SameSite=Lax`;
}

function getSessionCollisionMessage(type: PasswordSetupFlowType) {
  return type === "invite"
    ? "This invite belongs to a different account than the one currently signed in. Sign out first or open the invite link in a private window."
    : "This password reset link belongs to a different account than the one currently signed in. Sign out first or open the link in a private window.";
}

function getAuthErrorMessage(
  searchParams: URLSearchParams,
  hashParams: URLSearchParams,
) {
  const errorCode = searchParams.get("error_code") ?? hashParams.get("error_code");
  const errorDescription =
    searchParams.get("error_description") ?? hashParams.get("error_description");

  if (!errorCode && !errorDescription) {
    return null;
  }

  if (errorCode === "otp_expired") {
    return "That password reset link is invalid or has expired. Request a new reset link and use the latest email.";
  }

  return errorDescription ?? "That password reset link is invalid. Request a new reset link.";
}

function ResetPasswordSkeleton() {
  return (
    <main className="flex min-h-screen items-center justify-center bg-muted/20 p-6">
      <div className="w-full max-w-md rounded-xl border border-border/60 bg-background p-6 shadow-sm">
        <div className="space-y-2">
          <div className="h-8 w-56 rounded bg-muted" />
          <div className="h-4 w-full rounded bg-muted" />
        </div>
      </div>
    </main>
  );
}
