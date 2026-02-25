"use client";

import { useState } from "react";
import Image from "next/image";
import { cn } from "@/lib/utils";
import { Orbitron } from "next/font/google";
import { ChevronDown, ChevronUp, Swords, Trophy } from "lucide-react";

const orbitron = Orbitron({ subsets: ["latin"], weight: ["700", "900"] });

// ─── Types ────────────────────────────────────────────────────────────────────

interface MatchupCard {
  card_id: number;
  card_name: string;
  variant: string;
  slot_index: number | null;
}

interface MatchupStats {
  games_played: number;
  wins: number;
  losses: number;
  win_rate: number | null;
}

interface OpponentMatchup {
  opponent_deck_id: string | null;
  games_played: number;
  wins: number;
  losses: number;
  win_rate: number | null;
  opponent_cards: MatchupCard[];
}

interface DeckMatchupData {
  deck_id: string | null;
  deck_cards: MatchupCard[];
  stats: MatchupStats | null;
  matchups: OpponentMatchup[];
  total: number;
  page: number;
  total_pages: number;
}

interface DeckMatchupResultsProps {
  results: DeckMatchupData;
  className?: string;
}

// ─── Card tile ────────────────────────────────────────────────────────────────

function CardTile({ card }: { card: MatchupCard }) {
  const isEvo = card.variant === "evolution";
  const isHero = card.variant === "heroic";
  const cardFileName = (card.card_name || "unknown")
    .toLowerCase()
    .replace(/ /g, "_")
    .replace(/\./g, "");
  const imageSuffix = isEvo ? "_evolution" : isHero ? "_hero" : "";

  return (
    <div
      className="relative w-10 h-12 rounded-lg overflow-hidden shrink-0 border-2 bg-muted/50"
      style={{
        borderColor: isEvo
          ? "rgb(168,85,247)"
          : isHero
          ? "rgb(251,191,36)"
          : "rgba(255,255,255,0.08)",
        boxShadow: isEvo
          ? "0 0 8px rgba(168,85,247,0.3)"
          : isHero
          ? "0 0 8px rgba(251,191,36,0.3)"
          : undefined,
      }}
      title={`${card.card_name}${isEvo ? " (Evo)" : isHero ? " (Hero)" : ""}`}
    >
      <Image
        src={`/cards/${cardFileName}/${cardFileName}${imageSuffix}.png`}
        alt={card.card_name}
        fill
        className="object-contain p-0.5"
      />
    </div>
  );
}

// ─── Mini deck grid (4×2) ─────────────────────────────────────────────────────

function DeckMini({ cards, deckId }: { cards: MatchupCard[]; deckId: string | null }) {
  if (!cards || cards.length === 0) {
    return <span className="text-xs text-muted-foreground/50 italic">Unknown deck</span>;
  }

  const sorted = [
    ...cards.filter((c) => c.variant === "evolution"),
    ...cards.filter((c) => c.variant === "heroic"),
    ...cards.filter((c) => c.variant === "normal"),
  ].slice(0, 8);

  return (
    <div className="flex flex-col gap-1">
      <div className="flex gap-1">
        {sorted.slice(0, 4).map((c, i) => (
          <CardTile key={`${deckId}-r1-${c.card_id}-${i}`} card={c} />
        ))}
      </div>
      {sorted.length > 4 && (
        <div className="flex gap-1">
          {sorted.slice(4, 8).map((c, i) => (
            <CardTile key={`${deckId}-r2-${c.card_id}-${i}`} card={c} />
          ))}
        </div>
      )}
    </div>
  );
}

// ─── Single opponent matchup row ──────────────────────────────────────────────

function MatchupRow({ matchup, index }: { matchup: OpponentMatchup; index: number }) {
  const winRatePct = matchup.win_rate != null ? matchup.win_rate * 100 : null;
  const isGood = winRatePct != null && winRatePct >= 50;

  const ratingColor =
    winRatePct == null
      ? "text-muted-foreground"
      : winRatePct >= 55
      ? "text-emerald-400"
      : winRatePct >= 50
      ? "text-amber-400"
      : "text-rose-400";

  return (
    <div
      className={cn(
        "flex items-center gap-3 p-3 rounded-xl border transition-colors",
        isGood
          ? "border-amber-500/15 bg-amber-500/5"
          : "border-border/30 bg-muted/5"
      )}
      style={{ animationDelay: `${index * 30}ms` }}
    >
      {/* Win rate pill */}
      <div
        className={cn(
          "flex items-center justify-center rounded-lg px-2.5 py-1 shrink-0 min-w-[60px]",
          orbitron.className,
          "text-sm font-black",
          ratingColor,
          isGood
            ? "bg-amber-500/10 ring-1 ring-amber-500/20"
            : winRatePct != null && winRatePct < 50
            ? "bg-rose-500/10 ring-1 ring-rose-500/15"
            : "bg-muted/30 ring-1 ring-border/30"
        )}
      >
        {winRatePct != null ? `${winRatePct.toFixed(1)}%` : "—"}
      </div>

      {/* W / L */}
      <div className={cn("flex items-center gap-1 shrink-0 text-sm font-bold", orbitron.className)}>
        <span className="text-emerald-400">{matchup.wins}W</span>
        <span className="text-muted-foreground/30 font-normal">/</span>
        <span className="text-rose-400">{matchup.losses}L</span>
      </div>

      {/* Opponent deck cards */}
      <div className="flex-1 min-w-0">
        <DeckMini cards={matchup.opponent_cards} deckId={matchup.opponent_deck_id} />
      </div>

      {/* Games count */}
      <span className="text-xs text-muted-foreground/50 shrink-0">
        {matchup.games_played}g
      </span>
    </div>
  );
}

// ─── Main component ───────────────────────────────────────────────────────────

export function DeckMatchupResults({ results, className }: DeckMatchupResultsProps) {
  const [isOpen, setIsOpen] = useState(true);

  const stats = results.stats;
  const winRatePct = stats?.win_rate != null ? stats.win_rate * 100 : null;
  const ratingColor =
    winRatePct == null
      ? "text-muted-foreground"
      : winRatePct >= 55
      ? "text-emerald-400"
      : winRatePct >= 50
      ? "text-amber-400"
      : "text-rose-400";

  if (!results.deck_id) {
    return (
      <div
        className={cn(
          "rounded-xl border border-border/40 bg-card p-5 my-4 flex items-center gap-3",
          className
        )}
      >
        <Swords className="w-5 h-5 text-muted-foreground/40 shrink-0" />
        <p className="text-sm text-muted-foreground">
          This exact deck hasn&apos;t been recorded in our battle database.
        </p>
      </div>
    );
  }

  return (
    <div
      className={cn(
        "rounded-2xl border border-border/50 bg-card overflow-hidden my-4",
        className
      )}
    >
      {/* Top accent */}
      <div className="h-0.5 bg-gradient-to-r from-transparent via-primary/60 to-transparent" />

      {/* Collapsible header */}
      <button
        className="w-full flex items-center justify-between px-5 py-4 hover:bg-muted/20 transition-colors text-left"
        onClick={() => setIsOpen(!isOpen)}
      >
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 rounded-lg bg-primary/10 flex items-center justify-center shrink-0">
            <Swords className="w-4 h-4 text-primary" />
          </div>
          <div>
            <p className="text-sm font-bold text-foreground">Deck Matchups</p>
            <p className="text-xs text-muted-foreground">
              {results.total.toLocaleString()} unique opponent decks
            </p>
          </div>
        </div>

        <div className="flex items-center gap-4 shrink-0">
          {stats && (
            <div className="flex items-center gap-3">
              <div className={cn("flex items-center gap-1.5", orbitron.className)}>
                <Trophy className={cn("w-3.5 h-3.5", ratingColor)} />
                <span className={cn("text-lg font-black", ratingColor)}>
                  {winRatePct != null ? `${winRatePct.toFixed(1)}%` : "—"}
                </span>
              </div>
              <div className={cn("text-sm font-bold flex items-center gap-1", orbitron.className)}>
                <span className="text-emerald-400">{stats.wins.toLocaleString()}W</span>
                <span className="text-muted-foreground/30 font-normal">/</span>
                <span className="text-rose-400">{stats.losses.toLocaleString()}L</span>
              </div>
            </div>
          )}
          {isOpen ? (
            <ChevronUp className="w-4 h-4 text-muted-foreground" />
          ) : (
            <ChevronDown className="w-4 h-4 text-muted-foreground" />
          )}
        </div>
      </button>

      {isOpen && (
        <div className="border-t border-border/20 px-4 pb-4 pt-3 space-y-2 max-h-[500px] overflow-y-auto">
          {results.matchups.length === 0 ? (
            <p className="text-sm text-muted-foreground text-center py-8">
              No matchup data found.
            </p>
          ) : (
            results.matchups.map((m, i) => (
              <MatchupRow
                key={`${m.opponent_deck_id}-${i}`}
                matchup={m}
                index={i}
              />
            ))
          )}
          {results.total_pages > 1 && (
            <p className="text-xs text-muted-foreground/50 text-center pt-1">
              Showing page {results.page} of {results.total_pages}
            </p>
          )}
        </div>
      )}
    </div>
  );
}
