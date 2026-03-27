import { Loader2, Search, Sparkles } from "lucide-react";
import { DeckGridCard } from "@/components/deck-grid-card";
import { DecksResponse } from "@/lib/types";

interface DecksResultsGridProps {
  decksData: DecksResponse;
  isSearching: boolean;
  hideMatchups?: boolean;
}

export function DecksResultsGrid({
  decksData,
  isSearching,
  hideMatchups = false,
}: DecksResultsGridProps) {
  return (
    <div className="space-y-6">
      {/* Results Header */}
      <div className="flex items-center justify-between px-1">
        <div className="flex items-center gap-3">
          {isSearching ? (
            <Loader2 className="w-5 h-5 text-primary animate-spin" />
          ) : (
            <Sparkles className="w-5 h-5 text-primary" />
          )}
          <h2 className="text-2xl font-bold text-foreground">
            {isSearching
              ? "Searching..."
              : decksData.total > 0
                ? `Found ${decksData.total} Decks`
                : "No Decks Found"}
          </h2>
        </div>
        {!isSearching && decksData.total > 0 && (
          <div className="text-sm text-muted-foreground px-3 py-1.5 rounded-full bg-muted/50 border border-border/30">
            Page {decksData.page} of {decksData.total_pages}
          </div>
        )}
      </div>

      {/* Deck Grid */}
      {isSearching ? (
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 2xl:grid-cols-4 gap-6">
          {[...Array(6)].map((_, i) => (
            <div
              key={i}
              className="aspect-[3/4] bg-gradient-to-br from-muted/50 to-muted/30 border border-border/30 rounded-2xl animate-pulse"
            />
          ))}
        </div>
      ) : decksData.decks.length > 0 ? (
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 2xl:grid-cols-4 gap-6">
          {decksData.decks.map((deck) => (
            <DeckGridCard key={deck.deck_id} deck={deck} hideMatchups={hideMatchups} />
          ))}
        </div>
      ) : (
        <div className="flex flex-col items-center justify-center py-16 px-4 bg-muted/20 rounded-2xl border border-dashed border-border">
          <Search className="w-12 h-12 text-muted-foreground/50 mb-4" />
          <p className="text-lg font-semibold text-muted-foreground mb-2">
            No decks found
          </p>
          <p className="text-sm text-muted-foreground/70 text-center max-w-md">
            Try adjusting your filters or search criteria to find more decks.
          </p>
        </div>
      )}
    </div>
  );
}
