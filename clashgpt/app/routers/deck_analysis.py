"""
Deck Analysis Router

Matchup and head-to-head win condition endpoints.
"""

import asyncio
from typing import Annotated

from fastapi import APIRouter, HTTPException, Query, Request

from app.cache import (
    TTL_LONG,
    cache,
    make_matchup_cache_key,
    make_win_condition_cache_key,
)
from app.rate_limit import limiter
from app.routers.decks import VALID_VARIANTS
from app.services.database import get_database_service

router = APIRouter(prefix="/api", tags=["deck-analysis"])

MATCHUP_SEARCH_TIMEOUT = 10.0
WIN_CONDITION_MATCHUP_TIMEOUT = 15.0


# ===== MATCHUPS ENDPOINT =====


@router.get("/matchups")
@limiter.limit("10/minute")
async def get_deck_matchups(
    request: Request,
    deck: Annotated[
        str,
        Query(
            description="Comma-separated card specs: card_id:variant for each of 8 cards. "
            "Variant must be one of: normal, evolution, heroic."
        ),
    ],
    page: Annotated[int, Query(ge=1)] = 1,
    page_size: Annotated[int, Query(ge=1, le=100)] = 20,
    include_opponent: Annotated[
        str | None,
        Query(
            description="Comma-separated card_id:variant specs that opponent decks must contain."
        ),
    ] = None,
    exclude_opponent: Annotated[
        str | None,
        Query(
            description="Comma-separated card_id:variant specs that opponent decks must not contain."
        ),
    ] = None,
):
    """
    Find recent battles for an exact 8-card deck (with variants).

    The deck parameter must contain exactly 8 comma-separated card specs in the
    format ``card_id:variant`` where variant is ``normal``, ``evolution``, or
    ``heroic``.  The lookup matches the database record that has **exactly** these
    8 (card_id, variant) pairs - no more, no fewer.

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
            detail=f"Exactly 8 card specs are required; got {len(raw_specs)}.",
        )

    card_specs: list[tuple[int, str]] = []
    for raw in raw_specs:
        if ":" not in raw:
            raise HTTPException(
                status_code=400,
                detail=(
                    f"Invalid card spec '{raw}'. "
                    "Use card_id:variant format (e.g. 26000021:normal)."
                ),
            )
        card_id_str, variant = raw.split(":", 1)
        variant = variant.lower()
        if variant not in VALID_VARIANTS:
            raise HTTPException(
                status_code=400,
                detail=(
                    f"Invalid variant '{variant}' in '{raw}'. "
                    f"Valid variants: {', '.join(sorted(VALID_VARIANTS))}."
                ),
            )
        try:
            card_specs.append((int(card_id_str), variant))
        except ValueError:
            raise HTTPException(
                status_code=400,
                detail=f"Invalid card_id '{card_id_str}' — must be a numeric ID.",
            ) from None

    def _parse_opponent_specs(raw_param: str | None) -> list[tuple[int, str]]:
        if not raw_param:
            return []
        specs = []
        for raw in (s.strip() for s in raw_param.split(",") if s.strip()):
            if ":" not in raw:
                raise HTTPException(
                    status_code=400,
                    detail=f"Invalid opponent card spec '{raw}'. Use card_id:variant format.",
                )
            cid_str, var = raw.split(":", 1)
            var = var.lower()
            if var not in VALID_VARIANTS:
                raise HTTPException(
                    status_code=400,
                    detail=f"Invalid variant '{var}' in '{raw}'. Valid: {', '.join(sorted(VALID_VARIANTS))}.",
                )
            try:
                specs.append((int(cid_str), var))
            except ValueError:
                raise HTTPException(
                    status_code=400,
                    detail=f"Invalid card_id '{cid_str}' — must be numeric.",
                ) from None
        return specs

    include_opponent_specs = _parse_opponent_specs(include_opponent)
    exclude_opponent_specs = _parse_opponent_specs(exclude_opponent)

    cache_key = make_matchup_cache_key(deck, page, page_size, include_opponent, exclude_opponent)
    cached = await cache.get(cache_key)
    if cached is not None:
        return cached

    db = get_database_service()
    offset = (page - 1) * page_size

    try:
        result = await asyncio.wait_for(
            db.get_deck_matchups(
                card_specs=card_specs,
                limit=page_size,
                offset=offset,
                include_opponent_specs=include_opponent_specs or None,
                exclude_opponent_specs=exclude_opponent_specs or None,
            ),
            timeout=MATCHUP_SEARCH_TIMEOUT,
        )
    except asyncio.TimeoutError:
        raise HTTPException(
            status_code=504, detail="Matchup search timed out. Try again shortly."
        ) from None

    total = result["total_matchups"]
    total_pages = (total + page_size - 1) // page_size if total > 0 else 0

    payload = {
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
    await cache.set(cache_key, payload, ttl=TTL_LONG)
    return payload


# ===== WIN CONDITION MATCHUP ENDPOINT =====


@router.get("/win-condition-matchup")
@limiter.limit("10/minute")
async def get_win_condition_matchup(
    request: Request,
    card_a: Annotated[
        int, Query(description="Card ID for side A — must be a win condition")
    ],
    card_b: Annotated[
        int, Query(description="Card ID for side B — must be a win condition")
    ],
):
    """
    Get head-to-head win rate stats for two win condition cards.

    Aggregates all recorded battles where one side's deck contained card_a
    and the opponent's deck contained card_b, then returns:
      - Win rates for both sides
      - Total battles analysed
      - Top 5 most-played decks for each side (with card compositions)

    Both card IDs must be recognised win conditions. Returns 400 if either
    card is not a valid win condition or if both IDs are the same.

    Example:
        /api/win-condition-matchup?card_a=26000003&card_b=27000008
    """
    from app.services.database import WIN_CONDITION_CARD_IDS

    if card_a not in WIN_CONDITION_CARD_IDS:
        raise HTTPException(
            status_code=400,
            detail=f"Card ID {card_a} is not a valid win condition.",
        )
    if card_b not in WIN_CONDITION_CARD_IDS:
        raise HTTPException(
            status_code=400,
            detail=f"Card ID {card_b} is not a valid win condition.",
        )
    if card_a == card_b:
        raise HTTPException(
            status_code=400,
            detail="Both card IDs are the same. Provide two different win conditions.",
        )

    cache_key = make_win_condition_cache_key(card_a, card_b)
    cached = await cache.get(cache_key)
    if cached is not None:
        return cached

    db = get_database_service()

    try:
        result = await asyncio.wait_for(
            db.get_win_condition_matchup(card_a_id=card_a, card_b_id=card_b),
            timeout=WIN_CONDITION_MATCHUP_TIMEOUT,
        )
    except asyncio.TimeoutError:
        raise HTTPException(
            status_code=504,
            detail="Matchup query timed out. Try again shortly.",
        ) from None

    await cache.set(cache_key, result, ttl=TTL_LONG)
    return result
