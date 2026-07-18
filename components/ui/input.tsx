import * as React from "react";
import { cn } from "@/lib/utils";

export type InputProps = React.InputHTMLAttributes<HTMLInputElement>;

const Input = React.forwardRef<HTMLInputElement, InputProps>(({ className, ...props }, ref) => {
  return (
    <input
      className={cn(
        "flex h-11 w-full rounded-sm border border-[#CDBFAE] bg-white/85 px-3 py-2 text-sm text-[#2E251D] shadow-sm transition-colors placeholder:text-neutral-500 focus-visible:border-[#8A6A4F] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#8A6A4F]/15 disabled:cursor-not-allowed disabled:opacity-50",
        className
      )}
      ref={ref}
      suppressHydrationWarning
      {...props}
    />
  );
});
Input.displayName = "Input";

export { Input };
