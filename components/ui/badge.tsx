import * as React from "react";
import { cn } from "@/lib/utils";

export function Badge({ className, ...props }: React.HTMLAttributes<HTMLSpanElement>) {
  return (
    <span
      className={cn(
        "inline-flex items-center rounded-md border border-border bg-background/85 px-2.5 py-1 text-xs font-semibold text-foreground shadow-[0_1px_0_hsl(0_0%_100%/0.85)_inset,0_10px_24px_-22px_hsl(var(--foreground)/0.45)]",
        className
      )}
      {...props}
    />
  );
}
