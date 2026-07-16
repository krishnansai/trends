import { cn } from "@/lib/utils";

type ProgressProps = {
  value: number;
  className?: string;
};

export function Progress({ value, className }: ProgressProps) {
  const normalized = Math.max(0, Math.min(100, value));

  return (
    <div className={cn("h-2 w-full overflow-hidden rounded-full border border-[#CDBFAE] bg-white/75", className)}>
      <div
        className="h-full rounded-full bg-[#7B5637] shadow-[0_0_18px_rgba(123,86,55,0.25)] transition-all"
        style={{ width: `${normalized}%` }}
      />
    </div>
  );
}
