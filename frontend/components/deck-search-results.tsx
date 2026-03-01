"use client";

import { useState } from "react";
import { cn } from "@/lib/utils";
import { ChevronDown, ChevronUp, LayoutGrid } from "lucide-react";
import { DeckGrid } from "./deck-grid";

interface DeckCard {
  card_id: number;
  card_name: string;
  slot_index: number | null;
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
              {results.decks.length} deck{results.decks.length !== 1 ? "s" : ""}{" "}
              found
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2 text-muted-foreground">
          {isOpen ? (
            <ChevronUp className="w-5 h-5" />
          ) : (
            <ChevronDown className="w-5 h-5" />
          )}
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

function getKeyCards(cards: DeckCard[], avgElixir: number): string {
  const keyCardNames = [
    "giant", "royal giant", "golem", "goblin giant", "hog rider",
    "goblin drill", "goblin barrel", "mortar", "monk", "three musketeers",
    "royal hogs", "sparky", "graveyard", "p.e.k.k.a", "elixir golem",
    "balloon", "x-bow", "rocket", "ram rider", "boss bandit", "mega knight",
    "lava hound", "miner", "electro giant", "battle ram",
  ];

  const foundKeyCards = cards
    .filter((card) => keyCardNames.includes(card.card_name.toLowerCase()))
    .slice(0, 2);

  let deckName = "Deck";
  if (foundKeyCards.length > 0) {
    deckName = foundKeyCards.map((card) => card.card_name).join(" ");
  }
  if (avgElixir < 3.0) deckName += " Cycle";

  return deckName;
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

  const wrColor =
    winRate === null
      ? "text-muted-foreground"
      : parseFloat(winRate) >= 55
      ? "text-green-400"
      : parseFloat(winRate) >= 50
      ? "text-yellow-400"
      : "text-red-400";

  return (
    <div className="bg-card border border-border rounded-xl overflow-hidden shadow-sm hover:shadow-md hover:border-border/80 transition-all flex flex-col gap-0">
      {/* Header row */}
      <div className="flex items-center justify-between gap-3 px-3 pt-3 pb-2">
        <span
          className="text-sm font-semibold text-foreground truncate"
          title={deckName}
        >
          {deckName}
        </span>
        <div className="flex items-center gap-2 shrink-0">
          {winRate && hasStats && (
            <span className={cn("text-sm font-bold tabular-nums", wrColor)}>
              {winRate}%
            </span>
          )}
          <span className="text-xs text-muted-foreground bg-muted/40 px-2 py-0.5 rounded-full">
            {deck.avg_elixir.toFixed(1)}
            <span className="text-[10px] ml-0.5">avg</span>
          </span>
        </div>
      </div>

      {/* Card grid */}
      <DeckGrid
        cards={deck.cards.map((c) => ({
          cardName: c.card_name,
          variant: c.variant as "normal" | "evolution" | "heroic",
        }))}
        className="px-3 pb-2"
      />

      {/* Footer stats */}
      {hasStats && (
        <div className="flex items-center gap-3 px-3 py-1.5 border-t border-border bg-muted/20 text-[11px] text-muted-foreground">
          <span>{deck.games_played?.toLocaleString()} games</span>
          {deck.wins !== undefined && (
            <>
              <span className="text-green-400/80">
                {deck.wins.toLocaleString()}W
              </span>
              <span className="text-red-400/80">
                {deck.losses?.toLocaleString()}L
              </span>
            </>
          )}
        </div>
      )}
    </div>
  );
}
