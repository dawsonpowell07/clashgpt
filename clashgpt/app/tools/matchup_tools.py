"""
Deck matchup tool for the Clash Royale agent.

Returns aggregated win/loss stats for a specific deck against all opponent
decks it has faced, grouped by opponent deck.
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

VALID_VARIANTS = {"normal", "evolution", "heroic"}


async def get_deck_matchups(
    deck: str,
    page: int = 1,
    page_size: int = 10,
) -> dict:
    """
    Get aggregated matchup data for an exact 8-card deck.

    For a given deck (specified as 8 card_id:variant pairs), returns how it
    performs against every opponent deck it has faced — grouped by opponent
    deck with cumulative win/loss totals. Use this when the user wants to
    understand:
    - How a specific deck performs against the meta
    - Which decks counter or lose to a specific deck
    - Win rate breakdowns by matchup

    To use this tool, you first need the card IDs and variants from the
    search_decks tool, then pass all 8 cards as "card_id:variant" pairs.

    Args:
        deck: Comma-separated list of exactly 8 card specs in "card_id:variant"
            format. Each spec must include the variant (normal, evolution, or
            heroic). Example:
            "26000021:normal,26000000:normal,26000002:normal,26000030:normal,
             26000038:normal,26000005:normal,28000000:normal,28000009:normal"

        page: Page number for results (default: 1).

        page_size: Number of opponent deck matchups per page (default: 10,
            max: 50). Results are ordered by most games played first.

    Returns:
        Dictionary with:
        - deck_id: Unique identifier of the deck, or None if not in database
        - deck_cards: List of {card_id, card_name, variant, slot_index}
        - stats: Overall {games_played, wins, losses, win_rate} across all matchups
        - matchups: List of opponent deck results, each containing:
            - opponent_deck_id: Unique identifier for the opponent deck
            - games_played: Total games against this opponent deck
            - wins: Wins against this opponent deck
            - losses: Losses against this opponent deck
            - win_rate: Win rate as decimal (0.65 = 65%), null if no games
            - opponent_cards: List of {card_id, card_name, variant, slot_index}
        - total: Total unique opponent decks encountered
        - page, page_size, total_pages, has_next, has_previous

    Examples:
        # Analyse a Hog 2.6 Cycle deck matchups
        await get_deck_matchups(
            deck="26000021:normal,26000000:normal,26000002:normal,26000030:normal,"
                 "26000038:normal,26000005:normal,28000000:normal,28000009:normal"
        )
    """
    logger.info(
        f"Tool: get_deck_matchups | deck={deck}, page={page}, page_size={page_size}"
    )

    if not deck:
        return {
            "error": "deck parameter is required.",
            "error_type": "validation",
            "suggestion": "Provide 8 card specs as 'card_id:variant' pairs separated by commas.",
        }

    if not isinstance(page, int) or page < 1:
        page = 1
    if not isinstance(page_size, int) or page_size < 1:
        page_size = 10
    page_size = min(page_size, 50)

    raw_specs = [s.strip() for s in deck.split(",") if s.strip()]
    if len(raw_specs) != 8:
        return {
            "error": f"Exactly 8 card specs are required; got {len(raw_specs)}.",
            "error_type": "validation",
            "suggestion": "Provide exactly 8 'card_id:variant' pairs.",
        }

    card_specs: list[tuple[int, str]] = []
    for raw in raw_specs:
        if ":" not in raw:
            return {
                "error": f"Invalid card spec '{raw}'. Use 'card_id:variant' format.",
                "error_type": "validation",
                "suggestion": "Example: '26000021:normal'.",
            }
        card_id_str, variant = raw.split(":", 1)
        variant = variant.lower()
        if variant not in VALID_VARIANTS:
            return {
                "error": f"Invalid variant '{variant}' in '{raw}'.",
                "error_type": "validation",
                "suggestion": f"Valid variants: {', '.join(sorted(VALID_VARIANTS))}.",
            }
        try:
            card_specs.append((int(card_id_str), variant))
        except ValueError:
            return {
                "error": f"Invalid card_id '{card_id_str}' — must be a numeric ID.",
                "error_type": "validation",
            }

    try:
        db = get_database_service()
        offset = (page - 1) * page_size
        result = await db.get_deck_matchups(
            card_specs=card_specs,
            limit=page_size,
            offset=offset,
        )

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

    except (DatabaseConnectionError, DatabaseQueryError) as e:
        logger.error(f"Tool: get_deck_matchups | Database error: {e}")
        return {
            "error": "Matchup data is temporarily unavailable.",
            "error_type": "database",
            "details": str(e),
        }
    except DatabaseDataError as e:
        logger.error(f"Tool: get_deck_matchups | Data error: {e}")
        return {
            "error": "Matchup data could not be parsed.",
            "error_type": "data_error",
            "details": str(e),
        }
    except DatabaseServiceError as e:
        logger.error(f"Tool: get_deck_matchups | Service error: {e}")
        return {
            "error": "Matchup service is temporarily unavailable.",
            "error_type": "database",
            "details": str(e),
        }
    except Exception as e:
        logger.error(f"Tool: get_deck_matchups | Unexpected error: {e}", exc_info=True)
        return {
            "error": "Unexpected error while fetching matchup data.",
            "error_type": "unexpected",
            "details": str(e),
        }
