"use client";

import { useActionState } from "react";
import type { updateCaseAction, UpdateCaseState } from "../[id]/actions";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";

type ClinicOption = {
  id: string;
  name: string;
};

type ServiceTypeOption = {
  id: string;
  name: string;
};

type DentistOption = {
  id: string;
  name: string;
  clinic: {
    name: string;
  };
};

type CaseData = {
  id: string;
  code: string;
  patientName: string;
  clinicId: string | null;
  serviceTypeId: string | null;
  dentistId: string | null;
  pendingNote: string | null;
  teeth: string | null;
  shade: string | null;
  dueDate: Date | null;
  observations: string | null;
  isUrgent: boolean;
};

const initialState: UpdateCaseState = {
  success: false,
  message: "",
};

type Props = {
  action: typeof updateCaseAction;
  caseItem: CaseData;
  clinics: ClinicOption[];
  serviceTypes: ServiceTypeOption[];
  dentists: DentistOption[];
};

function toDateInputValue(date: Date | null) {
  if (!date) return "";
  return new Date(date).toISOString().slice(0, 10);
}

export function EditCaseForm({
  action,
  caseItem,
  clinics,
  serviceTypes,
  dentists,
}: Props) {
  const [state, formAction, pending] = useActionState(action, initialState);

  return (
    <Card className="rounded-2xl">
      <CardHeader>
        <CardTitle>Edit case</CardTitle>
      </CardHeader>

      <CardContent>
        <form action={formAction} className="grid gap-4 md:grid-cols-2">
          <input type="hidden" name="id" value={caseItem.id} />

          <div className="space-y-2">
            <Label htmlFor="code">Case code</Label>
            <Input id="code" name="code" defaultValue={caseItem.code} />
            {state.errors?.code?.map((error) => (
              <p key={error} className="text-sm text-red-500">
                {error}
              </p>
            ))}
          </div>

          <div className="space-y-2">
            <Label htmlFor="patientName">Patient name</Label>
            <Input
              id="patientName"
              name="patientName"
              defaultValue={caseItem.patientName}
            />
            {state.errors?.patientName?.map((error) => (
              <p key={error} className="text-sm text-red-500">
                {error}
              </p>
            ))}
          </div>

          <div className="space-y-2">
            <Label htmlFor="clinicId">Clinic</Label>
            <select
              id="clinicId"
              name="clinicId"
              className="flex h-10 w-full rounded-md border bg-background px-3 py-2 text-sm"
              defaultValue={caseItem.clinicId ?? ""}
            >
              <option value="" disabled>
                Select a clinic
              </option>
              {clinics.map((clinic) => (
                <option key={clinic.id} value={clinic.id}>
                  {clinic.name}
                </option>
              ))}
            </select>
            {state.errors?.clinicId?.map((error) => (
              <p key={error} className="text-sm text-red-500">
                {error}
              </p>
            ))}
          </div>

          <div className="space-y-2">
            <Label htmlFor="serviceTypeId">Service type</Label>
            <select
              id="serviceTypeId"
              name="serviceTypeId"
              className="flex h-10 w-full rounded-md border bg-background px-3 py-2 text-sm"
              defaultValue={caseItem.serviceTypeId ?? ""}
            >
              <option value="">No service type</option>
              {serviceTypes.map((serviceType) => (
                <option key={serviceType.id} value={serviceType.id}>
                  {serviceType.name}
                </option>
              ))}
            </select>
          </div>

          <div className="space-y-2">
            <Label htmlFor="dentistId">Dentist</Label>
            <select
              id="dentistId"
              name="dentistId"
              className="flex h-10 w-full rounded-md border bg-background px-3 py-2 text-sm"
              defaultValue={caseItem.dentistId ?? ""}
            >
              <option value="">No dentist</option>
              {dentists.map((dentist) => (
                <option key={dentist.id} value={dentist.id}>
                  {dentist.name} — {dentist.clinic.name}
                </option>
              ))}
            </select>
          </div>

          <div className="space-y-2">
            <Label htmlFor="teeth">Teeth</Label>
            <Input
              id="teeth"
              name="teeth"
              defaultValue={caseItem.teeth ?? ""}
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="shade">Shade</Label>
            <Input
              id="shade"
              name="shade"
              defaultValue={caseItem.shade ?? ""}
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="dueDate">Due date</Label>
            <Input
              id="dueDate"
              name="dueDate"
              type="date"
              defaultValue={toDateInputValue(caseItem.dueDate)}
            />
          </div>

          <div className="flex items-end gap-2">
            <input
              id="isUrgent"
              name="isUrgent"
              type="checkbox"
              defaultChecked={caseItem.isUrgent}
              className="h-4 w-4"
            />
            <Label htmlFor="isUrgent">Urgent case</Label>
          </div>

          <div className="space-y-2 md:col-span-2">
            <Label htmlFor="pendingNote">Pending note</Label>
            <Textarea
              id="pendingNote"
              name="pendingNote"
              defaultValue={caseItem.pendingNote ?? ""}
            />
          </div>

          <div className="space-y-2 md:col-span-2">
            <Label htmlFor="observations">Observations</Label>
            <Textarea
              id="observations"
              name="observations"
              defaultValue={caseItem.observations ?? ""}
            />
          </div>

          <div className="md:col-span-2 flex items-center gap-3">
            <Button type="submit" disabled={pending}>
              {pending ? "Saving..." : "Save changes"}
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
