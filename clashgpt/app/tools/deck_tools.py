"""
Deck-related tools for the Clash Royale agent.
"""
import logging

from app.models.models import DeckArchetype, FreeToPlayLevel
from app.services.database import get_database_service

logger = logging.getLogger(__name__)


async def get_top_decks(limit: int = 10, archetype: str | None = None) -> dict:
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
    logger.info(f"Tool: get_top_decks | limit={limit}, archetype={archetype}")
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
    include_cards: str | None = None,
    exclude_cards: str | None = None,
    archetype: str | None = None,
    ftp_tier: str | None = None,
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
    logger.info(
        f"Tool: search_decks | "
        f"include_cards={include_cards}, exclude_cards={exclude_cards}, "
        f"archetype={archetype}, ftp_tier={ftp_tier}, limit={limit}"
    )
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
