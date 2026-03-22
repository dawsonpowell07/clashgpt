import React from "react";
import { Shield, User, Heart, Star, Trophy, Crown, Zap } from "lucide-react";
import { cn } from "@/lib/utils";
import { CRPlayerInfo } from "./types";

const ACCENT_BG: Record<string, string> = {
  green: "from-emerald-500/[0.08] border-emerald-500/20",
  amber: "from-amber-500/[0.08] border-amber-500/20",
  blue: "from-sky-500/[0.08] border-sky-500/20",
  red: "from-rose-500/[0.08] border-rose-500/20",
  default: "from-muted/50 border-border/50",
};

const ACCENT_TOP: Record<string, string> = {
  green: "from-emerald-400/80 via-emerald-400/20 to-transparent",
  amber: "from-amber-400/80 via-amber-400/20 to-transparent",
  blue: "from-sky-400/80 via-sky-400/20 to-transparent",
  red: "from-rose-400/80 via-rose-400/20 to-transparent",
  default: "from-border/60 to-transparent",
};

function StatPill({
  label,
  value,
  sub,
  color = "text-foreground",
  accent = "default",
  icon: Icon,
}: {
  label: string;
  value: string;
  sub?: string;
  color?: string;
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
        <div className="flex items-center gap-3">
          <div className="flex items-center justify-center w-8 h-8 rounded-lg bg-primary/15 border border-primary/25 text-primary shrink-0">
            <Shield className="w-4 h-4" />
          </div>
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
            accent="amber"
            icon={Trophy}
          />
          <StatPill
            label="Ranked Medals"
            value={
              crInfo.current_path_of_legends_medals?.toLocaleString() ?? "—"
            }
            sub={`Best: ${crInfo.best_path_of_legends_medals?.toLocaleString() ?? "—"}`}
            color="text-sky-400"
            accent="blue"
            icon={Zap}
          />
          <div
            className={cn(
              "relative flex flex-col gap-1.5 bg-gradient-to-b to-card/30 border rounded-xl p-3.5 overflow-hidden min-w-0",
              ACCENT_BG.default,
            )}
          >
            <div
              className={cn(
                "absolute top-0 left-0 right-0 h-[1.5px] bg-gradient-to-r",
                ACCENT_TOP.default,
              )}
            />
            <span className="text-[9px] font-bold uppercase tracking-widest text-muted-foreground/60">
              Wins / Losses
            </span>
            <div className="flex flex-col font-[family-name:var(--font-heading)] font-black leading-tight">
              <span className="text-emerald-400 text-lg truncate">
                {crInfo.wins.toLocaleString()}W
              </span>
              <span className="text-red-400 text-lg truncate">
                {crInfo.losses.toLocaleString()}L
              </span>
            </div>
            {winRate && (
              <span className="text-[11px] text-muted-foreground">
                {winRate}% WR
              </span>
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
            accent="amber"
            icon={Crown}
          />
        </div>

        <div className="flex flex-wrap gap-2">
          {crInfo.arena && (
            <div className="flex items-center gap-1.5 text-xs bg-muted/40 border border-border/40 rounded-lg px-3 py-1.5">
              <Shield className="w-3 h-3 text-muted-foreground/60" />
              <span className="text-muted-foreground/70">Arena</span>
              <span className="font-semibold text-foreground">
                {crInfo.arena.name}
              </span>
            </div>
          )}
          {crInfo.clan && (
            <div className="flex items-center gap-1.5 text-xs bg-muted/40 border border-border/40 rounded-lg px-3 py-1.5">
              <User className="w-3 h-3 text-muted-foreground/60" />
              <span className="text-muted-foreground/70">Clan</span>
              <span className="font-semibold text-foreground">
                {crInfo.clan.clan_name}
              </span>
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
