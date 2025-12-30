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
    FreeToPlayLevel,
    Locations,
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
                    "description": "Search for decks with various filters",
                    "parameters": {
                        "include": "Optional - Comma-separated card IDs that must be in deck",
                        "exclude": "Optional - Comma-separated card IDs that must not be in deck",
                        "archetype": "Optional - Filter by archetype",
                        "ftp_tier": "Optional - Filter by FTP tier (FRIENDLY, MODERATE, PAYTOWIN)",
                        "limit": "Optional - Maximum results (1-200, default: 50)"
                    },
                    "example": "/api/decks/search?include=26000000,26000001&archetype=CYCLE&ftp_tier=FRIENDLY"
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
            "FreeToPlayLevel": ["FRIENDLY", "MODERATE", "PAYTOWIN"]
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


@router.get("/decks/search", response_model=list[Deck])
async def search_decks(
    include: Annotated[str | None, Query(description="Comma-separated card IDs that must be in deck")] = None,
    exclude: Annotated[str | None, Query(description="Comma-separated card IDs that must not be in deck")] = None,
    archetype: Annotated[DeckArchetype | None, Query(description="Filter by deck archetype")] = None,
    ftp_tier: Annotated[FreeToPlayLevel | None, Query(description="Filter by free-to-play tier")] = None,
    limit: Annotated[int, Query(ge=1, le=200)] = 50
):
    """
    Search for decks with various filters.

    Args:
        include: Comma-separated list of card IDs that must be in the deck
        exclude: Comma-separated list of card IDs that must not be in the deck
        archetype: Optional archetype filter (CYCLE, BEATDOWN, BRIDGESPAM, etc.)
        ftp_tier: Optional FTP tier filter (FRIENDLY, MODERATE, PAYTOWIN)
        limit: Maximum number of results (1-200, default: 50)

    Returns:
        List of decks matching the search criteria

    Examples:
        - /decks/search?include=26000000,26000001&archetype=CYCLE
        - /decks/search?exclude=26000010&ftp_tier=FRIENDLY&limit=10
        - /decks/search?archetype=BEATDOWN
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

    return await db.search_decks(
        include_card_ids=include_card_ids,
        exclude_card_ids=exclude_card_ids,
        archetype=archetype,
        ftp_tier=ftp_tier,
        limit=limit
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
