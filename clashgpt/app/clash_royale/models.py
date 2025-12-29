from enum import Enum

from pydantic import BaseModel


class Rarity(str, Enum):
    COMMON = "COMMON"
    RARE = "RARE"
    EPIC = "EPIC"
    LEGENDARY = "LEGENDARY"
    CHAMPION = "CHAMPION"


class ClanObject(BaseModel):
    tag: str
    clan_name: str
    badge_id: str


class ArenaObject(BaseModel):
    id: str
    name: str
    raw_name: str


class CardObject(BaseModel):
    id: str
    name: str
    elixir_cost: int
    icon_urls: dict[str, str]
    rarity: Rarity


class CardList(BaseModel):
    cards: list[CardObject]


class BattleObject(BaseModel):
    type: str
    battle_time: str
    arena: ArenaObject
    game_mode_name: str
    user_name: str
    user_trophy_change: int
    user_deck: CardList

    opponent_name: str
    opponent_trophy_change: int
    opponent_deck: CardList


class BattleLog(BaseModel):
    battles: list[BattleObject]


class PlayerObject(BaseModel):
    tag: str
    name: str
    trophies: int
    best_trophies: int
    wins: int
    losses: int
    battles_count: int
    three_crown_wins: int
    clan: ClanObject | None
    arena: ArenaObject | None
    current_trophies: int
    current_path_of_legends_medals: int | None
    current_path_of_legends_rank: int | None
    best_path_of_legends_medals: int | None
    best_path_of_legends_rank: int | None
    current_favorite_card: CardObject | None
