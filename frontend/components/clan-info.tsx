import { cn } from "@/lib/utils";
import { Trophy, Crown, Medal } from "lucide-react";

interface ClanMember {
  tag: string;
  name: string;
  role?: string | null;
  last_seen?: string | null;
  trophies?: number | null;
}

interface ClanInfoData {
  tag: string;
  name: string;
  type?: string | null;
  description?: string | null;
  clan_score?: string | null;
  clan_war_trophies?: number | null;
  location?: string | null;
  required_trophies?: number | null;
  donations_per_week?: number | null;
  num_members?: number | null;
  members_list: ClanMember[];
}

interface ClanInfoProps {
  clan: ClanInfoData;
  className?: string;
}

export function ClanInfo({ clan, className }: ClanInfoProps) {
  // Format the clan type for display
  const formatClanType = (type: string | null | undefined): string => {
    if (!type) return "Unknown";
    return type.charAt(0).toUpperCase() + type.slice(1).toLowerCase();
  };

  // Format role for display
  const formatRole = (role: string | null | undefined): string => {
    if (!role) return "Member";
    const roleMap: Record<string, string> = {
      member: "Member",
      elder: "Elder",
      coLeader: "Co-Leader",
      leader: "Leader",
    };
    return roleMap[role] || role;
  };

  // Format last seen timestamp
  const formatLastSeen = (lastSeen: string | null | undefined): string => {
    if (!lastSeen) return "Unknown";
    try {
      // API format: "20260105T202009.000Z"
      const date = new Date(
        lastSeen.replace(/(\d{4})(\d{2})(\d{2})T(\d{2})(\d{2})(\d{2})/, "$1-$2-$3T$4:$5:$6")
      );
      const now = new Date();
      const diffMs = now.getTime() - date.getTime();
      const diffMins = Math.floor(diffMs / 60000);
      const diffHours = Math.floor(diffMs / 3600000);
      const diffDays = Math.floor(diffMs / 86400000);

      if (diffMins < 60) return `${diffMins}m ago`;
      if (diffHours < 24) return `${diffHours}h ago`;
      return `${diffDays}d ago`;
    } catch {
      return "Unknown";
    }
  };

  // Get role badge color
  const getRoleBadgeColor = (role: string | null | undefined): string => {
    if (!role) return "bg-muted text-muted-foreground";
    const colorMap: Record<string, string> = {
      leader: "bg-yellow-500/20 text-yellow-400 border-yellow-500/40",
      coLeader: "bg-orange-500/20 text-orange-400 border-orange-500/40",
      elder: "bg-purple-500/20 text-purple-400 border-purple-500/40",
      member: "bg-muted text-muted-foreground border-border",
    };
    return colorMap[role] || "bg-muted text-muted-foreground border-border";
  };

  // Use the order provided by the API (already sorted by the game)
  const topThree = clan.members_list.slice(0, 3);
  const remainingMembers = clan.members_list.slice(3);

  return (
    <div
      className={cn(
        "bg-card border border-border rounded-xl shadow-lg overflow-hidden transition-all hover:shadow-xl w-full",
        className
      )}
    >
      {/* Header Section */}
      <div className="bg-muted/30 px-6 py-4 border-b border-border">
        <div className="flex items-start justify-between gap-6">
          {/* Clan Info */}
          <div className="flex-1">
            <div className="flex items-center gap-3 mb-2">
              <h2 className="text-2xl font-bold text-foreground">
                {clan.name}
              </h2>
              <span
                className={cn(
                  "px-3 py-1 text-xs font-medium rounded-full border",
                  clan.type === "open"
                    ? "bg-green-500/20 text-green-400 border-green-500/40"
                    : clan.type === "inviteOnly"
                    ? "bg-blue-500/20 text-blue-400 border-blue-500/40"
                    : "bg-muted text-muted-foreground border-border"
                )}
              >
                {formatClanType(clan.type)}
              </span>
            </div>
            <p className="text-sm text-muted-foreground font-mono mb-2">
              {clan.tag}
            </p>
            {clan.description && (
              <p className="text-sm text-foreground/80 mt-2 line-clamp-2">
                {clan.description}
              </p>
            )}
          </div>

          {/* Location */}
          {clan.location && (
            <div className="flex items-center gap-2 px-4 py-2 bg-card/60 backdrop-blur-sm rounded-lg border border-border/50">
              <span className="text-lg">🌍</span>
              <span className="text-sm font-medium text-accent">
                {clan.location}
              </span>
            </div>
          )}
        </div>
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 p-6 border-b border-border bg-muted/10">
        <div className="text-center p-3 bg-card/60 rounded-lg border border-border/50">
          <p className="text-xs text-muted-foreground uppercase tracking-wider mb-1">
            Clan Score
          </p>
          <p className="text-xl font-bold text-foreground">
            {clan.clan_score ? parseInt(clan.clan_score).toLocaleString() : "N/A"}
          </p>
        </div>

        <div className="text-center p-3 bg-card/60 rounded-lg border border-border/50">
          <p className="text-xs text-muted-foreground uppercase tracking-wider mb-1">
            War Trophies
          </p>
          <p className="text-xl font-bold text-primary">
            {clan.clan_war_trophies?.toLocaleString() || "N/A"}
          </p>
        </div>

        <div className="text-center p-3 bg-card/60 rounded-lg border border-border/50">
          <p className="text-xs text-muted-foreground uppercase tracking-wider mb-1">
            Members
          </p>
          <p className="text-xl font-bold text-accent">
            {clan.num_members || clan.members_list.length}/50
          </p>
        </div>

        <div className="text-center p-3 bg-card/60 rounded-lg border border-border/50">
          <p className="text-xs text-muted-foreground uppercase tracking-wider mb-1">
            Required Trophies
          </p>
          <p className="text-xl font-bold text-foreground">
            {clan.required_trophies?.toLocaleString() || "0"}
          </p>
        </div>
      </div>

      {/* Members Section */}
      <div className="p-6 space-y-6">
        <h3 className="text-lg font-semibold text-foreground flex items-center gap-2">
          <Trophy className="w-5 h-5 text-yellow-500" />
          Top Members
        </h3>

        {/* Podium for Top 3 */}
        {topThree.length > 0 && (
          <div className="bg-gradient-to-b from-muted/30 to-card border border-border rounded-xl p-6 overflow-hidden">
            <div className="flex items-end justify-center gap-4">
              {/* Second Place */}
              {topThree[1] && (
                <MemberPodiumCard
                  member={topThree[1]}
                  rank={2}
                  height="h-32"
                  medal="silver"
                  formatRole={formatRole}
                  getRoleBadgeColor={getRoleBadgeColor}
                />
              )}

              {/* First Place */}
              {topThree[0] && (
                <MemberPodiumCard
                  member={topThree[0]}
                  rank={1}
                  height="h-40"
                  medal="gold"
                  formatRole={formatRole}
                  getRoleBadgeColor={getRoleBadgeColor}
                />
              )}

              {/* Third Place */}
              {topThree[2] && (
                <MemberPodiumCard
                  member={topThree[2]}
                  rank={3}
                  height="h-24"
                  medal="bronze"
                  formatRole={formatRole}
                  getRoleBadgeColor={getRoleBadgeColor}
                />
              )}
            </div>
          </div>
        )}

        {/* Remaining Members List */}
        {remainingMembers.length > 0 && (
          <div className="space-y-2">
            <h3 className="text-sm font-semibold text-muted-foreground uppercase tracking-wide px-2">
              Other Members
            </h3>
            <div className="space-y-2 max-h-96 overflow-y-auto">
              {remainingMembers.map((member, idx) => (
                <div
                  key={member.tag}
                  className="flex items-center justify-between p-3 bg-muted/20 hover:bg-muted/40 rounded-lg border border-border/50 transition-colors"
                >
                  {/* Member Info */}
                  <div className="flex items-center gap-3 flex-1 min-w-0">
                    <span className="text-xs text-muted-foreground w-6 shrink-0">
                      #{idx + 4}
                    </span>
                    <div className="min-w-0 flex-1">
                      <p className="text-sm font-medium text-foreground truncate">
                        {member.name}
                      </p>
                      <p className="text-xs text-muted-foreground font-mono truncate">
                        {member.tag}
                      </p>
                    </div>
                  </div>

                  {/* Role & Stats */}
                  <div className="flex items-center gap-3 shrink-0">
                    <span
                      className={cn(
                        "px-2 py-1 text-xs font-medium rounded border",
                        getRoleBadgeColor(member.role)
                      )}
                    >
                      {formatRole(member.role)}
                    </span>

                    {member.trophies !== null && member.trophies !== undefined && (
                      <div className="flex items-center gap-1 px-2 py-1 bg-card/60 rounded border border-border/50">
                        <span className="text-xs">🏆</span>
                        <span className="text-xs font-medium text-foreground">
                          {member.trophies.toLocaleString()}
                        </span>
                      </div>
                    )}

                    {member.last_seen && (
                      <span className="text-xs text-muted-foreground min-w-15 text-right">
                        {formatLastSeen(member.last_seen)}
                      </span>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

interface MemberPodiumCardProps {
  member: ClanMember;
  rank: number;
  height: string;
  medal: "gold" | "silver" | "bronze";
  formatRole: (role: string | null | undefined) => string;
  getRoleBadgeColor: (role: string | null | undefined) => string;
}

function MemberPodiumCard({
  member,
  rank,
  height,
  medal,
  formatRole,
  getRoleBadgeColor,
}: MemberPodiumCardProps) {
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
      {/* Member Card */}
      <div
        className={cn(
          "bg-card border-2 rounded-xl p-4 w-full mb-2 transition-all hover:shadow-lg",
          medalColors[medal]
        )}
      >
        {/* Medal Icon */}
        <div className="flex justify-center mb-3">
          <div className={cn("rounded-full p-2 border-2", medalColors[medal])}>
            {medalIcons[medal]}
          </div>
        </div>

        {/* Member Name */}
        <div className="text-center mb-2">
          <p className="font-bold text-sm truncate" title={member.name}>
            {member.name}
          </p>
          <p className="text-xs text-muted-foreground font-mono truncate">
            {member.tag}
          </p>
        </div>

        {/* Role Badge */}
        <div className="flex justify-center mb-2">
          <span
            className={cn(
              "px-2 py-1 text-xs font-medium rounded border",
              getRoleBadgeColor(member.role)
            )}
          >
            {formatRole(member.role)}
          </span>
        </div>

        {/* Trophies */}
        {member.trophies !== null && member.trophies !== undefined && (
          <div className="bg-muted/50 rounded-lg px-3 py-2 text-center border border-border/50">
            <p className="text-xs text-muted-foreground mb-1">Trophies</p>
            <p
              className={cn(
                "text-lg font-bold flex items-center justify-center gap-1",
                medalColors[medal].split(" ")[0]
              )}
            >
              <span className="text-sm">🏆</span>
              {member.trophies.toLocaleString()}
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
        <span
          className={cn("text-3xl font-bold", medalColors[medal].split(" ")[0])}
        >
          {rank}
        </span>
      </div>
    </div>
  );
}
