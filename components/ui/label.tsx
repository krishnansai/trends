import * as React from "react";
import { cn } from "@/lib/utils";

export type LabelProps = React.LabelHTMLAttributes<HTMLLabelElement>;

const Label = React.forwardRef<HTMLLabelElement, LabelProps>(({ className, ...props }, ref) => {
  return (
    <label
      className={cn(
        "text-[11px] font-semibold uppercase tracking-[0.18em] text-neutral-600",
        className
      )}
      ref={ref}
      {...props}
    />
  );
});
Label.displayName = "Label";

export { Label };
