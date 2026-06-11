import { Badge } from "@/components/ui/badge";

type MetricPill = {
  label: string;
  value: string | number;
  tone?: "default" | "success" | "warning" | "danger" | "info" | "neutral";
};

type MetricPillsProps = {
  metrics: MetricPill[];
};

export function MetricPills({ metrics }: MetricPillsProps) {
  return (
    <div className="flex flex-wrap gap-2">
      {metrics.map((metric) => (
        <Badge
          key={metric.label}
          variant={metric.tone ?? "neutral"}
          className="gap-2 px-3 py-1.5 text-sm"
        >
          <span className="text-xs font-normal opacity-75">{metric.label}</span>
          <span>{metric.value}</span>
        </Badge>
      ))}
    </div>
  );
}
