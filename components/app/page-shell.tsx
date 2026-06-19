import * as React from "react";
import { cn } from "@/lib/utils";

type PageShellProps = React.ComponentProps<"main"> & {
  width?: "default" | "wide" | "kanban";
  contentClassName?: string;
};

const widthClass = {
  default: "max-w-7xl",
  wide: "max-w-7xl",
  kanban: "max-w-none",
};

export function PageShell({
  width = "wide",
  className,
  contentClassName,
  children,
  ...props
}: PageShellProps) {
  return (
    <main className={cn("min-h-screen bg-background", className)} {...props}>
      <div
        className={cn(
          "mx-auto w-full space-y-6 px-4 py-6 sm:px-6 sm:py-8",
          widthClass[width],
          width === "kanban" && "md:px-12",
          contentClassName,
        )}
      >
        {children}
      </div>
    </main>
  );
}
