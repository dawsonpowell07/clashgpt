import React from "react";
import { Clock, Trophy, Crown, Swords, Zap } from "lucide-react";
import { cn } from "@/lib/utils";
import { PlayerSearchResult } from "./types";
import { formatTag, formatLastSeen } from "./utils";

const ACCENT_BG: Record<string, string> = {
  green: "from-emerald-500/[0.08] border-emerald-500/20",
  amber: "from-amber-500/[0.08] border-amber-500/20",
  blue: "from-sky-500/[0.08] border-sky-500/20",
  red: "from-rose-500/[0.08] border-rose-500/20",
  purple: "from-purple-500/[0.08] border-purple-500/20",
  default: "from-muted/50 border-border/50",
};

const ACCENT_TOP: Record<string, string> = {
  green: "from-emerald-400/80 via-emerald-400/20 to-transparent",
  amber: "from-amber-400/80 via-amber-400/20 to-transparent",
  blue: "from-sky-400/80 via-sky-400/20 to-transparent",
  red: "from-rose-400/80 via-rose-400/20 to-transparent",
  purple: "from-purple-400/80 via-purple-400/20 to-transparent",
  default: "from-border/60 to-transparent",
};

function StatPill({
  label,
  value,
  sub,
  color,
  accent = "default",
  icon: Icon,
}: {
  label: string;
  value: string;
  sub?: string;
  color: string;
  accent?: string;
  icon?: React.ComponentType<{ className?: string }>;
}) {
  return (
    <div
      className={cn(
        "relative flex flex-col gap-1.5 bg-gradient-to-b to-card/30 border rounded-xl p-3.5 overflow-hidden",
        ACCENT_BG[accent] ?? ACCENT_BG.default,
      )}
    >
      <div
        className={cn(
          "absolute top-0 left-0 right-0 h-[1.5px] bg-gradient-to-r",
          ACCENT_TOP[accent] ?? ACCENT_TOP.default,
        )}
      />
      <span className="text-[9px] font-bold uppercase tracking-widest text-muted-foreground/60 flex items-center gap-1.5">
        {Icon && <Icon className="w-3 h-3" />}
        {label}
      </span>
      <span
        className={cn(
          "font-[family-name:var(--font-heading)] text-2xl font-black leading-none",
          color,
        )}
      >
        {value}
      </span>
      {sub && <span className="text-[11px] text-muted-foreground">{sub}</span>}
    </div>
  );
}

interface PlayerHeroCardProps {
  player: PlayerSearchResult;
}

export function PlayerHeroCard({ player }: PlayerHeroCardProps) {
  const wrAccent =
    (player.win_rate ?? 0) >= 55
      ? "green"
      : (player.win_rate ?? 0) >= 50
        ? "amber"
        : "red";
  const wrColor =
    (player.win_rate ?? 0) >= 55
      ? "text-emerald-400"
      : (player.win_rate ?? 0) >= 50
        ? "text-amber-400"
        : "text-red-400";

  return (
    <div className="relative rounded-2xl border border-border/60 bg-card overflow-hidden shadow-lg">
      <div className="h-1 w-full bg-gradient-to-r from-primary/40 via-primary to-amber-300/60" />
      <div className="p-5 sm:p-6">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 mb-5">
          <div>
            <h2 className="font-[family-name:var(--font-heading)] text-3xl sm:text-4xl font-extrabold text-foreground leading-none">
              {player.name}
            </h2>
            <p className="font-mono text-xs text-muted-foreground/60 mt-1.5">
              {formatTag(player.player_tag)}
            </p>
          </div>
          <div className="flex items-center gap-1.5 text-xs text-muted-foreground bg-muted/40 rounded-lg px-3 py-2 border border-border/40 self-start shrink-0">
            <Clock className="w-3 h-3" />
            Last seen {formatLastSeen(player.last_seen)}
          </div>
        </div>
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5">
          <StatPill
            label="Games Tracked"
            value={player.total_games.toLocaleString()}
            color="text-amber-400"
            accent="amber"
            icon={Swords}
          />
          <StatPill
            label="Win Rate"
            value={player.win_rate !== null ? `${player.win_rate}%` : "—"}
            sub={`${player.wins.toLocaleString()} wins`}
            color={wrColor}
            accent={wrAccent}
            icon={Trophy}
          />
          <StatPill
            label="Avg Crowns"
            value={
              player.avg_crowns !== null ? player.avg_crowns.toFixed(2) : "—"
            }
            color="text-sky-400"
            accent="blue"
            icon={Crown}
          />
          <StatPill
            label="Elixir Leaked"
            value={
              player.avg_elixir_leaked !== null
                ? player.avg_elixir_leaked.toFixed(2)
                : "—"
            }
            sub="avg per game"
            color="text-purple-400"
            accent="purple"
            icon={Zap}
          />
        </div>
      </div>
    </div>
  );
}
