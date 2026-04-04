"""
Global Tournament Router

Endpoints for global tournament deck search and leaderboard.
"""

import asyncio
from typing import Annotated

from fastapi import APIRouter, HTTPException, Query, Request
from fastapi.responses import JSONResponse

from app.rate_limit import limiter
from app.services.database import get_database_service

router = APIRouter(prefix="/api", tags=["global-tournament"])

MAX_INCLUDE_CARDS = 8
MAX_EXCLUDE_CARDS = 8
DECK_SEARCH_TIMEOUT = 10.0

# ===== GLOBAL TOURNAMENT CONFIG =====
# Update these two values each month for the new tournament.
# game_mode must match the game_mode string stored in processed_battles by the ETL.
# tournament_id is the Clash Royale API tournament ID used for the leaderboard.

CURRENT_GLOBAL_TOURNAMENT = {
    # Set enabled=False between tournaments to return 503 from the decks endpoint.
    # The leaderboard endpoint is unaffected — it always proxies the CR API.
    "enabled": False,
    "game_mode": "RetroRoyale",
    "tournament_id": "270787",
}


# ===== GLOBAL TOURNAMENT ENDPOINTS =====


@router.get("/global-tournament/decks")
@limiter.limit("2/second;20/minute;200/day")
async def search_global_tournament_decks(
    request: Request,
    include: Annotated[
        str | None,
        Query(
            description="Comma-separated card IDs that must be in deck (integers only, no variant suffix)"
        ),
    ] = None,
    exclude: Annotated[
        str | None,
        Query(description="Comma-separated card IDs that must not be in deck"),
    ] = None,
    min_games: Annotated[int, Query(ge=0, description="Minimum games played")] = 0,
    page: Annotated[int, Query(ge=1)] = 1,
    page_size: Annotated[int, Query(ge=1, le=200)] = 24,
):
    """
    Search decks from the current global tournament.

    Queries fact_battle_participants for battles matching the configured
    game_mode, parsing the pipe-separated deck_id string stored by the ETL
    (e.g. "26000000.3|26000021.3|...|tower_159000000").

    Update CURRENT_GLOBAL_TOURNAMENT at the top of this file each month.

    Examples:
        - /global-tournament/decks
        - /global-tournament/decks?include=26000000,26000021&min_games=5
        - /global-tournament/decks?exclude=26000055&page=2
    """
    if not CURRENT_GLOBAL_TOURNAMENT["enabled"]:
        raise HTTPException(
            status_code=503, detail="No global tournament is currently active."
        )

    db = get_database_service()

    def _parse_int_ids(s: str | None, name: str) -> list[int] | HTTPException:
        if not s:
            return []
        ids = []
        for part in s.split(","):
            part = part.strip()
            if not part:
                continue
            try:
                ids.append(int(part))
            except ValueError:
                return HTTPException(
                    status_code=400,
                    detail=f"Invalid card ID in '{name}': '{part}'. Must be an integer.",
                )
        return ids

    include_ids = _parse_int_ids(include, "include")
    if isinstance(include_ids, HTTPException):
        raise include_ids

    exclude_ids = _parse_int_ids(exclude, "exclude")
    if isinstance(exclude_ids, HTTPException):
        raise exclude_ids

    if len(include_ids) > MAX_INCLUDE_CARDS:
        raise HTTPException(
            status_code=400,
            detail=f"Cannot include more than {MAX_INCLUDE_CARDS} cards.",
        )
    if len(exclude_ids) > MAX_EXCLUDE_CARDS:
        raise HTTPException(
            status_code=400,
            detail=f"Cannot exclude more than {MAX_EXCLUDE_CARDS} cards.",
        )

    offset = (page - 1) * page_size

    try:
        decks, total = await asyncio.wait_for(
            db.search_global_tournament_decks(
                game_mode=CURRENT_GLOBAL_TOURNAMENT["game_mode"],
                include_card_ids=include_ids or None,
                exclude_card_ids=exclude_ids or None,
                min_games=min_games,
                limit=page_size,
                offset=offset,
            ),
            timeout=DECK_SEARCH_TIMEOUT,
        )
    except asyncio.TimeoutError:
        raise HTTPException(
            status_code=504, detail="Search took too long. Try narrowing your filters."
        ) from None

    total_pages = (total + page_size - 1) // page_size if total > 0 else 0

    result = {
        "decks": decks,
        "total": total,
        "page": page,
        "page_size": page_size,
        "total_pages": total_pages,
        "has_next": page < total_pages,
        "has_previous": page > 1,
    }

    response = JSONResponse(content=result)
    response.headers["Cache-Control"] = "public, max-age=300"
    return response


@router.get("/global-tournament/leaderboard")
@limiter.limit("15/minute")
async def get_global_tournament_leaderboard(request: Request):
    """
    Fetch the top 50 players from the current global tournament leaderboard.

    Hits the Clash Royale API at /leaderboard/{tournament_id}?limit=50.
    Update CURRENT_GLOBAL_TOURNAMENT at the top of this file each month.
    """
    from app.services.clash_royale import (
        ClashRoyaleAPIError,
        ClashRoyaleRateLimitError,
        ClashRoyaleService,
    )
    from app.tools.serialization import serialize_dataclass

    try:
        async with ClashRoyaleService() as service:
            leaderboard = await service.get_tournament_leaderboard(
                CURRENT_GLOBAL_TOURNAMENT["tournament_id"]
            )
            return serialize_dataclass(leaderboard)
    except ClashRoyaleRateLimitError:
        raise HTTPException(
            status_code=429, detail="Clash Royale API rate limit exceeded"
        ) from None
    except ClashRoyaleAPIError as e:
        raise HTTPException(
            status_code=502, detail=f"Clash Royale API error: {e!s}"
        ) from e
