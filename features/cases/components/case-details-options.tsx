import { Skeleton } from "@/components/ui/skeleton";

export function OptionFieldFallback({
  label,
  variant = "input",
}: {
  label: string;
  variant?: "input" | "textarea";
}) {
  return (
    <div className="space-y-2">
      <label className="text-sm font-medium">{label}</label>
      <Skeleton
        className={
          variant === "textarea"
            ? "min-h-25 w-full rounded-md bg-muted-foreground/15"
            : "h-10 w-full rounded-md bg-muted-foreground/15"
        }
      />
    </div>
  );
}

export function CaseOptionsFallback() {
  return (
    <>
      <div className="grid gap-4 sm:grid-cols-2">
        <OptionFieldFallback label="Paciente" />
        <OptionFieldFallback label="Customer" />
        <OptionFieldFallback label="Dentista" />
        <OptionFieldFallback label="Tipo de servico" />
        <OptionFieldFallback label="CADista" />
        <OptionFieldFallback label="Status" />
        <OptionFieldFallback label="Dentes" />
        <OptionFieldFallback label="No. de elementos" />
        <OptionFieldFallback label="Cor" />
        <OptionFieldFallback label="Prazo" />
        <OptionFieldFallback label="Urgente" />
      </div>
      <OptionFieldFallback label="Pendencia" variant="textarea" />
      <OptionFieldFallback label="Observacoes" variant="textarea" />
    </>
  );
}
