import * as React from "react";
import { cn } from "@/lib/utils";

export function Panel({
  className,
  ...props
}: React.ComponentProps<"section">) {
  return (
    <section
      className={cn(
        "overflow-hidden rounded-lg border border-border/40 bg-card shadow-sm",
        className,
      )}
      {...props}
    />
  );
}

export function PanelHeader({
  className,
  ...props
}: React.ComponentProps<"div">) {
  return (
    <div
      className={cn("border-b border-border/40 px-4 py-4 sm:px-6", className)}
      {...props}
    />
  );
}
