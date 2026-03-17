"use client";

import { useState } from "react";
import { Zap, Trophy, Swords, ChevronDown } from "lucide-react";
import { cn } from "@/lib/utils";
import { PlayerDeck } from "./types";
import { CardIcon } from "@/components/card-icon";

export function DeckAccordion({ deck, rank }: { deck: PlayerDeck; rank: number }) {
  const [isOpen, setIsOpen] = useState(false);
  const wr = deck.win_rate ?? 0;
  const wrColor =
    wr >= 55 ? "text-emerald-400" : wr >= 50 ? "text-amber-400" : "text-red-400";
  const wrBarColor =
    wr >= 55 ? "bg-emerald-500" : wr >= 50 ? "bg-amber-500" : "bg-red-500";

  const cards = deck.cards.map((c) => ({
    cardName: c.name,
    variant: c.variant as "normal" | "evolution" | "heroic",
  }));

  return (
    <div className="rounded-xl border border-border/50 bg-card/40 hover:bg-card/60 hover:border-border/70 transition-all overflow-hidden">
      {/* Collapsed row — rank + 8-card single row + chevron */}
      <button
        onClick={() => setIsOpen((o) => !o)}
        className="w-full flex items-center gap-3 px-4 py-3 text-left"
      >
        <div className="flex h-6 w-6 items-center justify-center rounded-full bg-muted/60 border border-border/60 text-muted-foreground text-xs font-black font-[family-name:var(--font-heading)] shrink-0">
          {rank}
        </div>

        {/* 1×8 card row */}
        <div className="flex gap-1 flex-1 min-w-0">
          {cards.map((card, i) => (
            <CardIcon key={i} cardName={card.cardName} variant={card.variant} className="flex-1 min-w-0" />
          ))}
        </div>

        <ChevronDown
          className={cn(
            "w-4 h-4 text-muted-foreground/60 shrink-0 transition-transform duration-200 ml-1",
            isOpen && "rotate-180"
          )}
        />
      </button>

      {/* Expanded — stats only */}
      {isOpen && (
        <div className="px-4 pb-4 pt-3 border-t border-border/40 flex flex-col sm:flex-row gap-4 items-start">
          {/* Stats */}
          <div className="flex-1 flex flex-col gap-3 min-w-0">
            <div>
              <div className="flex items-center justify-between mb-2">
                <span className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground/60 flex items-center gap-1">
                  <Trophy className="w-3 h-3" /> Win Rate
                </span>
                <span className={cn("text-base font-black font-[family-name:var(--font-heading)]", wrColor)}>
                  {deck.win_rate !== null ? `${deck.win_rate}%` : "—"}
                </span>
              </div>
              <div className="h-2 w-full bg-muted/80 rounded-full overflow-hidden">
                <div
                  className={cn("h-full rounded-full transition-all", wrBarColor)}
                  style={{ width: `${Math.min(wr, 100)}%` }}
                />
              </div>
              <div className="flex justify-between mt-1.5 text-xs font-semibold">
                <span className="text-emerald-400/80">{deck.wins}W</span>
                <span className="text-red-400/80">{deck.losses}L</span>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-2">
              <div className="flex items-center gap-2.5 bg-muted/30 border border-border/40 rounded-lg px-3 py-2.5">
                <Zap className="w-4 h-4 text-purple-400 shrink-0" />
                <div>
                  <span className="text-[10px] text-muted-foreground/70 uppercase tracking-wide font-bold block">
                    Elixir
                  </span>
                  <span className="text-sm font-bold text-foreground">{deck.avg_elixir ?? "—"}</span>
                </div>
              </div>
              <div className="flex items-center gap-2.5 bg-muted/30 border border-border/40 rounded-lg px-3 py-2.5">
                <Swords className="w-4 h-4 text-blue-400 shrink-0" />
                <div>
                  <span className="text-[10px] text-muted-foreground/70 uppercase tracking-wide font-bold block">
                    Games
                  </span>
                  <span className="text-sm font-bold text-foreground">
                    {deck.games.toLocaleString()}
                  </span>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
