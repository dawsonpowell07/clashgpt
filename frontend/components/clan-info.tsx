import { cn } from "@/lib/utils";

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

  // Sort members by role hierarchy then trophies
  const sortedMembers = [...clan.members_list].sort((a, b) => {
    const roleOrder: Record<string, number> = {
      leader: 0,
      coLeader: 1,
      elder: 2,
      member: 3,
    };
    const roleA = roleOrder[a.role || "member"] ?? 4;
    const roleB = roleOrder[b.role || "member"] ?? 4;

    if (roleA !== roleB) return roleA - roleB;
    return (b.trophies || 0) - (a.trophies || 0);
  });

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
      <div className="p-6">
        <h3 className="text-lg font-semibold text-foreground mb-4 flex items-center gap-2">
          <span>👥</span>
          Members ({clan.members_list.length})
        </h3>

        <div className="space-y-2 max-h-96 overflow-y-auto">
          {sortedMembers.map((member, idx) => (
            <div
              key={member.tag}
              className="flex items-center justify-between p-3 bg-muted/20 hover:bg-muted/40 rounded-lg border border-border/50 transition-colors"
            >
              {/* Member Info */}
              <div className="flex items-center gap-3 flex-1 min-w-0">
                <span className="text-xs text-muted-foreground w-6 flex-shrink-0">
                  #{idx + 1}
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
              <div className="flex items-center gap-3 flex-shrink-0">
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
                  <span className="text-xs text-muted-foreground min-w-[60px] text-right">
                    {formatLastSeen(member.last_seen)}
                  </span>
                )}
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
