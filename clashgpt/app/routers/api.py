"""
API Router

FastAPI router for database endpoints.
Provides REST API access to cards, decks, and locations.
"""

from typing import Annotated

from fastapi import APIRouter, HTTPException, Query

from app.models.models import (
    Card,
    CardList,
    Deck,
    DeckArchetype,
    DeckSortBy,
    DeckWithStats,
    FreeToPlayLevel,
    Locations,
    PaginatedDecks,
    PaginatedDecksWithStats,
    Rarity,
)
from app.services.database import get_database_service

router = APIRouter(prefix="/api", tags=["api"])


# ===== ROOT ENDPOINT =====

@router.get("/", response_model=dict)
async def list_endpoints():
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
                }
            },
            "decks": {
                "GET /api/decks/top": {
                    "description": "Get top decks ordered by most recently seen",
                    "parameters": {
                        "limit": "Optional - Maximum number of decks (1-200, default: 50)",
                        "archetype": "Optional - Filter by archetype (CYCLE, BEATDOWN, BRIDGESPAM, MIDLADDERMENACE, BAIT, CHIP, SIEGE)"
                    },
                    "example": "/api/decks/top?limit=10&archetype=CYCLE"
                },
                "GET /api/decks/search": {
                    "description": "Search for decks with various filters (paginated)",
                    "parameters": {
                        "include": "Optional - Comma-separated card IDs that must be in deck",
                        "exclude": "Optional - Comma-separated card IDs that must not be in deck",
                        "archetype": "Optional - Filter by archetype",
                        "ftp_tier": "Optional - Filter by FTP tier (FRIENDLY, MODERATE, PAYTOWIN)",
                        "page": "Optional - Page number (1-indexed, default: 1)",
                        "page_size": "Optional - Results per page (1-200, default: 24)"
                    },
                    "example": "/api/decks/search?include=26000000,26000001&archetype=CYCLE&ftp_tier=FRIENDLY&page=1&page_size=24"
                },
                "GET /api/decks/top-stats": {
                    "description": "Get top decks with stats, sortable by various metrics",
                    "parameters": {
                        "limit": "Optional - Maximum number of decks (1-200, default: 10)",
                        "archetype": "Optional - Filter by archetype",
                        "sort_by": "Optional - Sort by (RECENT, GAMES_PLAYED, WIN_RATE, WINS, default: RECENT)",
                        "min_games": "Optional - Minimum games played (default: 0)"
                    },
                    "example": "/api/decks/top-stats?limit=50&sort_by=WIN_RATE&min_games=10"
                },
                "GET /api/decks/search-stats": {
                    "description": "Search for decks with stats and various filters (paginated)",
                    "parameters": {
                        "include": "Optional - Comma-separated card IDs that must be in deck",
                        "exclude": "Optional - Comma-separated card IDs that must not be in deck",
                        "archetype": "Optional - Filter by archetype",
                        "ftp_tier": "Optional - Filter by FTP tier",
                        "sort_by": "Optional - Sort by (RECENT, GAMES_PLAYED, WIN_RATE, WINS, default: RECENT)",
                        "min_games": "Optional - Minimum games played (default: 0)",
                        "page": "Optional - Page number (1-indexed, default: 1)",
                        "page_size": "Optional - Results per page (1-200, default: 24)"
                    },
                    "example": "/api/decks/search-stats?include=26000000&sort_by=WIN_RATE&min_games=20&page=1&page_size=24"
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
            "DeckArchetype": ["CYCLE", "BEATDOWN", "BRIDGESPAM", "MIDLADDERMENACE", "BAIT", "CHIP", "SIEGE", "CONTROL"],
            "FreeToPlayLevel": ["FRIENDLY", "MODERATE", "PAYTOWIN"],
            "DeckSortBy": ["RECENT", "GAMES_PLAYED", "WIN_RATE", "WINS"]
        },
        "documentation": "/docs"
    }


# ===== CARDS ENDPOINTS =====

@router.get("/cards", response_model=CardList)
async def get_cards(
    rarity: Annotated[Rarity | None, Query(description="Filter by card rarity")] = None
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
async def get_card_by_id(card_id: str):
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
    card = await db.get_card_by_id(card_id)

    if card is None:
        raise HTTPException(
            status_code=404, detail=f"Card with id '{card_id}' not found")

    return card


# ===== DECKS ENDPOINTS =====

@router.get("/decks/top", response_model=list[Deck])
async def get_top_decks(
    limit: Annotated[int, Query(ge=1, le=200)] = 10,
    archetype: Annotated[DeckArchetype | None, Query(description="Filter by deck archetype")] = None
):
    """
    Get top decks ordered by most recently seen.

    Args:
        limit: Maximum number of decks to return (1-200, default: 10)
        archetype: Optional archetype filter (CYCLE, BEATDOWN, BRIDGESPAM, etc.)

    Returns:
        List of top decks
    """
    db = get_database_service()
    return await db.get_top_decks(limit=limit, archetype=archetype)


@router.get("/decks/search", response_model=PaginatedDecks)
async def search_decks(
    include: Annotated[str | None, Query(description="Comma-separated card IDs that must be in deck")] = None,
    exclude: Annotated[str | None, Query(description="Comma-separated card IDs that must not be in deck")] = None,
    archetype: Annotated[DeckArchetype | None, Query(description="Filter by deck archetype")] = None,
    ftp_tier: Annotated[FreeToPlayLevel | None, Query(description="Filter by free-to-play tier")] = None,
    page: Annotated[int, Query(ge=1)] = 1,
    page_size: Annotated[int, Query(ge=1, le=200)] = 24
):
    """
    Search for decks with various filters (paginated).

    Args:
        include: Comma-separated list of card IDs that must be in the deck
        exclude: Comma-separated list of card IDs that must not be in the deck
        archetype: Optional archetype filter (CYCLE, BEATDOWN, BRIDGESPAM, etc.)
        ftp_tier: Optional FTP tier filter (FRIENDLY, MODERATE, PAYTOWIN)
        page: Page number (1-indexed, default: 1)
        page_size: Results per page (1-200, default: 24)

    Returns:
        Paginated response with decks matching the search criteria and pagination metadata

    Examples:
        - /decks/search?include=26000000,26000001&archetype=CYCLE&page=1&page_size=24
        - /decks/search?exclude=26000010&ftp_tier=FRIENDLY&page=2&page_size=12
        - /decks/search?archetype=BEATDOWN&page=1
    """
    db = get_database_service()

    # Parse comma-separated card IDs
    include_card_ids = include.split(",") if include else None
    exclude_card_ids = exclude.split(",") if exclude else None

    # Clean up whitespace
    if include_card_ids:
        include_card_ids = [cid.strip()
                            for cid in include_card_ids if cid.strip()]
    if exclude_card_ids:
        exclude_card_ids = [cid.strip()
                            for cid in exclude_card_ids if cid.strip()]

    # Calculate offset from page
    offset = (page - 1) * page_size

    # Get decks and total count
    decks, total = await db.search_decks(
        include_card_ids=include_card_ids,
        exclude_card_ids=exclude_card_ids,
        archetype=archetype,
        ftp_tier=ftp_tier,
        limit=page_size,
        offset=offset
    )

    # Calculate pagination metadata
    total_pages = (total + page_size - 1) // page_size if total > 0 else 0
    has_next = page < total_pages
    has_previous = page > 1

    return PaginatedDecks(
        decks=decks,
        total=total,
        page=page,
        page_size=page_size,
        total_pages=total_pages,
        has_next=has_next,
        has_previous=has_previous
    )


@router.get("/decks/top-stats", response_model=list[DeckWithStats])
async def get_top_decks_with_stats(
    limit: Annotated[int, Query(ge=1, le=200)] = 10,
    archetype: Annotated[DeckArchetype | None, Query(description="Filter by deck archetype")] = None,
    sort_by: Annotated[DeckSortBy, Query(description="Sort by metric")] = DeckSortBy.RECENT,
    min_games: Annotated[int, Query(ge=0, description="Minimum games played")] = 0
):
    """
    Get top decks with stats, sortable by various metrics.

    Args:
        limit: Maximum number of decks to return (1-200, default: 10)
        archetype: Optional archetype filter (CYCLE, BEATDOWN, BRIDGESPAM, etc.)
        sort_by: How to sort results (RECENT, GAMES_PLAYED, WIN_RATE, WINS, default: RECENT)
        min_games: Minimum number of games played (default: 0)

    Returns:
        List of top decks with stats

    Examples:
        - /decks/top-stats?limit=50&sort_by=WIN_RATE&min_games=10
        - /decks/top-stats?archetype=CYCLE&sort_by=GAMES_PLAYED
    """
    db = get_database_service()
    return await db.get_top_decks_with_stats(
        limit=limit,
        archetype=archetype,
        sort_by=sort_by,
        min_games=min_games
    )


@router.get("/decks/search-stats", response_model=PaginatedDecksWithStats)
async def search_decks_with_stats(
    include: Annotated[str | None, Query(description="Comma-separated card IDs that must be in deck")] = None,
    exclude: Annotated[str | None, Query(description="Comma-separated card IDs that must not be in deck")] = None,
    archetype: Annotated[DeckArchetype | None, Query(description="Filter by deck archetype")] = None,
    ftp_tier: Annotated[FreeToPlayLevel | None, Query(description="Filter by free-to-play tier")] = None,
    sort_by: Annotated[DeckSortBy, Query(description="Sort by metric")] = DeckSortBy.RECENT,
    min_games: Annotated[int, Query(ge=0, description="Minimum games played")] = 0,
    page: Annotated[int, Query(ge=1)] = 1,
    page_size: Annotated[int, Query(ge=1, le=200)] = 24
):
    """
    Search for decks with stats and various filters (paginated).

    Args:
        include: Comma-separated list of card IDs that must be in the deck
        exclude: Comma-separated list of card IDs that must not be in the deck
        archetype: Optional archetype filter (CYCLE, BEATDOWN, BRIDGESPAM, etc.)
        ftp_tier: Optional FTP tier filter (FRIENDLY, MODERATE, PAYTOWIN)
        sort_by: How to sort results (RECENT, GAMES_PLAYED, WIN_RATE, WINS, default: RECENT)
        min_games: Minimum number of games played (default: 0)
        page: Page number (1-indexed, default: 1)
        page_size: Results per page (1-200, default: 24)

    Returns:
        Paginated response with decks matching the search criteria and pagination metadata

    Examples:
        - /decks/search-stats?include=26000000&sort_by=WIN_RATE&min_games=20
        - /decks/search-stats?archetype=CYCLE&ftp_tier=FRIENDLY&sort_by=GAMES_PLAYED&page=1
        - /decks/search-stats?exclude=26000010&min_games=50&sort_by=WINS&page=1&page_size=12
    """
    db = get_database_service()

    # Parse comma-separated card IDs
    include_card_ids = include.split(",") if include else None
    exclude_card_ids = exclude.split(",") if exclude else None

    # Clean up whitespace
    if include_card_ids:
        include_card_ids = [cid.strip() for cid in include_card_ids if cid.strip()]
    if exclude_card_ids:
        exclude_card_ids = [cid.strip() for cid in exclude_card_ids if cid.strip()]

    # Calculate offset from page
    offset = (page - 1) * page_size

    # Get decks and total count
    decks, total = await db.search_decks_with_stats(
        include_card_ids=include_card_ids,
        exclude_card_ids=exclude_card_ids,
        archetype=archetype,
        ftp_tier=ftp_tier,
        sort_by=sort_by,
        min_games=min_games,
        limit=page_size,
        offset=offset
    )

    # Calculate pagination metadata
    total_pages = (total + page_size - 1) // page_size if total > 0 else 0
    has_next = page < total_pages
    has_previous = page > 1

    return PaginatedDecksWithStats(
        decks=decks,
        total=total,
        page=page,
        page_size=page_size,
        total_pages=total_pages,
        has_next=has_next,
        has_previous=has_previous
    )


# ===== LOCATIONS ENDPOINTS =====

@router.get("/locations", response_model=Locations)
async def get_locations():
    """
    Get all locations.

    Returns:
        List of all locations
    """
    db = get_database_service()
    return await db.get_all_locations()
