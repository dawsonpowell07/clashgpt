"""
Profiles Router

Player profiles, search, battle history, and tracker endpoints.
"""

from typing import Annotated

from fastapi import APIRouter, Depends, HTTPException, Query, Request

from app.rate_limit import limiter
from app.services.database import get_database_service

router = APIRouter(prefix="/api", tags=["profiles"])


def _get_current_user_id_dep():
    """Lazy import to avoid circular imports at module load time."""
    from app.app_utils.clerk_auth import get_current_user_id

    return get_current_user_id


# ===== PLAYERS ENDPOINTS =====


@router.get("/players")
@limiter.limit("15/minute")
async def search_players(
    request: Request,
    name: Annotated[
        str, Query(min_length=1, description="Player name to search (partial match)")
    ],
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
@limiter.limit("15/minute")
async def get_player_cr_info(
    request: Request,
    player_tag: str,
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
        raise HTTPException(
            status_code=404, detail="Player not found in Clash Royale API"
        ) from None
    except ClashRoyaleRateLimitError:
        raise HTTPException(
            status_code=429, detail="Clash Royale API rate limit exceeded"
        ) from None
    except Exception as e:
        raise HTTPException(
            status_code=502, detail=f"Clash Royale API error: {e!s}"
        ) from e


@router.get("/players/{player_tag}/decks")
@limiter.limit("15/minute")
async def get_player_top_decks(
    request: Request,
    player_tag: str,
):
    """
    Get the top 5 most-used decks for a player, with card details.
    """
    db = get_database_service()
    decks = await db.get_player_top_decks(player_tag=player_tag, limit=5)
    return {"decks": decks}


@router.get("/players/{player_tag}/battles")
@limiter.limit("15/minute")
async def get_player_recent_battles(
    request: Request,
    player_tag: str,
):
    """
    Get the 20 most recent battles for a player.
    """
    db = get_database_service()
    battles = await db.get_player_recent_battles(player_tag=player_tag, limit=20)
    return {"battles": battles}


@router.get("/players/{player_tag}/battles/{battle_id}")
@limiter.limit("20/minute")
async def get_player_battle_detail(
    request: Request,
    player_tag: str,
    battle_id: str,
):
    """
    Get full detail for a single battle belonging to the given player tag.
    """
    db = get_database_service()
    detail = await db.get_battle_detail(battle_id=battle_id, player_tag=player_tag)
    if detail is None:
        raise HTTPException(status_code=404, detail="Battle not found.")
    return detail


# ===== TRACKER ENDPOINTS =====


@router.post("/tracker/register")
@limiter.limit("3/minute")
async def register_tracker(
    request: Request,
    player_tag: Annotated[
        str, Query(description="Your Clash Royale player tag (e.g. #2PP)")
    ],
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

    db = get_database_service()
    existing = await db.get_tracked_player(user_id=user_id)
    if existing is not None:
        raise HTTPException(
            status_code=409,
            detail=f"You are already tracking '{existing['player_tag']}'. You can only track one player per account.",
        )

    normalised = player_tag.strip().upper()
    if not normalised.startswith("#"):
        normalised = f"#{normalised}"

    try:
        async with ClashRoyaleService() as service:
            player = await service.get_player(normalised)
            player_name = player.name
    except ClashRoyaleNotFoundError:
        raise HTTPException(
            status_code=404,
            detail=f"Player tag '{normalised}' not found in Clash Royale. Check the tag and try again.",
        ) from None
    except ClashRoyaleRateLimitError:
        raise HTTPException(
            status_code=429,
            detail="Clash Royale API rate limit hit. Please try again in a moment.",
        ) from None
    except Exception as e:
        raise HTTPException(
            status_code=502, detail=f"Could not verify player tag: {e!s}"
        ) from e

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
@limiter.limit("20/minute")
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
        raise HTTPException(
            status_code=404,
            detail="No player tag linked. Use POST /api/tracker/register first.",
        )
    return {"tracked_player": tracked}


@router.get("/tracker/me/stats")
@limiter.limit("20/minute")
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
        raise HTTPException(
            status_code=404,
            detail="No player tag linked. Use POST /api/tracker/register first.",
        )

    stats = await db.get_tracker_stats(player_tag=tracked["player_tag"])
    return {
        "player_tag": tracked["player_tag"],
        "player_name": tracked["player_name"],
        "stats": stats,
    }


@router.get("/tracker/me/decks")
@limiter.limit("20/minute")
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
        raise HTTPException(
            status_code=404,
            detail="No player tag linked. Use POST /api/tracker/register first.",
        )

    decks = await db.get_tracker_deck_breakdown(
        player_tag=tracked["player_tag"], limit=limit
    )
    return {
        "player_tag": tracked["player_tag"],
        "player_name": tracked["player_name"],
        "decks": decks,
    }


@router.get("/tracker/me/battles")
@limiter.limit("20/minute")
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
        raise HTTPException(
            status_code=404,
            detail="No player tag linked. Use POST /api/tracker/register first.",
        )

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


@router.get("/tracker/battles/{battle_id}")
@limiter.limit("20/minute")
async def get_battle_detail(
    request: Request,
    battle_id: str,
    user_id: str = Depends(_get_current_user_id_dep()),
):
    """
    Get full detail for a single battle, verifying it belongs to the authenticated user's linked player.
    Returns 404 if the battle is not found or does not belong to the user.
    """
    db = get_database_service()
    tracked = await db.get_tracked_player(user_id=user_id)
    if tracked is None:
        raise HTTPException(
            status_code=404,
            detail="No player tag linked. Use POST /api/tracker/register first.",
        )

    detail = await db.get_battle_detail(
        battle_id=battle_id, player_tag=tracked["player_tag"]
    )
    if detail is None:
        raise HTTPException(
            status_code=404,
            detail="Battle not found or does not belong to your tracked player.",
        )
    return detail


@router.get("/tracker/me/activity")
@limiter.limit("20/minute")
async def get_tracker_activity(
    request: Request,
    days: int = 7,
    user_id: str = Depends(_get_current_user_id_dep()),
):
    """
    Get activity stats for the authenticated user's linked player over recent days.
    """
    db = get_database_service()
    tracked = await db.get_tracked_player(user_id=user_id)
    if tracked is None:
        raise HTTPException(
            status_code=404,
            detail="No player tag linked. Use POST /api/tracker/register first.",
        )
    activity = await db.get_tracker_activity(
        player_tag=tracked["player_tag"], days=min(days, 90)
    )
    return {
        "player_tag": tracked["player_tag"],
        "player_name": tracked["player_name"],
        "activity": activity,
    }


@router.get("/tracker/me/worst-matchups")
@limiter.limit("20/minute")
async def get_tracker_worst_matchups(
    request: Request,
    limit: Annotated[int, Query(ge=1, le=20)] = 10,
    min_games: Annotated[int, Query(ge=1)] = 3,
    user_id: str = Depends(_get_current_user_id_dep()),
):
    """
    Get the opposing win conditions the authenticated user's linked player has the worst win rate against.
    """
    db = get_database_service()
    tracked = await db.get_tracked_player(user_id=user_id)
    if tracked is None:
        raise HTTPException(
            status_code=404,
            detail="No player tag linked. Use POST /api/tracker/register first.",
        )

    matchups = await db.get_tracker_worst_matchups(
        player_tag=tracked["player_tag"],
        limit=limit,
        min_games=min_games,
    )
    return {
        "player_tag": tracked["player_tag"],
        "player_name": tracked["player_name"],
        "worst_matchups": matchups,
    }
