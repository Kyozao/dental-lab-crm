"use client";

import { type FormEvent, useEffect, useState } from "react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { UserRole } from "@/generated/prisma/enums";
import {
  assignableRoles,
  roleLabels,
} from "@/features/employees/employee-ui";
import type {
  CreateEmployeePayload,
  EmployeeRole,
} from "@/features/employees/types";

type EmployeeFormProps = {
  open: boolean;
  onSubmit: (payload: CreateEmployeePayload) => Promise<unknown>;
  onSuccess?: () => void | Promise<void>;
};

const initialForm = {
  name: "",
  email: "",
  role: UserRole.PRODUCTION as EmployeeRole,
};

export function EmployeeForm({
  open,
  onSubmit,
  onSuccess,
}: EmployeeFormProps) {
  const [name, setName] = useState(initialForm.name);
  const [email, setEmail] = useState(initialForm.email);
  const [role, setRole] = useState<EmployeeRole>(initialForm.role);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (open) return;
    setName(initialForm.name);
    setEmail(initialForm.email);
    setRole(initialForm.role);
    setError(null);
    setSubmitting(false);
  }, [open]);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setSubmitting(true);
    setError(null);

    try {
      await onSubmit({ name, email, role });
      await onSuccess?.();
    } catch (submitError) {
      setError(
        submitError instanceof Error
          ? submitError.message
          : "Failed to invite employee.",
      );
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <form className="grid gap-4" onSubmit={handleSubmit}>
      <div className="grid gap-2">
        <Label htmlFor="employee-name">Name</Label>
        <Input
          id="employee-name"
          value={name}
          onChange={(event) => setName(event.target.value)}
          placeholder="Ana Silva"
          required
        />
      </div>
      <div className="grid gap-2">
        <Label htmlFor="employee-email">Email</Label>
        <Input
          id="employee-email"
          type="email"
          value={email}
          onChange={(event) => setEmail(event.target.value)}
          placeholder="ana@lab.com"
          required
        />
      </div>
      <div className="grid gap-2">
        <Label htmlFor="employee-role">Role</Label>
        <Select value={role} onValueChange={(value) => setRole(value as EmployeeRole)}>
          <SelectTrigger id="employee-role" className="w-full">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {assignableRoles.map((assignableRole) => (
              <SelectItem key={assignableRole} value={assignableRole}>
                {roleLabels[assignableRole]}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>
      {error ? (
        <p className="text-sm text-destructive">{error}</p>
      ) : null}
      <div className="flex justify-end gap-2">
        <Button type="submit" disabled={submitting}>
          {submitting ? "Sending" : "Send invite"}
        </Button>
      </div>
    </form>
  );
}
