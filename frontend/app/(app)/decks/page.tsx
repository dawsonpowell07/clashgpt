"use client";

import { useState, useEffect } from "react";
import Image from "next/image";
import {
  Search,
  Filter,
  Trophy,
  Zap,
  Target,
  TrendingUp,
  X,
  ChevronLeft,
  ChevronRight,
} from "lucide-react";

// Types
type FilterCategory = "archetype" | "ftp_tier";

interface FilterState {
  archetype: string[];
  ftp_tier: string[];
}

interface DeckCard {
  card_id: string;
  card_name: string;
  card_variant: string;
}

interface Deck {
  id: string;
  deck_hash: string;
  cards: DeckCard[];
  avg_elixir: number;
  archetype: string;
  ftp_tier: string;
}

interface PaginatedDecks {
  decks: Deck[];
  total: number;
  page: number;
  page_size: number;
  total_pages: number;
  has_next: boolean;
  has_previous: boolean;
}

interface Card {
  id: string;
  name: string;
  elixir_cost: number;
  icon_urls: Record<string, string>;
  rarity: string;
}

interface CardVariant {
  id: string; // Original card ID
  name: string;
  variant: "NORMAL" | "EVOLUTION" | "HERO";
  displayName: string; // e.g., "Musketeer (Hero)"
  imagePath: string;
}

const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000";

// Define hero card names
const HERO_CARD_NAMES = ["Wizard", "Ice Golem", "Mini P.E.K.K.A", "Knight", "Musketeer"];

export default function DecksPage() {
  const [filters, setFilters] = useState<FilterState>({
    archetype: [],
    ftp_tier: [],
  });
  const [currentPage, setCurrentPage] = useState(1);
  const [paginatedData, setPaginatedData] = useState<PaginatedDecks | null>(
    null
  );
  const [loading, setLoading] = useState(false);
  const [allCardVariants, setAllCardVariants] = useState<CardVariant[]>([]);
  const [selectedCards, setSelectedCards] = useState<Set<string>>(new Set()); // Temporary selections
  const [confirmedCards, setConfirmedCards] = useState<Set<string>>(new Set()); // Applied to search
  const [showCardSelector, setShowCardSelector] = useState(false);
  const pageSize = 24;

  // Filter options
  const filterOptions = {
    archetype: [
      { value: "CYCLE", label: "Cycle" },
      { value: "BEATDOWN", label: "Beatdown" },
      { value: "CONTROL", label: "Control" },
      { value: "SIEGE", label: "Siege" },
      { value: "BRIDGESPAM", label: "Bridge Spam" },
      { value: "BAIT", label: "Bait" },
    ],
    ftp_tier: [
      { value: "FRIENDLY", label: "F2P Friendly" },
      { value: "MODERATE", label: "Moderate" },
      { value: "PAYTOWIN", label: "Pay to Win" },
    ],
  };

  // Fetch all cards once on mount and create variants
  useEffect(() => {
    const fetchCards = async () => {
      try {
        const response = await fetch(`${API_BASE_URL}/api/cards`);
        if (!response.ok) throw new Error("Failed to fetch cards");
        const data = await response.json();

        // Create card variants for each card
        const cardVariants: CardVariant[] = [];

        data.cards.forEach((card: Card) => {
          const cardFileName = card.name.toLowerCase().replace(/ /g, "_");
          const isHero = HERO_CARD_NAMES.includes(card.name);

          // Add hero variant first if it exists
          if (isHero) {
            cardVariants.push({
              id: card.id,
              name: card.name,
              variant: "HERO",
              displayName: `${card.name} (Hero)`,
              imagePath: `/cards/${cardFileName}/${cardFileName}_hero.png`,
            });
          }

          // Add evolution variant if it exists
          if (card.icon_urls?.evolution) {
            cardVariants.push({
              id: card.id,
              name: card.name,
              variant: "EVOLUTION",
              displayName: `${card.name} (Evolution)`,
              imagePath: `/cards/${cardFileName}/${cardFileName}_evolution.png`,
            });
          }

          // Add normal variant
          cardVariants.push({
            id: card.id,
            name: card.name,
            variant: "NORMAL",
            displayName: card.name,
            imagePath: `/cards/${cardFileName}/${cardFileName}.png`,
          });
        });

        // Order: heroes first, then evolutions, then normal
        const orderedVariants = cardVariants.sort((a, b) => {
          // Priority: HERO > EVOLUTION > NORMAL
          const variantOrder = { HERO: 0, EVOLUTION: 1, NORMAL: 2 };
          if (variantOrder[a.variant] !== variantOrder[b.variant]) {
            return variantOrder[a.variant] - variantOrder[b.variant];
          }
          // Within same variant type, sort alphabetically
          return a.name.localeCompare(b.name);
        });

        setAllCardVariants(orderedVariants);
      } catch (error) {
        console.error("Error fetching cards:", error);
      }
    };

    fetchCards();
  }, []);

  // Fetch decks from backend
  useEffect(() => {
    const fetchDecks = async () => {
      setLoading(true);

      // Scroll to top when page changes
      window.scrollTo({ top: 0, behavior: "smooth" });

      try {
        const params = new URLSearchParams({
          page: currentPage.toString(),
          page_size: pageSize.toString(),
        });

        // Add card filters (comma-separated card IDs)
        // Extract just the card IDs from the variant keys (e.g., "26000001-HERO" -> "26000001")
        if (confirmedCards.size > 0) {
          const cardIds = Array.from(confirmedCards).map(key => key.split('-')[0]);
          // Remove duplicates in case user selected multiple variants of the same card
          const uniqueCardIds = [...new Set(cardIds)];
          params.append("include", uniqueCardIds.join(","));
        }

        // Add archetype filters
        if (filters.archetype.length > 0) {
          // Backend supports single archetype, use first selected
          params.append("archetype", filters.archetype[0]);
        }

        // Add FTP tier filters
        if (filters.ftp_tier.length > 0) {
          // Backend supports single ftp_tier, use first selected
          params.append("ftp_tier", filters.ftp_tier[0]);
        }

        const response = await fetch(
          `${API_BASE_URL}/api/decks/search?${params.toString()}`
        );

        if (!response.ok) {
          throw new Error("Failed to fetch decks");
        }

        const data: PaginatedDecks = await response.json();
        setPaginatedData(data);
      } catch (error) {
        console.error("Error fetching decks:", error);
      } finally {
        setLoading(false);
      }
    };

    fetchDecks();
  }, [currentPage, filters, confirmedCards]);

  const toggleFilter = (category: FilterCategory, value: string) => {
    setFilters((prev) => ({
      ...prev,
      [category]: prev[category].includes(value)
        ? prev[category].filter((v) => v !== value)
        : [value], // Only allow one filter per category for now
    }));
    setCurrentPage(1); // Reset to first page when filters change
  };

  const clearAllFilters = () => {
    setFilters({ archetype: [], ftp_tier: [] });
    setCurrentPage(1);
  };

  const toggleCardSelection = (cardId: string) => {
    setSelectedCards((prev) => {
      const newSet = new Set(prev);
      if (newSet.has(cardId)) {
        newSet.delete(cardId);
      } else if (newSet.size < 8) {
        newSet.add(cardId);
      }
      return newSet;
    });
  };

  const confirmCardSelection = () => {
    setConfirmedCards(new Set(selectedCards));
    setShowCardSelector(false);
    setCurrentPage(1);
  };

  const clearCardSelection = () => {
    setSelectedCards(new Set());
    setConfirmedCards(new Set());
    setCurrentPage(1);
  };

  const hasActiveFilters = Object.values(filters).some((arr) => arr.length > 0);

  const decks = paginatedData?.decks || [];

  // Helper function to get card image path from card name and variant
  // Matches the pattern from deck-search-results.tsx
  const getCardImagePath = (
    cardName: string | undefined,
    variant: string = "NORMAL"
  ): string => {
    // Return empty string if card name is not available
    if (!cardName) {
      return "";
    }

    const cardFileName = cardName.toLowerCase().replace(/ /g, "_");

    // Determine the image suffix based on variant
    const imageSuffix =
      variant === "EVOLUTION"
        ? "_evolution"
        : variant === "HERO"
        ? "_hero"
        : "";

    return `/cards/${cardFileName}/${cardFileName}${imageSuffix}.png`;
  };

  return (
    <div className="min-h-screen bg-background text-foreground">
      {/* Main Content */}
      <main className="relative">
        {/* Hero Section with Search */}
        <section className="relative pt-24 pb-12 px-6 md:px-12">
          <div className="max-w-7xl mx-auto space-y-8">
            {/* Header */}
            <div className="text-center space-y-4 opacity-0 animate-[fade-in_0.6s_ease-out_0.1s_forwards]">
              <div className="inline-flex items-center gap-2 px-4 py-2 bg-card/50 border border-border/50 rounded-full backdrop-blur-sm">
                <Trophy className="w-4 h-4 text-primary" />
                <span className="text-sm tracking-wider uppercase text-muted-foreground font-medium">
                  Deck Database
                </span>
              </div>
              <h1 className="font-[family-name:var(--font-heading)] font-bold text-5xl md:text-6xl lg:text-7xl tracking-tight">
                Browse <span className="text-primary">Winning Decks</span>
              </h1>
              <p className="text-lg md:text-xl text-muted-foreground max-w-2xl mx-auto">
                Explore tournament-proven decks from the competitive meta
              </p>
            </div>

            {/* Card Selector Button */}
            <div className="max-w-3xl mx-auto opacity-0 animate-[fade-in_0.6s_ease-out_0.3s_forwards]">
              <div className="w-full flex items-center gap-3 px-6 py-4 bg-card/50 border border-border rounded-lg backdrop-blur-sm">
                <button
                  onClick={() => {
                    setShowCardSelector(!showCardSelector);
                    // When opening, sync temporary selection with confirmed selection
                    if (!showCardSelector) {
                      setSelectedCards(new Set(confirmedCards));
                    }
                  }}
                  className="flex-1 flex items-center justify-between text-foreground hover:text-primary transition-colors"
                >
                  <div className="flex items-center gap-3">
                    <Search className="w-5 h-5 text-muted-foreground" />
                    <span className="text-lg">
                      {confirmedCards.size > 0
                        ? `${confirmedCards.size} card${confirmedCards.size !== 1 ? "s" : ""} selected`
                        : "Search decks by card"}
                    </span>
                  </div>
                  <span className="text-muted-foreground">
                    {showCardSelector ? "▲" : "▼"}
                  </span>
                </button>
                {confirmedCards.size > 0 && (
                  <button
                    onClick={clearCardSelection}
                    className="px-3 py-1 text-sm bg-destructive/20 text-destructive rounded hover:bg-destructive/30 transition-colors shrink-0"
                  >
                    Clear
                  </button>
                )}
              </div>

              {/* Card Selection Grid */}
              {showCardSelector && (
                <div className="mt-4 p-6 bg-card/50 border border-border rounded-lg backdrop-blur-sm">
                  <div className="mb-4 flex items-center justify-between">
                    <p className="text-sm text-muted-foreground">
                      Select up to 8 cards to filter decks ({selectedCards.size}/8)
                    </p>
                  </div>
                  <div className="grid grid-cols-4 sm:grid-cols-6 md:grid-cols-8 lg:grid-cols-10 gap-2 max-h-96 overflow-y-auto mb-4">
                    {allCardVariants.map((cardVariant, index) => {
                      const uniqueKey = `${cardVariant.id}-${cardVariant.variant}`;
                      const isSelected = selectedCards.has(uniqueKey);
                      return (
                        <button
                          key={`${cardVariant.id}-${cardVariant.variant}-${index}`}
                          onClick={() => toggleCardSelection(uniqueKey)}
                          disabled={!isSelected && selectedCards.size >= 8}
                          className={`relative aspect-square rounded-lg border-2 overflow-hidden transition-all ${
                            isSelected
                              ? "border-primary ring-2 ring-primary/50 scale-95"
                              : "border-border/30 hover:border-primary/50 hover:scale-105"
                          } ${!isSelected && selectedCards.size >= 8 ? "opacity-30 cursor-not-allowed" : "cursor-pointer"}`}
                          title={cardVariant.displayName}
                        >
                          <Image
                            src={cardVariant.imagePath}
                            alt={cardVariant.displayName}
                            fill
                            className="object-contain"
                          />
                          {/* Variant Badge */}
                          {cardVariant.variant !== "NORMAL" && (
                            <div className="absolute top-0.5 right-0.5 px-1 py-0.5 bg-primary/90 rounded text-[8px] font-bold text-primary-foreground uppercase z-10">
                              {cardVariant.variant === "EVOLUTION" ? "EVO" : "HERO"}
                            </div>
                          )}
                          {isSelected && (
                            <div className="absolute inset-0 bg-primary/20 flex items-center justify-center">
                              <div className="w-6 h-6 rounded-full bg-primary text-primary-foreground flex items-center justify-center text-xs font-bold">
                                ✓
                              </div>
                            </div>
                          )}
                        </button>
                      );
                    })}
                  </div>
                  {/* Action Buttons */}
                  <div className="flex items-center justify-end gap-3 pt-4 border-t border-border">
                    <button
                      onClick={() => {
                        setShowCardSelector(false);
                        setSelectedCards(new Set(confirmedCards)); // Revert to confirmed selection
                      }}
                      className="px-4 py-2 text-sm bg-muted text-muted-foreground rounded-lg hover:bg-muted/80 transition-colors"
                    >
                      Cancel
                    </button>
                    <button
                      onClick={confirmCardSelection}
                      disabled={selectedCards.size === 0}
                      className="px-6 py-2 text-sm bg-primary text-primary-foreground rounded-lg hover:bg-primary/90 transition-colors disabled:opacity-50 disabled:cursor-not-allowed font-medium"
                    >
                      Search {selectedCards.size > 0 && `(${selectedCards.size})`}
                    </button>
                  </div>
                </div>
              )}
            </div>
          </div>
        </section>

        {/* Filters Section */}
        <section className="relative pb-8 px-6 md:px-12">
          <div className="max-w-7xl mx-auto space-y-6 opacity-0 animate-[fade-in_0.6s_ease-out_0.5s_forwards]">
            {/* Filter Header */}
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Filter className="w-5 h-5 text-muted-foreground" />
                <h2 className="font-(family-name:--font-heading) font-bold text-xl text-foreground">
                  Filters
                </h2>
              </div>
              {hasActiveFilters && (
                <button
                  onClick={clearAllFilters}
                  className="flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground transition-colors"
                >
                  <X className="w-4 h-4" />
                  Clear All
                </button>
              )}
            </div>

            {/* Filter Groups */}
            <div className="space-y-4">
              {/* Archetype */}
              <div className="space-y-2">
                <div className="flex items-center gap-2">
                  <Target className="w-4 h-4 text-accent" />
                  <h3 className="text-sm font-medium text-muted-foreground uppercase tracking-wider">
                    Archetype
                  </h3>
                </div>
                <div className="flex flex-wrap gap-2">
                  {filterOptions.archetype.map((option) => (
                    <button
                      key={option.value}
                      onClick={() => toggleFilter("archetype", option.value)}
                      className={`px-4 py-2 rounded-lg border text-sm font-medium transition-all duration-200 ${
                        filters.archetype.includes(option.value)
                          ? "bg-accent text-accent-foreground border-accent shadow-sm"
                          : "bg-card/50 text-muted-foreground border-border hover:bg-card hover:text-foreground hover:border-border/80"
                      }`}
                    >
                      {option.label}
                    </button>
                  ))}
                </div>
              </div>

              {/* Free-to-Play Tier */}
              <div className="space-y-2">
                <div className="flex items-center gap-2">
                  <TrendingUp className="w-4 h-4 text-primary" />
                  <h3 className="text-sm font-medium text-muted-foreground uppercase tracking-wider">
                    Free-to-Play Tier
                  </h3>
                </div>
                <div className="flex flex-wrap gap-2">
                  {filterOptions.ftp_tier.map((option) => (
                    <button
                      key={option.value}
                      onClick={() => toggleFilter("ftp_tier", option.value)}
                      className={`px-4 py-2 rounded-lg border text-sm font-medium transition-all duration-200 ${
                        filters.ftp_tier.includes(option.value)
                          ? "bg-primary text-primary-foreground border-primary shadow-sm"
                          : "bg-card/50 text-muted-foreground border-border hover:bg-card hover:text-foreground hover:border-border/80"
                      }`}
                    >
                      {option.label}
                    </button>
                  ))}
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* Results Section */}
        <section className="relative py-8 px-6 md:px-12 pb-24">
          <div className="max-w-7xl mx-auto">
            {/* Results Count & Pagination Info */}
            <div className="mb-6 opacity-0 animate-[fade-in_0.6s_ease-out_0.7s_forwards]">
              {loading ? (
                <p className="text-muted-foreground">Loading...</p>
              ) : (
                <p className="text-muted-foreground">
                  <span className="font-[family-name:var(--font-heading)] font-bold text-2xl text-foreground">
                    {paginatedData?.total || 0}
                  </span>{" "}
                  {paginatedData?.total === 1 ? "deck" : "decks"} found
                  {paginatedData && paginatedData.total > 0 && (
                    <span className="ml-2">
                      (Page {paginatedData.page} of {paginatedData.total_pages})
                    </span>
                  )}
                </p>
              )}
            </div>

            {/* Deck Grid */}
            {!loading && decks.length > 0 && (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 opacity-0 animate-[fade-in_0.6s_ease-out_0.9s_forwards]">
                {decks.map((deck, index) => (
                  <div
                    key={deck.id}
                    className="group bg-card border border-border rounded-xl p-6 transition-all duration-300 hover:border-primary/40 hover:shadow-[0_0_30px_rgba(255,159,28,0.1)] cursor-pointer"
                    style={{
                      animation: `fade-in 0.6s ease-out ${
                        0.9 + index * 0.1
                      }s forwards`,
                      opacity: 0,
                    }}
                  >
                    {/* Deck Header */}
                    <div className="space-y-3 mb-4">
                      <div className="flex items-start justify-between gap-2">
                        <h3 className="font-[family-name:var(--font-heading)] font-bold text-lg text-foreground group-hover:text-primary transition-colors">
                          {deck.archetype} Deck
                        </h3>
                        <div className="flex items-center gap-1 px-2 py-1 bg-primary/10 border border-primary/20 rounded text-xs font-medium text-primary">
                          <Zap className="w-3 h-3" />
                          {deck.avg_elixir.toFixed(1)}
                        </div>
                      </div>

                      <div className="flex items-center gap-3">
                        <span className="px-2 py-1 bg-accent/10 border border-accent/20 rounded text-xs font-medium text-accent">
                          {deck.archetype}
                        </span>
                        <span className="px-2 py-1 bg-muted/30 border border-border/50 rounded text-xs font-medium text-muted-foreground">
                          {deck.ftp_tier}
                        </span>
                      </div>
                    </div>

                    {/* Cards Grid */}
                    <div className="grid grid-cols-3 sm:grid-cols-4 gap-4">
                      {deck.cards.map((card, cardIndex) => {
                        const imagePath = getCardImagePath(
                          card.card_name,
                          card.card_variant
                        );
                        return (
                          <div
                            key={cardIndex}
                            className="relative aspect-square bg-muted/30 border-[0.5px] border-border/30 rounded-md overflow-hidden"
                            title={`${card.card_name}${
                              card.card_variant !== "NORMAL"
                                ? ` (${card.card_variant})`
                                : ""
                            }`}
                          >
                            <Image
                              src={imagePath}
                              alt={card.card_name}
                              fill
                              className="object-contain scale-110"
                            />
                            {/* Variant Badge */}
                            {card.card_variant !== "NORMAL" && (
                              <div className="absolute top-0.5 right-0.5 px-1 py-0.5 bg-primary/90 rounded text-[8px] font-bold text-primary-foreground uppercase z-10">
                                {card.card_variant === "EVOLUTION"
                                  ? "EVO"
                                  : card.card_variant === "HERO"
                                  ? "HERO"
                                  : card.card_variant}
                              </div>
                            )}
                          </div>
                        );
                      })}
                    </div>
                  </div>
                ))}
              </div>
            )}

            {/* Pagination Controls */}
            {!loading && paginatedData && paginatedData.total_pages > 1 && (
              <div className="flex justify-center items-center gap-4 mt-8 opacity-0 animate-[fade-in_0.6s_ease-out_1s_forwards]">
                <button
                  onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
                  disabled={!paginatedData.has_previous}
                  className="flex items-center gap-2 px-4 py-2 rounded-lg border bg-card text-foreground border-border hover:bg-card/80 disabled:opacity-50 disabled:cursor-not-allowed transition-all"
                >
                  <ChevronLeft className="w-4 h-4" />
                  Previous
                </button>

                <div className="flex items-center gap-2">
                  {(() => {
                    const totalPages = paginatedData.total_pages;
                    const currentPage = paginatedData.page;
                    let startPage = Math.max(1, currentPage - 2);
                    const endPage = Math.min(totalPages, startPage + 4);

                    // Adjust start if we're near the end
                    if (endPage - startPage < 4) {
                      startPage = Math.max(1, endPage - 4);
                    }

                    const pages = [];
                    for (let i = startPage; i <= endPage; i++) {
                      pages.push(i);
                    }

                    return pages.map((pageNum) => (
                      <button
                        key={`page-${pageNum}`}
                        onClick={() => setCurrentPage(pageNum)}
                        className={`w-10 h-10 rounded-lg border transition-all ${
                          pageNum === currentPage
                            ? "bg-primary text-primary-foreground border-primary"
                            : "bg-card text-foreground border-border hover:bg-card/80"
                        }`}
                      >
                        {pageNum}
                      </button>
                    ));
                  })()}
                </div>

                <button
                  onClick={() =>
                    setCurrentPage((p) =>
                      Math.min(paginatedData.total_pages, p + 1)
                    )
                  }
                  disabled={!paginatedData.has_next}
                  className="flex items-center gap-2 px-4 py-2 rounded-lg border bg-card text-foreground border-border hover:bg-card/80 disabled:opacity-50 disabled:cursor-not-allowed transition-all"
                >
                  Next
                  <ChevronRight className="w-4 h-4" />
                </button>
              </div>
            )}

            {/* No Results */}
            {!loading && decks.length === 0 && (
              <div className="text-center py-16 opacity-0 animate-[fade-in_0.6s_ease-out_0.9s_forwards]">
                <div className="inline-flex items-center justify-center w-16 h-16 bg-muted/30 border border-border rounded-full mb-4">
                  <Search className="w-8 h-8 text-muted-foreground" />
                </div>
                <h3 className="font-[family-name:var(--font-heading)] font-bold text-2xl text-foreground mb-2">
                  No decks found
                </h3>
                <p className="text-muted-foreground">
                  Try adjusting your filters
                </p>
              </div>
            )}
          </div>
        </section>
      </main>
    </div>
  );
}
