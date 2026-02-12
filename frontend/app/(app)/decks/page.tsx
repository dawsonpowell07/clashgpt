"use client";
import { useState, useEffect, useCallback, useRef } from "react";
import { Card, DecksResponse } from "@/lib/types";
import { CardSelector } from "@/components/card-selector";
import { DeckGridCard } from "@/components/deck-grid-card";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Filter, Search, X, Loader2, ChevronLeft, ChevronRight, Sparkles, TrendingUp } from "lucide-react";
import { cn } from "@/lib/utils";
import { Inter } from "next/font/google";

const inter = Inter({
  subsets: ["latin"],
  weight: ["400", "500", "600", "700", "800"],
});

const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000";

export default function DecksPage() {
  // --- State ---
  const [cards, setCards] = useState<Card[]>([]);
  const [isLoadingCards, setIsLoadingCards] = useState(true);
  
  // Selection State
  const [includedVariants, setIncludedVariants] = useState<Set<string>>(new Set());
  const [excludedVariants, setExcludedVariants] = useState<Set<string>>(new Set());
  const [filterMode, setFilterMode] = useState<"INCLUDE" | "EXCLUDE">("INCLUDE");

  // Search Results State
  const [decksData, setDecksData] = useState<DecksResponse | null>(null);
  const [isSearching, setIsSearching] = useState(false);
  const [page, setPage] = useState(1);
  const [minGames, setMinGames] = useState(0);
  const [rateLimitError, setRateLimitError] = useState<string | null>(null);

  // Debounce guard: prevent searches within 500ms of each other
  const lastSearchTime = useRef<number>(0);

  // --- Effects ---

  // 1. Fetch Cards on Mount
  useEffect(() => {
    async function fetchCards() {
      try {
        const res = await fetch(`${API_BASE_URL}/api/cards`);
        if (!res.ok) throw new Error("Failed to fetch cards");
        const data = await res.json();
        const cardList: Card[] = data.cards || [];
        setCards(cardList);
      } catch (error) {
        console.error("Error fetching cards:", error);
      } finally {
        setIsLoadingCards(false);
      }
    }
    fetchCards();
  }, []);

  // 2. Search Function with debounce guard and 429 handling
  const fetchDecks = useCallback(async (pageNum: number) => {
    // Debounce: skip if less than 500ms since last search
    const now = Date.now();
    if (now - lastSearchTime.current < 500) return;
    lastSearchTime.current = now;

    setIsSearching(true);
    setRateLimitError(null);
    try {
      const includeParam = Array.from(includedVariants).join(",");
      const excludeParam = Array.from(excludedVariants).join(",");

      const queryParams = new URLSearchParams({
        page: pageNum.toString(),
        page_size: "24",
        include_cards: "true", // Need card details for result display
        sort_by: "RECENT", // Default sort
        min_games: minGames.toString(),
      });

      if (includeParam) queryParams.set("include", includeParam);
      if (excludeParam) queryParams.set("exclude", excludeParam);

      const res = await fetch(`${API_BASE_URL}/api/decks?${queryParams.toString()}`);

      if (res.status === 429) {
        setRateLimitError("Too many requests — please wait a moment before searching again.");
        return;
      }

      if (!res.ok) throw new Error("Failed to search decks");

      const data = await res.json();
      setDecksData(data);
    } catch (error) {
      console.error("Error searching decks:", error);
    } finally {
      setIsSearching(false);
    }
  }, [includedVariants, excludedVariants, minGames]);

  // Initial Search on Mount
  useEffect(() => {
    fetchDecks(1);
  }, []); 

  // Handle Page Change
  const handlePageChange = (newPage: number) => {
    setPage(newPage);
    fetchDecks(newPage);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  // Toggle Logic
  const handleToggleCard = (id: string) => {
    if (filterMode === "INCLUDE") {
      const newSet = new Set(includedVariants);
      if (newSet.has(id)) {
        newSet.delete(id);
      } else {
        newSet.add(id);
        // Remove from exclude if present to prevent conflict
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
        // Remove from include if present
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
    } catch (e) {
      return id;
    }
  };

  return (
    <div className={cn(inter.className, "min-h-screen bg-gradient-to-b from-background via-background to-background/95 text-foreground pb-20 relative overflow-hidden")}>
      {/* Animated hexagonal pattern background */}
      <div className="fixed inset-0 hexagon-pattern opacity-[0.03] pointer-events-none" />

      {/* Ambient glow effects */}
      <div className="fixed top-0 left-1/4 w-96 h-96 bg-primary/5 rounded-full blur-3xl pointer-events-none" />
      <div className="fixed bottom-0 right-1/4 w-96 h-96 bg-accent/5 rounded-full blur-3xl pointer-events-none" />

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-8 relative z-10">

        {/* Header with gradient accent and arena styling */}
        <div className="relative flex flex-col gap-4 pb-6 border-b-2 border-border/30">
          {/* Animated accent line */}
          <div className="absolute inset-x-0 bottom-0 h-[3px] bg-gradient-to-r from-transparent via-primary to-transparent opacity-60 battle-glow" />

          <h1 className="text-5xl sm:text-6xl font-[family-name:var(--font-heading)] font-extrabold tracking-tight bg-gradient-to-r from-primary via-primary/90 to-accent bg-clip-text text-transparent relative">
            <span className="relative inline-block">
              Deck Arsenal
              {/* Subtle glow effect */}
              <span className="absolute inset-0 bg-gradient-to-r from-primary to-accent blur-2xl opacity-20 -z-10" />
            </span>
          </h1>
          <p className="text-muted-foreground text-base font-normal max-w-2xl">
            Browse and filter decks from top players
          </p>
        </div>

        {/* Filter Section with enhanced styling */}
        <div className="relative space-y-4 bg-gradient-to-br from-card via-card to-muted/20 border border-border/50 rounded-2xl p-6 shadow-lg backdrop-blur-sm">
          {/* Subtle glow effect */}
          <div className="absolute inset-0 rounded-2xl bg-gradient-to-br from-primary/5 to-transparent pointer-events-none" />

          <div className="relative flex flex-col gap-4">
            {/* Top Row: Mode Toggles and Min Games Filter */}
            <div className="flex flex-col sm:flex-row gap-4 justify-between items-start sm:items-center">
              {/* Mode Toggles with enhanced styling */}
              <div className="flex items-center gap-3 p-1.5 bg-muted/60 rounded-xl shadow-inner">
                <span className="text-sm font-semibold text-muted-foreground px-2">Filter Mode:</span>
                <button
                  onClick={() => setFilterMode("INCLUDE")}
                  className={cn(
                    "flex items-center gap-2 px-4 py-2 text-sm font-semibold rounded-lg transition-all duration-300 transform",
                    filterMode === "INCLUDE"
                      ? "bg-gradient-to-r from-green-500 to-green-600 text-white shadow-lg shadow-green-500/30 scale-105 ring-2 ring-green-400/50"
                      : "text-muted-foreground hover:bg-muted hover:scale-105"
                  )}
                >
                  <Filter className="w-4 h-4" />
                  Include
                </button>
                <button
                  onClick={() => setFilterMode("EXCLUDE")}
                  className={cn(
                    "flex items-center gap-2 px-4 py-2 text-sm font-semibold rounded-lg transition-all duration-300 transform",
                    filterMode === "EXCLUDE"
                      ? "bg-gradient-to-r from-red-500 to-red-600 text-white shadow-lg shadow-red-500/30 scale-105 ring-2 ring-red-400/50"
                      : "text-muted-foreground hover:bg-muted hover:scale-105"
                  )}
                >
                  <X className="w-4 h-4" />
                  Exclude
                </button>
              </div>

              {/* Minimum Games Filter */}
              <div className="flex items-center gap-3 p-1.5 bg-muted/60 rounded-xl shadow-inner">
                <div className="flex items-center gap-2 px-2">
                  <TrendingUp className="w-4 h-4 text-muted-foreground" />
                  <span className="text-sm font-semibold text-muted-foreground">Min Games:</span>
                </div>
                <Select
                  value={minGames.toString()}
                  onValueChange={(value) => setMinGames(Number(value))}
                >
                  <SelectTrigger className="w-[160px] font-semibold hover:border-primary/50 focus:ring-primary/50 transition-all">
                    <SelectValue placeholder="Select minimum" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="0">No minimum</SelectItem>
                    <SelectItem value="10">10+ games</SelectItem>
                    <SelectItem value="20">20+ games</SelectItem>
                    <SelectItem value="50">50+ games</SelectItem>
                    <SelectItem value="100">100+ games</SelectItem>
                    <SelectItem value="200">200+ games</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            {/* Bottom Row: Action Buttons */}
            <div className="flex items-center justify-end gap-3 w-full">
              <Button
                variant="outline"
                size="sm"
                onClick={clearFilters}
                disabled={includedVariants.size === 0 && excludedVariants.size === 0 && minGames === 0}
                className="hover:bg-destructive/10 hover:text-destructive hover:border-destructive/50 transition-all"
              >
                <X className="w-3.5 h-3.5 mr-1.5" />
                Clear Filters
              </Button>
              <Button
                onClick={() => { setPage(1); fetchDecks(1); }}
                disabled={isSearching}
                className="w-full sm:w-auto bg-gradient-to-r from-primary to-primary/80 hover:from-primary/90 hover:to-primary/70 shadow-lg shadow-primary/20 transition-all transform hover:scale-105"
              >
                {isSearching ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : <Search className="w-4 h-4 mr-2" />}
                Search Decks
              </Button>
            </div>
          </div>

          <Separator />

          {/* Card Grid Selector */}
          {isLoadingCards ? (
            <div className="h-[200px] flex items-center justify-center text-muted-foreground">
              <Loader2 className="w-8 h-8 animate-spin" />
            </div>
          ) : (
            <CardSelector 
              cards={cards}
              selectedIndices={filterMode === "INCLUDE" ? includedVariants : excludedVariants}
              onToggleCard={handleToggleCard}
              filterMode={filterMode}
            />
          )}

          {/* Active Filters Summary with enhanced badges */}
          {(includedVariants.size > 0 || excludedVariants.size > 0 || minGames > 0) && (
            <div className="relative pt-4 border-t border-border/30">
              <div className="flex flex-wrap gap-2">
                {Array.from(includedVariants).map(id => (
                  <span
                    key={id}
                    className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-semibold bg-gradient-to-r from-green-500/20 to-green-600/20 text-green-600 dark:text-green-400 ring-1 ring-green-500/30 shadow-sm backdrop-blur-sm transform transition-all hover:scale-105"
                  >
                    <Filter className="w-3 h-3" />
                    {getCardLabel(id)}
                  </span>
                ))}
                {Array.from(excludedVariants).map(id => (
                  <span
                    key={id}
                    className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-semibold bg-gradient-to-r from-red-500/20 to-red-600/20 text-red-600 dark:text-red-400 ring-1 ring-red-500/30 shadow-sm backdrop-blur-sm transform transition-all hover:scale-105"
                  >
                    <X className="w-3 h-3" />
                    {getCardLabel(id)}
                  </span>
                ))}
                {minGames > 0 && (
                  <span
                    className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-semibold bg-gradient-to-r from-blue-500/20 to-blue-600/20 text-blue-600 dark:text-blue-400 ring-1 ring-blue-500/30 shadow-sm backdrop-blur-sm transform transition-all hover:scale-105"
                  >
                    <TrendingUp className="w-3 h-3" />
                    Min {minGames} games
                  </span>
                )}
              </div>
            </div>
          )}
        </div>

        {/* Rate Limit Warning */}
        {rateLimitError && (
          <div className="flex items-center gap-3 px-5 py-4 rounded-xl bg-amber-500/10 border border-amber-500/30 text-amber-600 dark:text-amber-400">
            <svg className="w-5 h-5 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
            <p className="text-sm font-medium">{rateLimitError}</p>
          </div>
        )}

        {/* Results Section */}
        {decksData && (
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
                  {isSearching ? "Searching..." : decksData.total > 0 ? `Found ${decksData.total} Decks` : "No Decks Found"}
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
              <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6">
                {[...Array(6)].map((_, i) => (
                  <div
                    key={i}
                    className="h-[401px] bg-gradient-to-br from-muted/50 to-muted/30 border border-border/30 rounded-2xl animate-pulse"
                  />
                ))}
              </div>
            ) : decksData.decks.length > 0 ? (
              <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6">
                {decksData.decks.map((deck) => (
                  <DeckGridCard key={deck.deck_id} deck={deck} />
                ))}
              </div>
            ) : (
              <div className="flex flex-col items-center justify-center py-16 px-4 bg-muted/20 rounded-2xl border border-dashed border-border">
                <Search className="w-12 h-12 text-muted-foreground/50 mb-4" />
                <p className="text-lg font-semibold text-muted-foreground mb-2">No decks found</p>
                <p className="text-sm text-muted-foreground/70 text-center max-w-md">
                  Try adjusting your filters or search criteria to find more decks.
                </p>
              </div>
            )}

            {/* Pagination */}
            {!isSearching && decksData.total > 0 && (
              <div className="flex items-center justify-between pt-4 border-t border-border/30">
                <div className="text-sm text-muted-foreground">
                  Showing <span className="font-semibold text-foreground">{((decksData.page - 1) * 24) + 1}</span> to{" "}
                  <span className="font-semibold text-foreground">
                    {Math.min(decksData.page * 24, decksData.total)}
                  </span>{" "}
                  of <span className="font-semibold text-foreground">{decksData.total}</span> decks
                </div>
                <div className="flex gap-2">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => handlePageChange(Math.max(1, page - 1))}
                    disabled={!decksData.has_previous || isSearching}
                    className="hover:bg-primary/10 hover:border-primary/50 transition-all"
                  >
                    <ChevronLeft className="w-4 h-4 mr-1" />
                    Previous
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => handlePageChange(page + 1)}
                    disabled={!decksData.has_next || isSearching}
                    className="hover:bg-primary/10 hover:border-primary/50 transition-all"
                  >
                    Next
                    <ChevronRight className="w-4 h-4 ml-1" />
                  </Button>
                </div>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
