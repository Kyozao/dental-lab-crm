import {
  CASE_STATUS_OPTIONS,
  type CustomerOption,
  type EditableCase,
  type CaseStatusValue,
} from "@/features/cases/types";
import { getCaseStatusMeta } from "@/features/cases/constants";

type Props = {
  caseItem: EditableCase;
  customers: CustomerOption[];
  availableDentists: CustomerOption["dentists"];
  selectedCustomerId: string;
  onSelectedCustomerChange: (customerId: string) => void;
  canEditAll: boolean;
  disableResourceFields: boolean;
  optionsLoading: boolean;
  overdue: boolean;
  isCreateMode: boolean;
  selectedStatus: CaseStatusValue;
  onSelectedStatusChange: (status: CaseStatusValue) => void;
};

export function CaseEditFieldsSection({
  caseItem,
  customers,
  availableDentists,
  selectedCustomerId,
  onSelectedCustomerChange,
  canEditAll,
  disableResourceFields,
  optionsLoading,
  overdue,
  isCreateMode,
  selectedStatus,
  onSelectedStatusChange,
}: Props) {
  const selectedStatusMeta = getCaseStatusMeta(selectedStatus);

  return (
    <>
      <div hidden={optionsLoading} className="grid gap-4 sm:grid-cols-2">
        <div className="space-y-2" hidden={isCreateMode}>
          <label className="text-sm font-medium">Codigo</label>
          <input
            aria-label="Case code"
            defaultValue={caseItem.code}
            readOnly
            disabled
            className="flex h-10 w-full rounded-md border bg-background px-3 py-2 text-sm disabled:opacity-60"
          />
        </div>

        <InputField
          label="Paciente"
          name="patientName"
          defaultValue={caseItem.patientName}
          disabled={!canEditAll}
        />

        <SelectField
          label="Clinica"
          name="customerId"
          value={selectedCustomerId}
          onChange={onSelectedCustomerChange}
          disabled={!canEditAll || disableResourceFields}
          emptyLabel="Sem clinica"
          options={customers.map((customer) => ({
            id: customer.id,
            name: customer.name,
          }))}
        />

        <div className="space-y-2">
          <label className="text-sm font-medium">Dentista</label>
          <select
            key={selectedCustomerId}
            name="dentistId"
            defaultValue={
              availableDentists.some(
                (dentist) => dentist.id === caseItem.dentistId,
              )
                ? (caseItem.dentistId ?? "")
                : ""
            }
            disabled={!canEditAll || disableResourceFields}
            className="flex h-10 w-full rounded-md border bg-background px-3 py-2 text-sm disabled:opacity-60"
          >
            <option value="">Sem dentista</option>
            {availableDentists.map((dentist) => (
              <option key={dentist.id} value={dentist.id}>
                {dentist.name}
              </option>
            ))}
          </select>
        </div>

        <div className="space-y-2">
          <label className="text-sm font-medium">Status</label>
          <select
            name="currentStatus"
            value={selectedStatus}
            onChange={(event) =>
              onSelectedStatusChange(event.target.value as CaseStatusValue)
            }
            disabled={!canEditAll}
            className="flex h-10 w-full rounded-md border bg-background px-3 py-2 text-sm disabled:opacity-60"
          >
            {CASE_STATUS_OPTIONS.map((status) => (
              <option key={status.value} value={status.value}>
                {status.label}
              </option>
            ))}
          </select>
          {selectedStatusMeta ? (
            <p className="text-xs text-muted-foreground">
              Current state: {selectedStatusMeta.shortLabel}
            </p>
          ) : null}
        </div>

        <InputField
          label="Dentes"
          name="teeth"
          defaultValue={caseItem.teeth}
          disabled={!canEditAll}
        />
        <InputField
          label="No. de elementos"
          name="elementsQty"
          type="number"
          min={1}
          defaultValue={caseItem.elementsQty ?? ""}
          disabled={!canEditAll}
        />
        <InputField
          label="Cor"
          name="shade"
          defaultValue={caseItem.shade}
          disabled={!canEditAll}
        />

        <div className="space-y-2">
          <label className="text-sm font-medium">Prazo</label>
          <input
            name="dueDate"
            type="date"
            defaultValue={toDateInputValue(caseItem.dueDate)}
            disabled={!canEditAll}
            className="flex h-10 w-full rounded-md border bg-background px-3 py-2 text-sm disabled:opacity-60"
          />
          {overdue ? (
            <p className="text-xs text-red-500">Prazo atrasado</p>
          ) : null}
        </div>

        <div className="flex items-end gap-2">
          <input
            id={`urgent-${caseItem.id}`}
            name="isUrgent"
            type="checkbox"
            defaultChecked={caseItem.isUrgent}
            disabled={!canEditAll}
            className="h-4 w-4"
          />
          <label
            htmlFor={`urgent-${caseItem.id}`}
            className="text-sm font-medium"
          >
            Urgente
          </label>
        </div>

      </div>
      <TextareaField
        label="Observacoes"
        name="observations"
        defaultValue={caseItem.observations}
        disabled={!canEditAll}
        hidden={optionsLoading}
      />
    </>
  );
}

function toDateInputValue(date: string | null) {
  if (!date) return "";

  const parsed = new Date(date);
  if (Number.isNaN(parsed.getTime())) return "";

  const year = parsed.getFullYear();
  const month = String(parsed.getMonth() + 1).padStart(2, "0");
  const day = String(parsed.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

function InputField({
  label,
  name,
  disabled,
  ...inputProps
}: React.InputHTMLAttributes<HTMLInputElement> & {
  label: string;
  name: string;
}) {
  return (
    <div className="space-y-2">
      <label className="text-sm font-medium">{label}</label>
      <input
        name={name}
        disabled={disabled}
        className="flex h-10 w-full rounded-md border bg-background px-3 py-2 text-sm disabled:opacity-60"
        {...inputProps}
      />
    </div>
  );
}

function SelectField({
  label,
  name,
  value,
  defaultValue,
  onChange,
  disabled,
  emptyLabel,
  options,
}: {
  label: string;
  name: string;
  value?: string;
  defaultValue?: string;
  onChange?: (value: string) => void;
  disabled: boolean;
  emptyLabel: string;
  options: Array<{ id: string; name: string }>;
}) {
  return (
    <div className="space-y-2">
      <label className="text-sm font-medium">{label}</label>
      <select
        name={name}
        value={value}
        defaultValue={defaultValue}
        onChange={(event) => onChange?.(event.target.value)}
        disabled={disabled}
        className="flex h-10 w-full rounded-md border bg-background px-3 py-2 text-sm disabled:opacity-60"
      >
        <option value="">{emptyLabel}</option>
        {options.map((option) => (
          <option key={option.id} value={option.id}>
            {option.name}
          </option>
        ))}
      </select>
    </div>
  );
}

function TextareaField({
  label,
  name,
  defaultValue,
  disabled,
  hidden,
  placeholder,
}: {
  label: string;
  name: string;
  defaultValue: string;
  disabled: boolean;
  hidden: boolean;
  placeholder?: string;
}) {
  return (
    <div hidden={hidden} className="space-y-2">
      <label className="text-sm font-medium">{label}</label>
      <textarea
        name={name}
        defaultValue={defaultValue}
        disabled={disabled}
        placeholder={placeholder}
        className="min-h-25 w-full rounded-md border bg-background px-3 py-2 text-sm disabled:opacity-60"
      />
    </div>
  );
}
