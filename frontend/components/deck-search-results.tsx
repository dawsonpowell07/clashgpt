import Image from "next/image";
import { cn } from "@/lib/utils";

interface DeckCard {
  card_id: string;
  card_name: string;
  card_variant: string;
  elixir_cost?: number;
}

interface Deck {
  id: string;
  deck_hash: string;
  cards: DeckCard[];
  avg_elixir: number;
  archetype: string;
  ftp_tier: string;
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
          <DeckCardComponent key={deck.id} deck={deck} />
        ))}
      </div>
    </div>
  );
}

interface DeckCardComponentProps {
  deck: Deck;
}

function DeckCardComponent({ deck }: DeckCardComponentProps) {
  return (
    <div className="bg-card border border-border rounded-xl overflow-hidden shadow-sm hover:shadow-md transition-all">
      {/* Header */}
      <div className="px-4 py-3 bg-muted/30 border-b border-border">
        <div className="flex items-center justify-between flex-wrap gap-2">
          <div className="flex items-center gap-2">
            <ArchetypeBadge archetype={deck.archetype} />
          </div>
          <div className="text-sm text-muted-foreground">
            Avg Elixir:{" "}
            <span className="font-semibold text-foreground">
              {deck.avg_elixir.toFixed(1)}
            </span>
          </div>
        </div>
      </div>

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
  const hasEvolution = card.card_variant === "EVOLUTION";
  const isHero = card.card_variant === "HERO";
  const cardFileName = card.card_name.toLowerCase().replace(/ /g, "_");

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

      {/* Elixir cost */}
      {card.elixir_cost !== undefined && (
        <div className="absolute top-1 right-1 w-5 h-5 flex items-center justify-center rounded-full bg-primary/90 text-primary-foreground text-[10px] font-bold shadow-md">
          {card.elixir_cost}
        </div>
      )}

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

interface ArchetypeBadgeProps {
  archetype: string;
}

function ArchetypeBadge({ archetype }: ArchetypeBadgeProps) {
  const archetypeColors: Record<string, string> = {
    CYCLE: "bg-blue-500/20 text-blue-400 border-blue-500/30",
    BEATDOWN: "bg-red-500/20 text-red-400 border-red-500/30",
    BRIDGESPAM: "bg-orange-500/20 text-orange-400 border-orange-500/30",
    CONTROL: "bg-purple-500/20 text-purple-400 border-purple-500/30",
    BAIT: "bg-green-500/20 text-green-400 border-green-500/30",
    SIEGE: "bg-yellow-500/20 text-yellow-400 border-yellow-500/30",
    MIDLADDERMENACE: "bg-pink-500/20 text-pink-400 border-pink-500/30",
  };

  const archetypeLabels: Record<string, string> = {
    CYCLE: "Cycle",
    BEATDOWN: "Beatdown",
    BRIDGESPAM: "Bridge Spam",
    CONTROL: "Control",
    BAIT: "Bait",
    SIEGE: "Siege",
    MIDLADDERMENACE: "Midladder",
  };

  return (
    <span
      className={cn(
        "px-2.5 py-1 rounded-full text-xs font-semibold border",
        archetypeColors[archetype] ||
          "bg-muted/50 text-foreground border-border"
      )}
    >
      {archetypeLabels[archetype] || archetype}
    </span>
  );
}
