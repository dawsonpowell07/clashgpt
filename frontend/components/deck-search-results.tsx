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

  return (
    <div className="bg-card border border-border rounded-xl overflow-hidden shadow-sm hover:shadow-md transition-all">
      {/* Header */}
      <div className="px-4 py-3 bg-muted/30 border-b border-border">
        <div className="flex items-center justify-between flex-wrap gap-2">
          <div className="text-sm font-semibold text-foreground">
            {deckName}
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
                <span className="text-xs text-muted-foreground">
                  Last Seen:
                </span>
                <span className="text-sm font-semibold text-foreground">
                  {formatLastSeen(deck.last_seen)}
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
