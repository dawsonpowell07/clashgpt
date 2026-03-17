import { Shield, User, Heart, Star } from "lucide-react";
import { cn } from "@/lib/utils";
import { CRPlayerInfo } from "./types";

function StatPill({
  label,
  value,
  sub,
  color = "text-foreground",
}: {
  label: string;
  value: string;
  sub?: string;
  color?: string;
}) {
  return (
    <div className="flex flex-col gap-1 bg-muted/40 border border-border/50 rounded-xl p-3.5">
      <span className="text-[9px] font-bold uppercase tracking-widest text-muted-foreground/60">
        {label}
      </span>
      <span className={cn("font-[family-name:var(--font-heading)] text-2xl font-black leading-none", color)}>
        {value}
      </span>
      {sub && <span className="text-[11px] text-muted-foreground">{sub}</span>}
    </div>
  );
}

interface LivePlayerDataProps {
  crInfo: CRPlayerInfo;
}

export function LivePlayerData({ crInfo }: LivePlayerDataProps) {
  const winRate =
    crInfo.wins + crInfo.losses > 0
      ? ((crInfo.wins / (crInfo.wins + crInfo.losses)) * 100).toFixed(1)
      : null;

  return (
    <div className="rounded-2xl border border-border/60 bg-card overflow-hidden shadow-lg">
      <div className="px-5 pt-4 pb-3.5 border-b border-border/40 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Shield className="w-4 h-4 text-primary" />
          <span className="font-[family-name:var(--font-heading)] font-bold text-foreground">
            Live Player Data
          </span>
        </div>
        <span className="flex items-center gap-1.5 text-[10px] text-emerald-400 font-semibold uppercase tracking-wider">
          <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
          Live
        </span>
      </div>
      <div className="p-5 space-y-4">
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5">
          <StatPill
            label="Trophies"
            value={crInfo.trophies.toLocaleString()}
            sub={`Best: ${crInfo.best_trophies.toLocaleString()}`}
            color="text-amber-400"
          />
          <StatPill
            label="PoL Medals"
            value={crInfo.current_path_of_legends_medals?.toLocaleString() ?? "—"}
            sub={`Best: ${crInfo.best_path_of_legends_medals?.toLocaleString() ?? "—"}`}
            color="text-blue-400"
          />
          <div className="flex flex-col gap-1 bg-muted/40 border border-border/50 rounded-xl p-3.5 min-w-0">
            <span className="text-[9px] font-bold uppercase tracking-widest text-muted-foreground/60">
              Wins / Losses
            </span>
            <div className="flex flex-col font-[family-name:var(--font-heading)] font-black leading-tight">
              <span className="text-emerald-400 text-lg truncate">{crInfo.wins.toLocaleString()}W</span>
              <span className="text-red-400 text-lg truncate">{crInfo.losses.toLocaleString()}L</span>
            </div>
            {winRate && (
              <span className="text-[11px] text-muted-foreground">{winRate}% WR</span>
            )}
          </div>
          <StatPill
            label="3-Crown Wins"
            value={crInfo.three_crown_wins.toLocaleString()}
            sub={
              crInfo.challenge_max_wins != null
                ? `Best challenge: ${crInfo.challenge_max_wins}`
                : undefined
            }
            color="text-amber-400"
          />
        </div>

        <div className="flex flex-wrap gap-2">
          {crInfo.arena && (
            <div className="flex items-center gap-1.5 text-xs bg-muted/40 border border-border/40 rounded-lg px-3 py-1.5">
              <Shield className="w-3 h-3 text-muted-foreground/60" />
              <span className="text-muted-foreground/70">Arena</span>
              <span className="font-semibold text-foreground">{crInfo.arena.name}</span>
            </div>
          )}
          {crInfo.clan && (
            <div className="flex items-center gap-1.5 text-xs bg-muted/40 border border-border/40 rounded-lg px-3 py-1.5">
              <User className="w-3 h-3 text-muted-foreground/60" />
              <span className="text-muted-foreground/70">Clan</span>
              <span className="font-semibold text-foreground">{crInfo.clan.clan_name}</span>
            </div>
          )}
          {crInfo.total_donations != null && crInfo.total_donations > 0 && (
            <div className="flex items-center gap-1.5 text-xs bg-muted/40 border border-border/40 rounded-lg px-3 py-1.5">
              <Heart className="w-3 h-3 text-muted-foreground/60" />
              <span className="text-muted-foreground/70">Donations</span>
              <span className="font-semibold text-foreground">
                {crInfo.total_donations.toLocaleString()}
              </span>
            </div>
          )}
          {crInfo.current_favorite_card && (
            <div className="flex items-center gap-1.5 text-xs bg-amber-500/10 border border-amber-500/25 rounded-lg px-3 py-1.5">
              <Star className="w-3 h-3 text-amber-400" />
              <span className="text-muted-foreground/70">Fav. Card</span>
              <span className="font-semibold text-foreground">
                {crInfo.current_favorite_card.name}
              </span>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
