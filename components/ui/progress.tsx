import { cn } from "@/lib/utils";

type ProgressProps = {
  value: number;
  className?: string;
};

export function Progress({ value, className }: ProgressProps) {
  const normalized = Math.max(0, Math.min(100, value));

  return (
    <div className={cn("h-2 w-full overflow-hidden rounded-full border border-white/10 bg-white/[0.04]", className)}>
      <div
        className="h-full rounded-full bg-white shadow-[0_0_18px_hsl(0_0%_100%/0.26)] transition-all"
        style={{ width: `${normalized}%` }}
      />
    </div>
  );
}
