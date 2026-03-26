import { cn } from "@/lib/utils";
import { CardIcon } from "./card-icon";

interface DeckGridProps {
  cards: Array<{
    cardName: string;
    variant?: "normal" | "evolution" | "heroic";
  }>;
  className?: string;
}

function sortCards(
  cards: Array<{
    cardName: string;
    variant?: "normal" | "evolution" | "heroic";
  }>,
) {
  const evoCards = cards.filter((c) => c.variant === "evolution");
  const heroCards = cards.filter((c) => c.variant === "heroic");
  const normalCards = cards.filter((c) => !c.variant || c.variant === "normal");

  const sorted: typeof cards = [];

  // Slot 0: 1 fixed evolution slot
  if (evoCards.length >= 1) sorted.push(evoCards[0]);
  else sorted.push(...normalCards.splice(0, 1));

  // Slot 1: 1 fixed hero slot
  if (heroCards.length >= 1) sorted.push(heroCards[0]);
  else sorted.push(...normalCards.splice(0, 1));

  // Slot 2: wildcard — whatever the deck data shows (extra evo or extra hero)
  const wildcard = [...evoCards.slice(1), ...heroCards.slice(1)];
  if (wildcard.length >= 1) sorted.push(wildcard[0]);

  // Slots 3-7: Remaining normals
  sorted.push(...normalCards);

  return sorted;
}

export function DeckGrid({ cards, className }: DeckGridProps) {
  const sorted = sortCards([...cards]).slice(0, 8);

  return (
    <div className={cn("grid grid-cols-4 gap-1.5", className)}>
      {sorted.map((card, i) => (
        <CardIcon key={i} cardName={card.cardName} variant={card.variant} className="w-full" />
      ))}
    </div>
  );
}
