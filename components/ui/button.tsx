import * as React from "react";
import { cva, type VariantProps } from "class-variance-authority";
import { cn } from "@/lib/utils";

const buttonVariants = cva(
  "inline-flex h-10 items-center justify-center gap-2 whitespace-nowrap rounded-md border border-transparent px-4 text-sm font-semibold shadow-sm transition-[background-color,border-color,color,box-shadow,transform] hover:-translate-y-0.5 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background active:translate-y-px disabled:pointer-events-none disabled:translate-y-0 disabled:opacity-50",
  {
    variants: {
      variant: {
        default:
          "border-accent/40 bg-accent text-accent-foreground shadow-[0_18px_42px_-26px_hsl(var(--accent)/0.85)] hover:border-accent hover:bg-accent/90 hover:shadow-[0_22px_48px_-28px_hsl(var(--accent)/0.95)]",
        outline:
          "border-border bg-background text-foreground shadow-[0_10px_28px_-24px_hsl(var(--foreground)/0.45)] hover:border-ring/70 hover:bg-muted/70 hover:shadow-[0_16px_36px_-28px_hsl(var(--ring)/0.75)]",
        ghost:
          "border-transparent bg-transparent text-foreground shadow-none hover:bg-muted/70 hover:shadow-none",
        subtle:
          "border-border bg-muted/80 text-foreground hover:border-accent/50 hover:bg-background hover:shadow-[0_16px_36px_-30px_hsl(var(--accent)/0.65)]"
      },
      size: {
        default: "h-10 px-4",
        sm: "h-8 px-3 text-xs",
        icon: "size-10 p-0"
      }
    },
    defaultVariants: {
      variant: "default",
      size: "default"
    }
  }
);

export interface ButtonProps
  extends React.ButtonHTMLAttributes<HTMLButtonElement>,
    VariantProps<typeof buttonVariants> {}

const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
  ({ className, variant, size, ...props }, ref) => {
    return (
      <button
        className={cn(buttonVariants({ variant, size, className }))}
        ref={ref}
        {...props}
      />
    );
  }
);
Button.displayName = "Button";

export { Button, buttonVariants };
