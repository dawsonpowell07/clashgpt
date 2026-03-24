// ─── Types ──────────────────────────────────────────────────────────────────

export interface PlayerSearchResult {
  player_tag: string;
  name: string;
  last_seen: string | null;
  total_games: number;
  wins: number;
  win_rate: number | null;
  avg_crowns: number | null;
  avg_elixir_leaked: number | null;
}

export interface DeckCard {
  name: string;
  variant: string;
}

export interface PlayerDeck {
  deck_id: string;
  games: number;
  wins: number;
  losses: number;
  win_rate: number | null;
  avg_elixir: number | null;
  cards: DeckCard[];
}

export interface Battle {
  battle_id: string | null;
  battle_time: string | null;
  game_mode: string | null;
  result: string;
  crowns: number | null;
  elixir_leaked: number | null;
  opponent: string | null;
}

export interface CRClan {
  tag: string;
  clan_name: string;
  badge_id: string;
}

export interface CRArena {
  id: string;
  name: string;
}

export interface CRFavoriteCard {
  card_id: number;
  name: string;
  elixir_cost: number | null;
  rarity: string | null;
}

export interface CRPlayerInfo {
  tag: string;
  name: string;
  trophies: number;
  best_trophies: number;
  wins: number;
  losses: number;
  battles_count: number;
  three_crown_wins: number;
  clan: CRClan | null;
  arena: CRArena | null;
  current_trophies: number;
  current_path_of_legends_medals: number | null;
  current_path_of_legends_rank: number | null;
  best_path_of_legends_medals: number | null;
  best_path_of_legends_rank: number | null;
  current_favorite_card: CRFavoriteCard | null;
  total_donations: number | null;
  challenge_max_wins: number | null;
  current_path_of_legends_league: number | null;
}
