import * as React from "react";
import { ClipboardList } from "lucide-react";
import { cn } from "@/lib/utils";

type EmptyStateProps = {
  title: string;
  description?: string;
  icon?: React.ComponentType<{ className?: string }>;
  className?: string;
};

export function EmptyState({
  title,
  description,
  icon: Icon = ClipboardList,
  className,
}: EmptyStateProps) {
  return (
    <div className={cn("px-6 py-12 text-center", className)}>
      <div className="mx-auto mb-4 inline-flex h-10 w-10 items-center justify-center rounded-lg bg-muted text-muted-foreground">
        <Icon className="h-5 w-5" />
      </div>
      <h3 className="text-sm font-semibold">{title}</h3>
      {description ? (
        <p className="mt-1 text-sm text-muted-foreground">{description}</p>
      ) : null}
    </div>
  );
}
