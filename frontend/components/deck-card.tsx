import * as React from "react"
import Image from "next/image"
import { Card } from "@/types/deck"
import { cn } from "@/lib/utils"

interface DeckCardProps {
  card: Card
  className?: string
}

export function DeckCard({ card, className }: DeckCardProps) {
  const imagePath = card.image || `/cards/${card.name.toLowerCase().replace(/ /g, '_')}/${card.name.toLowerCase().replace(/ /g, '_')}${card.evolution ? '_evolution' : ''}.png`

  return (
    <div
      className={cn(
        "group relative aspect-[3/4] rounded-lg overflow-hidden border border-border bg-card shadow-sm transition-all hover:shadow-md hover:scale-105",
        className
      )}
    >
      <Image
        src={imagePath}
        alt={card.name}
        fill
        className="object-cover"
        sizes="(max-width: 768px) 20vw, 10vw"
      />

      {/* Elixir cost badge */}
      <div className="absolute top-2 right-2 size-8 flex items-center justify-center rounded-full bg-primary/90 backdrop-blur-sm text-primary-foreground text-sm font-bold shadow-md">
        {card.elixir}
      </div>

      {/* Card name on hover */}
      <div className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-black/80 via-black/50 to-transparent p-2 opacity-0 group-hover:opacity-100 transition-opacity">
        <p className="text-white text-xs font-medium text-center truncate">
          {card.name}
        </p>
      </div>
    </div>
  )
}
