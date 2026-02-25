import { Shield, User, Heart, Star } from "lucide-react";
import { CRPlayerInfo } from "./types";
import { StatBlock } from "./StatBlock";

interface LivePlayerDataProps {
  crInfo: CRPlayerInfo;
}

export function LivePlayerData({ crInfo }: LivePlayerDataProps) {
  return (
    <div className="rounded-2xl border border-border/60 bg-card overflow-hidden shadow-lg">
      <div className="px-6 pt-5 pb-4 border-b border-border/40">
        <div className="flex items-center gap-2">
          <Shield className="w-4 h-4 text-primary" />
          <span className="font-[family-name:var(--font-heading)] font-bold text-foreground">
            Live Player Data
          </span>
          <span className="flex items-center gap-1.5 ml-auto text-[10px] text-emerald-400 font-semibold uppercase tracking-wider">
            <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
            Clash Royale API
          </span>
        </div>
      </div>

      <div className="p-6 space-y-6">
        {/* Core stats grid */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-6">
          <StatBlock
            label="Trophies"
            value={crInfo.trophies.toLocaleString()}
            sub={`Best: ${crInfo.best_trophies.toLocaleString()}`}
            accent="gold"
          />
          <StatBlock
            label="PoL Medals"
            value={crInfo.current_path_of_legends_medals?.toLocaleString() ?? "—"}
            sub={`Best: ${crInfo.best_path_of_legends_medals?.toLocaleString() ?? "—"}`}
            accent="blue"
          />
          <div className="flex flex-col gap-1 min-w-0">
            <span className="text-[10px] font-semibold uppercase tracking-widest text-muted-foreground/70">
              Wins / Losses
            </span>
            <span className="font-[family-name:var(--font-heading)] text-2xl font-bold leading-none">
              <span className="text-emerald-400">{crInfo.wins.toLocaleString()}</span>
              <span className="text-muted-foreground/50 mx-1">/</span>
              <span className="text-red-400">{crInfo.losses.toLocaleString()}</span>
            </span>
            {crInfo.wins + crInfo.losses > 0 && (
              <span className="text-[11px] text-muted-foreground truncate">
                {((crInfo.wins / (crInfo.wins + crInfo.losses)) * 100).toFixed(1)}% WR
              </span>
            )}
          </div>
          <StatBlock
            label="3-Crown Wins"
            value={crInfo.three_crown_wins.toLocaleString()}
            sub={
              crInfo.challenge_max_wins != null
                ? `Best challenge: ${crInfo.challenge_max_wins}`
                : undefined
            }
            accent="gold"
          />
        </div>

        {/* Tags row */}
        <div className="flex flex-wrap gap-2">
          {crInfo.arena && (
            <div className="flex items-center gap-1.5 text-xs bg-muted/50 border border-border/40 rounded-lg px-3 py-1.5">
              <Shield className="w-3 h-3 text-muted-foreground" />
              <span className="text-muted-foreground">Arena</span>
              <span className="font-semibold text-foreground">{crInfo.arena.name}</span>
            </div>
          )}
          {crInfo.clan && (
            <div className="flex items-center gap-1.5 text-xs bg-muted/50 border border-border/40 rounded-lg px-3 py-1.5">
              <User className="w-3 h-3 text-muted-foreground" />
              <span className="text-muted-foreground">Clan</span>
              <span className="font-semibold text-foreground">{crInfo.clan.clan_name}</span>
            </div>
          )}
          {crInfo.total_donations != null && crInfo.total_donations > 0 && (
            <div className="flex items-center gap-1.5 text-xs bg-muted/50 border border-border/40 rounded-lg px-3 py-1.5">
              <Heart className="w-3 h-3 text-muted-foreground" />
              <span className="text-muted-foreground">Donations</span>
              <span className="font-semibold text-foreground">
                {crInfo.total_donations.toLocaleString()}
              </span>
            </div>
          )}
          {crInfo.current_favorite_card && (
            <div className="flex items-center gap-1.5 text-xs bg-amber-500/10 border border-amber-500/25 rounded-lg px-3 py-1.5">
              <Star className="w-3 h-3 text-amber-400" />
              <span className="text-muted-foreground">Favourite</span>
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
