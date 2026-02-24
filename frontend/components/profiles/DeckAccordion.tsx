"use client";

import { useState } from "react";
import Image from "next/image";
import { ChevronDown, ChevronUp, Zap } from "lucide-react";
import { cn } from "@/lib/utils";
import { PlayerDeck } from "./types";
import { CardIcon } from "./CardIcon";

export function DeckAccordion({ deck, rank }: { deck: PlayerDeck; rank: number }) {
  const [open, setOpen] = useState(false);

  const sorted = [
    ...deck.cards.filter((c) => c.variant === "evolution"),
    ...deck.cards.filter((c) => c.variant === "heroic"),
    ...deck.cards.filter((c) => c.variant === "normal"),
  ];

  const wr = deck.win_rate ?? 0;
  const wrColor =
    wr >= 55 ? "text-emerald-400" : wr >= 50 ? "text-amber-400" : "text-red-400";
  const wrBarColor =
    wr >= 55 ? "bg-emerald-500" : wr >= 50 ? "bg-amber-500" : "bg-red-500";

  return (
    <div
      className={cn(
        "rounded-xl border bg-card/60 backdrop-blur-sm overflow-hidden transition-all duration-200",
        open
          ? "border-border shadow-lg"
          : "border-border/50 hover:border-border/80 hover:shadow-md"
      )}
    >
      <button
        onClick={() => setOpen((v) => !v)}
        className="w-full flex items-center gap-4 px-5 py-4 text-left hover:bg-muted/20 transition-colors"
      >
        {/* Rank */}
        <span className="font-[family-name:var(--font-heading)] text-2xl font-black text-muted-foreground/30 w-6 shrink-0 text-center">
          {rank}
        </span>

        {/* Mini card strip (collapsed preview) */}
        {!open && sorted.length > 0 && (
          <div className="hidden sm:flex items-center gap-1 shrink-0">
            {sorted.slice(0, 8).map((card, i) => {
              const base = card.name.toLowerCase().replace(/ /g, "_").replace(/\./g, "");
              const suffix =
                card.variant === "evolution"
                  ? "_evolution"
                  : card.variant === "heroic"
                  ? "_hero"
                  : "";
              return (
                <div
                  key={i}
                  className="relative w-7 aspect-[3/4] rounded overflow-hidden bg-muted border border-white/5"
                >
                  <Image
                    src={`/cards/${base}/${base}${suffix}.png`}
                    alt={card.name}
                    fill
                    className="object-contain"
                    sizes="28px"
                  />
                </div>
              );
            })}
          </div>
        )}

        {/* Stats */}
        <div className="flex-1 flex flex-wrap items-center gap-x-5 gap-y-1 min-w-0">
          <span className={cn("font-[family-name:var(--font-heading)] text-lg font-bold", wrColor)}>
            {deck.win_rate !== null ? `${deck.win_rate}%` : "—"}
            <span className="text-xs font-normal text-muted-foreground ml-1">WR</span>
          </span>
          <span className="text-sm text-muted-foreground">
            {deck.games.toLocaleString()} games
          </span>
          <span className="flex items-center gap-1 text-sm text-muted-foreground">
            <Zap className="w-3.5 h-3.5 text-purple-400" />
            {deck.avg_elixir ?? "—"}
          </span>
          <span className="text-sm text-emerald-400 font-semibold">{deck.wins}W</span>
        </div>

        {open ? (
          <ChevronUp className="w-4 h-4 shrink-0 text-muted-foreground" />
        ) : (
          <ChevronDown className="w-4 h-4 shrink-0 text-muted-foreground" />
        )}
      </button>

      {open && (
        <div className="px-5 pb-5 pt-2 border-t border-border/40 space-y-3">
          {/* Win rate bar */}
          <div className="flex items-center gap-3">
            <div className="flex-1 h-1.5 bg-muted/60 rounded-full overflow-hidden">
              <div
                className={cn("h-full rounded-full transition-all duration-500", wrBarColor)}
                style={{ width: `${Math.min(wr, 100)}%` }}
              />
            </div>
            <span className={cn("text-xs font-bold tabular-nums", wrColor)}>
              {deck.win_rate !== null ? `${deck.win_rate}%` : "—"}
            </span>
          </div>

          {/* Card grid */}
          <div className="grid grid-cols-8 gap-2">
            {sorted.slice(0, 8).map((card, i) => (
              <CardIcon key={i} card={card} />
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
