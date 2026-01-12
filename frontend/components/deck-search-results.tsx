import Image from "next/image";
import { cn } from "@/lib/utils";

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
  return (
    <div className={cn("space-y-4", className)}>
      <div className="flex items-center justify-between">
        <h2 className="text-xl font-bold text-foreground">Deck Results</h2>
        <span className="text-sm text-muted-foreground">
          {results.decks.length} deck{results.decks.length !== 1 ? "s" : ""}{" "}
          found
        </span>
      </div>

      <div className="grid gap-4">
        {results.decks.map((deck) => (
          <DeckCardComponent key={deck.deck_id} deck={deck} />
        ))}
      </div>
    </div>
  );
}

interface DeckCardComponentProps {
  deck: Deck;
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

  return (
    <div className="bg-card border border-border rounded-xl overflow-hidden shadow-sm hover:shadow-md transition-all">
      {/* Header */}
      <div className="px-4 py-3 bg-muted/30 border-b border-border">
        <div className="flex items-center justify-between flex-wrap gap-2">
          <div className="text-xs text-muted-foreground">Deck ID</div>
          <div className="text-xs text-muted-foreground truncate max-w-[60%]">
            {deck.deck_id}
          </div>
          <div className="text-sm text-muted-foreground">
            Avg Elixir:{" "}
            <span className="font-semibold text-foreground">
              {deck.avg_elixir.toFixed(1)}
            </span>
          </div>
        </div>
      </div>

      {/* Stats Section (if available) */}
      {hasStats && (
        <div className="px-4 py-3 bg-muted/10 border-b border-border">
          <div className="flex items-center justify-between flex-wrap gap-4">
            {/* Win Rate - Most prominent */}
            {winRate && (
              <div className="flex items-center gap-2">
                <span className="text-xs font-medium text-muted-foreground uppercase">
                  Win Rate
                </span>
                <span
                  className={cn(
                    "text-lg font-bold",
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
            <div className="flex items-center gap-1.5">
              <span className="text-xs text-muted-foreground">Games:</span>
              <span className="text-sm font-semibold text-foreground">
                {deck.games_played}
              </span>
            </div>

            {/* W/L Record */}
            {deck.wins !== undefined && deck.losses !== undefined && (
              <div className="flex items-center gap-1.5">
                <span className="text-xs text-muted-foreground">Record:</span>
                <span className="text-sm font-semibold text-green-500">
                  {deck.wins}
                </span>
                <span className="text-xs text-muted-foreground">-</span>
                <span className="text-sm font-semibold text-red-500">
                  {deck.losses}
                </span>
              </div>
            )}

            {deck.last_seen && (
              <div className="flex items-center gap-1.5">
                <span className="text-xs text-muted-foreground">Last Seen:</span>
                <span className="text-sm font-semibold text-foreground">
                  {deck.last_seen}
                </span>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Deck Cards */}
      <div className="p-4">
        <div className="grid grid-cols-4 sm:grid-cols-8 gap-2">
          {deck.cards.map((card, index) => (
            <CardDisplay key={index} card={card} />
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

  return (
    <div className="relative aspect-3/4 rounded-lg overflow-hidden border border-border bg-muted group hover:scale-105 transition-transform">
      <Image
        src={`/cards/${cardFileName}/${cardFileName}${imageSuffix}.png`}
        alt={card.card_name}
        fill
        className="object-contain"
      />

      {/* Variant badge */}
      {hasEvolution && (
        <div className="absolute top-1 left-1 px-1.5 py-0.5 rounded bg-purple-500/90 text-white text-[8px] font-bold uppercase">
          Evo
        </div>
      )}
      {isHero && (
        <div className="absolute top-1 left-1 px-1.5 py-0.5 rounded bg-yellow-500/90 text-white text-[8px] font-bold uppercase">
          Hero
        </div>
      )}

      {/* Card name tooltip on hover */}
      <div className="absolute inset-x-0 bottom-0 bg-linear-to-t from-black/90 via-black/60 to-transparent p-1.5 opacity-0 group-hover:opacity-100 transition-opacity">
        <p className="text-white text-[10px] font-medium text-center truncate">
          {card.card_name}
        </p>
      </div>
    </div>
  );
}
