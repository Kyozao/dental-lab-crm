"use client";

import { type FormEvent, useEffect, useState } from "react";

import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { ApiError } from "@/lib/api";

import type { DentistPayload } from "@/features/customers/types";

type DentistFormProps = {
  open: boolean;
  submitLabel: string;
  submitErrorMessage: string;
  initialValue?: DentistPayload;
  onSubmit: (payload: DentistPayload) => Promise<unknown>;
  onSuccess?: () => void | Promise<void>;
};

const defaultValue: DentistPayload = {
  name: "",
  phone: "",
  email: "",
  notes: "",
  is_active: true,
};

export function DentistForm({
  open,
  submitLabel,
  submitErrorMessage,
  initialValue,
  onSubmit,
  onSuccess,
}: DentistFormProps) {
  const [name, setName] = useState(defaultValue.name);
  const [phone, setPhone] = useState(defaultValue.phone);
  const [email, setEmail] = useState(defaultValue.email);
  const [notes, setNotes] = useState(defaultValue.notes);
  const [isActive, setIsActive] = useState(defaultValue.is_active);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [fieldErrors, setFieldErrors] = useState<Record<string, string[]> | null>(null);

  useEffect(() => {
    const value = initialValue ?? defaultValue;

    setName(value.name);
    setPhone(value.phone);
    setEmail(value.email);
    setNotes(value.notes);
    setIsActive(value.is_active);
    setSubmitting(false);
    setError(null);
    setFieldErrors(null);
  }, [initialValue, open]);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setSubmitting(true);
    setError(null);
    setFieldErrors(null);

    try {
      await onSubmit({
        name,
        phone,
        email,
        notes,
        is_active: isActive,
      });
      await onSuccess?.();
    } catch (submitError) {
      if (submitError instanceof ApiError) {
        setError(submitError.message);
        setFieldErrors(submitError.fields ?? null);
      } else {
        setError(
          submitError instanceof Error ? submitError.message : submitErrorMessage,
        );
      }
    } finally {
      setSubmitting(false);
    }
  }

  function renderFieldErrors(field: string) {
    return fieldErrors?.[field]?.map((fieldError) => (
      <p key={fieldError} className="text-sm text-destructive">
        {fieldError}
      </p>
    ));
  }

  return (
    <form className="grid gap-4" onSubmit={handleSubmit}>
      <div className="grid gap-2">
        <Label htmlFor="dentist-name">Name</Label>
        <Input
          id="dentist-name"
          value={name}
          onChange={(event) => setName(event.target.value)}
          placeholder="Dr. Ana Souza"
          required
        />
        {renderFieldErrors("name")}
      </div>

      <div className="grid gap-2 sm:grid-cols-2">
        <div className="grid gap-2">
          <Label htmlFor="dentist-phone">Phone</Label>
          <Input
            id="dentist-phone"
            value={phone}
            onChange={(event) => setPhone(event.target.value)}
            placeholder="+55 11 99999-9999"
          />
          {renderFieldErrors("phone")}
        </div>

        <div className="grid gap-2">
          <Label htmlFor="dentist-email">Email</Label>
          <Input
            id="dentist-email"
            type="email"
            value={email}
            onChange={(event) => setEmail(event.target.value)}
            placeholder="dentist@customer.com"
          />
          {renderFieldErrors("email")}
        </div>
      </div>

      <div className="grid gap-2">
        <Label htmlFor="dentist-notes">Notes</Label>
        <Textarea
          id="dentist-notes"
          value={notes}
          onChange={(event) => setNotes(event.target.value)}
          placeholder="Chairside preferences or communication notes."
          rows={4}
        />
        {renderFieldErrors("notes")}
      </div>

      <div className="flex items-center gap-2">
        <Checkbox
          id="dentist-is-active"
          checked={isActive}
          onCheckedChange={(checked) => setIsActive(checked === true)}
        />
        <Label htmlFor="dentist-is-active" className="font-normal">
          Dentist is active
        </Label>
      </div>

      {error ? <p className="text-sm text-destructive">{error}</p> : null}

      <div className="flex justify-end">
        <Button type="submit" disabled={submitting}>
          {submitting ? "Saving" : submitLabel}
        </Button>
      </div>
    </form>
  );
}
