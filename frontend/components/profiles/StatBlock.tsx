import { cn } from "@/lib/utils";

export function StatBlock({
  label,
  value,
  sub,
  accent,
}: {
  label: string;
  value: string;
  sub?: string;
  accent?: "gold" | "blue" | "green" | "red";
}) {
  const accentClass =
    {
      gold: "text-amber-400",
      blue: "text-blue-400",
      green: "text-emerald-400",
      red: "text-red-400",
    }[accent ?? "gold"] ?? "text-foreground";

  return (
    <div className="flex flex-col gap-1 min-w-0">
      <span className="text-[10px] font-semibold uppercase tracking-widest text-muted-foreground/70">
        {label}
      </span>
      <span
        className={cn(
          "font-[family-name:var(--font-heading)] text-2xl font-bold leading-none",
          accentClass,
        )}
      >
        {value}
      </span>
      {sub && (
        <span className="text-[11px] text-muted-foreground truncate">
          {sub}
        </span>
      )}
    </div>
  );
}
