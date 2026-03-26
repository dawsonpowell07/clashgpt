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

  // Slot 0: evolution, or base card if player has none
  if (evoCards.length >= 1) sorted.push(evoCards[0]);
  else sorted.push(...normalCards.splice(0, 1));

  // Slot 1: hero/champion, or base card if player has none
  if (heroCards.length >= 1) sorted.push(heroCards[0]);
  else sorted.push(...normalCards.splice(0, 1));

  // Slot 2: wildcard (extra evo or extra hero), or base card if none
  const remainingSpecial = [...evoCards.slice(1), ...heroCards.slice(1)];
  if (remainingSpecial.length >= 1) sorted.push(remainingSpecial.shift()!);

  // Remaining slots: any overflow special cards (3+ evos/heroes) then normals
  sorted.push(...remainingSpecial, ...normalCards);

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
