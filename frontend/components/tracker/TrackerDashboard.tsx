"use client";

import { useEffect, useState, useCallback } from "react";
import { useAuth } from "@clerk/nextjs";
import {
  BarChart2,
  Swords,
  Zap,
  Trophy,
  RefreshCw,
  Loader2,
  AlertCircle,
  Clock,
  Crown,
  ChevronLeft,
  ChevronRight,
} from "lucide-react";
import Image from "next/image";
import { cn } from "@/lib/utils";
import type {
  TrackerStats,
  TrackerDeck,
  TrackerBattle,
  TrackerBattlesResponse,
  TrackerWorstMatchup,
  TrackerWorstMatchupsResponse,
} from "./types";

const API_URL = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:8000";

// ─── Helpers ────────────────────────────────────────────────────────────────

function cardImagePath(name: string, variant: string | null) {
  const base = name.toLowerCase().replace(/ /g, "_").replace(/\./g, "");
  const suffix =
    variant === "evolution" ? "_evolution" : variant === "heroic" ? "_hero" : "";
  return `/cards/${base}/${base}${suffix}.png`;
}

function fmtDate(iso: string | null) {
  if (!iso) return "—";
  return new Date(iso).toLocaleDateString(undefined, {
    month: "short",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

// ─── Sub-components ──────────────────────────────────────────────────────────

function StatCard({
  label,
  value,
  sub,
  icon: Icon,
  accent = "default",
}: {
  label: string;
  value: string;
  sub?: string;
  icon: React.ComponentType<{ className?: string }>;
  accent?: "green" | "amber" | "blue" | "red" | "default";
}) {
  const valueColor = {
    green: "text-emerald-400",
    amber: "text-amber-400",
    blue: "text-blue-400",
    red: "text-red-400",
    default: "text-foreground",
  }[accent];

  return (
    <div className="flex flex-col gap-2 rounded-xl border border-border/60 bg-card/40 backdrop-blur-sm p-4">
      <div className="flex items-center gap-2 text-muted-foreground/70">
        <Icon className="w-4 h-4" />
        <span className="text-[10px] font-semibold uppercase tracking-widest">{label}</span>
      </div>
      <span className={cn("font-[family-name:var(--font-heading)] text-3xl font-black", valueColor)}>
        {value}
      </span>
      {sub && <span className="text-[11px] text-muted-foreground">{sub}</span>}
    </div>
  );
}

function DeckRow({ deck, rank }: { deck: TrackerDeck; rank: number }) {
  const [open, setOpen] = useState(false);
  const wr = deck.win_rate ?? 0;
  const wrColor =
    wr >= 55 ? "text-emerald-400" : wr >= 50 ? "text-amber-400" : "text-red-400";
  const wrBarColor =
    wr >= 55 ? "bg-emerald-500" : wr >= 50 ? "bg-amber-500" : "bg-red-500";

  const sorted = [
    ...deck.cards.filter((c) => c.variant === "evolution"),
    ...deck.cards.filter((c) => c.variant === "heroic"),
    ...deck.cards.filter((c) => c.variant === "normal" || !c.variant),
  ].slice(0, 8);

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
        <span className="font-[family-name:var(--font-heading)] text-2xl font-black text-muted-foreground/30 w-6 shrink-0 text-center">
          {rank}
        </span>

        {!open && sorted.length > 0 && (
          <div className="hidden sm:flex items-center gap-1 shrink-0">
            {sorted.map((card, i) => (
              <div
                key={i}
                className="relative w-7 aspect-[3/4] rounded overflow-hidden bg-muted border border-white/5"
              >
                <Image
                  src={cardImagePath(card.name, card.variant ?? null)}
                  alt={card.name}
                  fill
                  className="object-contain"
                  sizes="28px"
                />
              </div>
            ))}
          </div>
        )}

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
          <ChevronLeft className="w-4 h-4 shrink-0 text-muted-foreground rotate-90" />
        ) : (
          <ChevronRight className="w-4 h-4 shrink-0 text-muted-foreground rotate-90" />
        )}
      </button>

      {open && (
        <div className="px-5 pb-5 pt-2 border-t border-border/40 space-y-3">
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
          <div className="grid grid-cols-8 gap-2">
            {sorted.map((card, i) => (
              <div key={i} className="flex flex-col items-center gap-1">
                <div className="relative w-full aspect-[3/4] rounded overflow-hidden bg-muted/60 border border-white/5">
                  <Image
                    src={cardImagePath(card.name, card.variant ?? null)}
                    alt={card.name}
                    fill
                    className="object-contain"
                    sizes="64px"
                  />
                </div>
                <span className="text-[9px] text-muted-foreground text-center leading-tight truncate w-full">
                  {card.name}
                </span>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

function WorstMatchupRow({ matchup, rank }: { matchup: TrackerWorstMatchup; rank: number }) {
  const wr = matchup.win_rate ?? 0;
  const wrColor =
    wr >= 55 ? "text-emerald-400" : wr >= 50 ? "text-amber-400" : "text-red-400";

  return (
    <div className="relative flex flex-col gap-4 p-5 rounded-3xl border border-border/40 bg-card/60 hover:bg-card/80 hover:border-border/60 transition-all shrink-0 w-[200px] sm:w-[220px] h-full group overflow-hidden">


      <div className="relative w-24 sm:w-28 aspect-[3/4] mx-auto shrink-0 group-hover:scale-110 group-hover:-translate-y-2 transition-all duration-300 z-10 filter drop-shadow-[0_10px_10px_rgba(0,0,0,0.5)]">
        <Image
          src={cardImagePath(matchup.card_name, null)}
          alt={matchup.card_name}
          fill
          className="object-contain"
          sizes="128px"
        />
      </div>

      <div className="flex flex-col w-full z-10 text-center space-y-1">
        <p className="text-xl font-bold text-foreground font-[family-name:var(--font-heading)] tracking-wide truncate w-full px-1">
          {matchup.card_name}
        </p>

        <div className="flex flex-col items-center">
          <span className={cn("font-[family-name:var(--font-heading)] text-5xl font-black mt-2", wrColor)}>
            {matchup.win_rate !== null ? `${Math.round(matchup.win_rate)}%` : "—"}
          </span>
          <span className="text-[10px] uppercase tracking-widest text-muted-foreground font-semibold mt-1">
            Win Rate
          </span>
        </div>
      </div>

      <div className="flex items-center justify-between w-full mt-auto z-10 pt-5 border-t border-border/30">
        <div className="flex flex-col items-start gap-1">
          <span className="text-lg font-bold font-mono text-foreground leading-none">{matchup.games.toLocaleString()}</span>
          <span className="text-[10px] uppercase tracking-widest text-muted-foreground font-semibold leading-none">Games</span>
        </div>
        <div className="flex flex-col items-end gap-1">
          <div className="flex items-center font-mono text-lg font-bold leading-none">
            <span className="text-emerald-400">{matchup.wins}</span>
            <span className="text-muted-foreground/40 mx-1">-</span>
            <span className="text-red-400">{matchup.losses}</span>
          </div>
          <span className="text-[10px] uppercase tracking-widest text-muted-foreground font-semibold leading-none">Record</span>
        </div>
      </div>
    </div>
  );
}

function BattleRow({ battle }: { battle: TrackerBattle }) {
  const isWin = battle.result === "Win";
  return (
    <div
      className={cn(
        "flex-1 flex items-center gap-4 px-4 py-2 sm:py-3 rounded-xl border transition-colors min-h-0",
        isWin
          ? "border-emerald-500/20 bg-emerald-500/5"
          : "border-red-500/20 bg-red-500/5"
      )}
    >
      {/* Result badge */}
      <span
        className={cn(
          "w-10 text-center text-xs font-bold uppercase tracking-wider rounded-md px-1.5 py-0.5",
          isWin
            ? "bg-emerald-500/20 text-emerald-400"
            : "bg-red-500/20 text-red-400"
        )}
      >
        {battle.result}
      </span>

      {/* Crowns */}
      <div className="flex items-center gap-1 text-amber-400 font-bold text-sm min-w-[2.5rem]">
        <Crown className="w-3.5 h-3.5" />
        {battle.crowns ?? "—"}
      </div>

      {/* Opponent */}
      <div className="flex-1 min-w-0">
        <p className="text-sm font-medium text-foreground truncate">
          vs {battle.opponent ?? "Unknown"}
        </p>
        <p className="text-[10px] text-muted-foreground">
          {battle.game_mode ?? "—"}
        </p>
      </div>

      {/* Elixir leaked */}
      {battle.elixir_leaked !== null && (
        <div className="text-right hidden sm:block">
          <p className="text-xs font-semibold text-purple-400">
            {battle.elixir_leaked.toFixed(1)}
          </p>
          <p className="text-[9px] text-muted-foreground">elixir leaked</p>
        </div>
      )}

      {/* Time */}
      <div className="text-right hidden md:block">
        <p className="text-xs text-muted-foreground">{fmtDate(battle.battle_time)}</p>
      </div>
    </div>
  );
}

// ─── Main Dashboard ──────────────────────────────────────────────────────────

interface TrackerDashboardProps {
  playerTag: string;
  playerName: string;
  onChangeTag: () => void;
}

export function TrackerDashboard({
  playerTag,
  playerName,
  onChangeTag,
}: TrackerDashboardProps) {
  const { getToken } = useAuth();

  const [stats, setStats] = useState<TrackerStats | null>(null);
  const [decks, setDecks] = useState<TrackerDeck[]>([]);
  const [worstMatchups, setWorstMatchups] = useState<TrackerWorstMatchup[]>([]);
  const [battlesData, setBattlesData] = useState<TrackerBattlesResponse | null>(null);
  const [page, setPage] = useState(1);

  const [loadingStats, setLoadingStats] = useState(true);
  const [loadingDecks, setLoadingDecks] = useState(true);
  const [loadingWorstMatchups, setLoadingWorstMatchups] = useState(true);
  const [loadingBattles, setLoadingBattles] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const authFetch = useCallback(
    async (url: string) => {
      const token = await getToken();
      const res = await fetch(url, {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (!res.ok) {
        const body = await res.json().catch(() => ({}));
        throw new Error(body.detail ?? `Request failed (${res.status})`);
      }
      return res.json();
    },
    [getToken]
  );

  useEffect(() => {
    setLoadingStats(true);
    authFetch(`${API_URL}/api/tracker/me/stats`)
      .then((d) => setStats(d.stats))
      .catch((e) => setError(e.message))
      .finally(() => setLoadingStats(false));

    setLoadingDecks(true);
    authFetch(`${API_URL}/api/tracker/me/decks?limit=10`)
      .then((d) => setDecks(d.decks ?? []))
      .catch(() => setDecks([]))
      .finally(() => setLoadingDecks(false));

    setLoadingWorstMatchups(true);
    authFetch(`${API_URL}/api/tracker/me/worst-matchups?limit=10`)
      .then((d) => setWorstMatchups(d.worst_matchups ?? []))
      .catch(() => setWorstMatchups([]))
      .finally(() => setLoadingWorstMatchups(false));
  }, [authFetch]);

  useEffect(() => {
    setLoadingBattles(true);
    authFetch(`${API_URL}/api/tracker/me/battles?page=${page}&page_size=10`)
      .then((d) => setBattlesData(d))
      .catch(() => setBattlesData(null))
      .finally(() => setLoadingBattles(false));
  }, [authFetch, page]);

  const isDataEmpty = !loadingStats && stats?.total_games === 0;
  const hasData = !loadingStats && (stats?.total_games ?? 0) > 0;

  return (
    <div className="w-full space-y-8">
      {/* Header */}
      <div className="flex items-center justify-between flex-wrap gap-4">
        <div>
          <h1 className="font-[family-name:var(--font-heading)] text-3xl font-black text-foreground">
            {playerName}
          </h1>
          <p className="text-sm font-mono text-muted-foreground/70">{playerTag}</p>
        </div>
        <button
          onClick={onChangeTag}
          className="flex items-center gap-2 px-4 py-2 rounded-lg border border-border text-sm text-muted-foreground hover:bg-muted/40 hover:text-foreground transition-all"
        >
          <RefreshCw className="w-3.5 h-3.5" />
          Change Tag
        </button>
      </div>

      {error && (
        <div className="flex items-center gap-2 text-red-400 bg-red-500/10 border border-red-500/20 rounded-lg px-4 py-3 text-sm">
          <AlertCircle className="w-4 h-4 shrink-0" />
          {error}
        </div>
      )}

      {/* Empty state */}
      {isDataEmpty && (
        <div className="rounded-2xl border border-border/60 bg-card/40 p-10 text-center space-y-3">
          <Clock className="w-10 h-10 text-muted-foreground/40 mx-auto" />
          <p className="font-[family-name:var(--font-heading)] text-lg font-bold text-foreground">
            Your battles are being processed…
          </p>
          <p className="text-sm text-muted-foreground max-w-sm mx-auto">
            Your tag has been registered. Your battle data will appear here after the next ETL pipeline run. Check back soon!
          </p>
        </div>
      )}

      {/* Stats grid */}
      {(hasData || loadingStats) && (
        <section className="space-y-3">
          <h2 className="text-sm font-semibold uppercase tracking-widest text-muted-foreground/70 flex items-center gap-2">
            <BarChart2 className="w-4 h-4" /> Overview
          </h2>
          {loadingStats ? (
            <div className="grid grid-cols-2 md:grid-cols-4 gap-3 animate-pulse">
              {[...Array(4)].map((_, i) => (
                <div key={i} className="h-24 rounded-xl bg-muted/40" />
              ))}
            </div>
          ) : stats ? (
            <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
              <StatCard
                label="Total Battles"
                value={stats.total_games.toLocaleString()}
                icon={Swords}
              />
              <StatCard
                label="Win Rate"
                value={stats.win_rate !== null ? `${stats.win_rate}%` : "—"}
                sub={`${stats.wins}W / ${stats.losses}L`}
                icon={Trophy}
                accent={
                  (stats.win_rate ?? 0) >= 55
                    ? "green"
                    : (stats.win_rate ?? 0) >= 50
                    ? "amber"
                    : "red"
                }
              />
              <StatCard
                label="Avg Crowns"
                value={stats.avg_crowns !== null ? stats.avg_crowns.toFixed(1) : "—"}
                icon={Crown}
                accent="amber"
              />
              <StatCard
                label="Avg Elixir Leaked"
                value={
                  stats.avg_elixir_leaked !== null
                    ? stats.avg_elixir_leaked.toFixed(1)
                    : "—"
                }
                icon={Zap}
                accent="blue"
              />
            </div>
          ) : null}
        </section>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        <div className="lg:col-span-8 flex flex-col gap-6">
          {/* Deck breakdown */}
          {(hasData || loadingDecks) && (
            <section className="bg-card/40 border border-border/50 rounded-2xl p-5 sm:p-6 flex flex-col gap-4 shadow-sm">
              <h2 className="text-sm font-semibold uppercase tracking-widest text-muted-foreground/70 flex items-center gap-2">
                <Zap className="w-4 h-4 text-amber-400" /> Your Top Decks
              </h2>
              {loadingDecks ? (
                <div className="space-y-2 animate-pulse">
                  {[...Array(3)].map((_, i) => (
                    <div key={i} className="h-16 rounded-xl bg-muted/40" />
                  ))}
                </div>
              ) : decks.length > 0 ? (
                <div className="space-y-2">
                  {decks.map((deck, i) => (
                    <DeckRow key={deck.deck_id} deck={deck} rank={i + 1} />
                  ))}
                </div>
              ) : (
                <p className="text-sm text-muted-foreground bg-muted/20 border border-border/50 rounded-xl px-5 py-4">No deck data yet.</p>
              )}
            </section>
          )}

          {/* Worst Matchups */}
          {(hasData || loadingWorstMatchups) && (
            <section className="bg-card/40 border border-border/50 rounded-2xl p-5 sm:p-6 flex flex-col gap-4 shadow-sm">
              <h2 className="text-sm font-semibold uppercase tracking-widest text-muted-foreground/70 flex items-center gap-2">
                <AlertCircle className="w-4 h-4 text-red-500" /> Your Worst Matchups
              </h2>
              {loadingWorstMatchups ? (
                <div className="space-y-2 animate-pulse">
                  {[...Array(3)].map((_, i) => (
                    <div key={i} className="h-16 rounded-xl bg-muted/40" />
                  ))}
                </div>
              ) : worstMatchups.length > 0 ? (
                <div className="flex overflow-x-auto gap-3 sm:gap-4 pb-2 snap-x scrollbar-thin scrollbar-thumb-border scrollbar-track-transparent h-[320px]">
                  {worstMatchups.map((matchup, i) => (
                    <div key={matchup.card_id} className="snap-start shrink-0 h-full">
                      <WorstMatchupRow matchup={matchup} rank={i + 1} />
                    </div>
                  ))}
                </div>
              ) : (
                <p className="text-sm text-muted-foreground bg-muted/20 border border-border/50 rounded-xl px-5 py-4">
                  Not enough data to determine your worst matchups yet. Play more games!
                </p>
              )}
            </section>
          )}
        </div>

        <div className="lg:col-span-4 flex flex-col">
          {/* Battle history */}
          {(hasData || loadingBattles) && (
            <section className="bg-card/40 border border-border/50 rounded-2xl p-5 sm:p-6 flex flex-col gap-4 shadow-sm h-full">
              <div className="flex items-center justify-between shrink-0">
                <h2 className="text-sm font-semibold uppercase tracking-widest text-foreground flex items-center gap-2">
                  <Swords className="w-4 h-4 text-primary" /> Battle History
                </h2>
                {battlesData && battlesData.total > 0 && (
                  <span className="text-xs font-medium text-muted-foreground bg-muted/60 px-2.5 py-1 rounded-full border border-border/40">
                    {battlesData.total.toLocaleString()} total
                  </span>
                )}
              </div>

              <div className="flex-1 flex flex-col gap-2 min-h-0">
                {loadingBattles ? (
                  <div className="flex-1 flex flex-col gap-2 animate-pulse pb-1">
                    {[...Array(10)].map((_, i) => (
                      <div key={i} className="flex-1 min-h-0 rounded-xl bg-muted/40" />
                    ))}
                  </div>
                ) : battlesData && battlesData.battles.length > 0 ? (
                  <div className="flex-1 flex flex-col gap-2 overflow-hidden pb-1">
                    {battlesData.battles.map((battle, i) => (
                      <BattleRow key={i} battle={battle} />
                    ))}
                  </div>
                ) : (
                  <p className="text-sm text-muted-foreground bg-muted/20 border border-border/50 rounded-xl px-5 py-4">No battles recorded yet.</p>
                )}
              </div>

              {/* Pagination */}
              {!loadingBattles && battlesData && battlesData.total_pages > 1 && (
                <div className="flex items-center justify-between pt-3 border-t border-border/40 shrink-0 mt-auto">
                  <button
                    disabled={!battlesData.has_previous}
                    onClick={() => setPage((p) => p - 1)}
                    className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-border/60 bg-card hover:bg-muted text-xs font-medium text-foreground transition-all disabled:opacity-40 disabled:cursor-not-allowed"
                  >
                    <ChevronLeft className="w-3.5 h-3.5" /> <span className="hidden sm:inline">Prev</span>
                  </button>
                  <span className="text-xs font-bold text-muted-foreground">
                    {page} <span className="font-normal mx-0.5">/</span> {battlesData.total_pages}
                  </span>
                  <button
                    disabled={!battlesData.has_next}
                    onClick={() => setPage((p) => p + 1)}
                    className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-border/60 bg-card hover:bg-muted text-xs font-medium text-foreground transition-all disabled:opacity-40 disabled:cursor-not-allowed"
                  >
                    <span className="hidden sm:inline">Next</span> <ChevronRight className="w-3.5 h-3.5" />
                  </button>
                </div>
              )}
            </section>
          )}
        </div>
      </div>
    </div>
  );
}
