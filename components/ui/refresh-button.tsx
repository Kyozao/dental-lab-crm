import { RefreshCw } from "lucide-react";

import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

type RefreshButtonProps = Omit<
  React.ComponentProps<typeof Button>,
  "children" | "size"
> & {
  label?: string;
  spinning?: boolean;
  size?: React.ComponentProps<typeof Button>["size"];
};

export function RefreshButton({
  label = "Refresh",
  spinning = false,
  className,
  size = "icon",
  ...props
}: RefreshButtonProps) {
  return (
    <Button
      type="button"
      variant="outline"
      size={size}
      aria-label={label}
      className={className}
      {...props}
    >
      <RefreshCw className={cn("size-4", spinning ? "animate-spin" : undefined)} />
    </Button>
  );
}
