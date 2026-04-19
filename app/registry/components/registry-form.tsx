"use client";

import { useEffect, useRef, useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { createRegistryEntity } from "./registry-api";
import type { RegistryActionState } from "./registry-types";
import type { RegistryEntity } from "./registry-types";

type FormErrors = Record<string, string[]> | undefined;

function ErrorText({ errors, field }: { errors?: FormErrors; field: string }) {
  const fieldErrors = errors?.[field];
  if (!fieldErrors?.length) return null;

  return (
    <>
      {fieldErrors.map((error) => (
        <p key={error} className="text-sm text-red-500">
          {error}
        </p>
      ))}
    </>
  );
}

type Props = {
  title: string;
  description?: string;
  entity: RegistryEntity;
  fields: Array<{
    name: string;
    label: string;
    type?: "text" | "email" | "number" | "checkbox" | "textarea" | "select";
    placeholder?: string;
    optional?: boolean;
    pattern?: string;
    options?: Array<{ value: string; label: string }>;
  }>;
  submitLabel?: string;
};

export function RegistryForm({
  title,
  description,
  entity,
  fields,
  submitLabel = "Create",
}: Props) {
  const [state, setState] = useState<RegistryActionState>({
    success: false,
    message: "",
  });
  const [pending, setPending] = useState(false);

  const formRef = useRef<HTMLFormElement>(null);

  useEffect(() => {
    if (state.success) {
      formRef.current?.reset();
    }
  }, [state.success]);

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setPending(true);
    const formData = new FormData(event.currentTarget);
    const result = await createRegistryEntity(entity, formData);
    setState(result);
    setPending(false);
  }

  return (
    <Card className="w-full">
      <CardHeader>
        <CardTitle>{title}</CardTitle>
        {description && <p className="text-sm text-gray-500">{description}</p>}
      </CardHeader>
      <CardContent>
        <form ref={formRef} onSubmit={handleSubmit} className="space-y-4">
          {state.message && (
            <Alert
              className={
                state.success
                  ? "border-green-200 bg-green-50"
                  : "border-red-200 bg-red-50"
              }
            >
              <AlertDescription
                className={state.success ? "text-green-800" : "text-red-800"}
              >
                {state.message}
              </AlertDescription>
            </Alert>
          )}

          {fields.map((field) => (
            <div key={field.name} className="space-y-2">
              <Label htmlFor={field.name}>
                {field.label}
                {field.optional && (
                  <span className="text-gray-400"> (optional)</span>
                )}
              </Label>

              {field.type === "textarea" ? (
                <Textarea
                  id={field.name}
                  name={field.name}
                  placeholder={field.placeholder}
                  rows={3}
                  required={!field.optional}
                />
              ) : field.type === "select" ? (
                <select
                  id={field.name}
                  name={field.name}
                  required={!field.optional}
                  defaultValue=""
                  className="flex h-10 w-full rounded-md border bg-background px-3 py-2 text-sm"
                >
                  <option value="" disabled>
                    {field.placeholder ?? "Select an option"}
                  </option>
                  {field.options?.map((option) => (
                    <option key={option.value} value={option.value}>
                      {option.label}
                    </option>
                  ))}
                </select>
              ) : field.type === "checkbox" ? (
                <div className="flex items-center space-x-2">
                  <input
                    type="checkbox"
                    id={field.name}
                    name={field.name}
                    defaultChecked={true}
                    value="on"
                    className="h-4 w-4 rounded border-gray-300"
                  />
                  <Label htmlFor={field.name} className="font-normal">
                    {field.placeholder || field.label}
                  </Label>
                </div>
              ) : (
                <Input
                  id={field.name}
                  name={field.name}
                  type={field.type || "text"}
                  placeholder={field.placeholder}
                  pattern={field.pattern}
                  required={!field.optional}
                />
              )}

              <ErrorText errors={state.errors} field={field.name} />
            </div>
          ))}

          <Button type="submit" disabled={pending} className="w-full">
            {pending ? "Creating..." : submitLabel}
          </Button>
        </form>
      </CardContent>
    </Card>
  );
}
