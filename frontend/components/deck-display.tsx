import * as React from "react"
import { Deck } from "@/types/deck"
import { DeckCard } from "./deck-card"
import { cn } from "@/lib/utils"

interface DeckDisplayProps {
  deck: Deck
  className?: string
  showStats?: boolean
}

export function DeckDisplay({ deck, className, showStats = true }: DeckDisplayProps) {
  // Calculate average elixir if not provided
  const averageElixir = React.useMemo(() => {
    if (deck.averageElixir !== undefined) return deck.averageElixir
    const total = deck.cards.reduce((sum, card) => sum + card.elixir, 0)
    return parseFloat((total / deck.cards.length).toFixed(1))
  }, [deck.cards, deck.averageElixir])

  // Split cards into two rows of 4
  const firstRow = deck.cards.slice(0, 4)
  const secondRow = deck.cards.slice(4, 8)

  return (
    <div className={cn("w-full max-w-2xl", className)}>
      {/* Stats header */}
      {showStats && (
        <div className="mb-4 flex items-center justify-between gap-4 rounded-lg border border-border bg-card p-4 shadow-sm">
          <div className="flex-1">
            <p className="text-xs text-muted-foreground uppercase tracking-wider mb-1">
              Archetype
            </p>
            <p className="text-sm font-semibold text-foreground">
              {deck.archetype || "Unknown"}
            </p>
          </div>

          <div className="h-8 w-px bg-border" />

          <div className="flex-1 text-center">
            <p className="text-xs text-muted-foreground uppercase tracking-wider mb-1">
              Avg Elixir
            </p>
            <p className="text-sm font-semibold text-foreground">
              {averageElixir}
            </p>
          </div>

          <div className="h-8 w-px bg-border" />

          <div className="flex-1 text-right">
            <p className="text-xs text-muted-foreground uppercase tracking-wider mb-1">
              Rating
            </p>
            <div className="flex items-center justify-end gap-1.5">
              <div className="flex gap-0.5">
                {deck.rating !== undefined && (
                  <>
                    {Array.from({ length: 10 }).map((_, i) => (
                      <div
                        key={i}
                        className={cn(
                          "w-1.5 h-4 rounded-sm transition-colors",
                          i < deck.rating!
                            ? "bg-primary"
                            : "bg-muted"
                        )}
                      />
                    ))}
                  </>
                )}
              </div>
              <span className="text-sm font-semibold text-foreground ml-1">
                {deck.rating !== undefined ? `${deck.rating}/10` : "N/A"}
              </span>
            </div>
          </div>
        </div>
      )}

      {/* Deck cards grid */}
      <div className="space-y-3">
        {/* First row - 4 cards */}
        <div className="grid grid-cols-4 gap-3">
          {firstRow.map((card) => (
            <DeckCard key={card.id} card={card} />
          ))}
        </div>

        {/* Second row - 4 cards */}
        <div className="grid grid-cols-4 gap-3">
          {secondRow.map((card) => (
            <DeckCard key={card.id} card={card} />
          ))}
        </div>
      </div>
    </div>
  )
}
