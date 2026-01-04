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

  return (
    <div
      className={cn(
        "bg-card border border-border rounded-xl shadow-lg overflow-hidden transition-all hover:shadow-xl max-w-2xl",
        className
      )}
    >
      {/* Header Section */}
      <div className="bg-gradient-to-r from-primary/20 via-accent/20 to-primary/20 p-6 border-b border-border">
        <div className="flex items-start justify-between gap-4">
          <div className="flex-1">
            <h2 className="text-2xl font-bold text-foreground mb-1">
              {player.name}
            </h2>
            <p className="text-sm text-muted-foreground font-mono">
              {player.tag}
            </p>
          </div>

          {/* Trophy Badge */}
          <div className="flex flex-col items-center gap-1 bg-card/80 backdrop-blur-sm rounded-lg px-4 py-2 border border-border">
            <div className="text-2xl font-bold text-primary">
              {player.current_trophies.toLocaleString()}
            </div>
            <div className="text-xs text-muted-foreground">Trophies</div>
          </div>
        </div>

        {/* Arena Info */}
        {player.arena && (
          <div className="mt-3 text-sm text-muted-foreground">
            <span className="font-medium text-accent">{player.arena.name}</span>
          </div>
        )}
      </div>

      {/* Stats Grid */}
      <div className="p-6 space-y-6">
        {/* Trophy Stats */}
        <div>
          <h3 className="text-sm font-semibold text-muted-foreground uppercase tracking-wide mb-3">
            Trophy Record
          </h3>
          <div className="grid grid-cols-2 gap-3">
            <StatCard
              label="Current"
              value={player.current_trophies.toLocaleString()}
              icon="🏆"
            />
            <StatCard
              label="Best"
              value={player.best_trophies.toLocaleString()}
              icon="⭐"
            />
          </div>
        </div>

        {/* Path of Legends Stats (if available) */}
        {player.current_path_of_legends_medals !== null &&
          player.current_path_of_legends_medals !== undefined && (
            <div>
              <h3 className="text-sm font-semibold text-muted-foreground uppercase tracking-wide mb-3">
                Path of Legends
              </h3>
              <div className="grid grid-cols-2 gap-3">
                <StatCard
                  label="Current Medals"
                  value={
                    player.current_path_of_legends_medals?.toLocaleString() ||
                    "0"
                  }
                  icon="🎖️"
                />
                {player.current_path_of_legends_rank && (
                  <StatCard
                    label="Current Rank"
                    value={`#${player.current_path_of_legends_rank.toLocaleString()}`}
                    icon="🏅"
                  />
                )}
                {player.best_path_of_legends_medals && (
                  <StatCard
                    label="Best Medals"
                    value={player.best_path_of_legends_medals.toLocaleString()}
                    icon="✨"
                  />
                )}
                {player.best_path_of_legends_rank && (
                  <StatCard
                    label="Best Rank"
                    value={`#${player.best_path_of_legends_rank.toLocaleString()}`}
                    icon="👑"
                  />
                )}
              </div>
            </div>
          )}

        {/* Battle Stats */}
        <div>
          <h3 className="text-sm font-semibold text-muted-foreground uppercase tracking-wide mb-3">
            Battle Statistics
          </h3>
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
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

        {/* Clan Info */}
        {player.clan && (
          <div>
            <h3 className="text-sm font-semibold text-muted-foreground uppercase tracking-wide mb-3">
              Clan
            </h3>
            <div className="bg-muted/50 rounded-lg p-4 border border-border">
              <div className="flex items-center gap-3">
                <div className="w-12 h-12 rounded-full bg-primary/20 flex items-center justify-center text-2xl">
                  🛡️
                </div>
                <div className="flex-1">
                  <p className="font-semibold text-foreground">
                    {player.clan.clan_name}
                  </p>
                  <p className="text-sm text-muted-foreground font-mono">
                    {player.clan.tag}
                  </p>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Favorite Card */}
        {player.current_favorite_card && (
          <div>
            <h3 className="text-sm font-semibold text-muted-foreground uppercase tracking-wide mb-3">
              Favorite Card
            </h3>
            <div className="bg-muted/50 rounded-lg p-4 border border-border">
              <div className="flex items-center gap-4">
                <div className="relative w-16 h-16 rounded-lg overflow-hidden border border-border bg-card">
                  <Image
                    src={`/cards/${player.current_favorite_card.name.toLowerCase().replace(/ /g, '_')}/${player.current_favorite_card.name.toLowerCase().replace(/ /g, '_')}.png`}
                    alt={player.current_favorite_card.name}
                    fill
                    className="object-contain"
                  />
                </div>
                <div className="flex-1">
                  <p className="font-semibold text-foreground">
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
          </div>
        )}
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
        {icon && <span className="text-xl flex-shrink-0">{icon}</span>}
      </div>
    </div>
  );
}
