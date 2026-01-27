import { cn } from "@/lib/utils";

interface ClanSearchItem {
  tag: string;
  name: string;
  type?: string | null;
  badge_id: number;
  clan_score?: number | null;
  clan_war_trophies?: number | null;
  location_id?: number | null;
  location_name?: string | null;
  members?: number | null;
  required_trophies?: number | null;
}

interface ClanSearchResultsData {
  items: ClanSearchItem[];
  paging?: {
    cursors?: Record<string, string>;
  } | null;
}

interface ClanSearchResultsProps {
  results: ClanSearchResultsData;
  className?: string;
}

export function ClanSearchResults({ results, className }: ClanSearchResultsProps) {
  // Format clan type for display
  const formatClanType = (type: string | null | undefined): string => {
    if (!type) return "Unknown";
    return type.charAt(0).toUpperCase() + type.slice(1).toLowerCase();
  };

  // Get type badge styling
  const getTypeBadgeColor = (type: string | null | undefined): string => {
    if (!type) return "bg-muted text-muted-foreground border-border";
    const colorMap: Record<string, string> = {
      open: "bg-green-500/20 text-green-400 border-green-500/40",
      inviteOnly: "bg-blue-500/20 text-blue-400 border-blue-500/40",
      closed: "bg-red-500/20 text-red-400 border-red-500/40",
    };
    return colorMap[type] || "bg-muted text-muted-foreground border-border";
  };

  if (!results.items || results.items.length === 0) {
    return (
      <div
        className={cn(
          "bg-card border border-border rounded-xl p-8 text-center",
          className
        )}
      >
        <div className="text-muted-foreground">
          <span className="text-4xl mb-2 block">🔍</span>
          <p className="text-lg font-medium">No clans found</p>
          <p className="text-sm mt-1">Try adjusting your search criteria</p>
        </div>
      </div>
    );
  }

  return (
    <div className={cn("w-full", className)}>
      {/* Header */}
      <div className="mb-4 flex items-center justify-between">
        <h3 className="text-lg font-semibold text-foreground flex items-center gap-2">
          <span>🏰</span>
          Clan Search Results ({results.items.length})
        </h3>
      </div>

      {/* Clan List */}
      <div className="space-y-3">
        {results.items.map((clan) => (
          <div
            key={clan.tag}
            className="bg-card border border-border rounded-lg p-4 hover:bg-muted/20 transition-all hover:shadow-md"
          >
            <div className="flex items-center justify-between gap-4">
              {/* Left: Clan Name & Tag */}
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 mb-1">
                  <h4 className="text-base font-semibold text-foreground truncate">
                    {clan.name}
                  </h4>
                  <span
                    className={cn(
                      "px-2 py-0.5 text-xs font-medium rounded border",
                      getTypeBadgeColor(clan.type)
                    )}
                  >
                    {formatClanType(clan.type)}
                  </span>
                </div>
                <p className="text-xs text-muted-foreground font-mono">
                  {clan.tag}
                </p>
              </div>

              {/* Right: Stats Grid */}
              <div className="flex items-center gap-3">
                {/* Location */}
                {clan.location_name && (
                  <div className="hidden sm:flex items-center gap-1.5 px-2.5 py-1.5 bg-muted/30 rounded border border-border/50">
                    <span className="text-xs">🌍</span>
                    <span className="text-xs font-medium text-foreground truncate max-w-[120px]">
                      {clan.location_name}
                    </span>
                  </div>
                )}

                {/* Members */}
                <div className="flex items-center gap-1.5 px-2.5 py-1.5 bg-accent/10 rounded border border-accent/30">
                  <span className="text-xs">👥</span>
                  <span className="text-xs font-semibold text-accent">
                    {clan.members ?? 0}/50
                  </span>
                </div>

                {/* Clan Score */}
                {clan.clan_score !== null && clan.clan_score !== undefined && (
                  <div className="flex items-center gap-1.5 px-2.5 py-1.5 bg-primary/10 rounded border border-primary/30">
                    <span className="text-xs">⭐</span>
                    <span className="text-xs font-semibold text-primary">
                      {clan.clan_score.toLocaleString()}
                    </span>
                  </div>
                )}

                {/* War Trophies */}
                {clan.clan_war_trophies !== null && clan.clan_war_trophies !== undefined && (
                  <div className="hidden md:flex items-center gap-1.5 px-2.5 py-1.5 bg-orange-500/10 rounded border border-orange-500/30">
                    <span className="text-xs">⚔️</span>
                    <span className="text-xs font-semibold text-orange-400">
                      {clan.clan_war_trophies.toLocaleString()}
                    </span>
                  </div>
                )}

                {/* Required Trophies */}
                {clan.required_trophies !== null && clan.required_trophies !== undefined && (
                  <div className="flex items-center gap-1.5 px-2.5 py-1.5 bg-muted/30 rounded border border-border/50">
                    <span className="text-xs">🏆</span>
                    <span className="text-xs font-medium text-foreground">
                      {clan.required_trophies.toLocaleString()}
                    </span>
                  </div>
                )}
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* Footer with count */}
      {results.items.length > 0 && (
        <div className="mt-4 text-center">
          <p className="text-xs text-muted-foreground">
            Showing {results.items.length} clan{results.items.length !== 1 ? 's' : ''}
          </p>
        </div>
      )}
    </div>
  );
}
