import * as React from "react";
import { cva, type VariantProps } from "class-variance-authority";
import { cn } from "@/lib/utils";

const buttonVariants = cva(
  "inline-flex h-10 items-center justify-center gap-2 whitespace-nowrap rounded-sm border border-transparent px-4 text-xs font-medium uppercase tracking-[0.16em] transition-[background-color,border-color,color,box-shadow,transform] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring/35 focus-visible:ring-offset-2 focus-visible:ring-offset-background active:translate-y-px disabled:pointer-events-none disabled:opacity-50",
  {
    variants: {
      variant: {
        default:
          "border-white bg-white text-black shadow-[0_18px_40px_-30px_hsl(0_0%_100%/0.55)] hover:bg-neutral-200",
        outline:
          "border-white/10 bg-white/[0.02] text-neutral-100 shadow-sm backdrop-blur-xl hover:border-white/35 hover:bg-white/[0.06]",
        ghost:
          "border-transparent bg-transparent text-neutral-200 shadow-none hover:bg-white/[0.06] hover:shadow-none",
        subtle:
          "border-white/10 bg-neutral-900/80 text-neutral-100 shadow-sm backdrop-blur-xl hover:border-white/30 hover:bg-neutral-800/80"
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
