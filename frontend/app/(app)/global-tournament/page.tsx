"use client";
import { useState, useEffect, useCallback, useRef, useMemo, Suspense } from "react";
import { useSearchParams, useRouter, usePathname } from "next/navigation";
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

// --- helpers to read/write URL search params ---
function parseSetParam(sp: URLSearchParams, key: string): Set<string> {
  const raw = sp.get(key);
  if (!raw) return new Set();
  return new Set(raw.split(",").filter(Boolean));
}

function GlobalTournamentContent() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const pathname = usePathname();

  const queryString = searchParams.toString();

  const urlState = useMemo(() => {
    const sp = new URLSearchParams(queryString);
    return {
      included: parseSetParam(sp, "include"),
      excluded: parseSetParam(sp, "exclude"),
      filterMode: (sp.get("mode") === "EXCLUDE" ? "EXCLUDE" : "INCLUDE") as
        | "INCLUDE"
        | "EXCLUDE",
      page: Math.max(1, parseInt(sp.get("page") || "1", 10) || 1),
      minGames: sp.has("min_games") ? parseInt(sp.get("min_games")!, 10) : 20,
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [queryString]);

  // --- State ---
  const [cards, setCards] = useState<Card[]>([]);
  const [isLoadingCards, setIsLoadingCards] = useState(true);
  const [cardsError, setCardsError] = useState<string | null>(null);
  const [searchError, setSearchError] = useState<string | null>(null);

  const [includedVariants, setIncludedVariants] = useState<Set<string>>(
    urlState.included,
  );
  const [excludedVariants, setExcludedVariants] = useState<Set<string>>(
    urlState.excluded,
  );
  const [filterMode, setFilterMode] = useState<"INCLUDE" | "EXCLUDE">(
    urlState.filterMode,
  );

  const [decksData, setDecksData] = useState<DecksResponse | null>(null);
  const [isSearching, setIsSearching] = useState(false);
  const [page, setPage] = useState(urlState.page);
  const [minGames, setMinGames] = useState(urlState.minGames);
  const [rateLimitError, setRateLimitError] = useState<string | null>(null);

  // Sync state when URL changes (back/forward)
  const prevQueryString = useRef(queryString);
  useEffect(() => {
    if (queryString !== prevQueryString.current) {
      prevQueryString.current = queryString;
      setIncludedVariants(urlState.included);
      setExcludedVariants(urlState.excluded);
      setFilterMode(urlState.filterMode);
      setPage(urlState.page);
      setMinGames(urlState.minGames);
    }
  }, [queryString, urlState]);

  const buildUrl = useCallback(
    (opts: {
      included?: Set<string>;
      excluded?: Set<string>;
      mode?: "INCLUDE" | "EXCLUDE";
      pg?: number;
      min?: number;
    }) => {
      const sp = new URLSearchParams();
      const inc = opts.included ?? includedVariants;
      const exc = opts.excluded ?? excludedVariants;
      const m = opts.mode ?? filterMode;
      const pg = opts.pg ?? page;
      const min = opts.min ?? minGames;

      if (inc.size > 0) sp.set("include", Array.from(inc).join(","));
      if (exc.size > 0) sp.set("exclude", Array.from(exc).join(","));
      if (m !== "INCLUDE") sp.set("mode", m);
      if (pg > 1) sp.set("page", pg.toString());
      if (min !== 20) sp.set("min_games", min.toString());

      const qs = sp.toString();
      return qs ? `${pathname}?${qs}` : pathname;
    },
    [includedVariants, excludedVariants, filterMode, page, minGames, pathname],
  );

  const syncToUrl = useCallback(
    (opts: {
      included?: Set<string>;
      excluded?: Set<string>;
      mode?: "INCLUDE" | "EXCLUDE";
      pg?: number;
      min?: number;
    }) => {
      router.replace(buildUrl(opts), { scroll: false });
    },
    [buildUrl, router],
  );

  const lastSearchTime = useRef<number>(0);

  // --- Fetch cards ---
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
      setCards(
        (data.cards || []).filter(
          (card: Card) =>
            !String(card.card_id).startsWith("159") &&
            !TOWER_TROOP_NAMES.has(card.name) &&
            TOURNAMENT_CONFIG.cardPool.has(card.name),
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
    if (TOURNAMENT_CONFIG.enabled) fetchCards();
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
          sort_by: "GAMES_PLAYED",
          min_games: minGames.toString(),
        });

        if (includeParam) queryParams.set("include", includeParam);
        if (excludeParam) queryParams.set("exclude", excludeParam);

        const res = await fetch(`${DECKS_URL}?${queryParams.toString()}`);

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

  // Auto-fetch on load
  const hasFetchedRef = useRef(false);
  useEffect(() => {
    if (TOURNAMENT_CONFIG.enabled && !hasFetchedRef.current) {
      hasFetchedRef.current = true;
      fetchDecks(1);
    }
  }, [fetchDecks]);

  const handlePageChange = (newPage: number) => {
    setPage(newPage);
    syncToUrl({ pg: newPage });
    fetchDecks(newPage);
    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  const handleToggleCard = (id: string) => {
    let newIncluded = includedVariants;
    let newExcluded = excludedVariants;

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
          newExcluded = newExclude;
        }
      }
      setIncludedVariants(newSet);
      newIncluded = newSet;
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
          newIncluded = newInclude;
        }
      }
      setExcludedVariants(newSet);
      newExcluded = newSet;
    }

    syncToUrl({ included: newIncluded, excluded: newExcluded });
  };

  const handleSetFilterMode = (mode: "INCLUDE" | "EXCLUDE") => {
    setFilterMode(mode);
    syncToUrl({ mode });
  };

  const handleSetMinGames = (val: number) => {
    setMinGames(val);
    syncToUrl({ min: val });
  };

  const clearFilters = () => {
    setIncludedVariants(new Set());
    setExcludedVariants(new Set());
    setMinGames(20);
    setPage(1);
    syncToUrl({ included: new Set(), excluded: new Set(), pg: 1, min: 20 });
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
          onSetFilterMode={handleSetFilterMode}
          includedVariants={includedVariants}
          excludedVariants={excludedVariants}
          onToggleCard={handleToggleCard}
          minGames={minGames}
          onSetMinGames={handleSetMinGames}
          isSearching={isSearching}
          onSearch={() => {
            setPage(1);
            syncToUrl({ pg: 1 });
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

        {/* Results */}
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

export default function GlobalTournamentPage() {
  return (
    <Suspense>
      <GlobalTournamentContent />
    </Suspense>
  );
}
