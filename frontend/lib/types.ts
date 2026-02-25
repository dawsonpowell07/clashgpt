export interface Card {
  card_id: number;
  name: string;
  elixir_cost: number | null;
  rarity: string | null;
  icon_urls: {
    medium: string;
    evolutionMedium?: string;
  } | null;
  card_type: string | null;
  can_evolve: boolean;
  can_be_heroic: boolean;
}

export interface CardList {
  cards: Card[];
}

export interface DeckCard {
  card_id: number;
  card_name: string;
  slot_index: number | null;
  variant: string; // 'normal', 'evolution', or 'heroic'
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
