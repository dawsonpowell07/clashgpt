import React from "react";

export function SectionHeading({
  icon,
  label,
  sub,
}: {
  icon: React.ReactNode;
  label: string;
  sub?: string;
}) {
  return (
    <div className="flex items-center gap-3">
      <div className="flex items-center justify-center w-8 h-8 rounded-lg bg-primary/15 border border-primary/25 text-primary shrink-0">
        {icon}
      </div>
      <div>
        <h3 className="font-[family-name:var(--font-heading)] text-lg font-bold text-foreground leading-none">
          {label}
        </h3>
        {sub && <p className="text-xs text-muted-foreground mt-0.5">{sub}</p>}
      </div>
      <div className="flex-1 h-px bg-gradient-to-r from-border/60 to-transparent ml-2" />
    </div>
  );
}
