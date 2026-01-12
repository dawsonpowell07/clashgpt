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

CARD_ID_TO_NAME = {
    "26000072": "Archer Queen",
    "26000001": "Archers",
    "28000001": "Arrows",
    "26000015": "Baby Dragon",
    "26000006": "Balloon",
    "26000046": "Bandit",
    "28000015": "Barbarian Barrel",
    "27000005": "Barbarian Hut",
    "26000008": "Barbarians",
    "26000049": "Bats",
    "26000068": "Battle Healer",
    "26000036": "Battle Ram",
    "26000102": "Berserker",
    "27000004": "Bomb Tower",
    "26000013": "Bomber",
    "26000103": "Boss Bandit",
    "26000034": "Bowler",
    "27000000": "Cannon",
    "26000054": "Cannon Cart",
    "28000013": "Clone",
    "26000027": "Dark Prince",
    "26000040": "Dart Goblin",
    "28000014": "Earthquake",
    "26000063": "Electro Dragon",
    "26000085": "Electro Giant",
    "26000084": "Electro Spirit",
    "26000042": "Electro Wizard",
    "26000043": "Elite Barbarians",
    "27000007": "Elixir Collector",
    "26000067": "Elixir Golem",
    "26000045": "Executioner",
    "26000031": "Fire Spirit",
    "28000000": "Fireball",
    "26000064": "Firecracker",
    "26000061": "Fisherman",
    "26000057": "Flying Machine",
    "28000005": "Freeze",
    "27000010": "Furnace",
    "26000003": "Giant",
    "26000020": "Giant Skeleton",
    "28000017": "Giant Snowball",
    "28000004": "Goblin Barrel",
    "27000012": "Goblin Cage",
    "28000024": "Goblin Curse",
    "26000095": "Goblin Demolisher",
    "27000013": "Goblin Drill",
    "26000041": "Goblin Gang",
    "26000060": "Goblin Giant",
    "27000001": "Goblin Hut",
    "26000096": "Goblin Machine",
    "26000002": "Goblins",
    "26000099": "Goblinstein",
    "26000074": "Golden Knight",
    "26000009": "Golem",
    "28000010": "Graveyard",
    "26000025": "Guards",
    "28000016": "Heal Spirit",
    "26000021": "Hog Rider",
    "26000044": "Hunter",
    "26000038": "Ice Golem",
    "26000030": "Ice Spirit",
    "26000023": "Ice Wizard",
    "26000037": "Inferno Dragon",
    "27000003": "Inferno Tower",
    "26000000": "Knight",
    "26000029": "Lava Hound",
    "28000007": "Lightning",
    "26000093": "Little Prince",
    "26000035": "Lumberjack",
    "26000062": "Magic Archer",
    "26000055": "Mega Knight",
    "26000039": "Mega Minion",
    "26000065": "Mighty Miner",
    "26000032": "Miner",
    "26000018": "Mini P.E.K.K.A",
    "26000022": "Minion Horde",
    "26000005": "Minions",
    "28000006": "Mirror",
    "26000077": "Monk",
    "27000002": "Mortar",
    "26000083": "Mother Witch",
    "26000014": "Musketeer",
    "26000048": "Night Witch",
    "26000004": "P.E.K.K.A",
    "26000087": "Phoenix",
    "28000009": "Poison",
    "26000016": "Prince",
    "26000026": "Princess",
    "28000002": "Rage",
    "26000051": "Ram Rider",
    "26000053": "Rascals",
    "28000003": "Rocket",
    "28000018": "Royal Delivery",
    "26000050": "Royal Ghost",
    "26000024": "Royal Giant",
    "26000059": "Royal Hogs",
    "26000047": "Royal Recruits",
    "26000101": "Rune Giant",
    "26000012": "Skeleton Army",
    "26000056": "Skeleton Barrel",
    "26000080": "Skeleton Dragons",
    "26000069": "Skeleton King",
    "26000010": "Skeletons",
    "26000033": "Sparky",
    "26000019": "Spear Goblins",
    "28000025": "Spirit Empress",
    "26000097": "Suspicious Bush",
    "27000006": "Tesla",
    "28000011": "The Log",
    "26000028": "Three Musketeers",
    "27000009": "Tombstone",
    "28000012": "Tornado",
    "26000011": "Valkyrie",
    "28000026": "Vines",
    "28000023": "Void",
    "26000058": "Wall Breakers",
    "26000007": "Witch",
    "26000017": "Wizard",
    "27000008": "X-Bow",
    "28000008": "Zap",
    "26000052": "Zappies",
}


def _parse_deck_id(deck_id: str) -> list[tuple[str, int]]:
    cards = []
    for entry in deck_id.split("|"):
        try:
            card_id, evo_level = entry.split("_", 1)
            cards.append((card_id, int(evo_level)))
        except ValueError:
            continue
    return cards


def _variant_from_evolution_level(evolution_level: int) -> str:
    if evolution_level == 1:
        return "evolved"
    if evolution_level == 2:
        return "hero"
    return "normal"


async def search_decks(
    include_cards: str | None = None,
    exclude_cards: str | None = None,
    sort_by: str = "RECENT",
    min_games: int = 0,
    limit: int = 10
) -> dict:
    """
    Search for decks with filters, performance stats, and custom sorting.
    Card details are always included based on the deck_id.

    Args:
        include_cards: Comma-separated list of card IDs that MUST be in the deck.
            Use this to find decks built around specific cards or combinations.
            Example: "26000000,26000001" to find decks with both Knight and Archers.
            Supports card variants: "26000004:EVOLUTION" for Goblin Barrel Evolution.

        exclude_cards: Comma-separated list of card IDs that MUST NOT be in the deck.
            Use this to avoid certain cards or find alternative decks.
            Example: "26000010" to exclude decks with Fireball.

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
        - deck_id: Unique deck identifier
        - cards: List of 8 cards with their IDs, names, and variants
        - avg_elixir: Average elixir cost
        - games_played: Total number of games tracked
        - wins: Total number of wins
        - losses: Total number of losses
        - win_rate: Win rate as a decimal (e.g., 0.65 = 65%), null if no games
        - last_seen: Most recent battle time for this deck

    Examples:
        # Find Hog Rider decks with best win rates (min 15 games for reliability)
        await search_decks(
            include_cards="26000020",
            sort_by="WIN_RATE",
            min_games=15,
            limit=10
        )

        # Find high win-rate decks with Miner and Poison, no Goblin Drill
        await search_decks(
            include_cards="26000016,26000047",
            exclude_cards="26000080",
            sort_by="WIN_RATE",
            min_games=20,
            limit=10
        )

        # Find popular decks by games played
        await search_decks(sort_by="GAMES_PLAYED", limit=20)
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

        # Parse card IDs
        include_card_ids = None
        if include_cards:
            include_card_ids = []
            for cid in include_cards.split(","):
                cid = cid.strip()
                if not cid:
                    continue
                try:
                    include_card_ids.append(int(cid))
                except ValueError:
                    return {
                        "error": f"Invalid card id: {cid}.",
                        "error_type": "validation",
                        "suggestion": "Use numeric card IDs, e.g. 26000024."
                    }

        exclude_card_ids = None
        if exclude_cards:
            exclude_card_ids = []
            for cid in exclude_cards.split(","):
                cid = cid.strip()
                if not cid:
                    continue
                try:
                    exclude_card_ids.append(int(cid))
                except ValueError:
                    return {
                        "error": f"Invalid card id: {cid}.",
                        "error_type": "validation",
                        "suggestion": "Use numeric card IDs, e.g. 26000024."
                    }

        # Convert string sort_by to enum
        sort_by_enum = DeckSortBy.RECENT  # Default
        if sort_by:
            try:
                sort_by_enum = DeckSortBy[sort_by.upper()]
            except KeyError:
                logger.warning(f"Invalid sort_by: {sort_by}, using RECENT")
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
            limit=limit
        )

        payloads = []
        for deck in decks:
            cards = []
            for card_id, evolution_level in _parse_deck_id(deck.deck_id):
                if card_id.startswith("159"):
                    continue
                cards.append({
                    "card_id": card_id,
                    "card_name": CARD_ID_TO_NAME.get(card_id),
                    "evolution_level": evolution_level,
                    "variant": _variant_from_evolution_level(evolution_level),
                })
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
