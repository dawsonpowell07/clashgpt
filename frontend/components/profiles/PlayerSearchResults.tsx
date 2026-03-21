import { Search } from "lucide-react";
import { PlayerSearchResult } from "./types";
import { formatTag } from "./utils";

interface PlayerSearchResultsProps {
  results: PlayerSearchResult[];
  onSelect: (player: PlayerSearchResult) => void;
}

export function PlayerSearchResults({
  results,
  onSelect,
}: PlayerSearchResultsProps) {
  return (
    <div className="space-y-3 arena-entrance">
      <p className="text-sm text-muted-foreground px-1">
        <span className="text-foreground font-semibold">
          {results.length} players
        </span>{" "}
        matched — select one
      </p>
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-2">
        {results.map((p, i) => (
          <button
            key={p.player_tag}
            onClick={() => onSelect(p)}
            className="group flex items-center gap-4 text-left bg-card border border-border/50 rounded-xl px-5 py-4 hover:bg-muted/30 hover:border-primary/40 hover:shadow-md transition-all"
          >
            <span className="font-[family-name:var(--font-heading)] text-xl font-black text-muted-foreground/30 w-5 shrink-0">
              {i + 1}
            </span>
            <div className="flex-1 min-w-0">
              <p className="font-semibold text-foreground truncate group-hover:text-primary transition-colors">
                {p.name}
              </p>
              <p className="text-xs text-muted-foreground font-mono mt-0.5">
                {formatTag(p.player_tag)}
              </p>
            </div>
            <div className="text-right shrink-0">
              <p className="text-sm font-bold text-foreground tabular-nums">
                {p.total_games.toLocaleString()}
                <span className="text-xs font-normal text-muted-foreground ml-1">
                  games
                </span>
              </p>
              {p.win_rate !== null && (
                <p className="text-xs text-muted-foreground">
                  {p.win_rate}% WR
                </p>
              )}
            </div>
          </button>
        ))}
      </div>
    </div>
  );
}

export function NoResults() {
  return (
    <div className="flex flex-col items-center justify-center py-16 rounded-2xl border border-dashed border-border/50 bg-muted/10">
      <Search className="w-8 h-8 text-muted-foreground/30 mb-3" />
      <p className="font-semibold text-muted-foreground">No players found</p>
      <p className="text-xs text-muted-foreground/60 mt-1">
        Try a different name.
      </p>
    </div>
  );
}
