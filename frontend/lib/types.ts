export interface Card {
  card_id: number;
  name: string;
  elixir_cost: number;
  rarity: string;
  icon_urls: {
    medium: string;
    evolutionMedium?: string;
  };
}

export interface CardList {
  cards: Card[];
}

export interface DeckCard {
  card_id: string; // The ID in the deck string, might be "id" or "id_variant"
  card_name: string;
  evolution_level: number;
  variant: string;
}

export interface Deck {
  deck_id: string;
  cards: DeckCard[];
  avg_elixir: number;
  games_played?: number;
  wins?: number;
  losses?: number;
  win_rate?: number | null;
  last_seen?: string | null;
}

export interface DecksResponse {
  decks: Deck[];
  total: number;
  page: number;
  page_size: number;
  total_pages: number;
  has_next: boolean;
  has_previous: boolean;
}
