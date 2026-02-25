import { Clock } from "lucide-react";
import { PlayerSearchResult } from "./types";
import { StatBlock } from "./StatBlock";
import { formatTag, formatLastSeen } from "./utils";

interface PlayerHeroCardProps {
  player: PlayerSearchResult;
}

export function PlayerHeroCard({ player }: PlayerHeroCardProps) {
  return (
    <div className="relative rounded-2xl border border-border/60 bg-card overflow-hidden shadow-xl">
      {/* Gold accent bar */}
      <div className="h-1 w-full bg-gradient-to-r from-primary/40 via-primary to-amber-300/60 battle-glow" />

      <div className="p-6 sm:p-8">
        {/* Name row */}
        <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-4 mb-8">
          <div>
            <h2 className="font-[family-name:var(--font-heading)] text-4xl sm:text-5xl font-extrabold text-foreground leading-none">
              {player.name}
            </h2>
            <p className="font-mono text-sm text-muted-foreground/70 mt-2">
              {formatTag(player.player_tag)}
            </p>
          </div>
          <div className="flex items-center gap-1.5 text-xs text-muted-foreground bg-muted/50 rounded-lg px-3 py-2 border border-border/40 self-start shrink-0">
            <Clock className="w-3 h-3" />
            Last seen {formatLastSeen(player.last_seen)}
          </div>
        </div>

        {/* DB Analytics stats */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-6">
          <StatBlock
            label="Games Tracked"
            value={player.total_games.toLocaleString()}
            accent="gold"
          />
          <StatBlock
            label="Win Rate"
            value={player.win_rate !== null ? `${player.win_rate}%` : "—"}
            sub={`${player.wins.toLocaleString()} wins`}
            accent={
              (player.win_rate ?? 0) >= 55
                ? "green"
                : (player.win_rate ?? 0) >= 50
                ? "gold"
                : "red"
            }
          />
          <StatBlock
            label="Avg Crowns Taken"
            value={player.avg_crowns !== null ? player.avg_crowns.toFixed(2) : "—"}
            accent="blue"
          />
          <StatBlock
            label="Elixir Leaked"
            value={
              player.avg_elixir_leaked !== null
                ? player.avg_elixir_leaked.toFixed(2)
                : "—"
            }
            sub="avg per game"
            accent="gold"
          />
        </div>
      </div>
    </div>
  );
}
