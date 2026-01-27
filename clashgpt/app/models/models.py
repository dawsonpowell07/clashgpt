import json
from dataclasses import asdict, dataclass, field
from enum import Enum
from typing import Literal


class Rarity(Enum):
    COMMON = "common"
    RARE = "rare"
    EPIC = "epic"
    LEGENDARY = "legendary"
    CHAMPION = "champion"


@dataclass
class ProcessedBattle:
    battle_id: str  # unique -> player_a|player_b|timestamp|game_mode_id
    player_a_tag: str
    player_b_tag: str
    battle_time: str  # timestamp -> ex: 20260112T002608.000Z
    processed_at: str  # timestamp -> generated
    season_id: int
    game_mode: str

    def model_dump_json(self, indent: int | None = None) -> str:
        """Serialize to JSON string for compatibility with Pydantic API."""
        return json.dumps(asdict(self), indent=indent)


@dataclass
class DeckUsageFacts:
    deck_id: str
    result: Literal["WIN", "LOSS"]
    league: str
    battle_time: str  # timestamp
    season_id: int

    def model_dump_json(self, indent: int | None = None) -> str:
        """Serialize to JSON string for compatibility with Pydantic API."""
        return json.dumps(asdict(self), indent=indent)


@dataclass
class CardUsageFacts:
    card_id: int
    deck_id: str
    result: Literal["WIN", "LOSS"]
    league: str
    battle_time: str  # timestamp
    season_id: int

    def model_dump_json(self, indent: int | None = None) -> str:
        """Serialize to JSON string for compatibility with Pydantic API."""
        return json.dumps(asdict(self), indent=indent)


@dataclass
class Deck:
    """
    Dimension table for unique deck compositions.

    deck_id format: "26000000_0|26000001_0|26000002_1|..."
    where each part is card_id_variant (variant: 0=normal, 1=evolution, 2=hero)
    Cards are sorted and pipe-delimited for deterministic IDs.
    """
    deck_id: str  # plaintext composition: card_id_variant|card_id_variant|...
    avg_elixir: float

    def model_dump_json(self, indent: int | None = None) -> str:
        """Serialize to JSON string for compatibility with Pydantic API."""
        return json.dumps(asdict(self), indent=indent)


@dataclass
class DeckCards:
    """
    Bridge table mapping cards to decks (many-to-many relationship).

    Composite primary key: (deck_id, card_id, evolution_level)
    Each deck has exactly 8 rows in this table.
    """
    deck_id: str
    card_id: int
    evolution_level: int  # 0=normal, 1=evolution, 2=hero
    is_support_card: bool

    def model_dump_json(self, indent: int | None = None) -> str:
        """Serialize to JSON string for compatibility with Pydantic API."""
        return json.dumps(asdict(self), indent=indent)


@dataclass
class Card:
    card_id: int
    name: str
    elixir_cost: int
    rarity: Rarity
    icon_urls: dict[str, str]

    def model_dump_json(self, indent: int | None = None) -> str:
        """Serialize to JSON string for compatibility with Pydantic API."""
        data = asdict(self)
        # Convert Enum to value for JSON serialization
        data['rarity'] = self.rarity.value
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
    NORMAL = "NORMAL"
    EVOLUTION = "EVOLUTION"
    HERO = "HERO"


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
        data = {'cards': [asdict(c) for c in self.cards]}
        # Convert Rarity enum to value for each card
        for card_data in data['cards']:
            if 'rarity' in card_data and isinstance(card_data['rarity'], Rarity):
                card_data['rarity'] = card_data['rarity'].value
        return json.dumps(data, indent=indent)


@dataclass
class CardStats:
    """
    Aggregated statistics for a card, calculated from card_usage_facts.

    This is computed on demand from fact tables, not stored in database.
    """
    card_id: int
    card_name: str | None = None
    total_uses: int = 0
    wins: int = 0
    losses: int = 0
    win_rate: float | None = None  # Calculated: wins / total_uses
    usage_rate: float | None = None  # Percentage of all card slots
    deck_appearance_rate: float | None = None  # Percentage of decks containing this card

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
    Aggregated statistics for a deck, calculated from deck_usage_facts.

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
    # Most recently used (MAX battle_time from deck_usage_facts)
    RECENT = "RECENT"
    # Most games played (COUNT from deck_usage_facts)
    GAMES_PLAYED = "GAMES_PLAYED"
    # Highest win rate (wins / games from deck_usage_facts)
    WIN_RATE = "WIN_RATE"
    WINS = "WINS"  # Most wins (COUNT WHERE result='WIN' from deck_usage_facts)


@dataclass
class DeckWithStats:
    """1
    Deck with aggregated statistics calculated from deck_usage_facts.

    Combines deck dimension data with computed statistics.
    """
    deck_id: str
    avg_elixir: float
    # Optional: joined from deck_cards bridge table
    cards: list[DeckCards] | None = None
    games_played: int | None = None
    wins: int | None = None
    losses: int | None = None
    win_rate: float | None = None  # Calculated: wins / games_played
    last_seen: str | None = None  # MAX(battle_time) from deck_usage_facts

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
        # Convert nested Card enum
        if self.current_favorite_card and 'rarity' in data.get('current_favorite_card', {}):
            data['current_favorite_card']['rarity'] = self.current_favorite_card.rarity.value
        return json.dumps(data, indent=indent)
