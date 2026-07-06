import { cn } from "@/lib/utils";

type ProgressProps = {
  value: number;
  className?: string;
};

export function Progress({ value, className }: ProgressProps) {
  const normalized = Math.max(0, Math.min(100, value));

  return (
    <div className={cn("h-2 w-full overflow-hidden bg-muted", className)}>
      <div
        className="h-full bg-foreground transition-all"
        style={{ width: `${normalized}%` }}
      />
    </div>
  );
}
