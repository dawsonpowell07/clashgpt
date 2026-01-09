"""
Deck-related tools for the Clash Royale agent.

These tools provide access to competitive deck data with performance statistics,
allowing the agent to recommend decks based on win rates, popularity, and other metrics.
"""
import logging

from app.models.models import DeckArchetype, DeckSortBy, FreeToPlayLevel
from app.services.database import get_database_service

logger = logging.getLogger(__name__)


async def get_top_decks(
    limit: int = 10,
    archetype: str | None = None,
    sort_by: str = "RECENT",
    min_games: int = 0
) -> dict:
    """
    Get the top meta decks with performance statistics from elite Path of Legend players.

    This function retrieves competitive decks from our database with their win rates,
    games played, and other performance metrics. The database is regularly updated by
    scanning top players' battle logs. You can sort by recency, win rate, popularity,
    or total wins.

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

        sort_by: How to sort the results (default: "RECENT").
            Valid sorting options:
            - "RECENT": Most recently seen in high-level play (latest meta)
            - "WIN_RATE": Highest win rate percentage (best performing)
            - "GAMES_PLAYED": Most games played (most popular/tested)
            - "WINS": Most total wins (proven winners)

        min_games: Minimum number of games played to include a deck (default: 0).
            Use higher values (e.g., 10-20) to filter out decks with insufficient data.
            Recommended when sorting by WIN_RATE to get reliable statistics.

    Returns:
        Dictionary with a "decks" list, where each deck contains:
        - id: Unique deck identifier
        - deck_hash: Hash of the deck composition
        - cards: List of 8 cards with their IDs, names, and variants (evolution/hero/normal)
        - avg_elixir: Average elixir cost of the deck
        - archetype: The deck's archetype classification
        - ftp_tier: Free-to-play friendliness (FRIENDLY/MODERATE/PAYTOWIN)
        - games_played: Total number of games tracked for this deck
        - wins: Total number of wins
        - losses: Total number of losses
        - unique_players: Number of unique players who used this deck
        - win_rate: Win rate as a decimal (e.g., 0.65 = 65% win rate), null if no games

    Examples:
        # Get top 10 most recently seen decks (latest meta snapshot)
        await get_top_decks(limit=10, sort_by="RECENT")

        # Get top 20 decks by win rate with at least 15 games (most reliable)
        await get_top_decks(limit=20, sort_by="WIN_RATE", min_games=15)

        # Get most popular cycle decks (by games played)
        await get_top_decks(limit=10, archetype="CYCLE", sort_by="GAMES_PLAYED")

        # Get beatdown decks with best win rates (min 10 games for reliability)
        await get_top_decks(limit=15, archetype="BEATDOWN", sort_by="WIN_RATE", min_games=10)

        # Get top 50 decks by total wins (proven performers)
        await get_top_decks(limit=50, sort_by="WINS")

        # Get F2P-friendly decks with high win rates
        # Note: Use search_decks() for ftp_tier filtering
        await get_top_decks(limit=20, sort_by="WIN_RATE", min_games=10)
    """
    logger.info(
        f"Tool: get_top_decks | limit={limit}, archetype={archetype}, "
        f"sort_by={sort_by}, min_games={min_games}"
    )
    db = get_database_service()

    # Convert string archetype to enum if provided
    archetype_enum = None
    if archetype:
        try:
            archetype_enum = DeckArchetype[archetype.upper()]
        except KeyError:
            logger.warning(f"Invalid archetype: {archetype}")

    # Convert string sort_by to enum
    sort_by_enum = DeckSortBy.RECENT  # Default
    if sort_by:
        try:
            sort_by_enum = DeckSortBy[sort_by.upper()]
        except KeyError:
            logger.warning(f"Invalid sort_by: {sort_by}, using RECENT")

    decks = await db.get_top_decks_with_stats(
        limit=limit,
        archetype=archetype_enum,
        sort_by=sort_by_enum,
        min_games=min_games
    )
    return {"decks": [deck.model_dump() for deck in decks]}


async def search_decks(
    include_cards: str | None = None,
    exclude_cards: str | None = None,
    archetype: str | None = None,
    ftp_tier: str | None = None,
    sort_by: str = "RECENT",
    min_games: int = 0,
    limit: int = 10
) -> dict:
    """
    Search for decks with advanced filters, performance stats, and custom sorting.

    This powerful search tool lets you find decks that contain specific cards, exclude certain cards,
    filter by archetype or free-to-play tier, and sort by performance metrics like win rate.
    Perfect for deck building, finding counters, and analyzing the meta.

    Args:
        include_cards: Comma-separated list of card IDs that MUST be in the deck.
            Use this to find decks built around specific cards or combinations.
            Example: "26000000,26000001" to find decks with both Knight and Archers.
            Supports card variants: "26000004:EVOLUTION" for Goblin Barrel Evolution.

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

        sort_by: How to sort the results (default: "RECENT").
            Valid sorting options:
            - "RECENT": Most recently seen in high-level play
            - "WIN_RATE": Highest win rate percentage (best performing)
            - "GAMES_PLAYED": Most games played (most popular/tested)
            - "WINS": Most total wins (proven winners)

        min_games: Minimum number of games played to include a deck (default: 0).
            Use higher values (e.g., 10-20) to filter out decks with insufficient data.
            Highly recommended when sorting by WIN_RATE to ensure statistical reliability.

        limit: Maximum number of results to return (default: 10, max: 200).

    Returns:
        Dictionary with a "decks" list matching your search criteria. Each deck contains:
        - id: Unique deck identifier
        - deck_hash: Hash of the deck composition
        - cards: List of 8 cards with their IDs, names, and variants
        - avg_elixir: Average elixir cost
        - archetype: Deck archetype
        - ftp_tier: Free-to-play tier
        - games_played: Total number of games tracked
        - wins: Total number of wins
        - losses: Total number of losses
        - unique_players: Number of unique players who used this deck
        - win_rate: Win rate as a decimal (e.g., 0.65 = 65%), null if no games

    Examples:
        # Find Hog Rider decks with best win rates (min 15 games for reliability)
        await search_decks(
            include_cards="26000020",
            sort_by="WIN_RATE",
            min_games=15,
            limit=10
        )

        # Find F2P-friendly cycle decks sorted by popularity
        await search_decks(
            archetype="CYCLE",
            ftp_tier="FRIENDLY",
            sort_by="GAMES_PLAYED",
            limit=15
        )

        # Find high win-rate decks with Miner and Poison, no Goblin Drill
        await search_decks(
            include_cards="26000016,26000047",
            exclude_cards="26000080",
            sort_by="WIN_RATE",
            min_games=20,
            limit=10
        )

        # Find most successful beatdown decks (by total wins)
        await search_decks(
            archetype="BEATDOWN",
            sort_by="WINS",
            min_games=10,
            limit=15
        )

        # Find moderate F2P decks with Royal Giant, sorted by win rate
        await search_decks(
            include_cards="26000024",
            ftp_tier="MODERATE",
            sort_by="WIN_RATE",
            min_games=10,
            limit=20
        )

        # Find recently seen bridge spam decks
        await search_decks(
            archetype="BRIDGESPAM",
            sort_by="RECENT",
            limit=20
        )

        # Find best performing F2P-friendly decks (high win rate filter)
        await search_decks(
            ftp_tier="FRIENDLY",
            sort_by="WIN_RATE",
            min_games=25,
            limit=10
        )
    """
    logger.info(
        f"Tool: search_decks | "
        f"include_cards={include_cards}, exclude_cards={exclude_cards}, "
        f"archetype={archetype}, ftp_tier={ftp_tier}, sort_by={sort_by}, "
        f"min_games={min_games}, limit={limit}"
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
            logger.warning(f"Invalid archetype: {archetype}")

    ftp_tier_enum = None
    if ftp_tier:
        try:
            ftp_tier_enum = FreeToPlayLevel[ftp_tier.upper()]
        except KeyError:
            logger.warning(f"Invalid ftp_tier: {ftp_tier}")

    # Convert string sort_by to enum
    sort_by_enum = DeckSortBy.RECENT  # Default
    if sort_by:
        try:
            sort_by_enum = DeckSortBy[sort_by.upper()]
        except KeyError:
            logger.warning(f"Invalid sort_by: {sort_by}, using RECENT")

    decks, _ = await db.search_decks_with_stats(
        include_card_ids=include_card_ids,
        exclude_card_ids=exclude_card_ids,
        archetype=archetype_enum,
        ftp_tier=ftp_tier_enum,
        sort_by=sort_by_enum,
        min_games=min_games,
        limit=limit
    )

    return {"decks": [deck.model_dump() for deck in decks]}
