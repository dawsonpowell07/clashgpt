"""
Card-related tools for the Clash Royale agent.

These tools provide access to individual card data and performance statistics,
allowing the agent to analyze card viability, meta strength, and usage trends.
"""
import logging

from app.services.database import (
    DatabaseConnectionError,
    DatabaseDataError,
    DatabaseQueryError,
    DatabaseServiceError,
    get_database_service,
)

logger = logging.getLogger(__name__)


async def get_card_stats(
    card_id: int,
    season_id: int | None = None,
    league: str | None = None
) -> dict:
    """
    Get performance statistics for a specific card including win rate, usage rate,
    and deck appearance rate across competitive play.

    Use this tool to analyze how well a card performs in the current meta,
    how popular it is, and what percentage of decks include it.

    Args:
        card_id: The numeric card ID to look up (e.g., 26000000 for Knight).
            Reference the card ID list in your context to find the correct ID.

        season_id: Optional season filter to get stats for a specific season.
            Format: YYYYMM (e.g., 202601 for January 2026).
            If not provided, returns stats across all available data.

        league: Optional league tier filter (e.g., "7" for Champion league).
            Use this to see how a card performs at specific skill levels.
            If not provided, returns stats across all leagues.

    Returns:
        Dictionary containing card statistics:
        - card_id: The card's numeric ID
        - card_name: The card's display name
        - total_uses: Total number of times the card was played
        - wins: Number of wins when this card was in the deck
        - losses: Number of losses when this card was in the deck
        - win_rate: Win rate as a decimal (e.g., 0.52 = 52%)
        - usage_rate: Percentage of all card slots filled by this card
        - deck_appearance_rate: Percentage of decks that include this card

    Key metrics explained:
        - win_rate: How often decks with this card win. Above 0.50 = above average.
        - deck_appearance_rate: Meta popularity. Higher = more commonly used.
          A card with 20% appearance rate is in 1 of every 5 decks.
        - usage_rate: Raw frequency in card slots (less intuitive than deck_appearance_rate).

    Examples:
        # Get Knight's overall performance
        await get_card_stats(card_id=26000000)

        # Get Hog Rider stats for current season in Champion league
        await get_card_stats(card_id=26000021, season_id=202601, league="7")

        # Check if a card is meta-viable
        await get_card_stats(card_id=26000055)  # Mega Knight
    """
    logger.info(
        f"Tool: get_card_stats | card_id={card_id}, "
        f"season_id={season_id}, league={league}"
    )
    try:
        if not isinstance(card_id, int) or card_id <= 0:
            return {
                "error": "card_id must be a positive integer.",
                "error_type": "validation",
                "suggestion": "Use a valid card ID like 26000000 (Knight)."
            }

        db = get_database_service()
        stats = await db.get_card_stats_by_id(
            card_id=card_id,
            season_id=season_id,
            league=league
        )

        if stats is None:
            return {
                "error": f"Card with ID {card_id} not found.",
                "error_type": "not_found",
                "suggestion": "Check the card ID list for valid IDs."
            }

        return {
            "card_id": stats.card_id,
            "card_name": stats.card_name,
            "total_uses": stats.total_uses,
            "wins": stats.wins,
            "losses": stats.losses,
            "win_rate": stats.win_rate,
            "usage_rate": stats.usage_rate,
            "deck_appearance_rate": stats.deck_appearance_rate,
        }
    except (DatabaseConnectionError, DatabaseQueryError) as e:
        error_msg = f"Database error while fetching card stats: {e}"
        logger.error(f"Tool: get_card_stats | {error_msg}")
        return {
            "error": "Card data is temporarily unavailable.",
            "error_type": "database",
            "details": str(e),
        }
    except DatabaseDataError as e:
        error_msg = f"Data parsing error while fetching card stats: {e}"
        logger.error(f"Tool: get_card_stats | {error_msg}")
        return {
            "error": "Card data could not be parsed.",
            "error_type": "data_error",
            "details": str(e),
        }
    except DatabaseServiceError as e:
        error_msg = f"Database service error while fetching card stats: {e}"
        logger.error(f"Tool: get_card_stats | {error_msg}")
        return {
            "error": "Card service is temporarily unavailable.",
            "error_type": "database",
            "details": str(e),
        }
    except Exception as e:
        error_msg = f"Unexpected error in get_card_stats: {e}"
        logger.error(f"Tool: get_card_stats | {error_msg}", exc_info=True)
        return {
            "error": "Unexpected error while fetching card stats.",
            "error_type": "unexpected",
            "details": str(e)
        }
