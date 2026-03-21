"use client";

import { cn } from "@/lib/utils";
import { Orbitron } from "next/font/google";
import { Swords, TrendingDown, TrendingUp, Trophy } from "lucide-react";
import { DeckGrid } from "./deck-grid";

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

// ─── Helpers ──────────────────────────────────────────────────────────────────

function toGridCards(cards: MatchupCard[]) {
  return cards.map((c) => ({
    cardName: c.card_name,
    variant: c.variant as "normal" | "evolution" | "heroic",
  }));
}

// ─── WinRateBadge ─────────────────────────────────────────────────────────────

function WinRateBadge({ winRate }: { winRate: number | null }) {
  const pct = winRate != null ? winRate * 100 : null;

  const color =
    pct == null
      ? "text-muted-foreground"
      : pct >= 60
        ? "text-emerald-400"
        : pct >= 40
          ? "text-amber-400"
          : "text-rose-400";

  const bg =
    pct == null
      ? "bg-muted/30 ring-1 ring-border/30"
      : pct >= 60
        ? "bg-emerald-500/10 ring-1 ring-emerald-500/25"
        : pct >= 40
          ? "bg-amber-500/10 ring-1 ring-amber-500/25"
          : "bg-rose-500/10 ring-1 ring-rose-500/25";

  return (
    <div
      className={cn(
        "flex items-center justify-center rounded-lg px-2 py-0.5 shrink-0 min-w-[56px]",
        orbitron.className,
        "text-xs font-black",
        color,
        bg,
      )}
    >
      {pct != null ? `${pct.toFixed(1)}%` : "—"}
    </div>
  );
}

// ─── MatchupSummary ───────────────────────────────────────────────────────────

function MatchupSummary({ matchups }: { matchups: OpponentMatchup[] }) {
  const counters = matchups.filter((m) => (m.win_rate ?? 0.5) < 0.4);
  const even = matchups.filter(
    (m) => (m.win_rate ?? 0.5) >= 0.4 && (m.win_rate ?? 0.5) <= 0.6,
  );
  const favorable = matchups.filter((m) => (m.win_rate ?? 0.5) > 0.6);

  const total = matchups.length || 1;
  const counterPct = (counters.length / total) * 100;
  const evenPct = (even.length / total) * 100;
  const favorablePct = (favorable.length / total) * 100;

  const worstWr =
    counters.length > 0
      ? Math.min(...counters.map((m) => m.win_rate ?? 0.5)) * 100
      : null;
  const bestWr =
    favorable.length > 0
      ? Math.max(...favorable.map((m) => m.win_rate ?? 0.5)) * 100
      : null;
  const evenRange =
    even.length > 0
      ? `${Math.min(...even.map((m) => (m.win_rate ?? 0.5) * 100)).toFixed(
          0,
        )}–${Math.max(...even.map((m) => (m.win_rate ?? 0.5) * 100)).toFixed(
          0,
        )}%`
      : "45–55%";

  return (
    <div className="border-t border-border/20">
      <div className="grid grid-cols-3 divide-x divide-border/20">
        <div className="px-4 py-3 flex flex-col gap-0.5">
          <span className="text-[10px] font-bold text-rose-400/70 uppercase tracking-wider">
            Counters
          </span>
          <span
            className={cn(
              "text-xl font-black text-rose-400",
              orbitron.className,
            )}
          >
            {counters.length}
          </span>
          <span className="text-[10px] text-muted-foreground/60">
            {worstWr != null ? `Worst ${worstWr.toFixed(1)}%` : "No data"}
          </span>
        </div>

        <div className="px-4 py-3 flex flex-col gap-0.5 items-center text-center">
          <span className="text-[10px] font-bold text-amber-400/70 uppercase tracking-wider">
            Even
          </span>
          <span
            className={cn(
              "text-xl font-black text-amber-400",
              orbitron.className,
            )}
          >
            {even.length}
          </span>
          <span className="text-[10px] text-muted-foreground/60">
            {evenRange}
          </span>
        </div>

        <div className="px-4 py-3 flex flex-col gap-0.5 items-end text-right">
          <span className="text-[10px] font-bold text-emerald-400/70 uppercase tracking-wider">
            Favorable
          </span>
          <span
            className={cn(
              "text-xl font-black text-emerald-400",
              orbitron.className,
            )}
          >
            {favorable.length}
          </span>
          <span className="text-[10px] text-muted-foreground/60">
            {bestWr != null ? `Best ${bestWr.toFixed(1)}%` : "No data"}
          </span>
        </div>
      </div>

      <div className="flex h-1">
        <div
          className="bg-rose-500/70 transition-all"
          style={{ width: `${counterPct}%` }}
        />
        <div
          className="bg-amber-400/70 transition-all"
          style={{ width: `${evenPct}%` }}
        />
        <div
          className="bg-emerald-500/70 transition-all"
          style={{ width: `${favorablePct}%` }}
        />
      </div>
    </div>
  );
}

// ─── MatchupEntry ─────────────────────────────────────────────────────────────

function MatchupEntry({
  matchup,
  variant,
}: {
  matchup: OpponentMatchup;
  variant: "counter" | "even" | "favorable";
}) {
  return (
    <div
      className={cn(
        "flex items-center gap-2 p-2 rounded-xl border transition-colors",
        variant === "favorable"
          ? "bg-emerald-500/5 border-emerald-500/15"
          : variant === "even"
            ? "bg-amber-500/5 border-amber-500/15"
            : "bg-rose-500/5 border-rose-500/15",
      )}
    >
      <WinRateBadge winRate={matchup.win_rate} />

      <div className="flex-1 min-w-0 flex justify-center py-1">
        <DeckGrid
          cards={toGridCards(matchup.opponent_cards)}
          className="grid-cols-4 gap-1 w-3/4"
        />
      </div>

      <div
        className={cn(
          "flex flex-col items-end gap-0.5 shrink-0 text-[10px] font-bold",
          orbitron.className,
        )}
      >
        <span className="text-emerald-400">{matchup.wins}W</span>
        <span className="text-rose-400">{matchup.losses}L</span>
      </div>
    </div>
  );
}

// ─── MatchupSection ───────────────────────────────────────────────────────────

function MatchupSection({
  title,
  matchups,
  variant,
}: {
  title: string;
  matchups: OpponentMatchup[];
  variant: "counter" | "even" | "favorable";
}) {
  const Icon =
    variant === "counter"
      ? TrendingDown
      : variant === "favorable"
        ? TrendingUp
        : Swords;
  const iconColor =
    variant === "favorable"
      ? "text-emerald-400"
      : variant === "even"
        ? "text-amber-400"
        : "text-rose-400";
  const titleColor = iconColor;

  return (
    <div className="p-3 space-y-2">
      <div className="flex items-center gap-1.5 pb-1">
        <Icon className={cn("w-3.5 h-3.5", iconColor)} />
        <span className={cn("text-xs font-bold", titleColor)}>{title}</span>
        <span className="text-xs text-muted-foreground/50 ml-auto">
          {matchups.length}
        </span>
      </div>

      {matchups.length === 0 ? (
        <p className="text-xs text-muted-foreground/50 text-center py-4">
          No data
        </p>
      ) : (
        <div className="space-y-1.5">
          {matchups.map((m, i) => (
            <MatchupEntry
              key={`${m.opponent_deck_id}-${i}`}
              matchup={m}
              variant={variant}
            />
          ))}
        </div>
      )}
    </div>
  );
}

// ─── Main component ───────────────────────────────────────────────────────────

export function DeckMatchupResults({
  results,
  className,
}: DeckMatchupResultsProps) {
  const stats = results.stats;
  const winRatePct = stats?.win_rate != null ? stats.win_rate * 100 : null;

  const ratingColor =
    winRatePct == null
      ? "text-muted-foreground"
      : winRatePct >= 60
        ? "text-emerald-400"
        : winRatePct >= 40
          ? "text-amber-400"
          : "text-rose-400";

  const sorted = [...results.matchups].sort(
    (a, b) => (a.win_rate ?? 0.5) - (b.win_rate ?? 0.5),
  );
  const counters = sorted.filter((m) => (m.win_rate ?? 0.5) < 0.4);
  const even = sorted.filter(
    (m) => (m.win_rate ?? 0.5) >= 0.4 && (m.win_rate ?? 0.5) <= 0.6,
  );
  const favorable = [
    ...sorted.filter((m) => (m.win_rate ?? 0.5) > 0.6),
  ].reverse();

  if (!results.deck_id) {
    return (
      <div
        className={cn(
          "rounded-xl border border-border/40 bg-card p-5 my-4 flex items-center gap-3",
          className,
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
        className,
      )}
    >
      {/* Top accent bar */}
      <div className="h-1 bg-gradient-to-r from-rose-600 via-amber-400 to-emerald-500" />

      {/* Header */}
      <div className="px-5 py-4 border-b border-border/20 flex flex-col gap-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-lg bg-primary/10 flex items-center justify-center shrink-0">
              <Swords className="w-4 h-4 text-primary" />
            </div>
            <div>
              <p className="text-sm font-bold text-foreground">Matchup Intel</p>
              <p className="text-xs text-muted-foreground">
                {results.total.toLocaleString()} opponent decks
              </p>
            </div>
          </div>

          {stats && (
            <div className="flex items-center gap-3">
              <div
                className={cn("flex items-center gap-1.5", orbitron.className)}
              >
                <Trophy className={cn("w-3.5 h-3.5", ratingColor)} />
                <span className={cn("text-xl font-black", ratingColor)}>
                  {winRatePct != null ? `${winRatePct.toFixed(1)}%` : "—"}
                </span>
              </div>
              <div
                className={cn(
                  "text-xs font-bold flex flex-col items-end gap-0.5",
                  orbitron.className,
                )}
              >
                <span className="text-emerald-400">
                  {stats.wins.toLocaleString()}W
                </span>
                <span className="text-rose-400">
                  {stats.losses.toLocaleString()}L
                </span>
              </div>
            </div>
          )}
        </div>

        {/* Your deck */}
        <DeckGrid
          cards={toGridCards(results.deck_cards)}
          className="grid-cols-4 gap-1 w-1/4 mx-auto"
        />
      </div>

      {/* Matchup summary */}
      {results.matchups.length > 0 && (
        <MatchupSummary matchups={results.matchups} />
      )}

      {/* Three-column split */}
      {results.matchups.length === 0 ? (
        <p className="text-sm text-muted-foreground text-center py-8">
          No matchup data found.
        </p>
      ) : (
        <div className="grid grid-cols-3 divide-x divide-border/20">
          <MatchupSection
            title="Hard Counters"
            matchups={counters}
            variant="counter"
          />
          <MatchupSection title="Even" matchups={even} variant="even" />
          <MatchupSection
            title="Favorable"
            matchups={favorable}
            variant="favorable"
          />
        </div>
      )}

      {results.matchups.length > 0 && (
        <p className="text-[10px] text-muted-foreground/40 text-center px-4 py-2 border-t border-border/20">
          Showing top {results.matchups.length} matchups by games played out of{" "}
          {results.total.toLocaleString()} unique opponent decks
        </p>
      )}
    </div>
  );
}
