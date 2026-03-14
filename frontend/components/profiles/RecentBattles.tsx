import { Crown } from "lucide-react";
import { cn } from "@/lib/utils";
import { Battle } from "./types";
import { formatBattleTime } from "./utils";

interface RecentBattlesProps {
  battles: Battle[];
}

export function RecentBattles({ battles }: RecentBattlesProps) {
  if (battles.length === 0) {
    return (
      <div className="text-sm text-muted-foreground/60 text-center py-10 rounded-xl border border-dashed border-border/40">
        No recent battles found.
      </div>
    );
  }

  return (
    <div className="rounded-xl border border-border/50 bg-card overflow-hidden shadow-sm">
      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-border/50 bg-muted/20">
              <th className="text-left px-4 py-3 text-[10px] font-bold uppercase tracking-widest text-muted-foreground/60 w-4" />
              <th className="text-left px-4 py-3 text-[10px] font-bold uppercase tracking-widest text-muted-foreground/60">
                Time
              </th>
              <th className="text-left px-4 py-3 text-[10px] font-bold uppercase tracking-widest text-muted-foreground/60">
                Mode
              </th>
              <th className="text-center px-4 py-3 text-[10px] font-bold uppercase tracking-widest text-muted-foreground/60">
                Crowns
              </th>
              <th className="text-center px-4 py-3 text-[10px] font-bold uppercase tracking-widest text-muted-foreground/60">
                Elixir
              </th>
              <th className="text-left px-4 py-3 text-[10px] font-bold uppercase tracking-widest text-muted-foreground/60">
                Opponent
              </th>
            </tr>
          </thead>
          <tbody>
            {battles.map((battle, i) => {
              const isWin = battle.result === "Win";
              return (
                <tr
                  key={i}
                  className="border-b border-border/25 last:border-0 hover:bg-muted/15 transition-colors group"
                >
                  {/* Color strip */}
                  <td className="pl-0 pr-0 py-0 w-1">
                    <div
                      className={cn(
                        "w-1 h-full min-h-[44px]",
                        isWin ? "bg-emerald-500/70" : "bg-red-500/50"
                      )}
                    />
                  </td>
                  <td className="px-4 py-3 text-xs text-muted-foreground whitespace-nowrap">
                    {formatBattleTime(battle.battle_time)}
                  </td>
                  <td className="px-4 py-3 text-xs text-foreground/80 max-w-[150px] truncate">
                    Ranked
                  </td>
                  <td className="px-4 py-3 text-center">
                    <span className="inline-flex items-center gap-1 font-bold text-foreground tabular-nums">
                      <Crown className="w-3 h-3 text-amber-400" />
                      {battle.crowns ?? "—"}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-center text-xs text-muted-foreground tabular-nums">
                    {battle.elixir_leaked !== null
                      ? battle.elixir_leaked.toFixed(1)
                      : "—"}
                  </td>
                  <td className="px-4 py-3 text-xs text-foreground/70 max-w-[140px] truncate">
                    {battle.opponent ?? (
                      <span className="text-muted-foreground/40">Unknown</span>
                    )}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}
