"use client";

import { type FormEvent, useEffect, useState } from "react";

import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { ApiError } from "@/lib/api";
import {
  listPriceTablesApi,
  type PriceTableListItem,
} from "@/features/services/services-api";

import type { CustomerPayload } from "@/features/customers/types";

type CustomerFormProps = {
  open: boolean;
  submitLabel: string;
  submitErrorMessage: string;
  initialValue?: CustomerPayload;
  onSubmit: (payload: CustomerPayload) => Promise<unknown>;
  onSuccess?: () => void | Promise<void>;
};

const defaultValue: CustomerPayload = {
  name: "",
  phone: "",
  email: "",
  notes: "",
  price_table_id: null,
  is_active: true,
};

export function CustomerForm({
  open,
  submitLabel,
  submitErrorMessage,
  initialValue,
  onSubmit,
  onSuccess,
}: CustomerFormProps) {
  const [name, setName] = useState(defaultValue.name);
  const [phone, setPhone] = useState(defaultValue.phone);
  const [email, setEmail] = useState(defaultValue.email);
  const [notes, setNotes] = useState(defaultValue.notes);
  const [priceTableId, setPriceTableId] = useState<string>(defaultValue.price_table_id ?? "");
  const [isActive, setIsActive] = useState(defaultValue.is_active);
  const [priceTables, setPriceTables] = useState<PriceTableListItem[]>([]);
  const [loadingPriceTables, setLoadingPriceTables] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [fieldErrors, setFieldErrors] = useState<Record<string, string[]> | null>(null);

  useEffect(() => {
    if (!open) {
      const value = initialValue ?? defaultValue;
      setName(value.name);
      setPhone(value.phone);
      setEmail(value.email);
      setNotes(value.notes);
      setPriceTableId(value.price_table_id ?? "");
      setIsActive(value.is_active);
      setSubmitting(false);
      setError(null);
      setFieldErrors(null);
      return;
    }

    const value = initialValue ?? defaultValue;
    setName(value.name);
    setPhone(value.phone);
    setEmail(value.email);
    setNotes(value.notes);
    setPriceTableId(value.price_table_id ?? "");
    setIsActive(value.is_active);
    setError(null);
    setFieldErrors(null);
  }, [initialValue, open]);

  useEffect(() => {
    if (!open) return;

    let cancelled = false;
    setLoadingPriceTables(true);

    void listPriceTablesApi()
      .then((items) => {
        if (cancelled) return;
        setPriceTables(items);
      })
      .catch(() => {
        if (cancelled) return;
        setPriceTables([]);
      })
      .finally(() => {
        if (cancelled) return;
        setLoadingPriceTables(false);
      });

    return () => {
      cancelled = true;
    };
  }, [open]);

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
        price_table_id: priceTableId || null,
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
        <Label htmlFor="customer-name">Name</Label>
        <Input
          id="customer-name"
          value={name}
          onChange={(event) => setName(event.target.value)}
          placeholder="Dental Studio Sao Paulo"
          required
        />
        {renderFieldErrors("name")}
      </div>

      <div className="grid gap-2 sm:grid-cols-2">
        <div className="grid gap-2">
          <Label htmlFor="customer-phone">Phone</Label>
          <Input
            id="customer-phone"
            value={phone}
            onChange={(event) => setPhone(event.target.value)}
            placeholder="+55 11 99999-9999"
          />
          {renderFieldErrors("phone")}
        </div>

        <div className="grid gap-2">
          <Label htmlFor="customer-email">Email</Label>
          <Input
            id="customer-email"
            type="email"
            value={email}
            onChange={(event) => setEmail(event.target.value)}
            placeholder="contact@clinic.com"
          />
          {renderFieldErrors("email")}
        </div>
      </div>

      <div className="grid gap-2">
        <Label htmlFor="customer-notes">Notes</Label>
        <Textarea
          id="customer-notes"
          value={notes}
          onChange={(event) => setNotes(event.target.value)}
          placeholder="Important billing or communication notes."
          rows={4}
        />
        {renderFieldErrors("notes")}
      </div>

      <div className="grid gap-2">
        <Label htmlFor="customer-price-table">Price table</Label>
        <select
          id="customer-price-table"
          value={priceTableId}
          onChange={(event) => setPriceTableId(event.target.value)}
          className="flex h-10 w-full rounded-md border bg-background px-3 py-2 text-sm disabled:opacity-60"
          disabled={loadingPriceTables}
        >
          <option value="">Use service base prices</option>
          {priceTables.map((priceTable) => (
            <option key={priceTable.id} value={priceTable.id}>
              {priceTable.name}
            </option>
          ))}
        </select>
        <p className="text-xs text-muted-foreground">
          {loadingPriceTables
            ? "Loading available price tables..."
            : "Optional. When assigned, new case prices default from this table before service base prices."}
        </p>
        {renderFieldErrors("price_table_id")}
      </div>

      <div className="flex items-center gap-2">
        <Checkbox
          id="customer-is-active"
          checked={isActive}
          onCheckedChange={(checked) => setIsActive(checked === true)}
        />
        <Label htmlFor="customer-is-active" className="font-normal">
          Customer is active
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
