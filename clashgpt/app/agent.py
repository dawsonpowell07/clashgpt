# ruff: noqa
# Copyright 2025 Google LLC
#
# Licensed under the Apache License, Version 2.0 (the "License");
# you may not use this file except in compliance with the License.
# You may obtain a copy of the License at
#
#     http://www.apache.org/licenses/LICENSE-2.0
#
# Unless required by applicable law or agreed to in writing, software
# distributed under the License is distributed on an "AS IS" BASIS,
# WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
# See the License for the specific language governing permissions and
# limitations under the License.

import datetime
from zoneinfo import ZoneInfo
from typing import Optional

from google.adk.agents import Agent
from google.adk.agents.callback_context import CallbackContext

from google.adk.apps.app import App
from google.adk.models import Gemini
from google.genai import types

import os
import google.auth

from app.services.clash_royale import ClashRoyaleService
from app.services.database import get_database_service
from app.models.models import DeckArchetype, FreeToPlayLevel

_, project_id = google.auth.default()
os.environ["GOOGLE_CLOUD_PROJECT"] = project_id
os.environ["GOOGLE_CLOUD_LOCATION"] = "global"
os.environ["GOOGLE_GENAI_USE_VERTEXAI"] = "True"


async def get_player_info(player_tag: str = "#90UUQRQC") -> dict:
    """
    Get Clash Royale player information.

    Args:
        player_tag: The player tag (with or without #). Defaults to #90UUQRQC

    Returns:
        Dictionary containing player information including name, trophies, wins, losses, clan info, etc.
    """
    async with ClashRoyaleService() as service:
        player = await service.get_player(player_tag)
        return player.model_dump()


async def get_player_battle_log(player_tag: str = "#90UUQRQC", limit: int = 3) -> dict:
    """
    Get Clash Royale player battle log showing recent battles.

    Args:
        player_tag: The player tag (with or without #). Defaults to #90UUQRQC
        limit: Maximum number of battles to return. Defaults to 3 most recent battles.

    Returns:
        Dictionary containing recent battle information including battle type, time, opponents, decks used, and trophy changes.
    """
    async with ClashRoyaleService() as service:
        battle_log = await service.get_player_battle_log(player_tag, limit=limit)
        return battle_log.model_dump()


async def get_top_players(location_id: int = 57000249, limit: int = 10) -> dict:
    """
    Get the top Path of Legend players for a specific location.

    Args:
        location_id: The location ID to get rankings for. Defaults to 57000249 (United States).
            Common location IDs:
            - 57000249: United States
            - 57000007: Brazil
            - 57000038: China
            - 57000070: France
            - 57000074: Germany
            - 57000094: India
            - 57000095: Indonesia
            - 57000097: Iran
            - 57000151: Russia
            - 57000088: Hong Kong
            - 57000227: United Kingdom
        limit: Number of top players to return (default: 10, max: 50).

    Returns:
        Dictionary containing the leaderboard with top players including their tags, names, ELO ratings, and clan information.
    """
    async with ClashRoyaleService() as service:
        leaderboard = await service.get_player_rankings(location_id, limit=limit)
        return leaderboard.model_dump()


async def get_top_decks(limit: int = 10, archetype: Optional[str] = None) -> dict:
    """
    Get the top meta decks currently being used by elite Path of Legend players.

    This function retrieves the most recently seen competitive decks from our database,
    which is regularly updated by scanning top players' battle logs. Decks are ranked
    by how recently they were seen in high-level play.

    Args:
        limit: Maximum number of decks to return (default: 10, max: 200).
            Use higher values to get a broader meta overview.
        archetype: Optional filter to get decks of a specific archetype.
            Valid archetypes:
            - "CYCLE": Fast, low-elixir decks that cycle cards quickly (avg < 3.0 elixir)
            - "BEATDOWN": Heavy tank-based decks (Golem, Giant, Lava Hound, etc.)
            - "BRIDGESPAM": Aggressive decks with fast units (Pekka, Bandit, Ram Rider)
            - "CONTROL": Defensive decks that control the pace (Miner, Royal Giant, Graveyard)
            - "BAIT": Spell bait decks (Goblin Barrel, Royal Hogs + Flying Machine)
            - "SIEGE": X-Bow or Mortar decks
            - "MIDLADDERMENACE": Decks with Elixir Golem or Elite Barbarians

    Returns:
        Dictionary with a "decks" list, where each deck contains:
        - id: Unique deck identifier
        - deck_hash: Hash of the deck composition
        - cards: List of 8 cards with their IDs, names, and variants (evolution/hero/normal)
        - avg_elixir: Average elixir cost of the deck
        - archetype: The deck's archetype classification
        - ftp_tier: Free-to-play friendliness (FRIENDLY/MODERATE/PAYTOWIN)

    Examples:
        # Get top 10 decks regardless of archetype
        await get_top_decks(limit=10)

        # Get top 5 cycle decks
        await get_top_decks(limit=5, archetype="CYCLE")

        # Get top 20 beatdown decks
        await get_top_decks(limit=20, archetype="BEATDOWN")

        # Get a broad overview of the meta
        await get_top_decks(limit=50)
    """
    db = get_database_service()

    # Convert string archetype to enum if provided
    archetype_enum = None
    if archetype:
        try:
            archetype_enum = DeckArchetype[archetype.upper()]
        except KeyError:
            # Invalid archetype, will return empty or raise error
            pass

    decks = await db.get_top_decks(limit=limit, archetype=archetype_enum)
    return {"decks": [deck.model_dump() for deck in decks]}


async def search_decks(
    include_cards: Optional[str] = None,
    exclude_cards: Optional[str] = None,
    archetype: Optional[str] = None,
    ftp_tier: Optional[str] = None,
    limit: int = 10
) -> dict:
    """
    Search for decks with advanced filters including specific cards, archetype, and F2P friendliness.

    This powerful search tool lets you find decks that contain specific cards, exclude certain cards,
    and filter by archetype or free-to-play tier. Perfect for deck building and finding counters.

    Args:
        include_cards: Comma-separated list of card IDs that MUST be in the deck.
            Use this to find decks built around specific cards or combinations.
            Example: "26000000,26000001" to find decks with both Knight and Archers.

        exclude_cards: Comma-separated list of card IDs that MUST NOT be in the deck.
            Use this to avoid certain cards or find alternative decks.
            Example: "26000010" to exclude decks with Fireball.

        archetype: Optional filter for deck archetype.
            Valid values: "CYCLE", "BEATDOWN", "BRIDGESPAM", "CONTROL", "BAIT", "SIEGE", "MIDLADDERMENACE"

        ftp_tier: Optional filter for free-to-play friendliness.
            Valid values:
            - "FRIENDLY": 0-2 legendaries/champions/heroes (easiest to upgrade)
            - "MODERATE": 3-4 legendaries/champions/heroes (moderate investment)
            - "PAYTOWIN": 5+ legendaries/champions/heroes (requires heavy investment)

        limit: Maximum number of results to return (default: 10, max: 200).

    Returns:
        Dictionary with a "decks" list matching your search criteria. Each deck contains:
        - id: Unique deck identifier
        - deck_hash: Hash of the deck composition
        - cards: List of 8 cards with their IDs, names, and variants
        - avg_elixir: Average elixir cost
        - archetype: Deck archetype
        - ftp_tier: Free-to-play tier

    Examples:
        # Find decks that include Hog Rider (card ID: 26000020)
        await search_decks(include_cards="26000020", limit=10)

        # Find F2P-friendly cycle decks
        await search_decks(archetype="CYCLE", ftp_tier="FRIENDLY", limit=15)

        # Find decks with both Miner and Poison, excluding Goblin Drill
        await search_decks(
            include_cards="26000016,26000047",
            exclude_cards="26000080",
            limit=20
        )

        # Find beatdown decks that don't use Elixir Golem
        await search_decks(
            archetype="BEATDOWN",
            exclude_cards="26000068",
            limit=10
        )

        # Find moderate F2P decks with Royal Giant
        await search_decks(
            include_cards="26000024",
            ftp_tier="MODERATE",
            limit=25
        )

        # Find all bridge spam decks (no other filters)
        await search_decks(archetype="BRIDGESPAM", limit=30)
    """
    db = get_database_service()

    # Parse card IDs
    include_card_ids = None
    if include_cards:
        include_card_ids = [cid.strip()
                            for cid in include_cards.split(",") if cid.strip()]

    exclude_card_ids = None
    if exclude_cards:
        exclude_card_ids = [cid.strip()
                            for cid in exclude_cards.split(",") if cid.strip()]

    # Convert string enums to actual enums
    archetype_enum = None
    if archetype:
        try:
            archetype_enum = DeckArchetype[archetype.upper()]
        except KeyError:
            pass

    ftp_tier_enum = None
    if ftp_tier:
        try:
            ftp_tier_enum = FreeToPlayLevel[ftp_tier.upper()]
        except KeyError:
            pass

    decks = await db.search_decks(
        include_card_ids=include_card_ids,
        exclude_card_ids=exclude_card_ids,
        archetype=archetype_enum,
        ftp_tier=ftp_tier_enum,
        limit=limit
    )

    return {"decks": [deck.model_dump() for deck in decks]}


root_agent = Agent(
    name="root_agent",
    model=Gemini(
        model="gemini-2.5-flash",
        retry_options=types.HttpRetryOptions(attempts=3),
    ),
    instruction="""
    You are a helpful AI assistant designed to provide accurate and useful information about Clash Royale players, decks, and the current meta. ONLY CALL ANY TOOL ONCE. A SINGLE TIME
    id to card mappings are as follows:
    
  {"id":"26000072","name":"Archer Queen"},
  {"id":"26000001","name":"Archers"},
  {"id":"28000001","name":"Arrows"},
  {"id":"26000015","name":"Baby Dragon"},
  {"id":"26000006","name":"Balloon"},
  {"id":"26000046","name":"Bandit"},
  {"id":"28000015","name":"Barbarian Barrel"},
  {"id":"27000005","name":"Barbarian Hut"},
  {"id":"26000008","name":"Barbarians"},
  {"id":"26000049","name":"Bats"},
  {"id":"26000068","name":"Battle Healer"},
  {"id":"26000036","name":"Battle Ram"},
  {"id":"26000102","name":"Berserker"},
  {"id":"27000004","name":"Bomb Tower"},
  {"id":"26000013","name":"Bomber"},
  {"id":"26000103","name":"Boss Bandit"},
  {"id":"26000034","name":"Bowler"},
  {"id":"27000000","name":"Cannon"},
  {"id":"26000054","name":"Cannon Cart"},
  {"id":"28000013","name":"Clone"},
  {"id":"26000027","name":"Dark Prince"},
  {"id":"26000040","name":"Dart Goblin"},
  {"id":"28000014","name":"Earthquake"},
  {"id":"26000063","name":"Electro Dragon"},
  {"id":"26000085","name":"Electro Giant"},
  {"id":"26000084","name":"Electro Spirit"},
  {"id":"26000042","name":"Electro Wizard"},
  {"id":"26000043","name":"Elite Barbarians"},
  {"id":"27000007","name":"Elixir Collector"},
  {"id":"26000067","name":"Elixir Golem"},
  {"id":"26000045","name":"Executioner"},
  {"id":"26000031","name":"Fire Spirit"},
  {"id":"28000000","name":"Fireball"},
  {"id":"26000064","name":"Firecracker"},
  {"id":"26000061","name":"Fisherman"},
  {"id":"26000057","name":"Flying Machine"},
  {"id":"28000005","name":"Freeze"},
  {"id":"27000010","name":"Furnace"},
  {"id":"26000003","name":"Giant"},
  {"id":"26000020","name":"Giant Skeleton"},
  {"id":"28000017","name":"Giant Snowball"},
  {"id":"28000004","name":"Goblin Barrel"},
  {"id":"27000012","name":"Goblin Cage"},
  {"id":"28000024","name":"Goblin Curse"},
  {"id":"26000095","name":"Goblin Demolisher"},
  {"id":"27000013","name":"Goblin Drill"},
  {"id":"26000041","name":"Goblin Gang"},
  {"id":"26000060","name":"Goblin Giant"},
  {"id":"27000001","name":"Goblin Hut"},
  {"id":"26000096","name":"Goblin Machine"},
  {"id":"26000002","name":"Goblins"},
  {"id":"26000099","name":"Goblinstein"},
  {"id":"26000074","name":"Golden Knight"},
  {"id":"26000009","name":"Golem"},
  {"id":"28000010","name":"Graveyard"},
  {"id":"26000025","name":"Guards"},
  {"id":"28000016","name":"Heal Spirit"},
  {"id":"26000021","name":"Hog Rider"},
  {"id":"26000044","name":"Hunter"},
  {"id":"26000038","name":"Ice Golem"},
  {"id":"26000030","name":"Ice Spirit"},
  {"id":"26000023","name":"Ice Wizard"},
  {"id":"26000037","name":"Inferno Dragon"},
  {"id":"27000003","name":"Inferno Tower"},
  {"id":"26000000","name":"Knight"},
  {"id":"26000029","name":"Lava Hound"},
  {"id":"28000007","name":"Lightning"},
  {"id":"26000093","name":"Little Prince"},
  {"id":"26000035","name":"Lumberjack"},
  {"id":"26000062","name":"Magic Archer"},
  {"id":"26000055","name":"Mega Knight"},
  {"id":"26000039","name":"Mega Minion"},
  {"id":"26000065","name":"Mighty Miner"},
  {"id":"26000032","name":"Miner"},
  {"id":"26000018","name":"Mini P.E.K.K.A"},
  {"id":"26000022","name":"Minion Horde"},
  {"id":"26000005","name":"Minions"},
  {"id":"28000006","name":"Mirror"},
  {"id":"26000077","name":"Monk"},
  {"id":"27000002","name":"Mortar"},
  {"id":"26000083","name":"Mother Witch"},
  {"id":"26000014","name":"Musketeer"},
  {"id":"26000048","name":"Night Witch"},
  {"id":"26000004","name":"P.E.K.K.A"},
  {"id":"26000087","name":"Phoenix"},
  {"id":"28000009","name":"Poison"},
  {"id":"26000016","name":"Prince"},
  {"id":"26000026","name":"Princess"},
  {"id":"28000002","name":"Rage"},
  {"id":"26000051","name":"Ram Rider"},
  {"id":"26000053","name":"Rascals"},
  {"id":"28000003","name":"Rocket"},
  {"id":"28000018","name":"Royal Delivery"},
  {"id":"26000050","name":"Royal Ghost"},
  {"id":"26000024","name":"Royal Giant"},
  {"id":"26000059","name":"Royal Hogs"},
  {"id":"26000047","name":"Royal Recruits"},
  {"id":"26000101","name":"Rune Giant"},
  {"id":"26000012","name":"Skeleton Army"},
  {"id":"26000056","name":"Skeleton Barrel"},
  {"id":"26000080","name":"Skeleton Dragons"},
  {"id":"26000069","name":"Skeleton King"},
  {"id":"26000010","name":"Skeletons"},
  {"id":"26000033","name":"Sparky"},
  {"id":"26000019","name":"Spear Goblins"},
  {"id":"28000025","name":"Spirit Empress"},
  {"id":"26000097","name":"Suspicious Bush"},
  {"id":"27000006","name":"Tesla"},
  {"id":"28000011","name":"The Log"},
  {"id":"26000028","name":"Three Musketeers"},
  {"id":"27000009","name":"Tombstone"},
  {"id":"28000012","name":"Tornado"},
  {"id":"26000011","name":"Valkyrie"},
  {"id":"28000026","name":"Vines"},
  {"id":"28000023","name":"Void"},
  {"id":"26000058","name":"Wall Breakers"},
  {"id":"26000007","name":"Witch"},
  {"id":"26000017","name":"Wizard"},
  {"id":"27000008","name":"X-Bow"},
  {"id":"28000008","name":"Zap"},
  {"id":"26000052","name":"Zappies"}

    """,
    tools=[get_player_info, get_player_battle_log,
           get_top_players, get_top_decks, search_decks],
)

app = App(root_agent=root_agent, name="app")
