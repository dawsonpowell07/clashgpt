import { Clock } from "lucide-react";
import { cn } from "@/lib/utils";
import { PlayerSearchResult } from "./types";
import { formatTag, formatLastSeen } from "./utils";

function StatPill({
  label,
  value,
  sub,
  color,
}: {
  label: string;
  value: string;
  sub?: string;
  color: string;
}) {
  return (
    <div className="flex flex-col gap-1 bg-muted/40 border border-border/50 rounded-xl p-3.5">
      <span className="text-[9px] font-bold uppercase tracking-widest text-muted-foreground/60">
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
          />
          <StatPill
            label="Win Rate"
            value={player.win_rate !== null ? `${player.win_rate}%` : "—"}
            sub={`${player.wins.toLocaleString()} wins`}
            color={wrColor}
          />
          <StatPill
            label="Avg Crowns"
            value={
              player.avg_crowns !== null ? player.avg_crowns.toFixed(2) : "—"
            }
            color="text-blue-400"
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
          />
        </div>
      </div>
    </div>
  );
}
