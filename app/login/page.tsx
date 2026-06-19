"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import type { FormEvent } from "react";
import { useMemo, useState } from "react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { createClient } from "@/lib/supabase/client";

type AuthMode = "login" | "signup" | "forgot";

export default function LoginPage() {
  const router = useRouter();
  const supabase = useMemo(() => createClient(), []);

  const [mode, setMode] = useState<AuthMode>("login");
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    try {
      setSubmitting(true);
      setError(null);
      setMessage(null);

      if (mode === "login") {
        const { error: loginError } = await supabase.auth.signInWithPassword({
          email: email.trim(),
          password,
        });

        if (loginError) {
          throw loginError;
        }

        router.push(await getPostLoginPath());
        router.refresh();
        return;
      }

      if (mode === "signup") {
        const emailRedirectTo =
          typeof window !== "undefined"
            ? `${window.location.origin}/onboarding/lab`
            : undefined;

        const { data, error: signUpError } = await supabase.auth.signUp({
          email: email.trim(),
          password,
          options: {
            data: {
              full_name: name.trim(),
            },
            emailRedirectTo,
          },
        });

        if (signUpError) {
          throw signUpError;
        }

        if (data.session) {
          router.push("/onboarding/lab");
          router.refresh();
          return;
        }

        setMessage("Account created. Check your email to confirm your sign up.");
        setMode("login");
        return;
      }

      if (mode === "forgot") {
        const redirectTo =
          typeof window !== "undefined"
            ? `${window.location.origin}/reset-password`
            : undefined;

        const { error: resetError } = await supabase.auth.resetPasswordForEmail(
          email.trim(),
          { redirectTo },
        );

        if (resetError) {
          throw resetError;
        }

        setMessage("Password reset link sent. Check your email to continue.");
        return;
      }

    } catch (submitError) {
      setError(
        submitError instanceof Error
          ? submitError.message
          : "Authentication failed.",
      );
    } finally {
      setSubmitting(false);
    }
  }

  function resetFeedback() {
    setError(null);
    setMessage(null);
  }

  return (
    <main className="flex min-h-screen items-center justify-center bg-muted/20 p-6">
      <div className="w-full max-w-md rounded-xl border border-border/60 bg-background p-6 shadow-sm">
        <div className="mb-6 space-y-2">
          <h1 className="text-2xl font-semibold">
            {mode === "forgot"
              ? "Reset your password"
              : "Welcome back"}
          </h1>
          <p className="text-sm text-muted-foreground">
            {mode === "forgot"
              ? "Enter your email and we will send you a password reset link."
              : "Sign in to access your dental lab workspace or create a new account."}
          </p>
        </div>

        <form onSubmit={(event) => void handleSubmit(event)}>
          {mode === "login" || mode === "signup" ? (
            <Tabs
              value={mode}
              onValueChange={(value) => {
                setMode(value as Extract<AuthMode, "login" | "signup">);
                resetFeedback();
              }}
              className="space-y-4"
            >
              <TabsList className="grid w-full grid-cols-2">
                <TabsTrigger value="login">Login</TabsTrigger>
                <TabsTrigger value="signup">Sign up</TabsTrigger>
              </TabsList>

              <TabsContent value="login" className="space-y-4">
                <AuthFields
                  showName={false}
                  showPassword
                  showConfirmPassword={false}
                  name={name}
                  email={email}
                  password={password}
                  confirmPassword=""
                  onNameChange={setName}
                  onEmailChange={setEmail}
                  onPasswordChange={setPassword}
                  onConfirmPasswordChange={() => {}}
                />
                <button
                  type="button"
                  className="text-sm text-muted-foreground underline underline-offset-4"
                  onClick={() => {
                    setMode("forgot");
                    setPassword("");
                    resetFeedback();
                  }}
                >
                  Forgot my password
                </button>
              </TabsContent>

              <TabsContent value="signup" className="space-y-4">
                <AuthFields
                  showName
                  showPassword
                  showConfirmPassword={false}
                  name={name}
                  email={email}
                  password={password}
                  confirmPassword=""
                  onNameChange={setName}
                  onEmailChange={setEmail}
                  onPasswordChange={setPassword}
                  onConfirmPasswordChange={() => {}}
                />
              </TabsContent>
            </Tabs>
          ) : (
            <div className="space-y-4">
              <AuthFields
                showName={false}
                showPassword={false}
                showConfirmPassword={false}
                name={name}
                email={email}
                password=""
                confirmPassword=""
                onNameChange={setName}
                onEmailChange={setEmail}
                onPasswordChange={() => {}}
                onConfirmPasswordChange={() => {}}
                emailDisabled={false}
              />

              {mode === "forgot" ? (
                <button
                  type="button"
                  className="text-sm text-muted-foreground underline underline-offset-4"
                  onClick={() => {
                    setMode("login");
                    resetFeedback();
                  }}
                >
                  Back to login
                </button>
              ) : null}
            </div>
          )}

          <Button type="submit" className="mt-4 w-full" disabled={submitting}>
            {submitting
              ? mode === "login"
                ? "Logging in..."
                : mode === "signup"
                  ? "Creating account..."
                  : "Sending link..."
              : mode === "login"
                ? "Login"
                : mode === "signup"
                  ? "Create account"
                  : "Send reset link"}
          </Button>
        </form>

        {error ? <p className="mt-3 text-sm text-destructive">{error}</p> : null}
        {message ? <p className="mt-3 text-sm text-emerald-700">{message}</p> : null}

        <p className="mt-6 text-center text-xs text-muted-foreground">
          Need help after signup? You&apos;ll be sent to lab onboarding once your session is active.
        </p>
        <p className="mt-2 text-center text-xs text-muted-foreground">
          <Link href="/" className="underline underline-offset-4">
            Back to home
          </Link>
        </p>
      </div>
    </main>
  );
}

async function getPostLoginPath() {
  const response = await fetch("/api/labs/current");

  if (response.status === 403 || response.status === 404) {
    const casesResponse = await fetch("/api/cases");
    return casesResponse.ok ? "/cases" : "/onboarding/lab";
  }

  if (!response.ok) {
    return "/cases";
  }

  const body = (await response.json().catch(() => null)) as {
    data?: { currentUserRole?: string | null };
  } | null;

  return body?.data?.currentUserRole === "PRODUCTION"
    ? "/production"
    : "/cases";
}

function AuthFields({
  showName,
  showPassword,
  showConfirmPassword,
  name,
  email,
  password,
  confirmPassword,
  onNameChange,
  onEmailChange,
  onPasswordChange,
  onConfirmPasswordChange,
  emailDisabled = false,
}: {
  showName: boolean;
  showPassword: boolean;
  showConfirmPassword: boolean;
  name: string;
  email: string;
  password: string;
  confirmPassword: string;
  onNameChange: (value: string) => void;
  onEmailChange: (value: string) => void;
  onPasswordChange: (value: string) => void;
  onConfirmPasswordChange: (value: string) => void;
  emailDisabled?: boolean;
}) {
  return (
    <div className="space-y-4">
      {showName ? (
        <div className="space-y-2">
          <Label htmlFor="auth-name">Name</Label>
          <Input
            id="auth-name"
            value={name}
            onChange={(event) => onNameChange(event.target.value)}
            placeholder="Maria Silva"
          />
        </div>
      ) : null}

      <div className="space-y-2">
        <Label htmlFor="auth-email">Email</Label>
        <Input
          id="auth-email"
          type="email"
          value={email}
          disabled={emailDisabled}
          onChange={(event) => onEmailChange(event.target.value)}
          placeholder="you@lab.com"
        />
      </div>

      {showPassword ? (
        <div className="space-y-2">
          <Label htmlFor="auth-password">Password</Label>
          <Input
            id="auth-password"
            type="password"
            value={password}
            onChange={(event) => onPasswordChange(event.target.value)}
            placeholder="********"
          />
        </div>
      ) : null}

      {showConfirmPassword ? (
        <div className="space-y-2">
          <Label htmlFor="auth-confirm-password">Confirm password</Label>
          <Input
            id="auth-confirm-password"
            type="password"
            value={confirmPassword}
            onChange={(event) => onConfirmPasswordChange(event.target.value)}
            placeholder="********"
          />
        </div>
      ) : null}
    </div>
  );
}
