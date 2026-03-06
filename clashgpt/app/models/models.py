import json
from dataclasses import asdict, dataclass
from enum import Enum


class Rarity(Enum):
    COMMON = "common"
    RARE = "rare"
    EPIC = "epic"
    LEGENDARY = "legendary"
    CHAMPION = "champion"


@dataclass
class Deck:
    """Dimension table for unique deck compositions. deck_id is a SHA-256 hash."""

    deck_id: str
    avg_elixir: float | None = None
    tower_troop_id: int | None = None
    created_at: str | None = None

    def model_dump_json(self, indent: int | None = None) -> str:
        """Serialize to JSON string for compatibility with Pydantic API."""
        return json.dumps(asdict(self), indent=indent)


@dataclass
class DeckCardConfig:
    """
    Bridge table mapping cards to decks with variant and slot tracking.
    Composite primary key: (deck_id, card_id, variant)
    """

    deck_id: str
    card_id: int
    variant: str  # 'normal', 'evolution', or 'heroic'
    slot_index: int | None = None
    card_name: str | None = None  # Populated via JOIN with dim_cards

    def model_dump_json(self, indent: int | None = None) -> str:
        """Serialize to JSON string for compatibility with Pydantic API."""
        return json.dumps(asdict(self), indent=indent)


@dataclass
class Card:
    card_id: int
    name: str
    elixir_cost: int | None
    rarity: Rarity | None
    icon_urls: dict[str, str] | None
    card_type: str | None = None  # e.g., 'Troop', 'Tower Troop'
    can_evolve: bool = False
    can_be_heroic: bool = False
    evolution_level: int = 0  # Preserved for API-sourced cards (battle/player data)

    def model_dump_json(self, indent: int | None = None) -> str:
        """Serialize to JSON string for compatibility with Pydantic API."""
        data = asdict(self)
        # Convert Enum to value for JSON serialization
        data["rarity"] = self.rarity.value if self.rarity else None
        return json.dumps(data, indent=indent)


class DeckArchetype(str, Enum):
    CYCLE = "CYCLE"
    BEATDOWN = "BEATDOWN"
    BRIDGESPAM = "BRIDGESPAM"
    MIDLADDERMENACE = "MIDLADDERMENACE"
    BAIT = "BAIT"
    SIEGE = "SIEGE"
    CONTROL = "CONTROL"


class FreeToPlayLevel(str, Enum):
    FRIENDLY = "FRIENDLY"
    MODERATE = "MODERATE"
    PAYTOWIN = "PAYTOWIN"


class CardVariant(str, Enum):
    NORMAL = "normal"
    EVOLUTION = "evolution"
    HEROIC = "heroic"


@dataclass
class Location:
    id: int
    name: str
    is_country: bool
    country_code: str | None

    def model_dump_json(self, indent: int | None = None) -> str:
        """Serialize to JSON string for compatibility with Pydantic API."""
        return json.dumps(asdict(self), indent=indent)


@dataclass
class Locations:
    locations: list[Location]

    def model_dump_json(self, indent: int | None = None) -> str:
        """Serialize to JSON string for compatibility with Pydantic API."""
        data = asdict(self)
        return json.dumps(data, indent=indent)


@dataclass
class Clan:
    tag: str
    clan_name: str
    badge_id: str

    def model_dump_json(self, indent: int | None = None) -> str:
        """Serialize to JSON string for compatibility with Pydantic API."""
        return json.dumps(asdict(self), indent=indent)


@dataclass
class Arena:
    id: str
    name: str
    raw_name: str

    def model_dump_json(self, indent: int | None = None) -> str:
        """Serialize to JSON string for compatibility with Pydantic API."""
        return json.dumps(asdict(self), indent=indent)


@dataclass
class CardList:
    cards: list[Card]

    def model_dump_json(self, indent: int | None = None) -> str:
        """Serialize to JSON string for compatibility with Pydantic API."""
        data = {"cards": [asdict(c) for c in self.cards]}
        for card_data in data["cards"]:
            if "rarity" in card_data and isinstance(card_data["rarity"], Rarity):
                card_data["rarity"] = card_data["rarity"].value
            elif "rarity" in card_data and card_data["rarity"] is None:
                card_data["rarity"] = None
        return json.dumps(data, indent=indent)


@dataclass
class CardStats:
    """
    Aggregated statistics for a card, derived from fact_battle_participants + deck_card_config.

    This is computed on demand from fact tables, not stored in database.
    """

    card_id: int
    card_name: str | None = None
    total_uses: int = 0
    wins: int = 0
    losses: int = 0
    win_rate: float | None = None  # Calculated: wins / total_uses
    usage_rate: float | None = None  # Percentage of all card slots
    # Percentage of decks containing this card
    deck_appearance_rate: float | None = None

    def model_dump_json(self, indent: int | None = None) -> str:
        """Serialize to JSON string for compatibility with Pydantic API."""
        return json.dumps(asdict(self), indent=indent)


@dataclass
class CardStatsFilters:
    """Filter parameters for card statistics queries."""

    season_id: int | None = None
    league: str | None = None
    min_uses: int = 0

    def model_dump_json(self, indent: int | None = None) -> str:
        """Serialize to JSON string for compatibility with Pydantic API."""
        return json.dumps(asdict(self), indent=indent)


@dataclass
class DeckStats:
    """
    Aggregated statistics for a deck, calculated from fact_battle_participants.

    This is not a database table - it's computed on demand from fact tables.
    """

    deck_id: str
    games_played: int
    wins: int
    losses: int
    win_rate: float | None = None  # Calculated: wins / games_played

    def model_dump_json(self, indent: int | None = None) -> str:
        """Serialize to JSON string for compatibility with Pydantic API."""
        return json.dumps(asdict(self), indent=indent)


@dataclass
class DeckStatsFilters:
    """Filter parameters for deck statistics queries."""

    season_id: int | None = None
    league: str | None = None
    min_games: int = 0

    def model_dump_json(self, indent: int | None = None) -> str:
        """Serialize to JSON string for compatibility with Pydantic API."""
        return json.dumps(asdict(self), indent=indent)


class DeckSortBy(str, Enum):
    # Most recently seen (MAX battle_time from processed_battles)
    RECENT = "RECENT"
    # Most games played (COUNT from fact_battle_participants)
    GAMES_PLAYED = "GAMES_PLAYED"
    # Highest win rate (SUM(is_win) / COUNT from fact_battle_participants)
    WIN_RATE = "WIN_RATE"
    # Most wins (SUM(is_win) from fact_battle_participants)
    WINS = "WINS"


@dataclass
class DeckWithStats:
    """
    Deck with aggregated statistics calculated from fact_battle_participants.

    Combines dim_decks dimension data with computed statistics.
    """

    deck_id: str
    avg_elixir: float | None = None
    # Optional: joined from deck_card_config bridge table
    cards: list[DeckCardConfig] | None = None
    games_played: int | None = None
    wins: int | None = None
    losses: int | None = None
    win_rate: float | None = None  # Calculated: wins / games_played
    last_seen: str | None = None  # MAX(battle_time) from processed_battles

    def model_dump_json(self, indent: int | None = None) -> str:
        """Serialize to JSON string for compatibility with Pydantic API."""
        data = asdict(self)
        return json.dumps(data, indent=indent)


@dataclass
class PaginatedDecks:
    decks: list[Deck]
    total: int
    page: int
    page_size: int
    total_pages: int
    has_next: bool
    has_previous: bool

    def model_dump_json(self, indent: int | None = None) -> str:
        """Serialize to JSON string for compatibility with Pydantic API."""
        data = asdict(self)
        return json.dumps(data, indent=indent)


@dataclass
class PaginatedDecksWithStats:
    decks: list[DeckWithStats]
    total: int
    page: int
    page_size: int
    total_pages: int
    has_next: bool
    has_previous: bool

    def model_dump_json(self, indent: int | None = None) -> str:
        """Serialize to JSON string for compatibility with Pydantic API."""
        data = asdict(self)
        return json.dumps(data, indent=indent)


@dataclass
class Battle:
    type: str
    battle_time: str
    arena: Arena
    game_mode_name: str
    user_name: str
    user_trophy_change: int
    user_deck: CardList
    opponent_name: str
    opponent_trophy_change: int
    opponent_deck: CardList

    def model_dump_json(self, indent: int | None = None) -> str:
        """Serialize to JSON string for compatibility with Pydantic API."""
        data = asdict(self)
        return json.dumps(data, indent=indent)


@dataclass
class LeaderboardEntry:
    tag: str
    name: str
    elo_rating: int
    clan: Clan | None

    def model_dump_json(self, indent: int | None = None) -> str:
        """Serialize to JSON string for compatibility with Pydantic API."""
        data = asdict(self)
        return json.dumps(data, indent=indent)


@dataclass
class Leaderboard:
    entries: list[LeaderboardEntry]

    def model_dump_json(self, indent: int | None = None) -> str:
        """Serialize to JSON string for compatibility with Pydantic API."""
        data = asdict(self)
        return json.dumps(data, indent=indent)


@dataclass
class BattleLog:
    battles: list[Battle]

    def model_dump_json(self, indent: int | None = None) -> str:
        """Serialize to JSON string for compatibility with Pydantic API."""
        data = asdict(self)
        return json.dumps(data, indent=indent)


@dataclass
class ClanMemberEntry:
    tag: str
    name: str
    role: str | None
    last_seen: str | None
    trophies: int | None

    def model_dump_json(self, indent: int | None = None) -> str:
        """Serialize to JSON string for compatibility with Pydantic API."""
        return json.dumps(asdict(self), indent=indent)


@dataclass
class FullClan:
    tag: str
    name: str
    type: str | None
    description: str | None
    clan_score: str | None
    clan_war_trophies: int | None
    location: str | None
    required_trophies: int | None
    donations_per_week: int | None
    num_members: int | None
    members_list: list[ClanMemberEntry]

    def model_dump_json(self, indent: int | None = None) -> str:
        """Serialize to JSON string for compatibility with Pydantic API."""
        data = asdict(self)
        return json.dumps(data, indent=indent)


@dataclass
class ClanSearchResult:
    """Represents a clan in search results."""

    tag: str
    name: str
    type: str | None
    badge_id: int
    clan_score: int | None
    clan_war_trophies: int | None
    location_id: int | None
    location_name: str | None
    members: int | None
    required_trophies: int | None

    def model_dump_json(self, indent: int | None = None) -> str:
        """Serialize to JSON string for compatibility with Pydantic API."""
        return json.dumps(asdict(self), indent=indent)


@dataclass
class ClanSearchPaging:
    """Pagination information for clan search."""

    cursors: dict[str, str] | None = None

    def model_dump_json(self, indent: int | None = None) -> str:
        """Serialize to JSON string for compatibility with Pydantic API."""
        return json.dumps(asdict(self), indent=indent)


@dataclass
class ClanSearchResults:
    """Paginated clan search results."""

    items: list[ClanSearchResult]
    paging: ClanSearchPaging | None = None

    def model_dump_json(self, indent: int | None = None) -> str:
        """Serialize to JSON string for compatibility with Pydantic API."""
        data = asdict(self)
        return json.dumps(data, indent=indent)


@dataclass
class Player:
    tag: str
    name: str
    trophies: int
    best_trophies: int
    wins: int
    losses: int
    battles_count: int
    three_crown_wins: int
    clan: Clan | None
    arena: Arena | None
    current_trophies: int
    current_path_of_legends_medals: int | None
    current_path_of_legends_rank: int | None
    best_path_of_legends_medals: int | None
    best_path_of_legends_rank: int | None
    current_favorite_card: Card | None
    total_donations: int | None
    challenge_max_wins: int | None
    current_path_of_legends_league: int | None

    def model_dump_json(self, indent: int | None = None) -> str:
        """Serialize to JSON string for compatibility with Pydantic API."""
        data = asdict(self)
        # Convert nested Card rarity enum
        if self.current_favorite_card:
            rarity = self.current_favorite_card.rarity
            data["current_favorite_card"]["rarity"] = rarity.value if rarity else None
        return json.dumps(data, indent=indent)
