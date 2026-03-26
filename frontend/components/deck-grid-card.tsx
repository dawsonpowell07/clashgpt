import Link from "next/link";
import { Trophy, Swords, Target, Clock, Layers, ExternalLink } from "lucide-react";
import { cn } from "@/lib/utils";
import { Orbitron } from "next/font/google";
import { DeckGrid } from "./deck-grid";

const orbitron = Orbitron({
  subsets: ["latin"],
  weight: ["700", "900"],
});

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

interface DeckGridCardProps {
  deck: Deck;
  className?: string;
}

function formatLastSeen(timestamp: string): string {
  try {
    const isoString =
      timestamp.includes("+") || timestamp.endsWith("Z")
        ? timestamp
        : timestamp + "Z";
    const date = new Date(isoString);
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
  } catch {
    return timestamp;
  }
}

function generateDeckLink(cards: DeckCard[], deckName: string): string {
  const evoCards = cards.filter((c) => c.variant === "evolution");
  const heroCards = cards.filter((c) => c.variant === "heroic");
  const normalCards = cards.filter((c) => c.variant !== "evolution" && c.variant !== "heroic");

  const sorted: DeckCard[] = [];
  sorted.push(...evoCards.slice(0, 2));
  const evosNeeded = 2 - Math.min(evoCards.length, 2);
  if (evosNeeded > 0) sorted.push(...normalCards.splice(0, evosNeeded));
  sorted.push(...heroCards.slice(0, 2));
  const heroesNeeded = 2 - Math.min(heroCards.length, 2);
  if (heroesNeeded > 0) sorted.push(...normalCards.splice(0, heroesNeeded));
  sorted.push(...normalCards);
  if (evoCards.length > 2) sorted.push(...evoCards.slice(2));
  if (heroCards.length > 2) sorted.push(...heroCards.slice(2));

  const deckParam = sorted.slice(0, 8).map((c) => c.card_id).join(";");
  const label = encodeURIComponent(deckName);
  return `https://link.clashroyale.com/en/?clashroyale://copyDeck?deck=${deckParam}&l=${label}&tt=159000000`;
}

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
    "electro giant",
    "battle ram",
  ];

  const foundKeyCards = cards
    .filter((card) => keyCardNames.includes(card.card_name.toLowerCase()))
    .slice(0, 2);

  let deckName = "Mixed Deck";
  if (foundKeyCards.length > 0) {
    deckName = foundKeyCards.map((card) => card.card_name).join(" ");
  }
  if (avgElixir < 3.0) deckName += " Cycle";

  return deckName;
}

export function DeckGridCard({ deck, className }: DeckGridCardProps) {
  const hasStats =
    deck.games_played !== undefined &&
    deck.games_played !== null &&
    deck.games_played >= 20;
  const winRate =
    deck.win_rate !== undefined && deck.win_rate !== null
      ? (deck.win_rate * 100).toFixed(1)
      : null;

  const deckName = getKeyCards(deck.cards, deck.avg_elixir);
  const matchupsHref = `/matchups?deck=${deck.cards
    .map((c) => `${c.card_id}:${c.variant}`)
    .join(",")}`;

  const winRateValue = winRate ? parseFloat(winRate) : 0;
  const winRateTier =
    winRateValue >= 55 ? "high" : winRateValue >= 50 ? "medium" : "low";

  const deckLink = generateDeckLink([...deck.cards], deckName);

  return (
    <div
      className={cn(
        "group relative bg-card border border-border/50 rounded-2xl overflow-hidden shadow-md hover:shadow-lg transition-all duration-300 hover:-translate-y-1 flex flex-col",
        className,
      )}
    >
      {/* Header */}
      <div className="relative px-4 sm:px-5 py-3 sm:py-4 bg-muted/20 border-b border-border/30 flex items-center min-h-[52px]">
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

      {/* Stats Bar */}
      <div className="relative px-4 sm:px-5 py-3 bg-muted/10 border-b border-border/20 min-h-[72px] flex items-center overflow-hidden">
        {hasStats && winRate ? (
          <div className="flex items-center justify-between gap-4 flex-wrap w-full">
            <div className="flex items-center gap-2">
              <Trophy
                className={cn(
                  "w-4 h-4",
                  winRateTier === "high"
                    ? "text-green-500"
                    : winRateTier === "medium"
                      ? "text-yellow-500"
                      : "text-red-500",
                )}
              />
              <div className="flex items-baseline gap-1">
                <span
                  className={cn(
                    orbitron.className,
                    "text-3xl font-black tracking-tight",
                    winRateTier === "high"
                      ? "text-green-500 dark:text-green-400"
                      : winRateTier === "medium"
                        ? "text-yellow-500 dark:text-yellow-400"
                        : "text-red-500 dark:text-red-400",
                  )}
                >
                  {winRate}%
                </span>
                <span className="text-xs text-muted-foreground font-medium">
                  Win Rate
                </span>
              </div>
            </div>

            <div className="flex items-center gap-3 flex-wrap">
              <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-cyan-500/10 border border-cyan-500/30">
                <Swords className="w-3 h-3 text-cyan-500" />
                <span className="text-xs font-semibold text-cyan-600 dark:text-cyan-400">
                  {deck.games_played}
                </span>
              </div>

              {deck.wins !== undefined && deck.losses !== undefined && (
                <div className="flex items-center gap-1 px-2.5 py-1 rounded-full bg-muted/50 border border-border/30">
                  <Target className="w-3 h-3 text-muted-foreground" />
                  <span className="text-xs font-semibold text-green-600 dark:text-green-400">
                    {deck.wins}
                  </span>
                  <span className="text-xs text-muted-foreground">-</span>
                  <span className="text-xs font-semibold text-red-600 dark:text-red-400">
                    {deck.losses}
                  </span>
                </div>
              )}

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

      {/* Cards Grid */}
      <div className="p-3 sm:p-4">
        <DeckGrid
          cards={deck.cards.map((c) => ({
            cardName: c.card_name,
            variant: c.variant as "normal" | "evolution" | "heroic",
          }))}
          className="gap-1.5 sm:gap-2"
        />
      </div>

      {/* Actions */}
      <div className="px-3 sm:px-5 pb-3 sm:pb-4 mt-auto flex gap-2">
        <Link
          href={matchupsHref}
          className="flex items-center justify-center gap-2 flex-1 py-2 rounded-xl text-xs font-semibold bg-primary/10 hover:bg-primary/20 text-primary border border-primary/20 hover:border-primary/40 transition-all"
        >
          <Swords className="w-3.5 h-3.5" />
          Matchups
        </Link>
        <a
          href={deckLink}
          target="_blank"
          rel="noopener noreferrer"
          className="flex items-center justify-center gap-1.5 px-3 py-2 rounded-xl text-xs font-semibold border bg-muted/30 hover:bg-muted/60 text-muted-foreground border-border/30 hover:border-border/60 transition-all"
          title="Open deck in Clash Royale"
        >
          <ExternalLink className="w-3.5 h-3.5" />
          Open
        </a>
      </div>
    </div>
  );
}
