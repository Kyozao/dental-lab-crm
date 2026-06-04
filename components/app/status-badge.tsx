import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import { getCaseStatusMeta } from "@/features/cases/constants";

type CaseStatusBadgeProps = {
  status: string;
  label?: string;
  className?: string;
};

export function CaseStatusBadge({
  status,
  label,
  className,
}: CaseStatusBadgeProps) {
  const meta = getCaseStatusMeta(status);

  return (
    <Badge
      variant={meta?.tone ?? "neutral"}
      className={cn("gap-2 rounded-full px-3 py-1.5", className)}
    >
      <span
        className={cn("h-1.5 w-1.5 rounded-full", meta?.dotClassName)}
        aria-hidden="true"
      />
      {label ?? meta?.label ?? status.replace(/_/g, " ")}
    </Badge>
  );
}
