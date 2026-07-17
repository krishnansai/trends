import * as React from "react";
import { cva, type VariantProps } from "class-variance-authority";
import { cn } from "@/lib/utils";

const buttonVariants = cva(
  "inline-flex min-h-10 min-w-0 items-center justify-center gap-2 rounded-sm border border-transparent px-4 py-2 text-center text-xs font-medium uppercase leading-tight tracking-[0.16em] transition-[background-color,border-color,color,box-shadow,transform] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring/35 focus-visible:ring-offset-2 focus-visible:ring-offset-background active:translate-y-px disabled:pointer-events-none disabled:opacity-50 sm:whitespace-nowrap",
  {
    variants: {
      variant: {
        default:
          "border-[#3A2A1E] bg-[#3A2A1E] text-[#FFF8EC] shadow-[0_18px_40px_-30px_rgba(58,42,30,0.8)] hover:border-[#5C402B] hover:bg-[#5C402B]",
        outline:
          "border-[#CDBFAE] bg-white/70 text-[#2E251D] shadow-sm backdrop-blur-xl hover:border-[#8A6A4F] hover:bg-[#F0E5D6]",
        ghost:
          "border-transparent bg-transparent text-[#4A3A2C] shadow-none hover:bg-[#F0E5D6] hover:text-[#2E251D] hover:shadow-none",
        subtle:
          "border-[#CDBFAE] bg-[#EFE6D8]/90 text-[#2E251D] shadow-sm backdrop-blur-xl hover:border-[#9B8065] hover:bg-[#E3D6C4]/90"
      },
      size: {
        default: "min-h-10 px-4 py-2",
        sm: "min-h-8 px-3 py-1.5 text-xs",
        icon: "size-10 min-h-0 p-0"
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
