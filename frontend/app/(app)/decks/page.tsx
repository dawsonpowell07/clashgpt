"use client";
import { useState, useEffect, useCallback, useRef } from "react";
import { AlertTriangle, RefreshCw, Search } from "lucide-react";
import { Card, DecksResponse } from "@/lib/types";
import { cn } from "@/lib/utils";
import { Inter } from "next/font/google";

import { FilterPanel } from "@/components/decks/FilterPanel";
import { ActiveFilterTags } from "@/components/decks/ActiveFilterTags";
import { DecksResultsGrid } from "@/components/decks/DecksResultsGrid";
import { DecksPagination } from "@/components/decks/DecksPagination";

const inter = Inter({
  subsets: ["latin"],
  weight: ["400", "500", "600", "700", "800"],
});

const API_BASE_URL = "/api/backend";

export default function DecksPage() {
  // --- State ---
  const [cards, setCards] = useState<Card[]>([]);
  const [isLoadingCards, setIsLoadingCards] = useState(true);
  const [cardsError, setCardsError] = useState<string | null>(null);
  const [searchError, setSearchError] = useState<string | null>(null);

  // Selection State
  const [includedVariants, setIncludedVariants] = useState<Set<string>>(
    new Set(),
  );
  const [excludedVariants, setExcludedVariants] = useState<Set<string>>(
    new Set(),
  );
  const [filterMode, setFilterMode] = useState<"INCLUDE" | "EXCLUDE">(
    "INCLUDE",
  );

  // Search Results State
  const [decksData, setDecksData] = useState<DecksResponse | null>(null);
  const [isSearching, setIsSearching] = useState(false);
  const [page, setPage] = useState(1);
  const [minGames, setMinGames] = useState(20);
  const [rateLimitError, setRateLimitError] = useState<string | null>(null);

  // Debounce guard
  const lastSearchTime = useRef<number>(0);

  // --- Effects ---

  const fetchCards = useCallback(async () => {
    setIsLoadingCards(true);
    setCardsError(null);
    try {
      const res = await fetch(`${API_BASE_URL}/api/cards`);
      if (!res.ok) throw new Error("Failed to fetch cards");
      const data = await res.json();
      const TOWER_TROOP_NAMES = new Set([
        "Tower Princess",
        "Royal Chef",
        "Dagger Duchess",
        "Cannoneer",
      ]);
      setCards(
        (data.cards || []).filter(
          (card: Card) =>
            !String(card.card_id).startsWith("159") &&
            !TOWER_TROOP_NAMES.has(card.name),
        ),
      );
    } catch (error) {
      console.error("Error fetching cards:", error);
      setCardsError(
        "Failed to load cards. Please check your connection and try again.",
      );
    } finally {
      setIsLoadingCards(false);
    }
  }, []);

  useEffect(() => {
    fetchCards();
  }, [fetchCards]);

  const variantIdToApiParam = (id: string): string => {
    const [cardIdStr, variantStr] = id.split("_");
    const variant = parseInt(variantStr);
    if (variant === 1) return `${cardIdStr}:evolution`;
    if (variant === 2) return `${cardIdStr}:heroic`;
    return `${cardIdStr}:normal`;
  };

  const fetchDecks = useCallback(
    async (pageNum: number) => {
      const now = Date.now();
      if (now - lastSearchTime.current < 500) return;
      lastSearchTime.current = now;

      setIsSearching(true);
      setRateLimitError(null);
      setSearchError(null);
      try {
        const includeParam = Array.from(includedVariants)
          .map(variantIdToApiParam)
          .join(",");
        const excludeParam = Array.from(excludedVariants)
          .map(variantIdToApiParam)
          .join(",");

        const queryParams = new URLSearchParams({
          page: pageNum.toString(),
          page_size: "24",
          include_cards: "true",
          sort_by: "GAMES_PLAYED",
          min_games: minGames.toString(),
        });

        if (includeParam) queryParams.set("include", includeParam);
        if (excludeParam) queryParams.set("exclude", excludeParam);

        const res = await fetch(
          `${API_BASE_URL}/api/decks?${queryParams.toString()}`,
        );

        if (res.status === 429) {
          setRateLimitError(
            "Too many requests — please wait a moment before searching again.",
          );
          return;
        }

        if (!res.ok) throw new Error("Failed to search decks");

        setDecksData(await res.json());
      } catch (error) {
        console.error("Error searching decks:", error);
        setSearchError("Failed to search decks. Please try again.");
      } finally {
        setIsSearching(false);
      }
    },
    [includedVariants, excludedVariants, minGames],
  );

  // No auto-fetch on mount — require user to select filters and click Search
  // to avoid expensive unfiltered queries on page load.

  const handlePageChange = (newPage: number) => {
    setPage(newPage);
    fetchDecks(newPage);
    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  const handleToggleCard = (id: string) => {
    if (filterMode === "INCLUDE") {
      const newSet = new Set(includedVariants);
      if (newSet.has(id)) {
        newSet.delete(id);
      } else {
        newSet.add(id);
        if (excludedVariants.has(id)) {
          const newExclude = new Set(excludedVariants);
          newExclude.delete(id);
          setExcludedVariants(newExclude);
        }
      }
      setIncludedVariants(newSet);
    } else {
      const newSet = new Set(excludedVariants);
      if (newSet.has(id)) {
        newSet.delete(id);
      } else {
        newSet.add(id);
        if (includedVariants.has(id)) {
          const newInclude = new Set(includedVariants);
          newInclude.delete(id);
          setIncludedVariants(newInclude);
        }
      }
      setExcludedVariants(newSet);
    }
  };

  const clearFilters = () => {
    setIncludedVariants(new Set());
    setExcludedVariants(new Set());
    setMinGames(0);
    setPage(1);
  };

  const getCardLabel = (id: string) => {
    try {
      const [cardIdStr, variantStr] = id.split("_");
      const cardId = parseInt(cardIdStr);
      const variant = parseInt(variantStr);
      const card = cards.find((c) => c.card_id === cardId);
      if (!card) return id;
      let suffix = "";
      if (variant === 1) suffix = " (Evo)";
      else if (variant === 2) suffix = " (Hero)";
      return `${card.name}${suffix}`;
    } catch {
      return id;
    }
  };

  return (
    <div
      className={cn(
        inter.className,
        "min-h-screen bg-gradient-to-b from-background via-background to-background/95 text-foreground pb-20 relative overflow-hidden",
      )}
    >
      {/* Background */}
      <div className="fixed inset-0 hexagon-pattern opacity-[0.03] pointer-events-none" />
      <div className="fixed top-0 left-1/4 w-96 h-96 bg-primary/5 rounded-full blur-3xl pointer-events-none" />
      <div className="fixed bottom-0 right-1/4 w-96 h-96 bg-accent/5 rounded-full blur-3xl pointer-events-none" />

      <div className="w-full max-w-[1600px] mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-8 relative z-10">
        {/* Header */}
        <div className="relative">
          <div className="w-12 h-0.5 bg-primary mb-4 rounded-full" />

          <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-4">
            <div>
              <p className="text-xs font-semibold uppercase tracking-[0.25em] text-primary/80 mb-2">
                Deck Database
              </p>
              <h1 className="font-[family-name:var(--font-heading)] text-5xl sm:text-7xl font-extrabold tracking-tight leading-none">
                <span className="bg-gradient-to-br from-foreground via-foreground/90 to-foreground/60 bg-clip-text text-transparent">
                  Deck
                </span>
                <br />
                <span className="bg-gradient-to-r from-primary via-primary/90 to-amber-300 bg-clip-text text-transparent battle-glow">
                  Arsenal
                </span>
              </h1>
            </div>
            <p className="text-sm text-muted-foreground max-w-xs leading-relaxed pb-1">
              Browse and filter decks from top players
            </p>
          </div>

          <div className="mt-6 h-px bg-gradient-to-r from-primary/40 via-border/50 to-transparent" />
        </div>

        {/* Filter Section */}
        <FilterPanel
          cards={cards}
          isLoadingCards={isLoadingCards}
          cardsError={cardsError}
          onRetryCards={fetchCards}
          filterMode={filterMode}
          onSetFilterMode={setFilterMode}
          includedVariants={includedVariants}
          excludedVariants={excludedVariants}
          onToggleCard={handleToggleCard}
          minGames={minGames}
          onSetMinGames={setMinGames}
          isSearching={isSearching}
          onSearch={() => {
            setPage(1);
            fetchDecks(1);
          }}
          onClearFilters={clearFilters}
        />

        {/* Active Filter Tags */}
        <ActiveFilterTags
          includedVariants={includedVariants}
          excludedVariants={excludedVariants}
          minGames={minGames}
          getCardLabel={getCardLabel}
        />

        {/* Rate Limit Warning */}
        {rateLimitError && (
          <div className="flex items-center gap-3 px-5 py-4 rounded-xl bg-amber-500/10 border border-amber-500/30 text-amber-600 dark:text-amber-400">
            <svg
              className="w-5 h-5 flex-shrink-0"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M12 9v2m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
              />
            </svg>
            <p className="text-sm font-medium">{rateLimitError}</p>
          </div>
        )}

        {/* Search Error */}
        {searchError && (
          <div className="flex items-center gap-3 px-5 py-4 rounded-xl bg-destructive/10 border border-destructive/30 text-destructive">
            <AlertTriangle className="w-5 h-5 flex-shrink-0" />
            <p className="text-sm font-medium flex-1">{searchError}</p>
            <button
              onClick={() => {
                setSearchError(null);
                fetchDecks(page);
              }}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium bg-destructive/10 hover:bg-destructive/20 rounded-md transition-colors"
            >
              <RefreshCw className="w-3 h-3" />
              Retry
            </button>
          </div>
        )}

        {/* Results Section */}
        {decksData ? (
          <div className="space-y-6">
            <DecksResultsGrid decksData={decksData} isSearching={isSearching} />
            <DecksPagination
              decksData={decksData}
              page={page}
              isSearching={isSearching}
              onPageChange={handlePageChange}
            />
          </div>
        ) : !isSearching && (
          <div className="flex flex-col items-center justify-center py-20 px-4">
            <div className="relative mb-6">
              <div className="w-20 h-20 rounded-2xl bg-gradient-to-br from-primary/20 to-primary/5 flex items-center justify-center border border-primary/20">
                <Search className="w-9 h-9 text-primary/60" />
              </div>
              <div className="absolute -inset-2 rounded-3xl bg-primary/5 blur-xl -z-10" />
            </div>
            <h3 className="text-lg font-semibold text-foreground mb-2">Search for Decks</h3>
            <p className="text-sm text-muted-foreground text-center max-w-md leading-relaxed">
              Select cards above to include or exclude, set a minimum games filter, then hit <span className="font-semibold text-primary">Search Decks</span> to find matching decks.
            </p>
          </div>
        )}
      </div>
    </div>
  );
}
