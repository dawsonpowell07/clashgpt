"""
API Router

FastAPI router for database endpoints.
Provides REST API access to cards, decks, and locations.
"""

import asyncio
from typing import Annotated

from fastapi import APIRouter, Depends, HTTPException, Query, Request
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

VALID_VARIANTS = {"normal", "evolution", "heroic"}
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
                    "description": "Get usage statistics for a specific card (win rate, usage rate, deck appearance rate)",
                    "parameters": {
                        "card_id": "Required - The card ID to fetch stats for",
                        "season_id": "Optional - Filter by season (e.g., 202601)"
                    },
                    "example": "/api/cards/26000000/stats?season_id=202601"
                }
            },
            "decks": {
                "GET /api/decks": {
                    "description": "Search and filter decks with stats (paginated)",
                    "parameters": {
                        "include": "Optional - Comma-separated card IDs that must be in deck. Supports variants: card_id:variant (e.g., 26000012:evolution). Valid variants: normal, evolution, heroic.",
                        "exclude": "Optional - Comma-separated card IDs that must not be in deck. Same format as include.",
                        "sort_by": "Optional - Sort by (RECENT, GAMES_PLAYED, WIN_RATE, WINS, default: RECENT)",
                        "min_games": "Optional - Minimum games played (default: 0)",
                        "page": "Optional - Page number (1-indexed, default: 1)",
                        "page_size": "Optional - Results per page (1-200, default: 24)",
                        "include_cards": "Optional - Include card details and variants for each deck (default: false)"
                    },
                    "example": "/api/decks?include=26000000,26000012:evolution&sort_by=WIN_RATE&min_games=20&include_cards=true&page=1&page_size=24"
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
):
    """
    Get usage statistics for a specific card.

    Returns win rate, usage rate, and deck appearance rate from fact_battle_participants.

    Args:
        card_id: The card ID to fetch stats for
        season_id: Optional season filter (e.g., 202601)

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
        include: Comma-separated card IDs that must be in the deck.
            Supports variant filtering: "card_id:variant"
            (e.g., "26000012:evolution" for evolved Skeleton Army).
            Valid variants: normal, evolution, heroic.
            Omit variant to match any (e.g., "26000012" matches all variants).
        exclude: Same format as include — card IDs that must NOT be in the deck.
        sort_by: RECENT | GAMES_PLAYED | WIN_RATE | WINS (default: RECENT)
        min_games: Minimum games played (default: 0)
        page: Page number 1-indexed (default: 1)
        page_size: Results per page 1-200 (default: 24)
        include_cards: Include card details for each deck (default: false)

    Examples:
        - /decks?include=26000000,26000001&sort_by=WIN_RATE&min_games=20&include_cards=true
        - /decks?include=26000012:evolution&exclude=26000010&sort_by=WINS
        - /decks?sort_by=GAMES_PLAYED
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

    include_card_ids = _parse_card_filter_param(include, "include")
    if isinstance(include_card_ids, HTTPException):
        raise include_card_ids

    exclude_card_ids = _parse_card_filter_param(exclude, "exclude")
    if isinstance(exclude_card_ids, HTTPException):
        raise exclude_card_ids

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
                offset=offset,
                include_cards=include_cards,
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
        payload: dict = {
            "deck_id": deck.deck_id,
            "avg_elixir": deck.avg_elixir,
            "games_played": deck.games_played,
            "wins": deck.wins,
            "losses": deck.losses,
            "win_rate": deck.win_rate,
            "last_seen": deck.last_seen,
        }

        if include_cards:
            payload["cards"] = [
                {
                    "card_id": c.card_id,
                    "card_name": c.card_name,
                    "slot_index": c.slot_index,
                    "variant": c.variant,
                }
                for c in (deck.cards or [])
            ]

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

    set_cached_decks(cache_key, result)

    response = JSONResponse(content=result)
    response.headers["X-Cache"] = "MISS"
    response.headers["Cache-Control"] = "public, max-age=300"
    return response


def _parse_card_filter_param(
    cards_str: str | None,
    param_name: str,
) -> list[str | int] | None | HTTPException:
    """
    Parse a comma-separated card filter query param into a list of card specs.
    Accepts "card_id" (int, any variant) or "card_id:variant" (str, specific variant).
    Returns None if empty, list of specs if valid, HTTPException on bad input.
    """
    if not cards_str:
        return None
    result = []
    for raw in cards_str.split(","):
        cid = raw.strip()
        if not cid:
            continue
        try:
            if ":" in cid:
                card_id_str, variant = cid.split(":", 1)
                int(card_id_str)
                variant = variant.lower()
                if variant not in VALID_VARIANTS:
                    return HTTPException(
                        status_code=400,
                        detail=(
                            f"Invalid variant '{variant}' in {param_name}='{cid}'. "
                            f"Valid variants: {', '.join(sorted(VALID_VARIANTS))}."
                        )
                    )
                result.append(f"{card_id_str}:{variant}")
            else:
                result.append(int(cid))
        except ValueError:
            return HTTPException(
                status_code=400,
                detail=(
                    f"Invalid card id '{cid}' in {param_name}. "
                    "Use numeric IDs (e.g. 26000024) or card_id:variant (e.g. 26000024:evolution)."
                )
            )
    return result or None


# ===== AUTH DEPENDENCY =====

def _get_current_user_id_dep():
    """Lazy import to avoid circular imports at module load time."""
    from app.app_utils.clerk_auth import get_current_user_id
    return get_current_user_id


# ===== PLAYERS ENDPOINTS =====

@router.get("/players")
@limiter.limit("30/minute")
async def search_players(
    request: Request,
    name: Annotated[str, Query(min_length=1, description="Player name to search (partial match)")],
    user_id: str = Depends(_get_current_user_id_dep()),
):
    """
    Search players by name from dim_players (top ranked battle participants).

    Returns up to 10 matching players with aggregated stats:
    total_games, wins, win_rate, avg_crowns, avg_elixir_leaked.
    """
    db = get_database_service()
    players = await db.search_players_by_name(name=name, limit=10)
    return {"players": players}


@router.get("/players/{player_tag}/info")
@limiter.limit("30/minute")
async def get_player_cr_info(
    request: Request,
    player_tag: str,
    user_id: str = Depends(_get_current_user_id_dep()),
):
    """
    Get live player info from the Clash Royale API.

    Returns trophies, Path of Legends data, wins/losses, clan, arena,
    favorite card, donations, and challenge stats.
    """
    from app.services.clash_royale import (
        ClashRoyaleNotFoundError,
        ClashRoyaleRateLimitError,
        ClashRoyaleService,
    )
    from app.tools.serialization import serialize_dataclass

    try:
        async with ClashRoyaleService() as service:
            player = await service.get_player(player_tag)
            return serialize_dataclass(player)
    except ClashRoyaleNotFoundError:
        raise HTTPException(status_code=404, detail="Player not found in Clash Royale API")
    except ClashRoyaleRateLimitError:
        raise HTTPException(status_code=429, detail="Clash Royale API rate limit exceeded")
    except Exception as e:
        raise HTTPException(status_code=502, detail=f"Clash Royale API error: {e!s}")


@router.get("/players/{player_tag}/decks")
@limiter.limit("30/minute")
async def get_player_top_decks(
    request: Request,
    player_tag: str,
    user_id: str = Depends(_get_current_user_id_dep()),
):
    """
    Get the top 5 most-used decks for a player, with card details.
    """
    db = get_database_service()
    decks = await db.get_player_top_decks(player_tag=player_tag, limit=5)
    return {"decks": decks}


@router.get("/players/{player_tag}/battles")
@limiter.limit("30/minute")
async def get_player_recent_battles(
    request: Request,
    player_tag: str,
    user_id: str = Depends(_get_current_user_id_dep()),
):
    """
    Get the 20 most recent battles for a player.
    """
    db = get_database_service()
    battles = await db.get_player_recent_battles(player_tag=player_tag, limit=20)
    return {"battles": battles}


# ===== MATCHUPS ENDPOINT =====

# Per-request timeout (seconds)
MATCHUP_SEARCH_TIMEOUT = 10.0


@router.get("/matchups")
@limiter.limit("30/minute")
async def get_deck_matchups(
    request: Request,
    deck: Annotated[str, Query(
        description="Comma-separated card specs: card_id:variant for each of 8 cards. "
                    "Variant must be one of: normal, evolution, heroic."
    )],
    page: Annotated[int, Query(ge=1)] = 1,
    page_size: Annotated[int, Query(ge=1, le=100)] = 20,
    user_id: str = Depends(_get_current_user_id_dep()),
):
    """
    Find recent battles for an exact 8-card deck (with variants).

    The deck parameter must contain exactly 8 comma-separated card specs in the
    format ``card_id:variant`` where variant is ``normal``, ``evolution``, or
    ``heroic``.  The lookup matches the database record that has **exactly** these
    8 (card_id, variant) pairs – no more, no fewer.

    Returns aggregate win/loss stats and paginated recent battles with each
    opponent's deck cards.

    Example:
        /api/matchups?deck=26000021:normal,26000000:normal,26000038:normal,26000030:normal,26000002:normal,26000005:normal,28000000:normal,28000009:normal
    """
    if not deck:
        raise HTTPException(status_code=400, detail="deck parameter is required.")

    raw_specs = [s.strip() for s in deck.split(",") if s.strip()]
    if len(raw_specs) != 8:
        raise HTTPException(
            status_code=400,
            detail=f"Exactly 8 card specs are required; got {len(raw_specs)}."
        )

    card_specs: list[tuple[int, str]] = []
    for raw in raw_specs:
        if ":" not in raw:
            raise HTTPException(
                status_code=400,
                detail=(
                    f"Invalid card spec '{raw}'. "
                    "Use card_id:variant format (e.g. 26000021:normal)."
                )
            )
        card_id_str, variant = raw.split(":", 1)
        variant = variant.lower()
        if variant not in VALID_VARIANTS:
            raise HTTPException(
                status_code=400,
                detail=(
                    f"Invalid variant '{variant}' in '{raw}'. "
                    f"Valid variants: {', '.join(sorted(VALID_VARIANTS))}."
                )
            )
        try:
            card_specs.append((int(card_id_str), variant))
        except ValueError:
            raise HTTPException(
                status_code=400,
                detail=f"Invalid card_id '{card_id_str}' — must be a numeric ID."
            )

    db = get_database_service()
    offset = (page - 1) * page_size

    try:
        result = await asyncio.wait_for(
            db.get_deck_matchups(
                card_specs=card_specs,
                limit=page_size,
                offset=offset,
            ),
            timeout=MATCHUP_SEARCH_TIMEOUT,
        )
    except asyncio.TimeoutError:
        raise HTTPException(
            status_code=504,
            detail="Matchup search timed out. Try again shortly."
        ) from None

    total = result["total_matchups"]
    total_pages = (total + page_size - 1) // page_size if total > 0 else 0

    return {
        "deck_id": result["deck_id"],
        "deck_cards": result["deck_cards"],
        "stats": result["stats"],
        "matchups": result["matchups"],
        "total": total,
        "page": page,
        "page_size": page_size,
        "total_pages": total_pages,
        "has_next": page < total_pages,
        "has_previous": page > 1,
    }


# ===== TRACKER ENDPOINTS =====


@router.post("/tracker/register")
@limiter.limit("10/minute")
async def register_tracker(
    request: Request,
    player_tag: Annotated[str, Query(description="Your Clash Royale player tag (e.g. #2PP)")],
    user_id: str = Depends(_get_current_user_id_dep()),
):
    """
    Link a Clash Royale player tag to the authenticated user's account.

    Validates the tag against the Clash Royale API, then upserts it
    into tracked_players so the ETL pipeline will scan battles for this tag.
    """
    from app.services.clash_royale import (
        ClashRoyaleNotFoundError,
        ClashRoyaleRateLimitError,
        ClashRoyaleService,
    )

    # Normalise tag
    normalised = player_tag.strip().upper()
    if not normalised.startswith("#"):
        normalised = f"#{normalised}"

    # Validate tag against CR API and get player name
    try:
        async with ClashRoyaleService() as service:
            player = await service.get_player(normalised)
            player_name = player.name
    except ClashRoyaleNotFoundError:
        raise HTTPException(status_code=404, detail=f"Player tag '{normalised}' not found in Clash Royale. Check the tag and try again.")
    except ClashRoyaleRateLimitError:
        raise HTTPException(status_code=429, detail="Clash Royale API rate limit hit. Please try again in a moment.")
    except Exception as e:
        raise HTTPException(status_code=502, detail=f"Could not verify player tag: {e!s}")

    db = get_database_service()
    tracked = await db.register_tracked_player(
        user_id=user_id,
        player_tag=normalised,
        player_name=player_name,
    )
    return {
        "message": "Player tag registered successfully. Your battles will be scanned on the next ETL run.",
        "tracked_player": tracked,
    }


@router.get("/tracker/me")
@limiter.limit("30/minute")
async def get_tracker_me(
    request: Request,
    user_id: str = Depends(_get_current_user_id_dep()),
):
    """
    Get the tracked player linked to the authenticated user's account.
    Returns 404 if no tag is linked yet.
    """
    db = get_database_service()
    tracked = await db.get_tracked_player(user_id=user_id)
    if tracked is None:
        raise HTTPException(status_code=404, detail="No player tag linked. Use POST /api/tracker/register first.")
    return {"tracked_player": tracked}


@router.get("/tracker/me/stats")
@limiter.limit("30/minute")
async def get_tracker_stats(
    request: Request,
    user_id: str = Depends(_get_current_user_id_dep()),
):
    """
    Get aggregate battle stats from the database for the authenticated user's linked player.
    """
    db = get_database_service()
    tracked = await db.get_tracked_player(user_id=user_id)
    if tracked is None:
        raise HTTPException(status_code=404, detail="No player tag linked. Use POST /api/tracker/register first.")

    stats = await db.get_tracker_stats(player_tag=tracked["player_tag"])
    return {"player_tag": tracked["player_tag"], "player_name": tracked["player_name"], "stats": stats}


@router.get("/tracker/me/decks")
@limiter.limit("30/minute")
async def get_tracker_decks(
    request: Request,
    limit: Annotated[int, Query(ge=1, le=20)] = 10,
    user_id: str = Depends(_get_current_user_id_dep()),
):
    """
    Get the top decks used by the authenticated user's linked player.
    """
    db = get_database_service()
    tracked = await db.get_tracked_player(user_id=user_id)
    if tracked is None:
        raise HTTPException(status_code=404, detail="No player tag linked. Use POST /api/tracker/register first.")

    decks = await db.get_tracker_deck_breakdown(player_tag=tracked["player_tag"], limit=limit)
    return {"player_tag": tracked["player_tag"], "player_name": tracked["player_name"], "decks": decks}


@router.get("/tracker/me/battles")
@limiter.limit("30/minute")
async def get_tracker_battles(
    request: Request,
    page: Annotated[int, Query(ge=1)] = 1,
    page_size: Annotated[int, Query(ge=1, le=50)] = 20,
    user_id: str = Depends(_get_current_user_id_dep()),
):
    """
    Get paginated battle history for the authenticated user's linked player.
    """
    db = get_database_service()
    tracked = await db.get_tracked_player(user_id=user_id)
    if tracked is None:
        raise HTTPException(status_code=404, detail="No player tag linked. Use POST /api/tracker/register first.")

    offset = (page - 1) * page_size
    result = await db.get_tracker_battles(
        player_tag=tracked["player_tag"],
        limit=page_size,
        offset=offset,
    )
    total = result["total"]
    total_pages = (total + page_size - 1) // page_size if total > 0 else 0
    return {
        "player_tag": tracked["player_tag"],
        "player_name": tracked["player_name"],
        "battles": result["battles"],
        "total": total,
        "page": page,
        "page_size": page_size,
        "total_pages": total_pages,
        "has_next": page < total_pages,
        "has_previous": page > 1,
    }


@router.get("/tracker/me/worst-matchups")
@limiter.limit("30/minute")
async def get_tracker_worst_matchups(
    request: Request,
    limit: Annotated[int, Query(ge=1, le=20)] = 5,
    min_games: Annotated[int, Query(ge=1)] = 3,
    user_id: str = Depends(_get_current_user_id_dep()),
):
    """
    Get the opposing win conditions the authenticated user's linked player has the worst win rate against.
    """
    db = get_database_service()
    tracked = await db.get_tracked_player(user_id=user_id)
    if tracked is None:
        raise HTTPException(status_code=404, detail="No player tag linked. Use POST /api/tracker/register first.")

    matchups = await db.get_tracker_worst_matchups(
        player_tag=tracked["player_tag"],
        limit=limit,
        min_games=min_games,
    )
    return {"player_tag": tracked["player_tag"], "player_name": tracked["player_name"], "worst_matchups": matchups}



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
