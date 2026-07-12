import * as React from "react";
import { ChevronDown } from "lucide-react";
import { cn } from "@/lib/utils";

export type SelectProps = React.SelectHTMLAttributes<HTMLSelectElement>;

const Select = React.forwardRef<HTMLSelectElement, SelectProps>(
  ({ children, className, ...props }, ref) => {
    return (
      <div className="relative">
        <select
          className={cn(
            "h-11 w-full appearance-none rounded-sm border border-white/10 bg-neutral-950/70 px-3 pr-10 text-sm text-neutral-100 shadow-sm transition-colors focus-visible:border-white/50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white/10 disabled:cursor-not-allowed disabled:opacity-50",
            className
          )}
          ref={ref}
          {...props}
        >
          {children}
        </select>
        <ChevronDown className="pointer-events-none absolute right-3 top-1/2 size-4 -translate-y-1/2 text-neutral-500" />
      </div>
    );
  }
);
Select.displayName = "Select";

export { Select };
