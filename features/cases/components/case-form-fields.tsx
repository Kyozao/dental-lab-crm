"use client";

import { useMemo, useState } from "react";

import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  CASE_STATUS_OPTIONS,
  CaseFormValues,
  CustomerOption,
} from "@/features/cases/types";

type FormErrors = Partial<Record<string, string[]>>;

type Props = {
  customers: CustomerOption[];
  values?: CaseFormValues;
  errors?: FormErrors;
  idPrefix: string;
};

function toDateInputValue(date: Date | string | null | undefined) {
  if (!date) return "";

  const parsed = typeof date === "string" ? new Date(date) : date;
  if (Number.isNaN(parsed.getTime())) return "";

  const year = parsed.getFullYear();
  const month = String(parsed.getMonth() + 1).padStart(2, "0");
  const day = String(parsed.getDate()).padStart(2, "0");

  return `${year}-${month}-${day}`;
}

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

export function CaseFormFields({
  customers,
  values,
  errors,
  idPrefix,
}: Props) {
  const [selectedCustomerId, setSelectedCustomerId] = useState(
    values?.customerId ?? "",
  );

  const selectedCustomer = useMemo(
    () => customers.find((customer) => customer.id === selectedCustomerId),
    [customers, selectedCustomerId],
  );

  const availableDentists = selectedCustomer?.dentists ?? [];

  return (
    <>
      <div className="space-y-2">
        <Label htmlFor={`${idPrefix}-patientName`}>Patient name</Label>
        <Input
          id={`${idPrefix}-patientName`}
          name="patientName"
          defaultValue={values?.patientName ?? ""}
          placeholder="Maria Silva"
        />
        <ErrorText errors={errors} field="patientName" />
      </div>

      <div className="space-y-2">
        <Label htmlFor={`${idPrefix}-customerId`}>customer</Label>
        <select
          id={`${idPrefix}-customerId`}
          name="customerId"
          value={selectedCustomerId}
          onChange={(e) => setSelectedCustomerId(e.target.value)}
          className="flex h-10 w-full rounded-md border bg-background px-3 py-2 text-sm"
        >
          <option value="" disabled>
            Select customer
          </option>
          {customers.map((customer) => (
            <option key={customer.id} value={customer.id}>
              {customer.name}
            </option>
          ))}
        </select>
        <ErrorText errors={errors} field="customerId" />
      </div>

      <div className="space-y-2">
        <Label htmlFor={`${idPrefix}-dentistId`}>Dentist</Label>
        <select
          id={`${idPrefix}-dentistId`}
          name="dentistId"
          defaultValue={values?.dentistId ?? ""}
          disabled={!selectedCustomerId}
          className="flex h-10 w-full rounded-md border bg-background px-3 py-2 text-sm disabled:cursor-not-allowed disabled:opacity-60"
        >
          <option value="">
            {selectedCustomerId ? "Select dentist" : "Select a customer first"}
          </option>
          {availableDentists.map((dentist) => (
            <option key={dentist.id} value={dentist.id}>
              {dentist.name}
            </option>
          ))}
        </select>
        <ErrorText errors={errors} field="dentistId" />
      </div>

      <div className="space-y-2">
        <Label htmlFor={`${idPrefix}-currentStatus`}>Status</Label>
        <select
          id={`${idPrefix}-currentStatus`}
          name="currentStatus"
          defaultValue={values?.currentStatus ?? "IN_PRODUCTION"}
          className="flex h-10 w-full rounded-md border bg-background px-3 py-2 text-sm"
        >
          {CASE_STATUS_OPTIONS.map((status) => (
            <option key={status.value} value={status.value}>
              {status.label}
            </option>
          ))}
        </select>
        <ErrorText errors={errors} field="currentStatus" />
      </div>

      <div className="space-y-2">
        <Label htmlFor={`${idPrefix}-teeth`}>Teeth</Label>
        <Input
          id={`${idPrefix}-teeth`}
          name="teeth"
          defaultValue={values?.teeth ?? ""}
          placeholder="11, 12, 13"
        />
        <ErrorText errors={errors} field="teeth" />
      </div>

      <div className="space-y-2">
        <Label htmlFor={`${idPrefix}-elementsQty`}>Nº de elementos</Label>
        <Input
          id={`${idPrefix}-elementsQty`}
          name="elementsQty"
          type="number"
          min={1}
          defaultValue={values?.elementsQty ?? ""}
          placeholder="3"
        />
        <ErrorText errors={errors} field="elementsQty" />
      </div>

      <div className="space-y-2">
        <Label htmlFor={`${idPrefix}-shade`}>Shade</Label>
        <Input
          id={`${idPrefix}-shade`}
          name="shade"
          defaultValue={values?.shade ?? ""}
          placeholder="A2"
        />
        <ErrorText errors={errors} field="shade" />
      </div>

      <div className="space-y-2">
        <Label htmlFor={`${idPrefix}-dueDate`}>Due date</Label>
        <Input
          id={`${idPrefix}-dueDate`}
          name="dueDate"
          type="date"
          defaultValue={toDateInputValue(values?.dueDate)}
        />
        <ErrorText errors={errors} field="dueDate" />
      </div>

      <div className="flex items-end gap-2">
        <input
          id={`${idPrefix}-isUrgent`}
          name="isUrgent"
          type="checkbox"
          defaultChecked={values?.isUrgent ?? false}
          className="h-4 w-4"
        />
        <Label htmlFor={`${idPrefix}-isUrgent`}>Urgent case</Label>
      </div>

      <div className="space-y-2 md:col-span-2">
        <Label htmlFor={`${idPrefix}-observations`}>Observations</Label>
        <Textarea
          id={`${idPrefix}-observations`}
          name="observations"
          defaultValue={values?.observations ?? ""}
          placeholder="Extra notes about the case"
        />
        <ErrorText errors={errors} field="observations" />
      </div>
    </>
  );
}
