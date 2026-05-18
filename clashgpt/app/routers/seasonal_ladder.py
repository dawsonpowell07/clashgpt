"""
Seasonal Ladder Router

Endpoints for seasonal ladder deck search (e.g. Sudden Death League).
"""

import asyncio
from typing import Annotated

from fastapi import APIRouter, HTTPException, Query, Request
from fastapi.responses import JSONResponse

from app.cache import TTL_MEDIUM, cache, make_seasonal_ladder_cache_key
from app.models.models import DeckSortBy
from app.rate_limit import limiter
from app.routers.decks import parse_card_filter_param
from app.services.database import get_database_service

router = APIRouter(prefix="/api", tags=["seasonal-ladder"])

MAX_INCLUDE_CARDS = 8
MAX_EXCLUDE_CARDS = 8
DECK_SEARCH_TIMEOUT = 10.0

# ===== SEASONAL LADDER CONFIG =====
# Update each season with the new game_mode string stored in processed_battles.

CURRENT_SEASONAL_LADDER = {
    # Set enabled=False between seasons to return 503 from the decks endpoint.
    "enabled": True,
    "game_mode": "SuddenDeath",
    "name": "Sudden Death",
}


# ===== SEASONAL LADDER ENDPOINTS =====


@router.get("/seasonal-ladder/decks")
@limiter.limit("2/second;20/minute;200/day")
async def search_seasonal_ladder_decks(
    request: Request,
    include: Annotated[
        str | None,
        Query(description="Comma-separated card IDs (supports card_id:variant format)"),
    ] = None,
    exclude: Annotated[
        str | None,
        Query(description="Comma-separated card IDs that must not be in deck"),
    ] = None,
    sort_by: Annotated[
        DeckSortBy, Query(description="Sort by metric")
    ] = DeckSortBy.GAMES_PLAYED,
    min_games: Annotated[int, Query(ge=0, description="Minimum games played")] = 0,
    page: Annotated[int, Query(ge=1)] = 1,
    page_size: Annotated[int, Query(ge=1, le=200)] = 24,
):
    """
    Search decks from the current seasonal ladder mode.

    Filtered to the configured game_mode (e.g. SuddenDeath). Supports
    card_id:variant filtering (e.g. "26000012:evolution").

    Update CURRENT_SEASONAL_LADDER at the top of this file each season.

    Examples:
        - /seasonal-ladder/decks
        - /seasonal-ladder/decks?include=26000000,26000021:evolution&min_games=5
        - /seasonal-ladder/decks?exclude=26000055&sort_by=WIN_RATE
    """
    if not CURRENT_SEASONAL_LADDER["enabled"]:
        raise HTTPException(
            status_code=503, detail="No seasonal ladder is currently active."
        )

    include_card_ids = parse_card_filter_param(include, "include")
    if isinstance(include_card_ids, HTTPException):
        raise include_card_ids

    exclude_card_ids = parse_card_filter_param(exclude, "exclude")
    if isinstance(exclude_card_ids, HTTPException):
        raise exclude_card_ids

    if include_card_ids and len(include_card_ids) > MAX_INCLUDE_CARDS:
        raise HTTPException(
            status_code=400,
            detail=f"Cannot include more than {MAX_INCLUDE_CARDS} cards.",
        )
    if exclude_card_ids and len(exclude_card_ids) > MAX_EXCLUDE_CARDS:
        raise HTTPException(
            status_code=400,
            detail=f"Cannot exclude more than {MAX_EXCLUDE_CARDS} cards.",
        )

    cache_key = make_seasonal_ladder_cache_key(
        include, exclude, sort_by.value, min_games, page, page_size
    )
    cached = await cache.get(cache_key)
    if cached is not None:
        response = JSONResponse(content=cached)
        response.headers["X-Cache"] = "HIT"
        response.headers["Cache-Control"] = f"public, max-age={TTL_MEDIUM}"
        return response

    db = get_database_service()
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
                include_cards=True,
                game_mode=CURRENT_SEASONAL_LADDER["game_mode"],
            ),
            timeout=DECK_SEARCH_TIMEOUT,
        )
    except asyncio.TimeoutError:
        raise HTTPException(
            status_code=504, detail="Search took too long. Try narrowing your filters."
        ) from None

    deck_payloads = [
        {
            "deck_id": deck.deck_id,
            "avg_elixir": deck.avg_elixir,
            "games_played": deck.games_played,
            "wins": deck.wins,
            "losses": deck.losses,
            "win_rate": deck.win_rate,
            "last_seen": deck.last_seen,
            "cards": [
                {
                    "card_id": c.card_id,
                    "card_name": c.card_name,
                    "slot_index": c.slot_index,
                    "variant": c.variant,
                }
                for c in (deck.cards or [])
            ],
        }
        for deck in decks
    ]

    total_pages = (total + page_size - 1) // page_size if total > 0 else 0

    result = {
        "decks": deck_payloads,
        "total": total,
        "page": page,
        "page_size": page_size,
        "total_pages": total_pages,
        "has_next": page < total_pages,
        "has_previous": page > 1,
    }

    await cache.set(cache_key, result, ttl=TTL_MEDIUM)

    response = JSONResponse(content=result)
    response.headers["X-Cache"] = "MISS"
    response.headers["Cache-Control"] = f"public, max-age={TTL_MEDIUM}"
    return response
