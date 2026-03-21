import Image from "next/image";
import { cn } from "@/lib/utils";

export interface CardIconProps {
  cardName: string;
  variant?: "normal" | "evolution" | "heroic";
  className?: string;
}

export function cardFileName(name: string): string {
  return (name || "unknown")
    .toLowerCase()
    .replace(/ /g, "_")
    .replace(/\./g, "");
}

export function CardIcon({
  cardName,
  variant = "normal",
  className,
}: CardIconProps) {
  const isEvo = variant === "evolution";
  const isHero = variant === "heroic";
  const fileName = cardFileName(cardName);
  const imageSuffix = isEvo ? "_evolution" : isHero ? "_hero" : "";

  return (
    <div
      className={cn(
        "relative aspect-[3/4] rounded-lg overflow-hidden border-2 bg-muted group hover:scale-[1.15] hover:z-20 hover:rotate-2 transition-all duration-300 shadow-md hover:shadow-lg",
        className,
      )}
      style={{
        borderColor: isEvo
          ? "rgb(168, 85, 247)"
          : isHero
            ? "rgb(234, 179, 8)"
            : "rgba(255, 255, 255, 0.1)",
      }}
      title={cardName}
    >
      <Image
        src={`/cards/${fileName}/${fileName}${imageSuffix}.png`}
        alt={cardName}
        fill
        className="object-contain p-0.5 relative z-10 group-hover:scale-105 transition-transform duration-300"
      />
      <div className="absolute inset-x-0 bottom-0 p-1.5 pt-4 opacity-0 group-hover:opacity-100 transition-opacity duration-200 z-20">
        <p className="text-white text-[10px] font-bold text-center truncate drop-shadow-[0_2px_4px_rgba(0,0,0,0.8)]">
          {cardName}
        </p>
      </div>
    </div>
  );
}
