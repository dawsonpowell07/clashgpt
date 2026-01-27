export interface Card {
  id: string
  name: string
  elixir: number
  image?: string // Path to card image
  evolution?: boolean
}

export interface Deck {
  id?: string
  cards: Card[]
  archetype?: string
  rating?: number // 0-10 scale
  averageElixir?: number
}
