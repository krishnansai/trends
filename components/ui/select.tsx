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
            "h-10 w-full appearance-none border border-input bg-background px-3 pr-10 text-sm text-foreground shadow-sm transition-colors focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-foreground disabled:cursor-not-allowed disabled:opacity-50",
            className
          )}
          ref={ref}
          {...props}
        >
          {children}
        </select>
        <ChevronDown className="pointer-events-none absolute right-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
      </div>
    );
  }
);
Select.displayName = "Select";

export { Select };
