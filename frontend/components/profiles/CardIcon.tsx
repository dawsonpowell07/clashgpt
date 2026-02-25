import Image from "next/image";
import { cn } from "@/lib/utils";
import { DeckCard } from "./types";
import { cardImagePath } from "./utils";

export function CardIcon({ card }: { card: DeckCard }) {
  const isEvo = card.variant === "evolution";
  const isHero = card.variant === "heroic";

  return (
    <div
      className="relative aspect-[3/4] rounded-md overflow-hidden border bg-muted group hover:scale-110 hover:z-20 transition-all duration-200 shadow-sm hover:shadow-lg"
      style={{
        borderColor: isEvo
          ? "rgba(168, 85, 247, 0.7)"
          : isHero
          ? "rgba(234, 179, 8, 0.7)"
          : "rgba(255,255,255,0.08)",
      }}
    >
      <Image
        src={cardImagePath(card.name, card.variant)}
        alt={card.name}
        fill
        className="object-contain p-0.5"
        sizes="96px"
      />
      <div className="absolute inset-x-0 bottom-0 opacity-0 group-hover:opacity-100 transition-opacity duration-150 z-10 pointer-events-none">
        <p className="text-white text-[9px] font-bold text-center truncate px-0.5 pb-0.5 drop-shadow-[0_1px_3px_rgba(0,0,0,0.95)]">
          {card.name}
        </p>
      </div>
      {(isEvo || isHero) && (
        <div
          className={cn(
            "absolute top-0.5 right-0.5 text-[7px] font-black px-1 py-0.5 rounded-sm leading-none tracking-wider",
            isEvo ? "bg-purple-600 text-white" : "bg-yellow-400 text-black"
          )}
        >
          {isEvo ? "EVO" : "HERO"}
        </div>
      )}
    </div>
  );
}
