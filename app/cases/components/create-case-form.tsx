"use client";

import { useActionState, useEffect, useRef } from "react";

import type { createCaseAction, CreateCaseState } from "../actions";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { CaseFormFields } from "./case-form-fields";

type ClinicOption = {
  id: string;
  name: string;
  dentists: {
    id: string;
    name: string;
  }[];
};

type ServiceTypeOption = {
  id: string;
  name: string;
};

type CadDesignerOption = {
  id: string;
  name: string;
};

const initialState: CreateCaseState = {
  success: false,
  message: "",
};

type Props = {
  action: typeof createCaseAction;
  clinics: ClinicOption[];
  serviceTypes: ServiceTypeOption[];
  cadDesigners: CadDesignerOption[];
};

export function CreateCaseForm({
  action,
  clinics,
  serviceTypes,
  cadDesigners,
}: Props) {
  const [state, formAction, pending] = useActionState(action, initialState);
  const formRef = useRef<HTMLFormElement>(null);

  useEffect(() => {
    if (!state.success) return;
    formRef.current?.reset();
  }, [state.success]);

  return (
    <Card className="rounded-2xl">
      <CardHeader>
        <CardTitle>Create case</CardTitle>
      </CardHeader>

      <CardContent>
        <form
          ref={formRef}
          action={formAction}
          className="grid gap-4 md:grid-cols-2"
        >
          <CaseFormFields
            clinics={clinics}
            serviceTypes={serviceTypes}
            cadDesigners={cadDesigners}
            errors={state.errors}
            idPrefix="create-case"
            values={{
              currentStatus: "ENTRY",
              isUrgent: false,
            }}
          />

          <div className="md:col-span-2 flex items-center gap-3">
            <Button type="submit" disabled={pending}>
              {pending ? "Creating..." : "Create case"}
            </Button>

            {state.message ? (
              <p
                className={`text-sm ${
                  state.success ? "text-green-600" : "text-red-500"
                }`}
              >
                {state.message}
              </p>
            ) : null}
          </div>
        </form>
      </CardContent>
    </Card>
  );
}
