import { DeckDisplay } from "@/components/deck-display"
import { Deck } from "@/types/deck"

export default function ExampleDeckPage() {
  const exampleDeck: Deck = {
    id: "1",
    cards: [
      { id: "1", name: "Archers", elixir: 3 },
      { id: "2", name: "Baby Dragon", elixir: 4 },
      { id: "3", name: "Arrows", elixir: 3 },
      { id: "4", name: "Barbarians", elixir: 5 },
      { id: "5", name: "Balloon", elixir: 5 },
      { id: "6", name: "Bandit", elixir: 3 },
      { id: "7", name: "Bats", elixir: 2 },
      { id: "8", name: "Battle Ram", elixir: 4 },
    ],
    archetype: "Beatdown",
    rating: 8.5,
  }

  return (
    <div className="min-h-screen p-8 bg-background">
      <div className="max-w-4xl mx-auto">
        <h1 className="text-3xl font-bold mb-8">Deck Example</h1>
        <DeckDisplay deck={exampleDeck} />
      </div>
    </div>
  )
}
