"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

type FieldErrors = {
  name?: string[];
};

type ApiError = {
  error?: string;
  fields?: FieldErrors;
};

export function CreateLabForm() {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [name, setName] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [fieldErrors, setFieldErrors] = useState<FieldErrors>({});

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError(null);
    setFieldErrors({});

    const response = await fetch("/api/labs", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name }),
    });

    if (!response.ok) {
      const payload = (await response.json().catch(() => ({}))) as ApiError;
      setError(payload.error ?? "Failed to create lab.");
      setFieldErrors(payload.fields ?? {});
      return;
    }

    startTransition(() => {
      router.replace("/cases");
      router.refresh();
    });
  }

  return (
    <form className="space-y-5" onSubmit={handleSubmit}>
      <div className="space-y-2">
        <Label htmlFor="lab-name">Lab name</Label>
        <Input
          id="lab-name"
          name="name"
          value={name}
          onChange={(event) => setName(event.target.value)}
          placeholder="Vela Dental Lab"
          autoComplete="organization"
          aria-invalid={Boolean(fieldErrors.name?.length)}
        />
        {fieldErrors.name?.[0] ? (
          <p className="text-sm text-destructive">{fieldErrors.name[0]}</p>
        ) : null}
      </div>

      {error ? <p className="text-sm text-destructive">{error}</p> : null}

      <Button type="submit" className="w-full" disabled={isPending}>
        {isPending ? "Creating..." : "Create lab"}
      </Button>
    </form>
  );
}
