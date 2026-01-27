import { cn } from "@/lib/utils";
import { Trophy, Crown, Medal } from "lucide-react";

interface Clan {
  tag: string;
  clan_name: string;
  badge_id: string;
}

interface LeaderboardEntry {
  tag: string;
  name: string;
  elo_rating: number;
  clan: Clan | null;
}

interface LeaderboardData {
  entries: LeaderboardEntry[];
}

interface LeaderboardProps {
  leaderboard: LeaderboardData;
  className?: string;
}

export function Leaderboard({ leaderboard, className }: LeaderboardProps) {
  const topThree = leaderboard.entries.slice(0, 3);
  const remaining = leaderboard.entries.slice(3);

  return (
    <div className={cn("space-y-6", className)}>
      {/* Header */}
      <div className="flex items-center justify-between">
        <h2 className="text-xl font-bold text-foreground flex items-center gap-2">
          <Trophy className="w-5 h-5 text-yellow-500" />
          Top Players Leaderboard
        </h2>
        <span className="text-sm text-muted-foreground">
          {leaderboard.entries.length} player
          {leaderboard.entries.length !== 1 ? "s" : ""}
        </span>
      </div>

      {/* Podium for Top 3 */}
      {topThree.length > 0 && (
        <div className="bg-gradient-to-b from-muted/30 to-card border border-border rounded-xl p-6 overflow-hidden">
          <div className="flex items-end justify-center gap-4 mb-2">
            {/* Second Place */}
            {topThree[1] && (
              <PodiumCard
                entry={topThree[1]}
                rank={2}
                height="h-32"
                medal="silver"
              />
            )}

            {/* First Place */}
            {topThree[0] && (
              <PodiumCard
                entry={topThree[0]}
                rank={1}
                height="h-40"
                medal="gold"
              />
            )}

            {/* Third Place */}
            {topThree[2] && (
              <PodiumCard
                entry={topThree[2]}
                rank={3}
                height="h-24"
                medal="bronze"
              />
            )}
          </div>
        </div>
      )}

      {/* Remaining Players List */}
      {remaining.length > 0 && (
        <div className="space-y-2">
          <h3 className="text-sm font-semibold text-muted-foreground uppercase tracking-wide px-2">
            Other Top Players
          </h3>
          <div className="space-y-2">
            {remaining.map((entry, index) => (
              <PlayerListItem
                key={entry.tag}
                entry={entry}
                rank={index + 4}
              />
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

interface PodiumCardProps {
  entry: LeaderboardEntry;
  rank: number;
  height: string;
  medal: "gold" | "silver" | "bronze";
}

function PodiumCard({ entry, rank, height, medal }: PodiumCardProps) {
  const medalColors = {
    gold: "text-yellow-500 bg-yellow-500/10 border-yellow-500/30",
    silver: "text-gray-400 bg-gray-400/10 border-gray-400/30",
    bronze: "text-orange-600 bg-orange-600/10 border-orange-600/30",
  };

  const medalIcons = {
    gold: <Crown className="w-6 h-6" />,
    silver: <Medal className="w-5 h-5" />,
    bronze: <Medal className="w-5 h-5" />,
  };

  return (
    <div className="flex flex-col items-center flex-1 max-w-[160px]">
      {/* Player Card */}
      <div
        className={cn(
          "bg-card border-2 rounded-xl p-4 w-full mb-2 transition-all hover:shadow-lg",
          medalColors[medal]
        )}
      >
        {/* Medal Icon */}
        <div className="flex justify-center mb-3">
          <div
            className={cn(
              "rounded-full p-2 border-2",
              medalColors[medal]
            )}
          >
            {medalIcons[medal]}
          </div>
        </div>

        {/* Player Name */}
        <div className="text-center mb-2">
          <p className="font-bold text-sm truncate" title={entry.name}>
            {entry.name}
          </p>
          <p className="text-xs text-muted-foreground font-mono truncate">
            {entry.tag}
          </p>
        </div>

        {/* ELO Rating */}
        <div className="bg-muted/50 rounded-lg px-3 py-2 text-center border border-border/50">
          <p className="text-xs text-muted-foreground mb-1">ELO</p>
          <p className={cn("text-lg font-bold", medalColors[medal].split(" ")[0])}>
            {entry.elo_rating.toLocaleString()}
          </p>
        </div>

        {/* Clan */}
        {entry.clan && (
          <div className="mt-2 text-center">
            <p className="text-xs text-muted-foreground truncate" title={entry.clan.clan_name}>
              {entry.clan.clan_name}
            </p>
          </div>
        )}
      </div>

      {/* Podium Base */}
      <div
        className={cn(
          "w-full rounded-t-lg border-t-2 border-x-2 transition-all",
          height,
          medalColors[medal],
          "flex items-center justify-center"
        )}
      >
        <span className={cn("text-3xl font-bold", medalColors[medal].split(" ")[0])}>
          {rank}
        </span>
      </div>
    </div>
  );
}

interface PlayerListItemProps {
  entry: LeaderboardEntry;
  rank: number;
}

function PlayerListItem({ entry, rank }: PlayerListItemProps) {
  return (
    <div className="bg-card border border-border rounded-lg px-4 py-3 hover:bg-muted/30 transition-all">
      <div className="flex items-center justify-between gap-4">
        {/* Rank & Name */}
        <div className="flex items-center gap-4 flex-1 min-w-0">
          <div className="flex-shrink-0 w-8 h-8 rounded-full bg-muted border border-border flex items-center justify-center">
            <span className="text-sm font-bold text-muted-foreground">
              {rank}
            </span>
          </div>

          <div className="flex-1 min-w-0">
            <p className="font-semibold text-sm truncate" title={entry.name}>
              {entry.name}
            </p>
            <p className="text-xs text-muted-foreground font-mono">
              {entry.tag}
            </p>
          </div>
        </div>

        {/* Clan */}
        {entry.clan && (
          <div className="hidden sm:block flex-shrink-0 max-w-[150px]">
            <p className="text-xs text-muted-foreground truncate" title={entry.clan.clan_name}>
              {entry.clan.clan_name}
            </p>
          </div>
        )}

        {/* ELO Rating */}
        <div className="flex-shrink-0 bg-muted/50 rounded-lg px-3 py-1 border border-border/50">
          <p className="text-xs text-muted-foreground">ELO</p>
          <p className="text-sm font-bold text-primary">
            {entry.elo_rating.toLocaleString()}
          </p>
        </div>
      </div>
    </div>
  );
}
