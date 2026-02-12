"""
API Router

FastAPI router for database endpoints.
Provides REST API access to cards, decks, and locations.
"""

import asyncio
from typing import Annotated

from fastapi import APIRouter, HTTPException, Query, Request
from fastapi.responses import JSONResponse

from app.cache import get_cached_decks, make_deck_cache_key, set_cached_decks
from app.models.models import (
    Card,
    CardList,
    CardStats,
    DeckSortBy,
    Locations,
    Rarity,
)
from app.rate_limit import limiter
from app.services.database import get_database_service

router = APIRouter(prefix="/api", tags=["api"])

# Query complexity limits
MAX_INCLUDE_CARDS = 8
MAX_EXCLUDE_CARDS = 8

# DB query timeout (seconds)
DECK_SEARCH_TIMEOUT = 10.0

CARD_ID_TO_NAME = {
    "26000072": "Archer Queen",
    "26000001": "Archers",
    "28000001": "Arrows",
    "26000015": "Baby Dragon",
    "26000006": "Balloon",
    "26000046": "Bandit",
    "28000015": "Barbarian Barrel",
    "27000005": "Barbarian Hut",
    "26000008": "Barbarians",
    "26000049": "Bats",
    "26000068": "Battle Healer",
    "26000036": "Battle Ram",
    "26000102": "Berserker",
    "27000004": "Bomb Tower",
    "26000013": "Bomber",
    "26000103": "Boss Bandit",
    "26000034": "Bowler",
    "27000000": "Cannon",
    "26000054": "Cannon Cart",
    "28000013": "Clone",
    "26000027": "Dark Prince",
    "26000040": "Dart Goblin",
    "28000014": "Earthquake",
    "26000063": "Electro Dragon",
    "26000085": "Electro Giant",
    "26000084": "Electro Spirit",
    "26000042": "Electro Wizard",
    "26000043": "Elite Barbarians",
    "27000007": "Elixir Collector",
    "26000067": "Elixir Golem",
    "26000045": "Executioner",
    "26000031": "Fire Spirit",
    "28000000": "Fireball",
    "26000064": "Firecracker",
    "26000061": "Fisherman",
    "26000057": "Flying Machine",
    "28000005": "Freeze",
    "27000010": "Furnace",
    "26000003": "Giant",
    "26000020": "Giant Skeleton",
    "28000017": "Giant Snowball",
    "28000004": "Goblin Barrel",
    "27000012": "Goblin Cage",
    "28000024": "Goblin Curse",
    "26000095": "Goblin Demolisher",
    "27000013": "Goblin Drill",
    "26000041": "Goblin Gang",
    "26000060": "Goblin Giant",
    "27000001": "Goblin Hut",
    "26000096": "Goblin Machine",
    "26000002": "Goblins",
    "26000099": "Goblinstein",
    "26000074": "Golden Knight",
    "26000009": "Golem",
    "28000010": "Graveyard",
    "26000025": "Guards",
    "28000016": "Heal Spirit",
    "26000021": "Hog Rider",
    "26000044": "Hunter",
    "26000038": "Ice Golem",
    "26000030": "Ice Spirit",
    "26000023": "Ice Wizard",
    "26000037": "Inferno Dragon",
    "27000003": "Inferno Tower",
    "26000000": "Knight",
    "26000029": "Lava Hound",
    "28000007": "Lightning",
    "26000093": "Little Prince",
    "26000035": "Lumberjack",
    "26000062": "Magic Archer",
    "26000055": "Mega Knight",
    "26000039": "Mega Minion",
    "26000065": "Mighty Miner",
    "26000032": "Miner",
    "26000018": "Mini P.E.K.K.A",
    "26000022": "Minion Horde",
    "26000005": "Minions",
    "28000006": "Mirror",
    "26000077": "Monk",
    "27000002": "Mortar",
    "26000083": "Mother Witch",
    "26000014": "Musketeer",
    "26000048": "Night Witch",
    "26000004": "P.E.K.K.A",
    "26000087": "Phoenix",
    "28000009": "Poison",
    "26000016": "Prince",
    "26000026": "Princess",
    "28000002": "Rage",
    "26000051": "Ram Rider",
    "26000053": "Rascals",
    "28000003": "Rocket",
    "28000018": "Royal Delivery",
    "26000050": "Royal Ghost",
    "26000024": "Royal Giant",
    "26000059": "Royal Hogs",
    "26000047": "Royal Recruits",
    "26000101": "Rune Giant",
    "26000012": "Skeleton Army",
    "26000056": "Skeleton Barrel",
    "26000080": "Skeleton Dragons",
    "26000069": "Skeleton King",
    "26000010": "Skeletons",
    "26000033": "Sparky",
    "26000019": "Spear Goblins",
    "28000025": "Spirit Empress",
    "26000097": "Suspicious Bush",
    "27000006": "Tesla",
    "28000011": "The Log",
    "26000028": "Three Musketeers",
    "27000009": "Tombstone",
    "28000012": "Tornado",
    "26000011": "Valkyrie",
    "28000026": "Vines",
    "28000023": "Void",
    "26000058": "Wall Breakers",
    "26000007": "Witch",
    "26000017": "Wizard",
    "27000008": "X-Bow",
    "28000008": "Zap",
    "26000052": "Zappies",
}


def _parse_deck_id(deck_id: str) -> list[tuple[str, int]]:
    cards = []
    for entry in deck_id.split("|"):
        try:
            card_id, evo_level = entry.split("_", 1)
            cards.append((card_id, int(evo_level)))
        except ValueError:
            continue
    return cards


def _variant_from_evolution_level(evolution_level: int) -> str:
    if evolution_level == 1:
        return "evolved"
    if evolution_level == 2:
        return "hero"
    return "normal"


# ===== ROOT ENDPOINT =====

@router.get("/", response_model=dict)
@limiter.limit("60/minute")
async def list_endpoints(request: Request):
    """
    List all available API endpoints.

    Returns:
        Dictionary containing all available endpoints with descriptions
    """
    return {
        "endpoints": {
            "cards": {
                "GET /api/cards": {
                    "description": "Get all cards, optionally filtered by rarity",
                    "parameters": {
                        "rarity": "Optional - Filter by rarity (COMMON, RARE, EPIC, LEGENDARY, CHAMPION)"
                    },
                    "example": "/api/cards?rarity=LEGENDARY"
                },
                "GET /api/cards/{card_id}": {
                    "description": "Get a specific card by its ID",
                    "parameters": {
                        "card_id": "Required - The card ID to fetch"
                    },
                    "example": "/api/cards/26000000"
                },
                "GET /api/cards/{card_id}/stats": {
                    "description": "Get usage statistics for a specific card (win rate, usage rate, games played)",
                    "parameters": {
                        "card_id": "Required - The card ID to fetch stats for",
                        "season_id": "Optional - Filter by season (e.g., 202601)",
                        "league": "Optional - Filter by league tier (e.g., '7')"
                    },
                    "example": "/api/cards/26000000/stats?season_id=202601"
                }
            },
            "decks": {
                "GET /api/decks": {
                    "description": "Search and filter decks with stats (paginated)",
                    "parameters": {
                        "include": "Optional - Comma-separated card IDs that must be in deck. Supports variants: card_id_evolution_level (e.g., 26000012_1 for evolved)",
                        "exclude": "Optional - Comma-separated card IDs that must not be in deck. Same format as include",
                        "sort_by": "Optional - Sort by (RECENT, GAMES_PLAYED, WIN_RATE, WINS, default: RECENT)",
                        "min_games": "Optional - Minimum games played (default: 0)",
                        "page": "Optional - Page number (1-indexed, default: 1)",
                        "page_size": "Optional - Results per page (1-200, default: 24)",
                        "include_cards": "Optional - Include card details and variants for each deck (default: false)"
                    },
                    "example": "/api/decks?include=26000000,26000012_1&sort_by=WIN_RATE&min_games=20&include_cards=true&page=1&page_size=24"
                }
            },
            "locations": {
                "GET /api/locations": {
                    "description": "Get all locations",
                    "parameters": {},
                    "example": "/api/locations"
                }
            }
        },
        "enums": {
            "Rarity": ["COMMON", "RARE", "EPIC", "LEGENDARY", "CHAMPION"],
            "DeckSortBy": ["RECENT", "GAMES_PLAYED", "WIN_RATE", "WINS"]
        },
        "documentation": "/docs"
    }


# ===== CARDS ENDPOINTS =====

@router.get("/cards", response_model=CardList)
@limiter.limit("60/minute")
async def get_cards(
    request: Request,
    rarity: Annotated[Rarity | None, Query(
        description="Filter by card rarity")] = None
):
    """
    Get all cards, optionally filtered by rarity.

    Args:
        rarity: Optional rarity filter (COMMON, RARE, EPIC, LEGENDARY, CHAMPION)

    Returns:
        List of cards
    """
    db = get_database_service()

    if rarity:
        return await db.get_cards_by_rarity(rarity)
    else:
        return await db.get_all_cards()


@router.get("/cards/{card_id}", response_model=Card)
@limiter.limit("60/minute")
async def get_card_by_id(request: Request, card_id: str):
    """
    Get a specific card by its ID.

    Args:
        card_id: The card ID to fetch

    Returns:
        Card object

    Raises:
        HTTPException: 404 if card not found
    """
    db = get_database_service()
    card_id_int = int(card_id)
    card = await db.get_card_by_id(card_id_int)

    if card is None:
        raise HTTPException(
            status_code=404, detail=f"Card with id '{card_id}' not found")

    return card


@router.get("/cards/{card_id}/stats", response_model=CardStats)
@limiter.limit("60/minute")
async def get_card_stats(
    request: Request,
    card_id: str,
    season_id: Annotated[int | None, Query(
        description="Filter by season (e.g., 202601)")] = None,
    league: Annotated[str | None, Query(
        description="Filter by league tier (e.g., '7')")] = None
):
    """
    Get usage statistics for a specific card.

    Returns win rate, usage rate, and total games from card_usage_facts.

    Args:
        card_id: The card ID to fetch stats for
        season_id: Optional season filter (e.g., 202601)
        league: Optional league filter (e.g., "7")

    Returns:
        CardStats object with usage statistics

    Raises:
        HTTPException: 404 if card not found
    """
    db = get_database_service()
    card_id_int = int(card_id)
    stats = await db.get_card_stats_by_id(
        card_id=card_id_int,
        season_id=season_id,
        league=league
    )

    if stats is None:
        raise HTTPException(
            status_code=404, detail=f"Card with id '{card_id}' not found")

    return stats


# ===== DECKS ENDPOINTS =====

@router.get("/decks")
@limiter.limit("5/second;30/minute;500/day")
async def search_decks(
    request: Request,
    include: Annotated[str | None, Query(
        description="Comma-separated card IDs that must be in deck")] = None,
    exclude: Annotated[str | None, Query(
        description="Comma-separated card IDs that must not be in deck")] = None,
    sort_by: Annotated[DeckSortBy, Query(
        description="Sort by metric")] = DeckSortBy.RECENT,
    min_games: Annotated[int, Query(
        ge=0, description="Minimum games played")] = 0,
    page: Annotated[int, Query(ge=1)] = 1,
    page_size: Annotated[int, Query(ge=1, le=200)] = 24,
    include_cards: Annotated[bool, Query(
        description="Include card details and variants")] = False
):
    """
    Search for decks with stats and filters (paginated).

    Args:
        include: Comma-separated list of card IDs that must be in the deck.
            Supports variant filtering: use "card_id_evolution_level" format (e.g., "26000012_1" for evolved Skeleton Army).
            Evolution levels: 0 (normal), 1 (evolved), 2 (hero).
            Omit evolution_level to match any variant (e.g., "26000012" matches all Skeleton Army variants).
        exclude: Comma-separated list of card IDs that must not be in the deck (same format as include)
        sort_by: How to sort results (RECENT, GAMES_PLAYED, WIN_RATE, WINS, default: RECENT)
        min_games: Minimum number of games played (default: 0)
        page: Page number (1-indexed, default: 1)
        page_size: Results per page (1-200, default: 24)
        include_cards: Include card details and variants for each deck (default: false)

    Returns:
        Paginated response with decks matching the search criteria and pagination metadata

    Examples:
        - /decks?include=26000000,26000001&sort_by=WIN_RATE&min_games=20&include_cards=true&page=1&page_size=24
        - /decks?include=26000012_1&exclude=26000010&sort_by=WINS&page=2&page_size=12
        - /decks?sort_by=GAMES_PLAYED&page=1
    """
    # --- Check cache first ---
    cache_key = make_deck_cache_key(
        include, exclude, sort_by.value, min_games, page, page_size, include_cards
    )
    cached = get_cached_decks(cache_key)
    if cached is not None:
        response = JSONResponse(content=cached)
        response.headers["X-Cache"] = "HIT"
        response.headers["Cache-Control"] = "public, max-age=300"
        return response

    # --- Cache miss: query database ---
    db = get_database_service()

    include_card_ids = None
    if include:
        include_card_ids = []
        for cid in include.split(","):
            cid = cid.strip()
            if not cid:
                continue
            try:
                if "_" in cid:
                    # Validate format: card_id_evolution_level (e.g., "26000012_1")
                    card_id, evo_level = cid.split("_", 1)
                    int(card_id)  # Validate card_id is numeric
                    int(evo_level)  # Validate evolution_level is numeric
                    include_card_ids.append(cid)  # Keep as string "26000012_1"
                else:
                    # Backward compatible: just card_id (any variant)
                    include_card_ids.append(int(cid))
            except ValueError as exc:
                raise HTTPException(
                    status_code=400,
                    detail=f"Invalid include card id: {cid}. Use numeric card IDs (e.g. 26000024) or card_id_variant (e.g. 26000024_1)."
                ) from exc

    exclude_card_ids = None
    if exclude:
        exclude_card_ids = []
        for cid in exclude.split(","):
            cid = cid.strip()
            if not cid:
                continue
            try:
                if "_" in cid:
                    # Validate format: card_id_evolution_level (e.g., "26000012_1")
                    card_id, evo_level = cid.split("_", 1)
                    int(card_id)  # Validate card_id is numeric
                    int(evo_level)  # Validate evolution_level is numeric
                    exclude_card_ids.append(cid)  # Keep as string "26000012_1"
                else:
                    # Backward compatible: just card_id (any variant)
                    exclude_card_ids.append(int(cid))
            except ValueError as exc:
                raise HTTPException(
                    status_code=400,
                    detail=f"Invalid exclude card id: {cid}. Use numeric card IDs (e.g. 26000024) or card_id_variant (e.g. 26000024_1)."
                ) from exc

    # Enforce query complexity limits
    if include_card_ids and len(include_card_ids) > MAX_INCLUDE_CARDS:
        raise HTTPException(
            status_code=400,
            detail=f"Cannot include more than {MAX_INCLUDE_CARDS} cards."
        )
    if exclude_card_ids and len(exclude_card_ids) > MAX_EXCLUDE_CARDS:
        raise HTTPException(
            status_code=400,
            detail=f"Cannot exclude more than {MAX_EXCLUDE_CARDS} cards."
        )

    offset = (page - 1) * page_size

    try:
        decks, total = await asyncio.wait_for(
            db.search_decks_with_stats(
                include_card_ids=include_card_ids,
                exclude_card_ids=exclude_card_ids,
                sort_by=sort_by,
                min_games=min_games,
                limit=page_size,
                offset=offset
            ),
            timeout=DECK_SEARCH_TIMEOUT
        )
    except asyncio.TimeoutError:
        raise HTTPException(
            status_code=504,
            detail="Search took too long. Try narrowing your filters."
        ) from None

    deck_payloads = []
    for deck in decks:
        payload = {
            "deck_id": deck.deck_id,
            "avg_elixir": deck.avg_elixir,
            "games_played": deck.games_played,
            "wins": deck.wins,
            "losses": deck.losses,
            "win_rate": deck.win_rate,
            "last_seen": deck.last_seen,
        }

        if include_cards:
            cards = []
            for card_id, evolution_level in _parse_deck_id(deck.deck_id):
                card_name = CARD_ID_TO_NAME.get(card_id)
                if card_name:
                    cards.append({
                        "card_id": card_id,
                        "card_name": card_name,
                        "evolution_level": evolution_level,
                        "variant": _variant_from_evolution_level(evolution_level),
                    })
            payload["cards"] = cards

        deck_payloads.append(payload)

    total_pages = (total + page_size - 1) // page_size if total > 0 else 0
    has_next = page < total_pages
    has_previous = page > 1

    result = {
        "decks": deck_payloads,
        "total": total,
        "page": page,
        "page_size": page_size,
        "total_pages": total_pages,
        "has_next": has_next,
        "has_previous": has_previous,
    }

    # Store in cache for next time
    set_cached_decks(cache_key, result)

    response = JSONResponse(content=result)
    response.headers["X-Cache"] = "MISS"
    response.headers["Cache-Control"] = "public, max-age=300"
    return response


# ===== LOCATIONS ENDPOINTS =====

@router.get("/locations", response_model=Locations)
@limiter.limit("60/minute")
async def get_locations(request: Request):
    """
    Get all locations.

    Returns:
        List of all locations
    """
    db = get_database_service()
    return await db.get_all_locations()
