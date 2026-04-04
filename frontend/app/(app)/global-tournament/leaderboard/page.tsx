"use client";
import { useState, useEffect } from "react";
import {
  Trophy,
  Crown,
  Medal,
  Swords,
  AlertTriangle,
  RefreshCw,
  Loader2,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { Inter } from "next/font/google";
import { Orbitron } from "next/font/google";
import { TOURNAMENT_CONFIG } from "@/lib/tournament-config";

const inter = Inter({
  subsets: ["latin"],
  weight: ["400", "500", "600", "700", "800"],
});

const orbitron = Orbitron({ subsets: ["latin"], weight: ["700", "900"] });

const API_URL = "/api/backend/api/global-tournament/leaderboard";

interface Clan {
  tag: string;
  clan_name: string;
  badge_id: string;
}

interface TournamentEntry {
  rank: number;
  tag: string;
  name: string;
  wins: number;
  clan: Clan | null;
}

interface TournamentLeaderboard {
  entries: TournamentEntry[];
}

export default function GlobalTournamentLeaderboardPage() {
  const [data, setData] = useState<TournamentLeaderboard | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchLeaderboard = async () => {
    setIsLoading(true);
    setError(null);
    try {
      const res = await fetch(API_URL);
      if (!res.ok) throw new Error(`Failed to fetch leaderboard (${res.status})`);
      setData(await res.json());
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to load leaderboard.");
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchLeaderboard();
  }, []);

  const topThree = data?.entries.slice(0, 3) ?? [];
  const rest = data?.entries.slice(3) ?? [];

  return (
    <div
      className={cn(
        inter.className,
        "min-h-screen bg-gradient-to-b from-background via-background to-background/95 text-foreground pb-20 relative overflow-hidden",
      )}
    >
      {/* Background */}
      <div className="fixed inset-0 hexagon-pattern opacity-[0.03] pointer-events-none" />
      <div className="fixed top-0 left-1/4 w-96 h-96 bg-amber-500/8 rounded-full blur-3xl pointer-events-none" />
      <div className="fixed bottom-0 right-1/4 w-96 h-96 bg-yellow-500/6 rounded-full blur-3xl pointer-events-none" />

      <div className="w-full max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-8 relative z-10">
        {/* Header */}
        <div className="relative">
          <div className="w-12 h-0.5 bg-amber-500 mb-4 rounded-full" />
          <div className="flex items-center gap-2 mb-2">
            <Trophy className="w-4 h-4 text-amber-500" />
            <p className="text-xs font-semibold uppercase tracking-[0.25em] text-amber-500/90">
              Global Tournament
            </p>
          </div>
          <h1 className="font-[family-name:var(--font-heading)] text-5xl sm:text-7xl font-extrabold tracking-tight leading-none mb-4">
            <span className="bg-gradient-to-br from-foreground via-foreground/90 to-foreground/60 bg-clip-text text-transparent">
              {TOURNAMENT_CONFIG.name}
            </span>{" "}
            <span className="bg-gradient-to-r from-amber-400 via-yellow-300 to-amber-500 bg-clip-text text-transparent">
              {TOURNAMENT_CONFIG.subtitle}
            </span>
            <br />
            <span className="text-4xl sm:text-5xl bg-gradient-to-r from-foreground/80 to-foreground/40 bg-clip-text text-transparent">
              Leaderboard
            </span>
          </h1>
          <p className="text-sm text-muted-foreground max-w-md leading-relaxed">
            Top 50 players in the current {TOURNAMENT_CONFIG.name}{" "}
            {TOURNAMENT_CONFIG.subtitle} global tournament, ranked by wins.
            Data is live from the Clash Royale API.
          </p>
          <div className="mt-6 h-px bg-gradient-to-r from-amber-500/40 via-border/50 to-transparent" />
        </div>

        {/* Loading */}
        {isLoading && (
          <div className="flex flex-col items-center justify-center py-24 gap-4 text-muted-foreground">
            <Loader2 className="w-10 h-10 animate-spin text-amber-500" />
            <p className="text-sm font-medium">Fetching leaderboard…</p>
          </div>
        )}

        {/* Error */}
        {error && !isLoading && (
          <div className="flex items-center gap-3 px-5 py-4 rounded-xl bg-destructive/10 border border-destructive/30 text-destructive">
            <AlertTriangle className="w-5 h-5 flex-shrink-0" />
            <p className="text-sm font-medium flex-1">{error}</p>
            <button
              onClick={fetchLeaderboard}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium bg-destructive/10 hover:bg-destructive/20 rounded-md transition-colors"
            >
              <RefreshCw className="w-3 h-3" />
              Retry
            </button>
          </div>
        )}

        {/* Podium — top 3 */}
        {!isLoading && topThree.length > 0 && (
          <div className="bg-gradient-to-b from-muted/30 to-card border border-amber-500/20 rounded-2xl p-6 overflow-hidden">
            <div className="flex flex-col sm:flex-row items-center sm:items-end justify-center gap-4">
              {/* 2nd */}
              {topThree[1] && (
                <PodiumCard entry={topThree[1]} rank={2} height="h-28" medal="silver" />
              )}
              {/* 1st */}
              {topThree[0] && (
                <PodiumCard entry={topThree[0]} rank={1} height="h-36" medal="gold" />
              )}
              {/* 3rd */}
              {topThree[2] && (
                <PodiumCard entry={topThree[2]} rank={3} height="h-20" medal="bronze" />
              )}
            </div>
          </div>
        )}

        {/* Ranks 4–50 */}
        {!isLoading && rest.length > 0 && (
          <div className="space-y-2">
            <h3 className="text-xs font-semibold text-muted-foreground uppercase tracking-[0.2em] px-1">
              Ranks 4 – {data!.entries.length}
            </h3>
            <div className="space-y-1.5">
              {rest.map((entry) => (
                <PlayerRow key={entry.tag} entry={entry} orbitronClass={orbitron.className} />
              ))}
            </div>
          </div>
        )}

        {/* Empty */}
        {!isLoading && !error && data?.entries.length === 0 && (
          <div className="flex flex-col items-center justify-center py-16 text-muted-foreground gap-3">
            <Swords className="w-10 h-10 opacity-30" />
            <p className="text-sm">No leaderboard data available yet.</p>
          </div>
        )}
      </div>
    </div>
  );
}

// ── Podium card ────────────────────────────────────────────────────────────────

const MEDAL_STYLES = {
  gold: {
    border: "border-yellow-500/40",
    text: "text-yellow-500",
    bg: "bg-yellow-500/10",
    icon: <Crown className="w-6 h-6" />,
  },
  silver: {
    border: "border-gray-400/40",
    text: "text-gray-400",
    bg: "bg-gray-400/10",
    icon: <Medal className="w-5 h-5" />,
  },
  bronze: {
    border: "border-orange-600/40",
    text: "text-orange-500",
    bg: "bg-orange-600/10",
    icon: <Medal className="w-5 h-5" />,
  },
} as const;

function PodiumCard({
  entry,
  rank,
  height,
  medal,
}: {
  entry: TournamentEntry;
  rank: number;
  height: string;
  medal: keyof typeof MEDAL_STYLES;
}) {
  const s = MEDAL_STYLES[medal];
  return (
    <div className="flex flex-col items-center flex-1 max-w-[160px]">
      <div
        className={cn(
          "bg-card border-2 rounded-xl p-4 w-full mb-2 hover:shadow-lg transition-all",
          s.border,
        )}
      >
        <div className="flex justify-center mb-3">
          <div className={cn("rounded-full p-2 border-2", s.bg, s.border, s.text)}>
            {s.icon}
          </div>
        </div>
        <div className="text-center mb-2">
          <p className="font-bold text-sm truncate" title={entry.name}>
            {entry.name}
          </p>
          <p className="text-xs text-muted-foreground font-mono truncate">{entry.tag}</p>
        </div>
        <div className={cn("rounded-lg px-3 py-2 text-center border", s.bg, s.border)}>
          <p className="text-xs text-muted-foreground mb-0.5">Wins</p>
          <p className={cn("text-2xl font-black", s.text)}>{entry.wins}</p>
        </div>
        {entry.clan && (
          <p
            className="mt-2 text-xs text-muted-foreground text-center truncate w-full"
            title={entry.clan.clan_name}
          >
            {entry.clan.clan_name}
          </p>
        )}
      </div>
      <div
        className={cn(
          "w-full rounded-t-lg border-t-2 border-x-2 hidden sm:flex items-center justify-center",
          height,
          s.border,
          s.bg,
        )}
      >
        <span className={cn("text-3xl font-black", s.text)}>{rank}</span>
      </div>
    </div>
  );
}

// ── Row for ranks 4+ ──────────────────────────────────────────────────────────

function PlayerRow({
  entry,
  orbitronClass,
}: {
  entry: TournamentEntry;
  orbitronClass: string;
}) {
  return (
    <div className="bg-card border border-border/50 rounded-xl px-4 py-3 hover:bg-muted/20 hover:border-amber-500/20 transition-all">
      <div className="flex items-center gap-4">
        {/* Rank */}
        <div className="w-8 h-8 rounded-full bg-muted border border-border flex items-center justify-center shrink-0">
          <span className="text-xs font-bold text-muted-foreground">{entry.rank}</span>
        </div>

        {/* Name + tag */}
        <div className="flex-1 min-w-0">
          <p className="font-semibold text-sm truncate">{entry.name}</p>
          <p className="text-xs text-muted-foreground font-mono">{entry.tag}</p>
        </div>

        {/* Clan */}
        {entry.clan && (
          <p
            className="hidden sm:block text-xs text-muted-foreground truncate max-w-[140px] shrink-0"
            title={entry.clan.clan_name}
          >
            {entry.clan.clan_name}
          </p>
        )}

        {/* Wins */}
        <div className="shrink-0 bg-amber-500/10 border border-amber-500/20 rounded-lg px-3 py-1.5 text-center min-w-[56px]">
          <p className="text-[10px] text-amber-600 dark:text-amber-400 font-medium">Wins</p>
          <p className={cn("text-base font-black text-amber-500", orbitronClass)}>
            {entry.wins}
          </p>
        </div>
      </div>
    </div>
  );
}
