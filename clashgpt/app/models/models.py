from enum import Enum

from pydantic import BaseModel


class Rarity(str, Enum):
    COMMON = "COMMON"
    RARE = "RARE"
    EPIC = "EPIC"
    LEGENDARY = "LEGENDARY"
    CHAMPION = "CHAMPION"


class DeckArchetype(str, Enum):
    CYCLE = "CYCLE"
    BEATDOWN = "BEATDOWN"
    BRIDGESPAM = "BRIDGESPAM"
    MIDLADDERMENACE = "MIDLADDERMENACE"
    BAIT = "BAIT"
    CHIP = "CHIP"
    SIEGE = "SIEGE"


class FreeToPlayLevel(str, Enum):
    FRIENDLY = "FRIENDLY"
    MODERATE = "MODERATE"
    PAYTOWIN = "PAYTOWIN"


class SkillTier(str, Enum):
    LOW = "LOW"
    MEDIUM = "MEDIUM"
    HIGH = "HIGH"


class CardVariant(str, Enum):
    NORMAL = "NORMAL"
    EVOLUTION = "EVOLUTION"
    HERO = "HERO"


class Location(BaseModel):
    id: int
    name: str
    is_country: bool
    country_code: str | None


class Locations(BaseModel):
    locations: list[Location]


class Clan(BaseModel):
    tag: str
    clan_name: str
    badge_id: str


class Arena(BaseModel):
    id: str
    name: str
    raw_name: str


class Card(BaseModel):
    id: str
    name: str
    elixir_cost: int = 0
    icon_urls: dict[str, str]
    rarity: Rarity


class CardList(BaseModel):
    cards: list[Card]


class Deck(BaseModel):
    id: str
    deck_hash: str
    cards: list[dict]
    avg_elixir: float
    archetype: DeckArchetype
    ftp_tier: FreeToPlayLevel
    skill: SkillTier


class Battle(BaseModel):
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


class LeaderboardEntry(BaseModel):
    tag: str
    name: str
    elo_rating: int
    clan: Clan | None


class Leaderboard(BaseModel):
    entries: list[LeaderboardEntry]


class BattleLog(BaseModel):
    battles: list[Battle]


class Player(BaseModel):
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
