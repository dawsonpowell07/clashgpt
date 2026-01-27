import Image from "next/image";
import { Trophy, Swords, Target, Clock, Layers } from "lucide-react";
import { cn } from "@/lib/utils";
import { Orbitron } from "next/font/google";

const orbitron = Orbitron({
  subsets: ["latin"],
  weight: ["700", "900"],
});

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

interface DeckGridCardProps {
  deck: Deck;
  className?: string;
}

// Helper function to format timestamp to readable format
function formatLastSeen(timestamp: string): string {
  try {
    const year = parseInt(timestamp.substring(0, 4));
    const month = parseInt(timestamp.substring(4, 6)) - 1;
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

    if (diffMinutes < 1) return "Just now";
    if (diffMinutes < 60) return `${diffMinutes}m ago`;
    if (diffHours < 24) return `${diffHours}h ago`;
    if (diffDays < 7) return `${diffDays}d ago`;

    return date.toLocaleDateString("en-US", {
      month: "short",
      day: "numeric",
      year: date.getFullYear() !== now.getFullYear() ? "numeric" : undefined,
    });
  } catch (error) {
    return timestamp;
  }
}

// Helper function to extract key cards for deck naming
function getKeyCards(cards: DeckCard[], avgElixir: number): string {
  const keyCardNames = [
    "giant", "royal giant", "golem", "goblin giant", "hog rider",
    "goblin drill", "goblin barrel", "mortar", "monk", "three musketeers",
    "royal hogs", "sparky", "graveyard", "p.e.k.k.a", "elixir golem",
    "balloon", "x-bow", "rocket", "ram rider", "boss bandit", "mega knight",
    "lava hound", "miner",
  ];

  const foundKeyCards = cards
    .filter((card) => keyCardNames.includes(card.card_name.toLowerCase()))
    .slice(0, 2);

  let deckName = "Mixed Deck";

  if (foundKeyCards.length > 0) {
    deckName = foundKeyCards.map((card) => card.card_name).join(" ");
  }

  if (avgElixir < 3.0) {
    deckName += " Cycle";
  }

  return deckName;
}

function CardDisplay({ card }: { card: DeckCard }) {
  const hasEvolution = card.variant === "evolved";
  const isHero = card.variant === "hero";
  const cardFileName = (card.card_name || "unknown")
    .toLowerCase()
    .replace(/ /g, "_")
    .replace(/\./g, "");

  const imageSuffix = hasEvolution ? "_evolution" : isHero ? "_hero" : "";

  return (
    <div className="relative aspect-[3/4] rounded-lg overflow-hidden border-2 bg-muted group hover:scale-[1.15] hover:z-20 hover:rotate-2 transition-all duration-300 shadow-md hover:shadow-lg"
      style={{
        borderColor: hasEvolution ? 'rgb(168, 85, 247)' : isHero ? 'rgb(234, 179, 8)' : 'rgba(255, 255, 255, 0.1)',
      }}
    >
      <Image
        src={`/cards/${cardFileName}/${cardFileName}${imageSuffix}.png`}
        alt={card.card_name}
        fill
        className="object-contain p-0.5 relative z-10 group-hover:scale-105 transition-transform duration-300"
      />

      {/* Card name on hover without background */}
      <div className="absolute inset-x-0 bottom-0 p-1.5 pt-4 opacity-0 group-hover:opacity-100 transition-opacity duration-200 z-20">
        <p className="text-white text-[10px] font-bold text-center truncate drop-shadow-[0_2px_4px_rgba(0,0,0,0.8)]">
          {card.card_name}
        </p>
      </div>
    </div>
  );
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

export function DeckGridCard({ deck, className }: DeckGridCardProps) {
  const hasStats = deck.games_played !== undefined && deck.games_played !== null && deck.games_played >= 20;
  const winRate = deck.win_rate !== undefined && deck.win_rate !== null
    ? (deck.win_rate * 100).toFixed(1)
    : null;

  const deckName = getKeyCards(deck.cards, deck.avg_elixir);

  // Determine win rate tier for styling
  const winRateValue = winRate ? parseFloat(winRate) : 0;
  const winRateTier = winRateValue >= 55 ? "high" : winRateValue >= 50 ? "medium" : "low";

  // Sort cards by variant
  const sortedCards = sortCardsByVariant([...deck.cards]);

  return (
    <div className={cn(
      "group relative bg-card border border-border/50 rounded-2xl overflow-hidden shadow-md hover:shadow-lg transition-all duration-300 hover:-translate-y-1",
      className
    )}>
      {/* Header Section with fixed height */}
      <div className="relative px-5 py-4 bg-muted/20 border-b border-border/30 h-[64px] flex items-center">
        <div className="flex items-center justify-between gap-3 w-full">
          <div className="flex items-center gap-2 min-w-0 flex-1">
            <Layers className="w-4 h-4 text-primary shrink-0" />
            <h3 className="text-base font-bold text-foreground truncate">
              {deckName}
            </h3>
          </div>
          <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-pink-500/10 ring-1 ring-pink-500/20 shrink-0">
            <div className="w-2 h-2 rounded-full bg-pink-500 animate-pulse" />
            <span className="text-xs font-bold text-pink-500 dark:text-pink-400">
              {deck.avg_elixir.toFixed(1)}
            </span>
          </div>
        </div>
      </div>

      {/* Stats Bar - Always rendered for consistent height */}
      <div className="relative px-5 py-3 bg-muted/10 border-b border-border/20 h-[96px] flex items-center overflow-hidden">
        {hasStats && winRate ? (
          <div className="flex items-center justify-between gap-4 flex-wrap w-full">
            {/* Win Rate - Prominent */}
            <div className="flex items-center gap-2">
              <Trophy className={cn(
                "w-4 h-4",
                winRateTier === "high" ? "text-green-500" :
                winRateTier === "medium" ? "text-yellow-500" : "text-red-500"
              )} />
              <div className="flex items-baseline gap-1">
                <span className={cn(
                  orbitron.className,
                  "text-3xl font-black tracking-tight",
                  winRateTier === "high" ? "text-green-500 dark:text-green-400" :
                  winRateTier === "medium" ? "text-yellow-500 dark:text-yellow-400" :
                  "text-red-500 dark:text-red-400"
                )}>
                  {winRate}%
                </span>
                <span className="text-xs text-muted-foreground font-medium">Win Rate</span>
              </div>
            </div>

            {/* Stats Pills */}
            <div className="flex items-center gap-3 flex-wrap">
              {/* Games Played */}
              <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-cyan-500/10 border border-cyan-500/30">
                <Swords className="w-3 h-3 text-cyan-500" />
                <span className="text-xs font-semibold text-cyan-600 dark:text-cyan-400">{deck.games_played}</span>
              </div>

              {/* W/L Record */}
              {deck.wins !== undefined && deck.losses !== undefined && (
                <div className="flex items-center gap-1 px-2.5 py-1 rounded-full bg-muted/50 border border-border/30">
                  <Target className="w-3 h-3 text-muted-foreground" />
                  <span className="text-xs font-semibold text-green-600 dark:text-green-400">{deck.wins}</span>
                  <span className="text-xs text-muted-foreground">-</span>
                  <span className="text-xs font-semibold text-red-600 dark:text-red-400">{deck.losses}</span>
                </div>
              )}

              {/* Last Seen */}
              {deck.last_seen && (
                <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-purple-500/10 border border-purple-500/30">
                  <Clock className="w-3 h-3 text-purple-500" />
                  <span className="text-xs font-medium text-purple-600 dark:text-purple-400">
                    {formatLastSeen(deck.last_seen)}
                  </span>
                </div>
              )}
            </div>
          </div>
        ) : (
          <div className="flex items-center gap-2 w-full justify-center">
            <Target className="w-4 h-4 text-muted-foreground/50" />
            <span className="text-xs text-muted-foreground/70 font-medium">
              Insufficient data (min. 20 games required)
            </span>
          </div>
        )}
      </div>

      {/* Cards Grid - 2 rows of 4 with fixed height */}
      <div className="relative p-5 h-[240px] overflow-hidden">
        <div className="grid grid-cols-4 gap-2.5 h-[100px]">
          {/* First row: Evos (0-1) + Heroes (2-3) */}
          {sortedCards.slice(0, 4).map((card, index) => (
            <CardDisplay key={`${deck.deck_id}-${index}`} card={card} />
          ))}
        </div>
        <div className="grid grid-cols-4 gap-2.5 mt-2.5 h-[100px]">
          {/* Second row: Normals (4-7) */}
          {sortedCards.slice(4, 8).map((card, index) => (
            <CardDisplay key={`${deck.deck_id}-${index + 4}`} card={card} />
          ))}
        </div>
      </div>
    </div>
  );
}
