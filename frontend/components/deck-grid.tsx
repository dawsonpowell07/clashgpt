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

  // Slots 0-1: Evolution cards (up to 2)
  sorted.push(...evoCards.slice(0, 2));
  const evosNeeded = 2 - Math.min(evoCards.length, 2);
  if (evosNeeded > 0) sorted.push(...normalCards.splice(0, evosNeeded));

  // Slots 2-3: Hero cards (up to 2)
  sorted.push(...heroCards.slice(0, 2));
  const heroesNeeded = 2 - Math.min(heroCards.length, 2);
  if (heroesNeeded > 0) sorted.push(...normalCards.splice(0, heroesNeeded));

  // Slots 4-7: Remaining normals
  sorted.push(...normalCards);

  // Overflow evos/heroes
  if (evoCards.length > 2) sorted.push(...evoCards.slice(2));
  if (heroCards.length > 2) sorted.push(...heroCards.slice(2));

  return sorted;
}

export function DeckGrid({ cards, className }: DeckGridProps) {
  const sorted = sortCards([...cards]).slice(0, 8);

  return (
    <div className={cn("grid grid-cols-4 gap-1.5", className)}>
      {sorted.map((card, i) => (
        <CardIcon key={i} cardName={card.cardName} variant={card.variant} />
      ))}
    </div>
  );
}
