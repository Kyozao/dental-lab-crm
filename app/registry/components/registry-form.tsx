"use client";

import { useActionState, useEffect, useRef } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Alert, AlertDescription } from "@/components/ui/alert";
import type { RegistryActionState } from "../actions";

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
  action: (prevState: RegistryActionState, formData: FormData) => Promise<RegistryActionState>;
  fields: Array<{
    name: string;
    label: string;
    type?: "text" | "email" | "number" | "checkbox" | "textarea";
    placeholder?: string;
    optional?: boolean;
    pattern?: string;
  }>;
  submitLabel?: string;
};

export function RegistryForm({
  title,
  description,
  action,
  fields,
  submitLabel = "Create",
}: Props) {
  const [state, formAction, pending] = useActionState(action, {
    success: false,
    message: "",
  });

  const formRef = useRef<HTMLFormElement>(null);

  useEffect(() => {
    if (state.success) {
      formRef.current?.reset();
    }
  }, [state.success]);

  return (
    <Card className="w-full">
      <CardHeader>
        <CardTitle>{title}</CardTitle>
        {description && <p className="text-sm text-gray-500">{description}</p>}
      </CardHeader>
      <CardContent>
        <form ref={formRef} action={formAction} className="space-y-4">
          {state.message && (
            <Alert
              className={state.success ? "border-green-200 bg-green-50" : "border-red-200 bg-red-50"}
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
                {field.optional && <span className="text-gray-400"> (optional)</span>}
              </Label>

              {field.type === "textarea" ? (
                <Textarea
                  id={field.name}
                  name={field.name}
                  placeholder={field.placeholder}
                  rows={3}
                  required={!field.optional}
                />
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
