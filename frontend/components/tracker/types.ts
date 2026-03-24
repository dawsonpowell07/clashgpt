// Tracker feature TypeScript types

export interface TrackedPlayer {
  user_id: string;
  player_tag: string;
  player_name: string;
  tracked_since: string;
  is_active: boolean;
}

export interface TrackerStats {
  total_games: number;
  wins: number;
  losses: number;
  win_rate: number | null; // percentage e.g. 54.2
  avg_crowns: number | null;
  avg_elixir_leaked: number | null;
  last_seen: string | null;
}

export interface TrackerCard {
  card_id: number;
  name: string;
  variant: string | null;
  slot_index: number;
}

export interface TrackerDeck {
  deck_id: string;
  games: number;
  wins: number;
  losses: number;
  win_rate: number | null;
  avg_elixir: number | null;
  cards: TrackerCard[];
}

export interface TrackerBattle {
  battle_id: string | null;
  battle_time: string | null;
  game_mode: string | null;
  result: "Win" | "Loss";
  crowns: number | null;
  elixir_leaked: number | null;
  opponent: string | null;
  deck_id: string | null;
  player_cards: TrackerCard[];
  opponent_deck_id: string | null;
  opponent_cards: TrackerCard[];
  starting_trophies: number | null;
  trophy_change: number | null;
}

export interface TrackerBattlesResponse {
  player_tag: string;
  player_name: string;
  battles: TrackerBattle[];
  total: number;
  page: number;
  page_size: number;
  total_pages: number;
  has_next: boolean;
  has_previous: boolean;
}

export interface TrackerWorstMatchup {
  card_id: number;
  card_name: string;
  games: number;
  wins: number;
  losses: number;
  win_rate: number | null;
}

export interface TrackerWorstMatchupsResponse {
  player_tag: string;
  player_name: string;
  worst_matchups: TrackerWorstMatchup[];
}
