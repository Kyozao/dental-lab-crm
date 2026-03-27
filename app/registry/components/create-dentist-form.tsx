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

type Clinic = {
  id: string;
  name: string;
};

type Props = {
  action: (prevState: RegistryActionState, formData: FormData) => Promise<RegistryActionState>;
  clinics: Clinic[];
};

export function CreateDentistForm({ action, clinics }: Props) {
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
        <CardTitle>Add New Dentist</CardTitle>
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

          <div className="space-y-2">
            <Label htmlFor="clinicId">Clinic</Label>
            <select
              id="clinicId"
              name="clinicId"
              required
              className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2"
            >
              <option value="">Select a clinic...</option>
              {clinics.map((clinic) => (
                <option key={clinic.id} value={clinic.id}>
                  {clinic.name}
                </option>
              ))}
            </select>
            <ErrorText errors={state.errors} field="clinicId" />
          </div>

          <div className="space-y-2">
            <Label htmlFor="name">Dentist Name</Label>
            <Input
              id="name"
              name="name"
              placeholder="Dr. João Silva"
              required
            />
            <ErrorText errors={state.errors} field="name" />
          </div>

          <div className="space-y-2">
            <Label htmlFor="phone">Phone <span className="text-gray-400">(optional)</span></Label>
            <Input
              id="phone"
              name="phone"
              type="tel"
              placeholder="(11) 98765-4321"
            />
            <ErrorText errors={state.errors} field="phone" />
          </div>

          <div className="space-y-2">
            <Label htmlFor="email">Email <span className="text-gray-400">(optional)</span></Label>
            <Input
              id="email"
              name="email"
              type="email"
              placeholder="dentist@clinic.com"
            />
            <ErrorText errors={state.errors} field="email" />
          </div>

          <div className="space-y-2">
            <Label htmlFor="notes">Notes <span className="text-gray-400">(optional)</span></Label>
            <Textarea
              id="notes"
              name="notes"
              placeholder="Additional information about the dentist..."
              rows={3}
            />
            <ErrorText errors={state.errors} field="notes" />
          </div>

          <Button type="submit" disabled={pending} className="w-full">
            {pending ? "Creating..." : "Add Dentist"}
          </Button>
        </form>
      </CardContent>
    </Card>
  );
}
