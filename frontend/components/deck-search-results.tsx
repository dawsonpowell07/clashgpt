"use client";

import { useState } from "react";
import Image from "next/image";
import { cn } from "@/lib/utils";
import { ChevronDown, ChevronUp, LayoutGrid } from "lucide-react";

interface DeckCard {
  card_id: string;
  card_name: string;
  evolution_level: number;
  variant: string;
}

interface Deck {
  deck_id: string;
  cards: DeckCard[];
  avg_elixir: number;
  games_played?: number;
  wins?: number;
  losses?: number;
  win_rate?: number | null;
  last_seen?: string | null;
}

interface DeckSearchResultsData {
  decks: Deck[];
}

interface DeckSearchResultsProps {
  results: DeckSearchResultsData;
  className?: string;
}

export function DeckSearchResults({
  results,
  className,
}: DeckSearchResultsProps) {
  const [isOpen, setIsOpen] = useState(true);

  return (
    <div className={cn("space-y-4", className)}>
      <div 
        className={cn(
          "flex items-center justify-between bg-card border border-border p-4 rounded-xl cursor-pointer hover:bg-accent/50 transition-colors",
          isOpen ? "rounded-b-none border-b-0" : "rounded-xl"
        )}
        onClick={() => setIsOpen(!isOpen)}
      >
        <div className="flex items-center gap-4">
          <div className="p-3 bg-primary/10 rounded-lg">
            <LayoutGrid className="w-6 h-6 text-primary" />
          </div>
          <div>
            <h2 className="text-lg font-bold text-foreground">Deck Results</h2>
            <p className="text-xs text-muted-foreground">
              {results.decks.length} deck{results.decks.length !== 1 ? "s" : ""} found
            </p>
          </div>
        </div>
        
        <div className="flex items-center gap-2 text-muted-foreground">
          {isOpen ? <ChevronUp className="w-5 h-5" /> : <ChevronDown className="w-5 h-5" />}
        </div>
      </div>

      {isOpen && (
        <div className="bg-card border border-t-0 border-border rounded-b-xl p-4 mt-0 animate-in slide-in-from-top-2 duration-200">
           <div className="grid grid-cols-1 md:grid-cols-2 gap-4 max-h-[600px] overflow-y-auto pr-2">
            {results.decks.map((deck) => (
              <DeckCardComponent key={deck.deck_id} deck={deck} />
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

interface DeckCardComponentProps {
  deck: Deck;
}

// Helper function to format timestamp to readable format
function formatLastSeen(timestamp: string): string {
  try {
    // Parse format: 20260112T173423.000Z
    const year = parseInt(timestamp.substring(0, 4));
    const month = parseInt(timestamp.substring(4, 6)) - 1; // 0-indexed
    const day = parseInt(timestamp.substring(6, 8));
    const hour = parseInt(timestamp.substring(9, 11));
    const minute = parseInt(timestamp.substring(11, 13));
    const second = parseInt(timestamp.substring(13, 15));

    const date = new Date(Date.UTC(year, month, day, hour, minute, second));
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));
    const diffHours = Math.floor(diffMs / (1000 * 60 * 60));
    const diffMinutes = Math.floor(diffMs / (1000 * 60));

    // Return relative time for recent dates
    if (diffMinutes < 1) {
      return "Just now";
    } else if (diffMinutes < 60) {
      return `${diffMinutes}m ago`;
    } else if (diffHours < 24) {
      return `${diffHours}h ago`;
    } else if (diffDays < 7) {
      return `${diffDays}d ago`;
    } else {
      // Return formatted date for older entries
      return date.toLocaleDateString("en-US", {
        month: "short",
        day: "numeric",
        year: date.getFullYear() !== now.getFullYear() ? "numeric" : undefined,
      });
    }
  } catch (error) {
    return timestamp; // Fallback to original if parsing fails
  }
}

// Helper function to extract key cards for deck naming
function getKeyCards(cards: DeckCard[], avgElixir: number): string {
  const keyCardNames = [
    "giant",
    "royal giant",
    "golem",
    "goblin giant",
    "hog rider",
    "goblin drill",
    "goblin barrel",
    "mortar",
    "monk",
    "three musketeers",
    "royal hogs",
    "sparky",
    "graveyard",
    "p.e.k.k.a",
    "elixir golem",
    "balloon",
    "x-bow",
    "rocket",
    "ram rider",
    "boss bandit",
    "mega knight",
    "lava hound",
    "miner",
  ];

  const foundKeyCards = cards
    .filter((card) => keyCardNames.includes(card.card_name.toLowerCase()))
    .slice(0, 2); // Take up to 2 key cards

  let deckName = "Deck";

  if (foundKeyCards.length > 0) {
    deckName = foundKeyCards.map((card) => card.card_name).join(" ");
  }

  // Add "Cycle" suffix if avg elixir is under 3.0
  if (avgElixir < 3.0) {
    deckName += " Cycle";
  }

  return deckName;
}

// Sort cards by variant: evo cards first, then hero cards, then normal cards
function sortCardsByVariant(cards: DeckCard[]): DeckCard[] {
  // Separate cards by variant
  const evoCards = cards.filter(card => card.variant === "evolved");
  const heroCards = cards.filter(card => card.variant === "hero");
  const normalCards = cards.filter(card => card.variant === "normal");

  const sortedCards: DeckCard[] = [];

  // First row positions 0-1: Evolution cards (up to 2)
  sortedCards.push(...evoCards.slice(0, 2));

  // Fill remaining first row evo slots with normals if needed
  const evosNeeded = 2 - Math.min(evoCards.length, 2);
  if (evosNeeded > 0) {
    sortedCards.push(...normalCards.splice(0, evosNeeded));
  }

  // First row positions 2-3: Hero cards (up to 2)
  sortedCards.push(...heroCards.slice(0, 2));

  // Fill remaining first row hero slots with normals if needed
  const heroesNeeded = 2 - Math.min(heroCards.length, 2);
  if (heroesNeeded > 0) {
    sortedCards.push(...normalCards.splice(0, heroesNeeded));
  }

  // Second row positions 4-7: Remaining normal cards
  sortedCards.push(...normalCards);

  // Add any extra evos/heroes that didn't fit in first row to second row
  if (evoCards.length > 2) {
    sortedCards.push(...evoCards.slice(2));
  }
  if (heroCards.length > 2) {
    sortedCards.push(...heroCards.slice(2));
  }

  return sortedCards;
}

function DeckCardComponent({ deck }: DeckCardComponentProps) {
  const hasStats =
    deck.games_played !== undefined &&
    deck.games_played !== null &&
    deck.games_played >= 20;
  const winRate =
    deck.win_rate !== undefined && deck.win_rate !== null
      ? (deck.win_rate * 100).toFixed(1)
      : null;

  const deckName = getKeyCards(deck.cards, deck.avg_elixir);
  const sortedCards = sortCardsByVariant([...deck.cards]);

  return (
    <div className="bg-card border border-border rounded-xl overflow-hidden shadow-sm hover:shadow-md transition-all h-full flex flex-col">
      {/* Header */}
      <div className="px-3 py-2 bg-muted/30 border-b border-border">
        <div className="flex items-center justify-between gap-2">
          <div className="text-sm font-semibold text-foreground truncate" title={deckName}>
            {deckName}
          </div>
          <div className="text-xs text-muted-foreground whitespace-nowrap">
            {deck.avg_elixir.toFixed(1)} Avg
          </div>
        </div>
      </div>

      {/* Stats Section (if available) */}
      {hasStats && (
        <div className="px-3 py-2 bg-muted/10 border-b border-border">
          <div className="flex items-center justify-between text-xs">
            {/* Win Rate - Most prominent */}
            {winRate && (
              <div className="flex items-center gap-1.5">
                <span className="font-medium text-muted-foreground">WR:</span>
                <span
                  className={cn(
                    "font-bold",
                    parseFloat(winRate) >= 55
                      ? "text-green-500"
                      : parseFloat(winRate) >= 50
                      ? "text-yellow-500"
                      : "text-red-500"
                  )}
                >
                  {winRate}%
                </span>
              </div>
            )}

            {/* Games Played */}
            <div className="flex items-center gap-1">
              <span className="text-muted-foreground">Games:</span>
              <span className="font-semibold text-foreground">
                {deck.games_played}
              </span>
            </div>
          </div>
        </div>
      )}

      {/* Deck Cards - using user specified layout */}
      <div className="p-3">
        <div className="grid grid-cols-4 gap-1.5">
          {/* First row: Evos (0-1) + Heroes (2-3) */}
          {sortedCards.slice(0, 4).map((card, index) => (
            <CardDisplay key={`${deck.deck_id}-${index}`} card={card} />
          ))}
        </div>
        <div className="grid grid-cols-4 gap-1.5 mt-1.5">
          {/* Second row: Normals (4-7) */}
          {sortedCards.slice(4, 8).map((card, index) => (
            <CardDisplay key={`${deck.deck_id}-${index + 4}`} card={card} />
          ))}
        </div>
      </div>
    </div>
  );
}

interface CardDisplayProps {
  card: DeckCard;
}

function CardDisplay({ card }: CardDisplayProps) {
  const hasEvolution = card.variant === "evolved";
  const isHero = card.variant === "hero";
  const cardFileName = (card.card_name || "unknown")
    .toLowerCase()
    .replace(/ /g, "_")
    .replace(/\./g, "");

  // Determine the image suffix based on variant
  const imageSuffix = hasEvolution ? "_evolution" : isHero ? "_hero" : "";
  
  // Custom border colors for variants to match deck-grid-card style
  const borderColor = hasEvolution ? 'border-purple-500/50' : isHero ? 'border-yellow-500/50' : 'border-border';

  return (
    <div 
      className={cn(
        "relative aspect-3/4 rounded overflow-hidden border bg-muted group hover:scale-105 transition-transform",
        borderColor
      )}
    >
      <Image
        src={`/cards/${cardFileName}/${cardFileName}${imageSuffix}.png`}
        alt={card.card_name}
        fill
        className="object-contain"
      />

      {/* Variant badge */}
      {hasEvolution && (
        <div className="absolute top-0.5 left-0.5 px-1 py-px rounded bg-purple-500/90 text-white text-[6px] font-bold uppercase leading-none z-10">
          Evo
        </div>
      )}
      {isHero && (
        <div className="absolute top-0.5 left-0.5 px-1 py-px rounded bg-yellow-500/90 text-white text-[6px] font-bold uppercase leading-none z-10">
          Hero
        </div>
      )}

      {/* Card name tooltip on hover */}
      <div className="absolute inset-x-0 bottom-0 bg-linear-to-t from-black/90 via-black/60 to-transparent p-1 opacity-0 group-hover:opacity-100 transition-opacity">
        <p className="text-white text-[8px] font-medium text-center truncate leading-tight">
          {card.card_name}
        </p>
      </div>
    </div>
  );
}
