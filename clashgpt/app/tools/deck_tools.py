"""
Deck-related tools for the Clash Royale agent.

These tools provide access to competitive deck data with performance statistics,
allowing the agent to recommend decks based on win rates, popularity, and other metrics.
"""
import logging

from app.models.models import DeckSortBy
from app.services.database import (
    DatabaseConnectionError,
    DatabaseDataError,
    DatabaseQueryError,
    DatabaseServiceError,
    get_database_service,
)

logger = logging.getLogger(__name__)

VALID_VARIANTS = {"normal", "evolution", "heroic"}


async def search_decks(
    include_cards: str | None = None,
    exclude_cards: str | None = None,
    sort_by: str = "RECENT",
    min_games: int = 0,
    limit: int = 10
) -> dict:
    """
    Search for decks with filters, performance stats, and custom sorting.

    Args:
        include_cards: Comma-separated list of card IDs that MUST be in the deck.
            Use this to find decks built around specific cards or combinations.
            Example: "26000000,26000001" to find decks with both Knight and Archers.
            Supports card variants: "26000004:evolution" for evolved cards,
            "26000004:heroic" for heroic cards, "26000004:normal" for base cards.
            Omit variant to match any variant (e.g., "26000004" matches all variants).

        exclude_cards: Comma-separated list of card IDs that MUST NOT be in the deck.
            Example: "26000010" to exclude decks with Skeletons.
            Same variant format as include_cards.

        sort_by: How to sort the results (default: "RECENT").
            Valid options:
            - "RECENT": Most recently seen in high-level play
            - "WIN_RATE": Highest win rate percentage
            - "GAMES_PLAYED": Most games played (most popular)
            - "WINS": Most total wins

        min_games: Minimum number of games played to include a deck (default: 0).
            Use higher values (e.g., 10-20) for statistical reliability with WIN_RATE.

        limit: Maximum number of results to return (default: 10, max: 200).

    Returns:
        Dictionary with a "decks" list. Each deck contains:
        - deck_id: Unique deck identifier (SHA-256 hash)
        - cards: List of up to 8 cards with card_id, card_name, slot_index, variant
        - avg_elixir: Average elixir cost
        - games_played: Total games tracked
        - wins: Total wins
        - losses: Total losses
        - win_rate: Win rate as a decimal (e.g., 0.65 = 65%), null if no games
        - last_seen: Most recent battle time for this deck

    Examples:
        # Find Hog Rider decks with best win rates
        await search_decks(include_cards="26000021", sort_by="WIN_RATE", min_games=15)

        # Find evolved Skeleton Army decks
        await search_decks(include_cards="26000012:evolution", sort_by="WIN_RATE")

        # Find Miner + Poison decks, no Goblin Drill
        await search_decks(
            include_cards="26000032,28000009",
            exclude_cards="27000013",
            sort_by="WIN_RATE",
            min_games=20
        )
    """
    logger.info(
        f"Tool: search_decks | "
        f"include_cards={include_cards}, exclude_cards={exclude_cards}, "
        f"sort_by={sort_by}, min_games={min_games}, limit={limit}"
    )
    try:
        if not isinstance(limit, int) or limit <= 0:
            return {
                "error": "Limit must be a positive integer.",
                "error_type": "validation",
                "suggestion": "Use a limit between 1 and 200."
            }
        if not isinstance(min_games, int) or min_games < 0:
            return {
                "error": "min_games must be a non-negative integer.",
                "error_type": "validation",
                "suggestion": "Use 0 or a positive integer."
            }

        db = get_database_service()

        include_card_ids = _parse_card_filter(include_cards)
        if isinstance(include_card_ids, dict):  # error dict
            return include_card_ids

        exclude_card_ids = _parse_card_filter(exclude_cards)
        if isinstance(exclude_card_ids, dict):  # error dict
            return exclude_card_ids

        sort_by_enum = DeckSortBy.RECENT
        if sort_by:
            try:
                sort_by_enum = DeckSortBy[sort_by.upper()]
            except KeyError:
                return {
                    "error": f"Invalid sort_by: {sort_by}.",
                    "error_type": "validation",
                    "suggestion": "Use RECENT, WIN_RATE, GAMES_PLAYED, or WINS."
                }

        decks, _ = await db.search_decks_with_stats(
            include_card_ids=include_card_ids,
            exclude_card_ids=exclude_card_ids,
            sort_by=sort_by_enum,
            min_games=min_games,
            limit=limit,
            include_cards=True,
        )

        payloads = []
        for deck in decks:
            cards = [
                {
                    "card_id": c.card_id,
                    "card_name": c.card_name,
                    "slot_index": c.slot_index,
                    "variant": c.variant,
                }
                for c in (deck.cards or [])
            ]
            payloads.append({
                "deck_id": deck.deck_id,
                "avg_elixir": deck.avg_elixir,
                "games_played": deck.games_played,
                "wins": deck.wins,
                "losses": deck.losses,
                "win_rate": deck.win_rate,
                "last_seen": deck.last_seen,
                "cards": cards,
            })

        return {"decks": payloads}
    except (DatabaseConnectionError, DatabaseQueryError) as e:
        error_msg = f"Database error while searching decks: {e}"
        logger.error(f"Tool: search_decks | {error_msg}")
        return {
            "error": "Deck data is temporarily unavailable.",
            "error_type": "database",
            "details": str(e),
        }
    except DatabaseDataError as e:
        error_msg = f"Data parsing error while searching decks: {e}"
        logger.error(f"Tool: search_decks | {error_msg}")
        return {
            "error": "Deck data could not be parsed.",
            "error_type": "data_error",
            "details": str(e),
        }
    except DatabaseServiceError as e:
        error_msg = f"Database service error while searching decks: {e}"
        logger.error(f"Tool: search_decks | {error_msg}")
        return {
            "error": "Deck service is temporarily unavailable.",
            "error_type": "database",
            "details": str(e),
        }
    except Exception as e:
        error_msg = f"Unexpected error in search_decks: {e}"
        logger.error(f"Tool: search_decks | {error_msg}", exc_info=True)
        return {
            "error": "Unexpected error while searching decks.",
            "error_type": "unexpected",
            "details": str(e)
        }


def _parse_card_filter(cards_str: str | None) -> list[str | int] | dict:
    """
    Parse a comma-separated card filter string into a list of card specs.

    Accepts:
    - "26000012" → int (any variant)
    - "26000012:evolution" → str (specific variant)

    Returns a list of (int | str) specs, or an error dict on invalid input.
    """
    if not cards_str:
        return None  # type: ignore[return-value]

    result = []
    for raw in cards_str.split(","):
        cid = raw.strip()
        if not cid:
            continue
        try:
            if ":" in cid:
                card_id_str, variant = cid.split(":", 1)
                int(card_id_str)  # validate numeric
                variant = variant.lower()
                if variant not in VALID_VARIANTS:
                    return {
                        "error": f"Invalid variant '{variant}' in '{cid}'.",
                        "error_type": "validation",
                        "suggestion": f"Valid variants: {', '.join(sorted(VALID_VARIANTS))}."
                    }
                result.append(cid.lower())  # e.g. "26000012:evolution"
            else:
                result.append(int(cid))
        except ValueError:
            return {
                "error": f"Invalid card id: '{cid}'.",
                "error_type": "validation",
                "suggestion": "Use numeric card IDs (e.g. 26000000) or card_id:variant (e.g. 26000000:evolution)."
            }
    return result or None  # type: ignore[return-value]
