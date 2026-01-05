import Image from "next/image";
import { cn } from "@/lib/utils";

interface Card {
  id: string;
  name: string;
  elixir_cost: number;
  icon_urls: Record<string, string>;
  rarity: string;
}

interface Clan {
  tag: string;
  clan_name: string;
  badge_id: string;
}

interface Arena {
  id: string;
  name: string;
  raw_name: string;
}

interface PlayerProfileData {
  tag: string;
  name: string;
  trophies: number;
  best_trophies: number;
  wins: number;
  losses: number;
  battles_count: number;
  three_crown_wins: number;
  clan?: Clan | null;
  arena?: Arena | null;
  current_trophies: number;
  current_path_of_legends_medals?: number | null;
  current_path_of_legends_rank?: number | null;
  best_path_of_legends_medals?: number | null;
  best_path_of_legends_rank?: number | null;
  current_favorite_card?: Card | null;
  total_donations?: number | null;
  challenge_max_wins?: number | null;
  current_path_of_legends_league?: number | null;
}

interface PlayerProfileProps {
  player: PlayerProfileData;
  className?: string;
}

export function PlayerProfile({ player, className }: PlayerProfileProps) {
  const winRate =
    player.battles_count > 0
      ? ((player.wins / player.battles_count) * 100).toFixed(1)
      : "0.0";

  // Map Path of Legends league number to name
  const getLeagueName = (leagueNumber: number): string => {
    const leagueMap: Record<number, string> = {
      1: "Master I",
      2: "Master II",
      3: "Master III",
      4: "Champion",
      5: "Grand Champion",
      6: "Royal Champion",
      7: "Ultimate Champion",
    };
    return leagueMap[leagueNumber] || `League ${leagueNumber}`;
  };

  return (
    <div
      className={cn(
        "bg-card border border-border rounded-xl shadow-lg overflow-hidden transition-all hover:shadow-xl w-full",
        className
      )}
    >
      {/* Header Section - Horizontal Layout */}
      <div className="bg-muted/30 px-6 py-4 border-b border-border">
        <div className="flex items-center justify-between gap-6">
          {/* Player Info */}
          <div className="flex items-center gap-6 flex-1">
            <div>
              <h2 className="text-2xl font-bold text-foreground mb-1">
                {player.name}
              </h2>
              <p className="text-sm text-muted-foreground font-mono">
                {player.tag}
              </p>
            </div>

            {/* Arena Info */}
            {player.arena && (
              <div className="flex items-center gap-2 px-4 py-2 bg-card/60 backdrop-blur-sm rounded-lg border border-border/50">
                <span className="text-lg">🏟️</span>
                <span className="text-sm font-medium text-accent">
                  {player.arena.name}
                </span>
              </div>
            )}
          </div>

          {/* Trophy Badge */}
          <div className="flex items-center gap-6">
            <div className="flex flex-col items-center gap-1 bg-card/80 backdrop-blur-sm rounded-lg px-6 py-3 border border-border">
              <div className="text-3xl font-bold text-primary">
                {player.current_trophies.toLocaleString()}
              </div>
              <div className="text-xs text-muted-foreground uppercase tracking-wide">
                Trophies
              </div>
            </div>

            <div className="flex flex-col items-center gap-1 bg-card/80 backdrop-blur-sm rounded-lg px-6 py-3 border border-border">
              <div className="text-2xl font-bold text-accent">
                {player.best_trophies.toLocaleString()}
              </div>
              <div className="text-xs text-muted-foreground uppercase tracking-wide">
                Best
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Stats Section - Horizontal Grid */}
      <div className="p-6 space-y-6">
        {/* First Row: Battle Stats - Always 4 columns */}
        <div>
          <h3 className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-3">
            Battle Statistics
          </h3>
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
            <StatCard
              label="Wins"
              value={player.wins.toLocaleString()}
              icon="✅"
              highlight="success"
            />
            <StatCard
              label="Losses"
              value={player.losses.toLocaleString()}
              icon="❌"
              highlight="destructive"
            />
            <StatCard
              label="3-Crown"
              value={player.three_crown_wins.toLocaleString()}
              icon="👑"
            />
            <StatCard label="Win Rate" value={`${winRate}%`} icon="📊" />
          </div>
        </div>

        {/* Second Row: Path of Legends - League, Current Medals, Best Medals */}
        {player.current_path_of_legends_medals !== null &&
          player.current_path_of_legends_medals !== undefined && (
            <div>
              <h3 className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-3">
                Ranked
              </h3>
              <div className="grid grid-cols-2 lg:grid-cols-3 gap-4">
                {player.current_path_of_legends_league !== null &&
                  player.current_path_of_legends_league !== undefined && (
                    <StatCard
                      label="Current League"
                      value={getLeagueName(
                        player.current_path_of_legends_league
                      )}
                      icon="🏆"
                    />
                  )}
                <StatCard
                  label="Current Medals"
                  value={
                    player.current_path_of_legends_medals > 0
                      ? player.current_path_of_legends_medals.toLocaleString()
                      : "N/A"
                  }
                  icon="🎖️"
                />
                <StatCard
                  label="Best Medals"
                  value={
                    player.best_path_of_legends_medals &&
                    player.best_path_of_legends_medals > 0
                      ? player.best_path_of_legends_medals.toLocaleString()
                      : "N/A"
                  }
                  icon="✨"
                />
              </div>
            </div>
          )}

        {/* Last Row: Additional Stats */}
        {((player.total_donations !== null &&
          player.total_donations !== undefined) ||
          (player.challenge_max_wins !== null &&
            player.challenge_max_wins !== undefined)) && (
          <div>
            <h3 className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-3">
              Additional Stats
            </h3>
            <div className="grid grid-cols-2 gap-4">
              {player.total_donations !== null &&
                player.total_donations !== undefined && (
                  <StatCard
                    label="Total Donations"
                    value={player.total_donations.toLocaleString()}
                    icon="🎁"
                  />
                )}
              {player.challenge_max_wins !== null &&
                player.challenge_max_wins !== undefined && (
                  <StatCard
                    label="Max Challenge Wins"
                    value={player.challenge_max_wins.toLocaleString()}
                    icon="🏅"
                  />
                )}
            </div>
          </div>
        )}

        {/* Bottom Row - Clan and Favorite Card */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
          {/* Clan Info */}
          {player.clan && (
            <div className="bg-muted/50 rounded-lg p-4 border border-border">
              <div className="flex items-center gap-3">
                <div className="w-12 h-12 rounded-full bg-primary/20 flex items-center justify-center text-2xl shrink-0">
                  🛡️
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-xs text-muted-foreground uppercase tracking-wide mb-1">
                    Clan
                  </p>
                  <p className="font-semibold text-foreground truncate">
                    {player.clan.clan_name}
                  </p>
                  <p className="text-sm text-muted-foreground font-mono">
                    {player.clan.tag}
                  </p>
                </div>
              </div>
            </div>
          )}

          {/* Favorite Card */}
          {player.current_favorite_card && (
            <div className="bg-muted/50 rounded-lg p-4 border border-border">
              <div className="flex items-center gap-4">
                <div className="relative w-12 h-12 rounded-lg overflow-hidden border border-border bg-card shrink-0">
                  <Image
                    src={`/cards/${player.current_favorite_card.name
                      .toLowerCase()
                      .replace(/ /g, "_")}/${player.current_favorite_card.name
                      .toLowerCase()
                      .replace(/ /g, "_")}.png`}
                    alt={player.current_favorite_card.name}
                    fill
                    className="object-contain"
                  />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-xs text-muted-foreground uppercase tracking-wide mb-1">
                    Favorite Card
                  </p>
                  <p className="font-semibold text-foreground truncate">
                    {player.current_favorite_card.name}
                  </p>
                  <div className="flex items-center gap-2 mt-1">
                    <span className="text-xs px-2 py-0.5 rounded-full bg-primary/20 text-primary font-medium">
                      {player.current_favorite_card.elixir_cost} Elixir
                    </span>
                    <span className="text-xs px-2 py-0.5 rounded-full bg-accent/20 text-accent font-medium capitalize">
                      {player.current_favorite_card.rarity.toLowerCase()}
                    </span>
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

interface StatCardProps {
  label: string;
  value: string;
  icon?: string;
  highlight?: "success" | "destructive";
}

function StatCard({ label, value, icon, highlight }: StatCardProps) {
  return (
    <div className="bg-muted/30 rounded-lg p-3 border border-border hover:border-accent/50 transition-colors">
      <div className="flex items-start justify-between gap-2">
        <div className="flex-1 min-w-0">
          <p className="text-xs text-muted-foreground mb-1">{label}</p>
          <p
            className={cn(
              "text-lg font-bold truncate",
              highlight === "success" && "text-green-400",
              highlight === "destructive" && "text-destructive",
              !highlight && "text-foreground"
            )}
          >
            {value}
          </p>
        </div>
        {icon && <span className="text-xl shrink-0">{icon}</span>}
      </div>
    </div>
  );
}
