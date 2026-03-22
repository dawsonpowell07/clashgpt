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
  ChevronDown,
  ExternalLink,
} from "lucide-react";
import Image from "next/image";
import { cn } from "@/lib/utils";
import { DeckGrid } from "@/components/deck-grid";
import { CardIcon } from "@/components/card-icon";
import {
  PieChart,
  Pie,
  Cell,
  Label,
  ResponsiveContainer,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  CartesianGrid,
  ReferenceLine,
} from "recharts";
import type {
  TrackerStats,
  TrackerDeck,
  TrackerBattle,
  TrackerBattlesResponse,
  TrackerWorstMatchup,
} from "./types";

const API_URL = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:8000";

// ─── Helpers ────────────────────────────────────────────────────────────────

function cardImagePath(name: string, variant: string | null) {
  const base = name.toLowerCase().replace(/ /g, "_").replace(/\./g, "");
  const suffix =
    variant === "evolution"
      ? "_evolution"
      : variant === "heroic"
        ? "_hero"
        : "";
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

// ─── Shared section heading ───────────────────────────────────────────────────

function SectionHeading({
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

// ─── StatCard ────────────────────────────────────────────────────────────────

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
  accent?: "green" | "amber" | "blue" | "red" | "default" | "purple";
}) {
  const valueColor = {
    green: "text-emerald-400",
    amber: "text-amber-400",
    blue: "text-sky-400",
    red: "text-rose-400",
    default: "text-foreground",
    purple: "text-purple-400",
  }[accent];

  const accentBg = {
    green: "from-emerald-500/[0.08] border-emerald-500/20",
    amber: "from-amber-500/[0.08] border-amber-500/20",
    blue: "from-sky-500/[0.08] border-sky-500/20",
    red: "from-rose-500/[0.08] border-rose-500/20",
    default: "from-muted/50 border-border/50",
    purple: "from-purple-500/[0.08] border-purple-500/20",
  }[accent];

  const accentTop = {
    green: "from-emerald-400/80 via-emerald-400/20 to-transparent",
    amber: "from-amber-400/80 via-amber-400/20 to-transparent",
    blue: "from-sky-400/80 via-sky-400/20 to-transparent",
    red: "from-rose-400/80 via-rose-400/20 to-transparent",
    default: "from-border/60 to-transparent",
    purple: "from-purple-400/80 via-purple-400/20 to-transparent",
  }[accent];

  return (
    <div
      className={cn(
        "relative flex flex-col gap-1.5 bg-gradient-to-b to-card/30 border rounded-xl p-3.5 overflow-hidden",
        accentBg,
      )}
    >
      <div
        className={cn(
          "absolute top-0 left-0 right-0 h-[1.5px] bg-gradient-to-r",
          accentTop,
        )}
      />
      <span className="text-[9px] font-bold uppercase tracking-widest text-muted-foreground/60 flex items-center gap-1.5">
        <Icon className="w-3 h-3" />
        {label}
      </span>
      <span
        className={cn(
          "font-[family-name:var(--font-heading)] text-2xl font-black leading-none",
          valueColor,
        )}
      >
        {value}
      </span>
      {sub && <span className="text-[11px] text-muted-foreground">{sub}</span>}
    </div>
  );
}

// ─── DeckRow ─────────────────────────────────────────────────────────────────

function DeckRow({ deck, rank }: { deck: TrackerDeck; rank: number }) {
  const [isOpen, setIsOpen] = useState(false);
  const wr = deck.win_rate ?? 0;
  const wrColor =
    wr >= 55
      ? "text-emerald-400"
      : wr >= 50
        ? "text-amber-400"
        : "text-red-400";
  const wrBarColor =
    wr >= 55 ? "bg-emerald-500" : wr >= 50 ? "bg-amber-500" : "bg-red-500";

  const cards = [
    ...deck.cards.filter((c) => c.variant === "evolution"),
    ...deck.cards.filter((c) => c.variant === "heroic"),
    ...deck.cards.filter((c) => c.variant === "normal" || !c.variant),
  ]
    .slice(0, 8)
    .map((c) => ({
      cardName: c.name,
      variant: (c.variant ?? "normal") as "normal" | "evolution" | "heroic",
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
            <CardIcon
              key={i}
              cardName={card.cardName}
              variant={card.variant}
              className="flex-1 min-w-0"
            />
          ))}
        </div>

        <ChevronDown
          className={cn(
            "w-4 h-4 text-muted-foreground/60 shrink-0 transition-transform duration-200 ml-1",
            isOpen && "rotate-180",
          )}
        />
      </button>

      {/* Expanded — stats only */}
      {isOpen && (
        <div className="px-4 pb-4 pt-3 border-t border-border/40 flex flex-col gap-3">
          <div className="flex flex-col gap-3 min-w-0">
            <div>
              <div className="flex items-center justify-between mb-2">
                <span className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground/60 flex items-center gap-1">
                  <Trophy className="w-3 h-3" /> Win Rate
                </span>
                <span
                  className={cn(
                    "text-base font-black font-[family-name:var(--font-heading)]",
                    wrColor,
                  )}
                >
                  {deck.win_rate !== null ? `${deck.win_rate}%` : "—"}
                </span>
              </div>
              <div className="h-2 w-full bg-muted/80 rounded-full overflow-hidden">
                <div
                  className={cn(
                    "h-full rounded-full transition-all",
                    wrBarColor,
                  )}
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
                  <span className="text-sm font-bold text-foreground">
                    {deck.avg_elixir ?? "—"}
                  </span>
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

// ─── WorstMatchupRow ──────────────────────────────────────────────────────────

function WorstMatchupRow({ matchup }: { matchup: TrackerWorstMatchup }) {
  const wr = matchup.win_rate ?? 0;
  const wrColor =
    wr >= 55
      ? "text-emerald-400"
      : wr >= 50
        ? "text-amber-400"
        : "text-red-400";

  return (
    <div className="relative flex flex-col gap-3 p-4 rounded-2xl border border-border/40 bg-card/60 hover:bg-card/80 hover:border-border/60 transition-all shrink-0 w-[160px] sm:w-[176px] h-full group overflow-hidden">
      <div className="relative w-16 sm:w-20 aspect-[3/4] mx-auto shrink-0 group-hover:scale-110 group-hover:-translate-y-1 transition-all duration-300 z-10 filter drop-shadow-[0_8px_8px_rgba(0,0,0,0.5)]">
        <Image
          src={cardImagePath(matchup.card_name, null)}
          alt={matchup.card_name}
          fill
          className="object-contain"
          sizes="96px"
        />
      </div>

      <div className="flex flex-col w-full z-10 text-center gap-0.5">
        <p className="text-sm font-bold text-foreground font-[family-name:var(--font-heading)] tracking-wide truncate px-1">
          {matchup.card_name}
        </p>
        <span
          className={cn(
            "font-[family-name:var(--font-heading)] text-2xl font-black",
            wrColor,
          )}
        >
          {matchup.win_rate !== null ? `${Math.round(matchup.win_rate)}%` : "—"}
        </span>
        <span className="text-[9px] uppercase tracking-widest text-muted-foreground/70 font-semibold">
          Win Rate
        </span>
      </div>

      <div className="flex items-center justify-between w-full mt-auto z-10 pt-3 border-t border-border/30">
        <div className="flex flex-col items-start gap-0.5">
          <span className="text-xs font-bold font-mono text-foreground leading-none">
            {matchup.games.toLocaleString()}
          </span>
          <span className="text-[9px] uppercase tracking-widest text-muted-foreground/70 font-semibold leading-none">
            Games
          </span>
        </div>
        <div className="flex flex-col items-end gap-0.5">
          <div className="flex items-center font-mono text-xs font-bold leading-none">
            <span className="text-emerald-400">{matchup.wins}</span>
            <span className="text-muted-foreground/40 mx-0.5">-</span>
            <span className="text-red-400">{matchup.losses}</span>
          </div>
          <span className="text-[9px] uppercase tracking-widest text-muted-foreground/70 font-semibold leading-none">
            Record
          </span>
        </div>
      </div>
    </div>
  );
}

// ─── BattleRow ────────────────────────────────────────────────────────────────

function BattleRow({ battle }: { battle: TrackerBattle }) {
  const isWin = battle.result === "Win";
  return (
    <button
      onClick={() => {
        if (battle.battle_id) {
          window.open(
            `/tracker/battle/${encodeURIComponent(battle.battle_id)}`,
            "_blank",
          );
        }
      }}
      className={cn(
        "w-full flex items-center gap-3 px-3 py-2.5 rounded-xl border text-sm transition-colors shrink-0 text-left",
        battle.battle_id ? "cursor-pointer" : "cursor-default",
        isWin
          ? "border-emerald-500/20 bg-emerald-500/5 hover:bg-emerald-500/10"
          : "border-red-500/20 bg-red-500/5 hover:bg-red-500/10",
      )}
    >
      <span
        className={cn(
          "shrink-0 w-10 text-center text-[10px] font-bold uppercase tracking-wider rounded-md px-1.5 py-1",
          isWin
            ? "bg-emerald-500/20 text-emerald-400"
            : "bg-red-500/20 text-red-400",
        )}
      >
        {battle.result}
      </span>
      <div className="flex items-center gap-1 text-amber-400 font-bold text-sm shrink-0 min-w-[2.25rem]">
        <Crown className="w-3 h-3" />
        {battle.crowns ?? "—"}
      </div>
      <div className="flex-1 min-w-0">
        <p className="text-xs font-medium text-foreground truncate">
          vs {battle.opponent ?? "Unknown"}
        </p>
        <p className="text-[10px] text-muted-foreground">
          {fmtDate(battle.battle_time)}
        </p>
      </div>
      {battle.elixir_leaked !== null && (
        <div className="text-right shrink-0 hidden sm:block">
          <p className="text-xs font-semibold text-purple-400">
            {battle.elixir_leaked.toFixed(1)}
          </p>
          <p className="text-[9px] text-muted-foreground">elixir</p>
        </div>
      )}
      {battle.battle_id !== null && (
        <ExternalLink className="w-3 h-3 text-muted-foreground/40 shrink-0" />
      )}
    </button>
  );
}

// ─── Chart helpers ───────────────────────────────────────────────────────────

function fmtActivityDate(iso: string) {
  return new Date(iso + "T12:00:00").toLocaleDateString(undefined, {
    month: "short",
    day: "numeric",
  });
}

const CHART_TOOLTIP_STYLE = {
  background: "rgba(6, 9, 20, 0.95)",
  border: "1px solid rgba(148, 163, 184, 0.12)",
  borderRadius: "10px",
  fontSize: "12px",
  boxShadow:
    "0 20px 40px rgba(0,0,0,0.6), inset 0 1px 0 rgba(255,255,255,0.06)",
};
const CHART_ITEM_STYLE = { color: "#e2e8f0" };
const CHART_LABEL_STYLE = { color: "#94a3b8" };

function WinLossDonut({
  wins,
  losses,
  winRate,
}: {
  wins: number;
  losses: number;
  winRate: number | null;
}) {
  const pct = winRate !== null ? `${winRate}%` : "—";
  const data = [
    { name: "Wins", value: wins },
    { name: "Losses", value: losses },
  ];
  return (
    <div className="bg-card/50 border border-border/60 rounded-2xl p-5 flex flex-col gap-3 shadow-[0_0_40px_rgba(34,211,238,0.04)]">
      <p className="text-[9px] font-bold uppercase tracking-widest text-muted-foreground/60 flex items-center gap-1.5">
        <Trophy className="w-3 h-3" /> Win / Loss
      </p>
      <div className="h-44">
        <ResponsiveContainer width="100%" height="100%">
          <PieChart>
            <defs>
              <linearGradient id="pieBlueGrad" x1="0" y1="0" x2="1" y2="1">
                <stop offset="0%" stopColor="#67e8f9" />
                <stop offset="100%" stopColor="#3b82f6" />
              </linearGradient>
              <linearGradient id="pieRedGrad" x1="0" y1="0" x2="1" y2="1">
                <stop offset="0%" stopColor="#fb7185" />
                <stop offset="100%" stopColor="#e11d48" />
              </linearGradient>
            </defs>
            <Pie
              data={data}
              cx="50%"
              cy="50%"
              innerRadius={50}
              outerRadius={74}
              dataKey="value"
              strokeWidth={0}
              isAnimationActive={false}
              paddingAngle={3}
              cornerRadius={4}
            >
              <Cell fill="url(#pieBlueGrad)" />
              <Cell fill="url(#pieRedGrad)" />
              <Label
                value={pct}
                position="center"
                style={{
                  fontSize: "24px",
                  fontWeight: 900,
                  fill: "#f0f9ff",
                  letterSpacing: "-0.5px",
                }}
              />
            </Pie>
            <Tooltip
              // eslint-disable-next-line @typescript-eslint/no-explicit-any
              formatter={(v: any, n: any) => [v?.toLocaleString() ?? "", n]}
              contentStyle={CHART_TOOLTIP_STYLE}
              itemStyle={CHART_ITEM_STYLE}
              labelStyle={{ ...CHART_LABEL_STYLE, display: "none" }}
            />
          </PieChart>
        </ResponsiveContainer>
      </div>
      <div className="flex justify-center gap-5 text-xs text-muted-foreground">
        <span className="flex items-center gap-1.5">
          <span className="w-2.5 h-2.5 rounded-full bg-cyan-400 inline-block shadow-[0_0_8px_rgba(103,232,249,0.7)]" />
          <span className="font-semibold text-foreground/80">
            {wins.toLocaleString()}
          </span>
          W
        </span>
        <span className="flex items-center gap-1.5">
          <span className="w-2.5 h-2.5 rounded-full bg-rose-500 inline-block shadow-[0_0_8px_rgba(251,113,133,0.7)]" />
          <span className="font-semibold text-foreground/80">
            {losses.toLocaleString()}
          </span>
          L
        </span>
      </div>
    </div>
  );
}

const ACTIVITY_OPTIONS = [
  { label: "24h", days: 1 },
  { label: "7d", days: 7 },
  { label: "14d", days: 14 },
  { label: "30d", days: 30 },
  { label: "60d", days: 60 },
];

function GamesPerDayChart({
  activity,
  days,
  onDaysChange,
  loading,
}: {
  activity: { date: string; wins: number; losses: number }[];
  days: number;
  onDaysChange: (d: number) => void;
  loading: boolean;
}) {
  const data = activity.map((d) => ({ ...d, date: fmtActivityDate(d.date) }));
  return (
    <div className="bg-card/50 border border-border/60 rounded-2xl p-5 flex flex-col gap-3 flex-1">
      <div className="flex items-center justify-between gap-2">
        <p className="text-[9px] font-bold uppercase tracking-widest text-muted-foreground/60 flex items-center gap-1.5">
          <Swords className="w-3 h-3" /> Activity
        </p>
        <div className="flex items-center gap-1">
          {ACTIVITY_OPTIONS.map((opt) => (
            <button
              key={opt.days}
              onClick={() => onDaysChange(opt.days)}
              className={cn(
                "px-2 py-0.5 rounded text-[10px] font-bold transition-colors",
                days === opt.days
                  ? "bg-sky-500/15 text-sky-400 border border-sky-400/30"
                  : "text-muted-foreground/60 hover:text-muted-foreground hover:bg-muted/60",
              )}
            >
              {opt.label}
            </button>
          ))}
        </div>
      </div>
      <div className="h-44 relative">
        {loading && (
          <div className="absolute inset-0 flex items-center justify-center bg-background/40 rounded-lg z-10">
            <Loader2 className="w-5 h-5 animate-spin text-muted-foreground/40" />
          </div>
        )}
        <ResponsiveContainer width="100%" height="100%">
          <BarChart
            data={data}
            maxBarSize={28}
            barCategoryGap="25%"
            margin={{ top: 4, right: 4, left: -24, bottom: 0 }}
          >
            <defs>
              <linearGradient id="barBlueGrad" x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor="#38bdf8" stopOpacity={0.95} />
                <stop offset="100%" stopColor="#0284c7" stopOpacity={0.85} />
              </linearGradient>
              <linearGradient id="barRedGrad" x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor="#fb7185" stopOpacity={0.95} />
                <stop offset="100%" stopColor="#be123c" stopOpacity={0.85} />
              </linearGradient>
            </defs>
            <CartesianGrid
              vertical={false}
              stroke="rgba(148,163,184,0.1)"
              strokeDasharray="4 4"
            />
            <XAxis
              dataKey="date"
              tick={{ fontSize: 10, fill: "#94a3b8" }}
              axisLine={false}
              tickLine={false}
              dy={5}
            />
            <YAxis
              allowDecimals={false}
              tick={{ fontSize: 10, fill: "#94a3b8" }}
              axisLine={false}
              tickLine={false}
            />
            <Tooltip
              contentStyle={CHART_TOOLTIP_STYLE}
              itemStyle={CHART_ITEM_STYLE}
              labelStyle={CHART_LABEL_STYLE}
              cursor={{ fill: "rgba(255,255,255,0.04)" }}
            />
            <Bar
              dataKey="wins"
              name="Wins"
              stackId="a"
              fill="url(#barBlueGrad)"
              radius={[0, 0, 0, 0]}
              isAnimationActive={false}
            />
            <Bar
              dataKey="losses"
              name="Losses"
              stackId="a"
              fill="url(#barRedGrad)"
              radius={[4, 4, 0, 0]}
              isAnimationActive={false}
            />
          </BarChart>
        </ResponsiveContainer>
      </div>
      <div className="flex justify-end gap-4 text-xs text-muted-foreground">
        <span className="flex items-center gap-1.5">
          <span className="w-2 h-2 rounded-sm bg-sky-400 inline-block" />
          Wins
        </span>
        <span className="flex items-center gap-1.5">
          <span className="w-2 h-2 rounded-sm bg-rose-500 inline-block" />
          Losses
        </span>
      </div>
    </div>
  );
}

function DeckWinRateChart({ decks }: { decks: TrackerDeck[] }) {
  if (decks.length === 0) return null;
  const data = decks.slice(0, 8).map((d, i) => ({
    name: `Deck ${i + 1}`,
    wr: d.win_rate ?? 0,
    games: d.games,
  }));
  return (
    <div className="bg-card/50 border border-border/60 rounded-2xl p-5 flex flex-col gap-3">
      <p className="text-[9px] font-bold uppercase tracking-widest text-muted-foreground/60 flex items-center gap-1.5">
        <Zap className="w-3 h-3 text-amber-400" /> Deck Win Rates
      </p>
      <div className="h-52">
        <ResponsiveContainer width="100%" height="100%">
          <BarChart
            data={data}
            layout="vertical"
            margin={{ top: 0, right: 40, left: 0, bottom: 0 }}
            maxBarSize={20}
            barCategoryGap="15%"
          >
            <defs>
              <linearGradient id="deckGreenGrad" x1="0" y1="0" x2="1" y2="0">
                <stop offset="0%" stopColor="#86efac" />
                <stop offset="100%" stopColor="#16a34a" />
              </linearGradient>
              <linearGradient id="deckAmberGrad" x1="0" y1="0" x2="1" y2="0">
                <stop offset="0%" stopColor="#fcd34d" />
                <stop offset="100%" stopColor="#b45309" />
              </linearGradient>
              <linearGradient id="deckRedGrad" x1="0" y1="0" x2="1" y2="0">
                <stop offset="0%" stopColor="#fb7185" />
                <stop offset="100%" stopColor="#9f1239" />
              </linearGradient>
            </defs>
            <CartesianGrid
              horizontal={false}
              stroke="rgba(148,163,184,0.1)"
              strokeDasharray="3 3"
            />
            <XAxis
              type="number"
              domain={[0, 100]}
              tick={{ fontSize: 10, fill: "#94a3b8" }}
              axisLine={false}
              tickLine={false}
              tickFormatter={(v) => `${v}%`}
            />
            <YAxis
              type="category"
              dataKey="name"
              tick={{ fontSize: 11, fill: "#94a3b8", fontWeight: 500 }}
              axisLine={false}
              tickLine={false}
              width={64}
            />
            <Tooltip
              // eslint-disable-next-line @typescript-eslint/no-explicit-any
              formatter={(v: any, _n: any, props: any) => [
                `${v}% (${props.payload?.games?.toLocaleString() ?? 0} games)`,
                "Win Rate",
              ]}
              contentStyle={CHART_TOOLTIP_STYLE}
              itemStyle={CHART_ITEM_STYLE}
              labelStyle={CHART_LABEL_STYLE}
              cursor={{ fill: "rgba(255,255,255,0.04)" }}
            />
            <Bar
              dataKey="wr"
              name="Win Rate"
              radius={[0, 4, 4, 0]}
              isAnimationActive={false}
              // eslint-disable-next-line @typescript-eslint/no-explicit-any
              label={{
                position: "right",
                fontSize: 11,
                fill: "#e2e8f0",
                fontWeight: 700,
                formatter: (v: any) => `${v}%`,
              }}
            >
              {data.map((d, i) => (
                <Cell
                  key={i}
                  fill={
                    d.wr >= 55
                      ? "url(#deckGreenGrad)"
                      : d.wr >= 50
                        ? "url(#deckAmberGrad)"
                        : "url(#deckRedGrad)"
                  }
                />
              ))}
            </Bar>
            <ReferenceLine
              x={50}
              stroke="rgba(248,113,133,0.4)"
              strokeDasharray="4 3"
              strokeWidth={1.5}
            />
          </BarChart>
        </ResponsiveContainer>
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
  const [battlesData, setBattlesData] = useState<TrackerBattlesResponse | null>(
    null,
  );
  const [activityData, setActivityData] = useState<
    { date: string; wins: number; losses: number }[]
  >([]);
  const [activityDays, setActivityDays] = useState(7);
  const [loadingActivity, setLoadingActivity] = useState(false);
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
    [getToken],
  );

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
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
    setLoadingActivity(true);
    authFetch(`${API_URL}/api/tracker/me/activity?days=${activityDays}`)
      .then((d) => setActivityData(d.activity ?? []))
      .catch(() => setActivityData([]))
      .finally(() => setLoadingActivity(false));
  }, [authFetch, activityDays]);

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setLoadingBattles(true);
    authFetch(`${API_URL}/api/tracker/me/battles?page=${page}&page_size=10`)
      .then((d) => setBattlesData(d))
      .catch(() => setBattlesData(null))
      .finally(() => setLoadingBattles(false));
  }, [authFetch, page]);

  const isDataEmpty = !loadingStats && stats?.total_games === 0;
  const hasData = !loadingStats && (stats?.total_games ?? 0) > 0;

  return (
    <div className="w-full min-w-0 space-y-8">
      {/* ── Header ── */}
      <div className="relative pb-6 border-b border-border/40">
        <div className="absolute bottom-0 inset-x-0 h-px bg-gradient-to-r from-transparent via-primary/50 to-transparent" />
        <div className="flex items-start justify-between flex-wrap gap-4">
          <div>
            <h1 className="font-[family-name:var(--font-heading)] text-4xl sm:text-5xl font-extrabold tracking-tight bg-gradient-to-r from-primary via-amber-300 to-primary/70 bg-clip-text text-transparent">
              {playerName}
            </h1>
            <p className="text-sm font-mono text-muted-foreground/60 mt-1.5">
              {playerTag}
            </p>
          </div>
          <button
            onClick={onChangeTag}
            className="flex items-center gap-2 px-4 py-2 rounded-lg border border-border/60 text-sm text-muted-foreground hover:bg-muted/40 hover:text-foreground transition-all self-start mt-1"
          >
            <RefreshCw className="w-3.5 h-3.5" />
            Change Tag
          </button>
        </div>
      </div>

      {/* ── Error ── */}
      {error && (
        <div className="flex items-center gap-2 text-red-400 bg-red-500/10 border border-red-500/20 rounded-xl px-4 py-3 text-sm">
          <AlertCircle className="w-4 h-4 shrink-0" />
          {error}
        </div>
      )}

      {/* ── Empty state ── */}
      {isDataEmpty && (
        <div className="rounded-2xl border border-border/50 bg-card/40 p-10 text-center space-y-3">
          <Clock className="w-10 h-10 text-muted-foreground/40 mx-auto" />
          <p className="font-[family-name:var(--font-heading)] text-lg font-bold text-foreground">
            Your battles are being processed…
          </p>
          <p className="text-sm text-muted-foreground max-w-sm mx-auto">
            Your tag has been registered. Battle data will appear soon.
          </p>
        </div>
      )}

      {/* ── Stats grid ── */}
      {(hasData || loadingStats) && (
        <section className="space-y-3">
          <SectionHeading
            icon={<BarChart2 className="w-4 h-4" />}
            label="Overview"
          />
          {loadingStats ? (
            <div className="grid grid-cols-2 md:grid-cols-4 gap-2.5 animate-pulse">
              {[...Array(4)].map((_, i) => (
                <div key={i} className="h-20 rounded-xl bg-muted/40" />
              ))}
            </div>
          ) : stats ? (
            <div className="grid grid-cols-2 md:grid-cols-4 gap-2.5">
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
                value={
                  stats.avg_crowns !== null ? stats.avg_crowns.toFixed(1) : "—"
                }
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
                accent="purple"
              />
            </div>
          ) : null}
        </section>
      )}

      {/* ── Charts ── */}
      {hasData && (
        <section className="space-y-3">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
            {stats && (
              <WinLossDonut
                wins={stats.wins}
                losses={stats.losses}
                winRate={stats.win_rate}
              />
            )}
            <div className="md:col-span-2 min-w-0">
              <GamesPerDayChart
                activity={activityData}
                days={activityDays}
                onDaysChange={setActivityDays}
                loading={loadingActivity}
              />
            </div>
          </div>
          {decks.length > 0 && <DeckWinRateChart decks={decks} />}
        </section>
      )}

      {/* ── Two-column: decks + matchups left, battles right ── */}
      <div className="grid grid-cols-1 xl:grid-cols-[1fr_380px] gap-6 items-start">
        {/* Left column */}
        <div className="flex flex-col gap-6 min-w-0">
          {/* Top Decks */}
          {(hasData || loadingDecks) && (
            <section className="space-y-3">
              <SectionHeading
                icon={<Zap className="w-4 h-4" />}
                label="Your Top Decks"
                sub="By games played"
              />
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
                <p className="text-sm text-muted-foreground/60 text-center py-8 rounded-xl border border-dashed border-border/40">
                  No deck data yet.
                </p>
              )}
            </section>
          )}

          {/* Worst Matchups */}
          {(hasData || loadingWorstMatchups) && (
            <section className="space-y-3">
              <SectionHeading
                icon={<AlertCircle className="w-4 h-4" />}
                label="Matchup Stats"
                sub="Your win rate against win conditions"
              />
              {loadingWorstMatchups ? (
                <div className="flex gap-3 animate-pulse">
                  {[...Array(5)].map((_, i) => (
                    <div
                      key={i}
                      className="h-48 w-40 rounded-2xl bg-muted/40 shrink-0"
                    />
                  ))}
                </div>
              ) : worstMatchups.length > 0 ? (
                <div className="flex overflow-x-auto gap-3 pb-2 snap-x scrollbar-thin scrollbar-thumb-border scrollbar-track-transparent h-[280px]">
                  {worstMatchups.map((matchup) => (
                    <div
                      key={matchup.card_id}
                      className="snap-start shrink-0 h-full"
                    >
                      <WorstMatchupRow matchup={matchup} />
                    </div>
                  ))}
                </div>
              ) : (
                <p className="text-sm text-muted-foreground/60 text-center py-8 rounded-xl border border-dashed border-border/40">
                  Not enough data yet. Play more games!
                </p>
              )}
            </section>
          )}
        </div>

        {/* Right column — sticky battle history */}
        <div className="xl:sticky xl:top-6 min-w-0">
          {(hasData || loadingBattles) && (
            <section className="space-y-3">
              <div className="flex items-center gap-3">
                <div className="flex items-center justify-center w-8 h-8 rounded-lg bg-primary/15 border border-primary/25 text-primary shrink-0">
                  <Swords className="w-4 h-4" />
                </div>
                <div className="flex items-center gap-2 flex-1 min-w-0">
                  <h3 className="font-[family-name:var(--font-heading)] text-lg font-bold text-foreground leading-none">
                    Battle History
                  </h3>
                  {battlesData && battlesData.total > 0 && (
                    <span className="text-xs font-medium text-muted-foreground bg-muted/60 px-2 py-0.5 rounded-full border border-border/40 shrink-0">
                      {battlesData.total.toLocaleString()} total
                    </span>
                  )}
                </div>
                <div className="flex-1 h-px bg-gradient-to-r from-border/60 to-transparent ml-2" />
              </div>

              <div className="bg-card/40 border border-border/50 rounded-2xl p-4 flex flex-col gap-3">
                <div className="flex flex-col gap-1.5">
                  {loadingBattles ? (
                    <div className="flex flex-col gap-1.5 animate-pulse">
                      {[...Array(10)].map((_, i) => (
                        <div key={i} className="h-12 rounded-xl bg-muted/40" />
                      ))}
                    </div>
                  ) : battlesData && battlesData.battles.length > 0 ? (
                    battlesData.battles.map((battle, i) => (
                      <BattleRow key={i} battle={battle} />
                    ))
                  ) : (
                    <p className="text-sm text-muted-foreground/60 text-center py-8">
                      No battles recorded yet.
                    </p>
                  )}
                </div>

                {/* Pagination */}
                {!loadingBattles &&
                  battlesData &&
                  battlesData.total_pages > 1 && (
                    <div className="flex items-center justify-between pt-3 border-t border-border/40 mt-1">
                      <button
                        disabled={!battlesData.has_previous}
                        onClick={() => setPage((p) => p - 1)}
                        className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-border/60 bg-card hover:bg-muted text-xs font-medium text-foreground transition-all disabled:opacity-40 disabled:cursor-not-allowed"
                      >
                        <ChevronLeft className="w-3.5 h-3.5" />
                        <span className="hidden sm:inline">Prev</span>
                      </button>
                      <span className="text-xs font-bold text-muted-foreground">
                        {page} <span className="font-normal mx-0.5">/</span>{" "}
                        {battlesData.total_pages}
                      </span>
                      <button
                        disabled={!battlesData.has_next}
                        onClick={() => setPage((p) => p + 1)}
                        className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-border/60 bg-card hover:bg-muted text-xs font-medium text-foreground transition-all disabled:opacity-40 disabled:cursor-not-allowed"
                      >
                        <span className="hidden sm:inline">Next</span>
                        <ChevronRight className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  )}
              </div>
            </section>
          )}
        </div>
      </div>
    </div>
  );
}
