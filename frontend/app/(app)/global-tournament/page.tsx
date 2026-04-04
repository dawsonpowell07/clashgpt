"use client";
import { useState, useEffect, useCallback, useRef } from "react";
import { AlertTriangle, RefreshCw, Trophy, Clock } from "lucide-react";
import { Card, DecksResponse } from "@/lib/types";
import { cn } from "@/lib/utils";
import { Inter } from "next/font/google";
import { TOURNAMENT_CONFIG } from "@/lib/tournament-config";

import { FilterPanel } from "@/components/decks/FilterPanel";
import { ActiveFilterTags } from "@/components/decks/ActiveFilterTags";
import { DecksResultsGrid } from "@/components/decks/DecksResultsGrid";
import { DecksPagination } from "@/components/decks/DecksPagination";

const inter = Inter({
  subsets: ["latin"],
  weight: ["400", "500", "600", "700", "800"],
});

const DECKS_URL = "/api/backend/api/global-tournament/decks";

export default function GlobalTournamentPage() {
  // --- State ---
  const [cards, setCards] = useState<Card[]>([]);
  const [isLoadingCards, setIsLoadingCards] = useState(true);
  const [cardsError, setCardsError] = useState<string | null>(null);
  const [searchError, setSearchError] = useState<string | null>(null);

  const [includedVariants, setIncludedVariants] = useState<Set<string>>(
    new Set(),
  );
  const [excludedVariants, setExcludedVariants] = useState<Set<string>>(
    new Set(),
  );
  const [filterMode, setFilterMode] = useState<"INCLUDE" | "EXCLUDE">(
    "INCLUDE",
  );

  const [decksData, setDecksData] = useState<DecksResponse | null>(null);
  const [isSearching, setIsSearching] = useState(false);
  const [page, setPage] = useState(1);
  const [minGames, setMinGames] = useState(20);
  const [rateLimitError, setRateLimitError] = useState<string | null>(null);

  const lastSearchTime = useRef<number>(0);

  // --- Fetch tournament cards (base variants only, filtered to card pool) ---
  const fetchCards = useCallback(async () => {
    setIsLoadingCards(true);
    setCardsError(null);
    try {
      const res = await fetch("/api/backend/api/cards");
      if (!res.ok) throw new Error("Failed to fetch cards");
      const data = await res.json();

      const TOWER_TROOP_NAMES = new Set([
        "Tower Princess",
        "Royal Chef",
        "Dagger Duchess",
        "Cannoneer",
      ]);

      // Filter to the tournament card pool and strip evo/hero variants so the
      // selector only shows base cards (tournament rules — no evolutions or heroes).
      const tournamentCards = (data.cards || [])
        .filter(
          (card: Card) =>
            !String(card.card_id).startsWith("159") &&
            !TOWER_TROOP_NAMES.has(card.name) &&
            TOURNAMENT_CONFIG.cardPool.has(card.name),
        )
        .map((card: Card) => ({
          ...card,
          can_evolve: false,
          can_be_heroic: false,
        }));

      setCards(tournamentCards);
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

  // Retro royale cards are base-only — strip the variant suffix and just send the card ID.
  const variantIdToCardId = (id: string): string => id.split("_")[0];

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
          .map(variantIdToCardId)
          .join(",");
        const excludeParam = Array.from(excludedVariants)
          .map(variantIdToCardId)
          .join(",");

        const queryParams = new URLSearchParams({
          page: pageNum.toString(),
          page_size: "24",
          min_games: minGames.toString(),
        });

        if (includeParam) queryParams.set("include", includeParam);
        if (excludeParam) queryParams.set("exclude", excludeParam);

        const res = await fetch(
          `${DECKS_URL}?${queryParams.toString()}`,
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

  const hasFetchedRef = useRef(false);
  useEffect(() => {
    if (!hasFetchedRef.current) {
      hasFetchedRef.current = true;
      fetchDecks(1);
    }
  }, [fetchDecks]);

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
      const [cardIdStr] = id.split("_");
      const cardId = parseInt(cardIdStr);
      const card = cards.find((c) => c.card_id === cardId);
      return card ? card.name : id;
    } catch {
      return id;
    }
  };

  if (!TOURNAMENT_CONFIG.enabled) {
    return (
      <div
        className={cn(
          inter.className,
          "min-h-screen bg-gradient-to-b from-background via-background to-background/95 text-foreground flex items-center justify-center relative overflow-hidden",
        )}
      >
        <div className="fixed inset-0 hexagon-pattern opacity-[0.03] pointer-events-none" />
        <div className="text-center space-y-4 relative z-10 px-4">
          <div className="flex items-center justify-center gap-2 mb-2">
            <Trophy className="w-5 h-5 text-amber-500" />
            <p className="text-xs font-semibold uppercase tracking-[0.25em] text-amber-500/90">
              Global Tournament
            </p>
          </div>
          <h2 className="font-[family-name:var(--font-heading)] text-3xl font-extrabold tracking-tight text-foreground">
            No Active Tournament
          </h2>
          <p className="text-sm text-muted-foreground max-w-sm mx-auto leading-relaxed">
            There is no global tournament running right now. Check back at the
            end of the month when the next one begins.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div
      className={cn(
        inter.className,
        "min-h-screen bg-gradient-to-b from-background via-background to-background/95 text-foreground pb-20 relative overflow-hidden",
      )}
    >
      {/* Background — amber/gold tones to evoke the retro theme */}
      <div className="fixed inset-0 hexagon-pattern opacity-[0.03] pointer-events-none" />
      <div className="fixed top-0 left-1/4 w-96 h-96 bg-amber-500/8 rounded-full blur-3xl pointer-events-none" />
      <div className="fixed bottom-0 right-1/4 w-96 h-96 bg-yellow-500/6 rounded-full blur-3xl pointer-events-none" />

      <div className="w-full max-w-[1600px] mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-8 relative z-10">
        {/* Header */}
        <div className="relative">
          <div className="w-12 h-0.5 bg-amber-500 mb-4 rounded-full" />

          <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-4">
            <div>
              <div className="flex items-center gap-2 mb-2">
                <Trophy className="w-4 h-4 text-amber-500" />
                <p className="text-xs font-semibold uppercase tracking-[0.25em] text-amber-500/90">
                  Global Tournament
                </p>
              </div>
              <h1 className="font-[family-name:var(--font-heading)] text-5xl sm:text-7xl font-extrabold tracking-tight leading-none">
                <span className="bg-gradient-to-br from-foreground via-foreground/90 to-foreground/60 bg-clip-text text-transparent">
                  {TOURNAMENT_CONFIG.name}
                </span>
                <br />
                <span className="bg-gradient-to-r from-amber-400 via-yellow-300 to-amber-500 bg-clip-text text-transparent">
                  {TOURNAMENT_CONFIG.subtitle}
                </span>
              </h1>
            </div>
            <div className="flex flex-col gap-2 pb-1 max-w-sm">
              <p className="text-sm text-muted-foreground leading-relaxed">
                {TOURNAMENT_CONFIG.description}
              </p>
              <div className="flex items-center gap-1.5 text-xs text-amber-600 dark:text-amber-400 font-medium">
                <Clock className="w-3.5 h-3.5" />
                <span>{cards.length} cards in pool</span>
              </div>
              <div className="flex items-start gap-2 mt-1 px-3 py-2.5 rounded-lg bg-amber-500/8 border border-amber-500/20 text-xs text-amber-700 dark:text-amber-400 leading-relaxed">
                <AlertTriangle className="w-3.5 h-3.5 mt-0.5 shrink-0" />
                <span>
                  Win rates here skew high. Most of this deck data is from the
                  top players in the tournament, who have mostly 25+ wins with
                  fewer than 5 losses before eliminating — far above the average
                  player&apos;s run. Lower battle volume also means stats are
                  less stable than on the ranked ladder.
                </span>
              </div>
            </div>
          </div>

          <div className="mt-6 h-px bg-gradient-to-r from-amber-500/40 via-border/50 to-transparent" />
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
          hideVariantFilter
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
        {decksData && (
          <div className="space-y-6">
            <DecksResultsGrid
              decksData={decksData}
              isSearching={isSearching}
              hideMatchups
            />
            <DecksPagination
              decksData={decksData}
              page={page}
              isSearching={isSearching}
              onPageChange={handlePageChange}
            />
          </div>
        )}
      </div>
    </div>
  );
}
