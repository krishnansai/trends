import * as React from "react";
import { cva, type VariantProps } from "class-variance-authority";
import { cn } from "@/lib/utils";

const buttonVariants = cva(
  "inline-flex h-10 items-center justify-center gap-2 whitespace-nowrap rounded-md border border-transparent px-4 text-sm font-semibold shadow-sm transition-[background-color,border-color,color,box-shadow,transform] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background active:translate-y-px disabled:pointer-events-none disabled:opacity-50",
  {
    variants: {
      variant: {
        default:
          "bg-foreground text-background hover:bg-foreground/90 hover:shadow-md",
        outline:
          "border-border bg-background text-foreground hover:border-foreground hover:bg-muted hover:shadow-md",
        ghost:
          "border-transparent bg-transparent text-foreground shadow-none hover:bg-muted",
        subtle:
          "border-border bg-muted text-foreground hover:border-foreground hover:bg-background hover:shadow-md"
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
