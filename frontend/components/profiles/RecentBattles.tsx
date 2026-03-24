import { Crown, ExternalLink } from "lucide-react";
import { cn } from "@/lib/utils";
import { Battle } from "./types";
import { formatBattleTime } from "./utils";

interface RecentBattlesProps {
  battles: Battle[];
  playerTag: string;
}

export function RecentBattles({ battles, playerTag }: RecentBattlesProps) {
  if (battles.length === 0) {
    return (
      <div className="text-sm text-muted-foreground/60 text-center py-10 rounded-xl border border-dashed border-border/40">
        No recent battles found.
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-1.5">
      {battles.map((battle, i) => {
        const isWin = battle.result === "Win";
        return (
          <button
            key={i}
            onClick={() => {
              if (battle.battle_id) {
                window.open(
                  `/profiles/battle/${encodeURIComponent(battle.battle_id)}?player=${encodeURIComponent(playerTag)}`,
                  "_blank",
                );
              }
            }}
            className={cn(
              "w-full flex items-center gap-3 px-3 py-2.5 rounded-xl border text-sm transition-colors text-left",
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
                {formatBattleTime(battle.battle_time)}
              </p>
            </div>
            {battle.elixir_leaked !== null && (
              <div className="text-right shrink-0">
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
      })}
    </div>
  );
}
