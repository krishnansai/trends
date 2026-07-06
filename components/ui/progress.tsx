import { cn } from "@/lib/utils";

type ProgressProps = {
  value: number;
  className?: string;
};

export function Progress({ value, className }: ProgressProps) {
  const normalized = Math.max(0, Math.min(100, value));

  return (
    <div className={cn("h-2 w-full overflow-hidden rounded-full border border-border bg-muted/80 shadow-[0_1px_0_hsl(0_0%_100%/0.9)_inset]", className)}>
      <div
        className="h-full rounded-full bg-accent shadow-[0_0_18px_hsl(var(--accent)/0.3)] transition-all"
        style={{ width: `${normalized}%` }}
      />
    </div>
  );
}
