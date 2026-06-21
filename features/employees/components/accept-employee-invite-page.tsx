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
import type { EmployeeInviteDetails } from "@/features/employees/types";

import {
  acceptEmployeeInviteApi,
  getEmployeeInviteDetailsApi,
} from "../services/employee-invites-api";

export function AcceptEmployeeInvitePage() {
  return (
    <Suspense fallback={<AcceptEmployeeInviteSkeleton />}>
      <AcceptEmployeeInviteContent />
    </Suspense>
  );
}

function AcceptEmployeeInviteContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const supabase = useMemo(() => createClient(), []);

  const [invite, setInvite] = useState<EmployeeInviteDetails | null>(null);
  const [name, setName] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [ready, setReady] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;

    async function initializeInvite() {
      setLoading(true);

      const inviteId = searchParams.get("invite");
      const flowContext = readEmployeeInviteFlowContext();

      if (!inviteId || !flowContext) {
        if (!cancelled) {
          setReady(false);
          setError("Open this page from the latest employee invite email link.");
          setLoading(false);
        }
        return;
      }

      const authError = searchParams.get("error_description");
      if (authError) {
        if (!cancelled) {
          setReady(false);
          setError(authError);
          setLoading(false);
        }
        return;
      }

      const {
        data: { session },
      } = await supabase.auth.getSession();

      if (cancelled) return;

      if (!session?.user) {
        setReady(false);
        setError("Open this page from the latest employee invite email link.");
        setLoading(false);
        return;
      }

      if (flowContext.targetUserId && session.user.id !== flowContext.targetUserId) {
        setReady(false);
        setError(
          "This invite belongs to a different account than the one currently signed in. Sign out first or open the invite link in a private window.",
        );
        setLoading(false);
        return;
      }

      try {
        const inviteDetails = await getEmployeeInviteDetailsApi(inviteId);
        if (cancelled) return;

        setInvite(inviteDetails);
        setName(inviteDetails.name);
        setReady(true);
        setError(null);
      } catch (loadError) {
        if (cancelled) return;

        setReady(false);
        setError(
          loadError instanceof Error
            ? loadError.message
            : "Failed to load employee invite.",
        );
      } finally {
        if (!cancelled) {
          setLoading(false);
        }
      }
    }

    void initializeInvite();

    return () => {
      cancelled = true;
    };
  }, [searchParams, supabase]);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    if (!invite) {
      setError("Open this page from the latest employee invite email link.");
      return;
    }

    try {
      setSubmitting(true);
      setError(null);

      if (password.length < 8) {
        throw new Error("Password must be at least 8 characters.");
      }

      if (password !== confirmPassword) {
        throw new Error("Passwords do not match.");
      }

      const { error: updateError } = await supabase.auth.updateUser({
        password,
        data: {
          name: name.trim(),
          full_name: name.trim(),
        },
      });

      if (updateError) {
        throw updateError;
      }

      const result = await acceptEmployeeInviteApi(invite.id, {
        name: name.trim(),
      });

      clearEmployeeInviteFlowCookies();
      router.push(result.redirect_to);
      router.refresh();
    } catch (submitError) {
      setError(
        submitError instanceof Error
          ? submitError.message
          : "Failed to accept employee invite.",
      );
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <main className="flex min-h-screen items-center justify-center bg-muted/20 p-6">
      <div className="w-full max-w-md rounded-xl border border-border/60 bg-background p-6 shadow-sm">
        <div className="mb-6 space-y-2">
          <p className="text-sm font-medium text-muted-foreground">Employee invite</p>
          <h1 className="text-2xl font-semibold">Join your lab workspace</h1>
          <p className="text-sm text-muted-foreground">
            {invite
              ? `Accept your ${invite.role.toLowerCase()} invite to ${invite.lab_name}.`
              : "Open the latest invite email to continue."}
          </p>
        </div>

        {loading ? (
          <div className="space-y-3 text-sm text-muted-foreground">
            <p>Loading invite...</p>
          </div>
        ) : null}

        {!loading && invite ? (
          <form className="space-y-4" onSubmit={(event) => void handleSubmit(event)}>
            <div className="space-y-2">
              <Label htmlFor="employee-invite-email">Email</Label>
              <Input
                id="employee-invite-email"
                value={invite.email}
                disabled
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="employee-invite-name">Name</Label>
              <Input
                id="employee-invite-name"
                value={name}
                onChange={(event) => setName(event.target.value)}
                placeholder="Ana Silva"
                disabled={!ready || submitting}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="employee-invite-password">Create password</Label>
              <Input
                id="employee-invite-password"
                type="password"
                value={password}
                onChange={(event) => setPassword(event.target.value)}
                placeholder="********"
                autoComplete="new-password"
                disabled={!ready || submitting}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="employee-invite-password-confirm">Confirm password</Label>
              <Input
                id="employee-invite-password-confirm"
                type="password"
                value={confirmPassword}
                onChange={(event) => setConfirmPassword(event.target.value)}
                placeholder="********"
                autoComplete="new-password"
                disabled={!ready || submitting}
              />
            </div>

            <Button type="submit" className="w-full" disabled={!ready || submitting}>
              {submitting ? "Joining lab..." : "Accept invite"}
            </Button>
          </form>
        ) : null}

        {error ? <p className="mt-3 text-sm text-destructive">{error}</p> : null}

        <p className="mt-6 text-center text-xs text-muted-foreground">
          <Link href="/login" className="underline underline-offset-4">
            Back to login
          </Link>
        </p>
      </div>
    </main>
  );
}

function readEmployeeInviteFlowContext() {
  if (typeof document === "undefined") {
    return null;
  }

  const flowType = getCookieValue(PASSWORD_SETUP_FLOW_COOKIE);
  if (flowType !== "invite") {
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

function clearEmployeeInviteFlowCookies() {
  document.cookie = `${PASSWORD_SETUP_FLOW_COOKIE}=; Max-Age=0; path=/; SameSite=Lax`;
  document.cookie = `${PASSWORD_SETUP_TARGET_COOKIE}=; Max-Age=0; path=/; SameSite=Lax`;
}

function AcceptEmployeeInviteSkeleton() {
  return (
    <main className="flex min-h-screen items-center justify-center bg-muted/20 p-6">
      <div className="w-full max-w-md rounded-xl border border-border/60 bg-background p-6 shadow-sm">
        <div className="space-y-2">
          <div className="h-4 w-32 rounded bg-muted" />
          <div className="h-8 w-56 rounded bg-muted" />
          <div className="h-4 w-full rounded bg-muted" />
        </div>
      </div>
    </main>
  );
}
