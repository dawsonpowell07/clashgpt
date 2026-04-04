"""
Database Service

Async service for interacting with the PostgreSQL database.
Provides read-only access to cards, decks, and locations.

Schema: dim_cards, dim_decks, deck_card_config, fact_battle_participants,
        processed_battles, dim_players, dim_seasons
"""

import logging
from typing import Any
from urllib.parse import quote

from sqlalchemy import text
from sqlalchemy.exc import SQLAlchemyError
from sqlalchemy.ext.asyncio import async_sessionmaker, create_async_engine

from app.models.models import (
    Card,
    CardList,
    CardStats,
    Deck,
    DeckCardConfig,
    DeckSortBy,
    DeckStats,
    DeckWithStats,
    Location,
    Locations,
    Rarity,
)
from app.settings import settings

logger = logging.getLogger(__name__)

# List of card IDs that constitute win conditions for identifying worst matchups
WIN_CONDITION_CARD_IDS = [
    27000002,  # Mortar
    26000024,  # Royal Giant
    26000067,  # Elixir Golem
    26000036,  # Battle Ram
    26000021,  # Hog Rider
    26000003,  # Giant
    26000059,  # Royal Hogs
    26000058,  # Wall Breakers
    28000004,  # Goblin Barrel
    27000013,  # Goblin Drill
    26000006,  # Balloon
    26000060,  # Goblin Giant
    26000085,  # Electro Giant
    27000008,  # X-Bow
    26000009,  # Golem
    26000032,  # Miner
    26000051,  # Ram Rider
    28000010,  # Graveyard
    26000029,  # Lava Hound
    26000028,  # Three Musketeers
    28000003,  # Rocket
    26000056,  # Skeleton Barrel
    26000020,  # Giant Skeleton
    26000004,  # PEKKA
]


class DatabaseServiceError(Exception):
    """Base exception for database service errors."""


class DatabaseConnectionError(DatabaseServiceError):
    """Raised when database connection or configuration fails."""


class DatabaseQueryError(DatabaseServiceError):
    """Raised when a database query fails."""


class DatabaseDataError(DatabaseServiceError):
    """Raised when database data cannot be parsed."""


class DatabaseService:
    """
    Async service for querying the database.

    Provides methods for fetching cards, decks, and locations
    from the PostgreSQL database (star-schema ETL pipeline).
    """

    def __init__(self, database_url: str | None = None):
        try:
            if database_url is None:
                database_url = self._build_database_url()

            if not database_url:
                raise DatabaseConnectionError("Database URL is required")

            logger.info(
                f"Initializing database service | mode={'dev' if settings.dev_mode else 'prod'}"
            )
            connect_args = {} if settings.dev_mode else {"ssl": True}
            self.engine = create_async_engine(
                database_url,
                echo=False,
                pool_size=5,
                max_overflow=10,
                connect_args=connect_args,
            )
            self.async_session = async_sessionmaker(self.engine, expire_on_commit=False)
        except DatabaseServiceError:
            raise
        except Exception as e:
            logger.exception("Failed to initialize database service")
            raise DatabaseConnectionError(
                f"Failed to initialize database service: {e!s}"
            ) from e

    def _build_database_url(self) -> str:
        try:
            if settings.dev_mode:
                encoded_pass = quote(settings.local_db_password or "", safe="")
                return (
                    f"postgresql+asyncpg://{settings.local_db_user}:{encoded_pass}"
                    f"@{settings.local_db_host}:{settings.local_db_port}/{settings.local_db_name}"
                )

            encoded_pass = quote(settings.database_password or "", safe="")
            return (
                f"postgresql+asyncpg://{settings.database_username}:{encoded_pass}"
                f"@{settings.database_host}:{settings.database_port}/{settings.database}"
            )
        except Exception as e:
            logger.exception("Failed to build database URL")
            raise DatabaseConnectionError(f"Failed to build database URL: {e!s}") from e

    async def close(self):
        """Close database connections."""
        try:
            logger.info("Closing database connections")
            await self.engine.dispose()
        except Exception as e:
            logger.exception("Failed to close database connections")
            raise DatabaseConnectionError(
                f"Failed to close database connections: {e!s}"
            ) from e

    # ===== CARDS ENDPOINTS =====

    def _row_to_card(self, row: Any) -> Card:
        """Convert a dim_cards row to a Card dataclass."""
        # row: card_id, name, elixir_cost, rarity, card_type, can_evolve, can_be_heroic, icon_urls
        import json as _json

        rarity = Rarity(row[3].lower()) if row[3] else None
        icon_urls_raw = row[7]
        if isinstance(icon_urls_raw, dict):
            icon_urls = icon_urls_raw
        elif isinstance(icon_urls_raw, str) and icon_urls_raw.strip():
            try:
                icon_urls = _json.loads(icon_urls_raw)
            except _json.JSONDecodeError:
                icon_urls = None
        else:
            icon_urls = None
        return Card(
            card_id=row[0],
            name=row[1],
            elixir_cost=row[2],
            rarity=rarity,
            icon_urls=icon_urls,
            card_type=row[4],
            can_evolve=bool(row[5]),
            can_be_heroic=bool(row[6]),
        )

    async def get_all_cards(self) -> CardList:
        """Get all cards from dim_cards."""
        logger.info("DB query: get_all_cards")
        try:
            async with self.async_session() as session:
                stmt = text(
                    "SELECT card_id, name, elixir_cost, rarity, card_type, "
                    "can_evolve, can_be_heroic, icon_urls "
                    "FROM dim_cards ORDER BY name"
                )
                result = await session.execute(stmt)
                rows = result.fetchall()

                cards = []
                for row in rows:
                    try:
                        cards.append(self._row_to_card(row))
                    except Exception as e:
                        logger.exception("Failed to parse card row in get_all_cards")
                        raise DatabaseDataError(
                            f"Failed to parse card row: {e!s}"
                        ) from e

                logger.info(f"DB result: get_all_cards returned {len(cards)} cards")
                return CardList(cards=cards)
        except DatabaseServiceError:
            raise
        except SQLAlchemyError as e:
            logger.exception("DB query failed: get_all_cards")
            raise DatabaseQueryError(
                f"Database query failed while fetching cards: {e!s}"
            ) from e
        except Exception as e:
            logger.exception("Unexpected error in get_all_cards")
            raise DatabaseServiceError(
                f"Unexpected error while fetching cards: {e!s}"
            ) from e

    async def get_card_by_id(self, card_id: int) -> Card | None:
        """Get a card by its ID from dim_cards."""
        logger.info(f"DB query: get_card_by_id | card_id={card_id}")
        try:
            async with self.async_session() as session:
                stmt = text(
                    "SELECT card_id, name, elixir_cost, rarity, card_type, "
                    "can_evolve, can_be_heroic, icon_urls "
                    "FROM dim_cards WHERE card_id = :card_id"
                )
                result = await session.execute(stmt, {"card_id": card_id})
                row = result.fetchone()

                if row:
                    try:
                        return self._row_to_card(row)
                    except Exception as e:
                        logger.exception("Failed to parse card row in get_card_by_id")
                        raise DatabaseDataError(
                            f"Failed to parse card row: {e!s}"
                        ) from e
                return None
        except DatabaseServiceError:
            raise
        except SQLAlchemyError as e:
            logger.exception("DB query failed: get_card_by_id")
            raise DatabaseQueryError(
                f"Database query failed while fetching card: {e!s}"
            ) from e
        except Exception as e:
            logger.exception("Unexpected error in get_card_by_id")
            raise DatabaseServiceError(
                f"Unexpected error while fetching card: {e!s}"
            ) from e

    async def get_cards_by_rarity(self, rarity: Rarity) -> CardList:
        """Get all cards of a specific rarity from dim_cards."""
        logger.info(f"DB query: get_cards_by_rarity | rarity={rarity.value}")
        try:
            async with self.async_session() as session:
                stmt = text(
                    "SELECT card_id, name, elixir_cost, rarity, card_type, "
                    "can_evolve, can_be_heroic, icon_urls "
                    "FROM dim_cards WHERE rarity = :rarity ORDER BY name"
                )
                result = await session.execute(stmt, {"rarity": rarity.value})
                rows = result.fetchall()

                cards = []
                for row in rows:
                    try:
                        cards.append(self._row_to_card(row))
                    except Exception as e:
                        logger.exception(
                            "Failed to parse card row in get_cards_by_rarity"
                        )
                        raise DatabaseDataError(
                            f"Failed to parse card row: {e!s}"
                        ) from e

                return CardList(cards=cards)
        except DatabaseServiceError:
            raise
        except SQLAlchemyError as e:
            logger.exception("DB query failed: get_cards_by_rarity")
            raise DatabaseQueryError(
                f"Database query failed while fetching cards by rarity: {e!s}"
            ) from e
        except Exception as e:
            logger.exception("Unexpected error in get_cards_by_rarity")
            raise DatabaseServiceError(
                f"Unexpected error while fetching cards by rarity: {e!s}"
            ) from e

    # ===== CARD ANALYTICS =====

    async def get_card_win_rates(
        self, season_id: int | None = None, min_uses: int = 100, limit: int = 50
    ) -> list[CardStats]:
        """
        Get card win rates derived from fact_battle_participants + deck_card_config.

        Args:
            season_id: Optional season filter (e.g., 202601)
            min_uses: Minimum number of uses to include (default: 100)
            limit: Maximum number of results (default: 50)
        """
        logger.info(
            f"DB query: get_card_win_rates | season_id={season_id}, "
            f"min_uses={min_uses}, limit={limit}"
        )
        try:
            async with self.async_session() as session:
                params: dict[str, Any] = {"min_uses": min_uses, "limit": limit}
                join_clause = (
                    "JOIN processed_battles pb ON fbp.battle_id = pb.battle_id"
                )
                where_conditions = ["pb.source = 'ladder'"]

                if season_id:
                    where_conditions.append("pb.season_id = :season_id")
                    params["season_id"] = season_id

                where_clause = "WHERE " + " AND ".join(where_conditions)

                query = f"""
                    SELECT
                        dc.card_id,
                        dc.name AS card_name,
                        COUNT(*) AS total_uses,
                        SUM(fbp.is_win) AS wins,
                        (COUNT(*) - COALESCE(SUM(fbp.is_win), 0)) AS losses,
                        ROUND(
                            100.0 * SUM(fbp.is_win) / NULLIF(COUNT(*), 0),
                            2
                        ) AS win_rate_pct
                    FROM fact_battle_participants fbp
                    {join_clause}
                    JOIN deck_card_config dcc ON fbp.deck_id = dcc.deck_id
                    JOIN dim_cards dc ON dcc.card_id = dc.card_id
                    {where_clause}
                    GROUP BY dc.card_id, dc.name
                    HAVING COUNT(*) >= :min_uses
                    ORDER BY win_rate_pct DESC
                    LIMIT :limit
                """

                result = await session.execute(text(query), params)
                rows = result.fetchall()

                stats_list = []
                for row in rows:
                    try:
                        total_uses = int(row[2])
                        wins = int(row[3])
                        win_rate = (wins / total_uses) if total_uses > 0 else None
                        stats_list.append(
                            CardStats(
                                card_id=row[0],
                                card_name=row[1],
                                total_uses=total_uses,
                                wins=wins,
                                losses=int(row[4]),
                                win_rate=win_rate,
                            )
                        )
                    except Exception as e:
                        logger.exception("Failed to parse card stats row")
                        raise DatabaseDataError(
                            f"Failed to parse card stats row: {e!s}"
                        ) from e

                logger.info(
                    f"DB result: get_card_win_rates returned {len(stats_list)} cards"
                )
                return stats_list
        except DatabaseServiceError:
            raise
        except SQLAlchemyError as e:
            logger.exception("DB query failed: get_card_win_rates")
            raise DatabaseQueryError(
                f"Database query failed while fetching card win rates: {e!s}"
            ) from e
        except Exception as e:
            logger.exception("Unexpected error in get_card_win_rates")
            raise DatabaseServiceError(
                f"Unexpected error while fetching card win rates: {e!s}"
            ) from e

    async def get_card_usage_rates(
        self, season_id: int | None = None, limit: int = 50
    ) -> list[CardStats]:
        """
        Get card usage rates (how often cards are played) derived from
        fact_battle_participants + deck_card_config.

        Args:
            season_id: Optional season filter
            limit: Maximum number of results
        """
        logger.info(
            f"DB query: get_card_usage_rates | season_id={season_id}, limit={limit}"
        )
        try:
            async with self.async_session() as session:
                params: dict[str, Any] = {"limit": limit}
                join_clause = (
                    "JOIN processed_battles pb ON fbp.battle_id = pb.battle_id"
                )
                where_conditions = ["pb.source = 'ladder'"]

                if season_id:
                    where_conditions.append("pb.season_id = :season_id")
                    params["season_id"] = season_id

                where_clause = "WHERE " + " AND ".join(where_conditions)

                # Total card appearances across all battle-deck slots
                total_query = f"""
                    SELECT COUNT(*)
                    FROM fact_battle_participants fbp
                    {join_clause}
                    JOIN deck_card_config dcc ON fbp.deck_id = dcc.deck_id
                    {where_clause}
                """
                total_result = await session.execute(text(total_query), params)
                total_uses = total_result.scalar() or 1

                query = f"""
                    SELECT
                        dc.card_id,
                        dc.name AS card_name,
                        COUNT(*) AS total_uses,
                        SUM(fbp.is_win) AS wins,
                        (COUNT(*) - COALESCE(SUM(fbp.is_win), 0)) AS losses,
                        ROUND(100.0 * COUNT(*) / :total_uses, 2) AS usage_rate_pct
                    FROM fact_battle_participants fbp
                    {join_clause}
                    JOIN deck_card_config dcc ON fbp.deck_id = dcc.deck_id
                    JOIN dim_cards dc ON dcc.card_id = dc.card_id
                    {where_clause}
                    GROUP BY dc.card_id, dc.name
                    ORDER BY total_uses DESC
                    LIMIT :limit
                """
                params["total_uses"] = total_uses

                result = await session.execute(text(query), params)
                rows = result.fetchall()

                stats_list = []
                for row in rows:
                    try:
                        total = int(row[2])
                        wins = int(row[3])
                        stats_list.append(
                            CardStats(
                                card_id=row[0],
                                card_name=row[1],
                                total_uses=total,
                                wins=wins,
                                losses=int(row[4]),
                                win_rate=(wins / total) if total > 0 else None,
                                usage_rate=float(row[5]),
                            )
                        )
                    except Exception as e:
                        logger.exception("Failed to parse card usage stats row")
                        raise DatabaseDataError(
                            f"Failed to parse card usage stats row: {e!s}"
                        ) from e

                logger.info(
                    f"DB result: get_card_usage_rates returned {len(stats_list)} cards"
                )
                return stats_list
        except DatabaseServiceError:
            raise
        except SQLAlchemyError as e:
            logger.exception("DB query failed: get_card_usage_rates")
            raise DatabaseQueryError(
                f"Database query failed while fetching card usage rates: {e!s}"
            ) from e
        except Exception as e:
            logger.exception("Unexpected error in get_card_usage_rates")
            raise DatabaseServiceError(
                f"Unexpected error while fetching card usage rates: {e!s}"
            ) from e

    async def get_card_stats_by_id(
        self,
        card_id: int,
        season_id: int | None = None,
    ) -> CardStats | None:
        """
        Get usage statistics for a specific card by ID.
        Derived from fact_battle_participants + deck_card_config.

        Args:
            card_id: The card ID to fetch stats for
            season_id: Optional season filter (e.g., 202601)
        """
        logger.info(
            f"DB query: get_card_stats_by_id | card_id={card_id}, season_id={season_id}"
        )
        try:
            async with self.async_session() as session:
                # Verify the card exists
                card_stmt = text(
                    "SELECT card_id, name FROM dim_cards WHERE card_id = :card_id"
                )
                card_result = await session.execute(card_stmt, {"card_id": card_id})
                card_row = card_result.fetchone()

                if not card_row:
                    logger.info(
                        f"DB result: get_card_stats_by_id - card {card_id} not found"
                    )
                    return None

                card_name = card_row[1]

                join_clause = (
                    "JOIN processed_battles pb ON fbp.battle_id = pb.battle_id"
                )
                season_conditions = ["pb.source = 'ladder'"]
                season_params: dict[str, Any] = {}
                if season_id:
                    season_conditions.append("pb.season_id = :season_id")
                    season_params["season_id"] = season_id

                season_where = "WHERE " + " AND ".join(season_conditions)

                # Total card appearances across all decks for usage rate
                total_query = f"""
                    SELECT COUNT(*)
                    FROM fact_battle_participants fbp
                    {join_clause}
                    JOIN deck_card_config dcc ON fbp.deck_id = dcc.deck_id
                    {season_where}
                """
                total_result = await session.execute(text(total_query), season_params)
                total_card_uses = total_result.scalar() or 1

                # Total distinct decks for deck appearance rate
                total_decks_query = f"""
                    SELECT COUNT(DISTINCT fbp.deck_id)
                    FROM fact_battle_participants fbp
                    {join_clause}
                    {season_where}
                """
                total_decks_result = await session.execute(
                    text(total_decks_query), season_params
                )
                total_decks = total_decks_result.scalar() or 1

                # Stats for the specific card
                card_where_conditions = ["dcc.card_id = :card_id"]
                if season_conditions:
                    card_where_conditions.extend(season_conditions)

                card_where = "WHERE " + " AND ".join(card_where_conditions)
                card_params = {"card_id": card_id, **season_params}

                stats_query = f"""
                    SELECT
                        COUNT(*) AS total_uses,
                        SUM(fbp.is_win) AS wins,
                        (COUNT(*) - COALESCE(SUM(fbp.is_win), 0)) AS losses,
                        COUNT(DISTINCT fbp.deck_id) AS deck_count
                    FROM fact_battle_participants fbp
                    {join_clause}
                    JOIN deck_card_config dcc ON fbp.deck_id = dcc.deck_id
                    {card_where}
                """

                result = await session.execute(text(stats_query), card_params)
                row = result.fetchone()

                if row and row[0] and int(row[0]) > 0:
                    total_uses = int(row[0])
                    wins = int(row[1])
                    losses = int(row[2])
                    deck_count = int(row[3])
                    win_rate = (wins / total_uses) if total_uses > 0 else None
                    usage_rate = round(100.0 * total_uses / total_card_uses, 2)
                    deck_appearance_rate = round(100.0 * deck_count / total_decks, 2)

                    stats = CardStats(
                        card_id=card_id,
                        card_name=card_name,
                        total_uses=total_uses,
                        wins=wins,
                        losses=losses,
                        win_rate=win_rate,
                        usage_rate=usage_rate,
                        deck_appearance_rate=deck_appearance_rate,
                    )
                else:
                    stats = CardStats(
                        card_id=card_id,
                        card_name=card_name,
                        total_uses=0,
                        wins=0,
                        losses=0,
                        win_rate=None,
                        usage_rate=0.0,
                        deck_appearance_rate=0.0,
                    )

                logger.info(
                    f"DB result: get_card_stats_by_id card={card_id} ({card_name}): "
                    f"{stats.total_uses} uses, win_rate={stats.win_rate}"
                )
                return stats
        except DatabaseServiceError:
            raise
        except SQLAlchemyError as e:
            logger.exception("DB query failed: get_card_stats_by_id")
            raise DatabaseQueryError(
                f"Database query failed while fetching card stats: {e!s}"
            ) from e
        except Exception as e:
            logger.exception("Unexpected error in get_card_stats_by_id")
            raise DatabaseServiceError(
                f"Unexpected error while fetching card stats: {e!s}"
            ) from e

    # ===== DECKS ENDPOINTS =====

    async def get_deck_by_id(self, deck_id: str) -> Deck | None:
        """Get a deck by its ID from dim_decks."""
        logger.info(f"DB query: get_deck_by_id | deck_id={deck_id}")
        try:
            async with self.async_session() as session:
                stmt = text("""
                    SELECT deck_id, avg_elixir, tower_troop_id, created_at
                    FROM dim_decks
                    WHERE deck_id = :deck_id
                """)
                result = await session.execute(stmt, {"deck_id": deck_id})
                row = result.fetchone()

                if row:
                    return Deck(
                        deck_id=row[0],
                        avg_elixir=float(row[1]) if row[1] is not None else None,
                        tower_troop_id=row[2],
                        created_at=str(row[3]) if row[3] else None,
                    )
                return None
        except DatabaseServiceError:
            raise
        except SQLAlchemyError as e:
            logger.exception("DB query failed: get_deck_by_id")
            raise DatabaseQueryError(
                f"Database query failed while fetching deck: {e!s}"
            ) from e
        except Exception as e:
            logger.exception("Unexpected error in get_deck_by_id")
            raise DatabaseServiceError(
                f"Unexpected error while fetching deck: {e!s}"
            ) from e

    async def get_deck_with_cards(self, deck_id: str) -> DeckWithStats | None:
        """
        Get a deck with its cards from deck_card_config bridge table.
        """
        logger.info(f"DB query: get_deck_with_cards | deck_id={deck_id}")
        try:
            async with self.async_session() as session:
                deck_stmt = text(
                    "SELECT deck_id, avg_elixir, tower_troop_id, created_at "
                    "FROM dim_decks WHERE deck_id = :deck_id"
                )
                deck_result = await session.execute(deck_stmt, {"deck_id": deck_id})
                deck_row = deck_result.fetchone()

                if not deck_row:
                    return None

                cards_stmt = text("""
                    SELECT dcc.deck_id, dcc.card_id, dcc.slot_index,
                           dcc.variant::text, dc.name AS card_name
                    FROM deck_card_config dcc
                    JOIN dim_cards dc ON dcc.card_id = dc.card_id
                    WHERE dcc.deck_id = :deck_id
                    ORDER BY dcc.slot_index
                """)
                cards_result = await session.execute(cards_stmt, {"deck_id": deck_id})
                cards_rows = cards_result.fetchall()

                deck_cards = [
                    DeckCardConfig(
                        deck_id=crow[0],
                        card_id=crow[1],
                        slot_index=crow[2],
                        variant=crow[3],
                        card_name=crow[4],
                    )
                    for crow in cards_rows
                ]

                return DeckWithStats(
                    deck_id=deck_row[0],
                    avg_elixir=float(deck_row[1]) if deck_row[1] is not None else None,
                    cards=deck_cards,
                )
        except DatabaseServiceError:
            raise
        except SQLAlchemyError as e:
            logger.exception("DB query failed: get_deck_with_cards")
            raise DatabaseQueryError(
                f"Database query failed while fetching deck with cards: {e!s}"
            ) from e
        except Exception as e:
            logger.exception("Unexpected error in get_deck_with_cards")
            raise DatabaseServiceError(
                f"Unexpected error while fetching deck with cards: {e!s}"
            ) from e

    # ===== DECK ANALYTICS =====

    async def get_deck_stats(
        self,
        deck_id: str,
        season_id: int | None = None,
    ) -> DeckStats | None:
        """
        Get statistics for a deck aggregated from fact_battle_participants.
        """
        logger.info(
            f"DB query: get_deck_stats | deck_id={deck_id}, season_id={season_id}"
        )
        try:
            async with self.async_session() as session:
                where_conditions = ["fbp.deck_id = :deck_id", "pb.source = 'ladder'"]
                params: dict[str, Any] = {"deck_id": deck_id}
                join_clause = (
                    "JOIN processed_battles pb ON fbp.battle_id = pb.battle_id"
                )

                if season_id:
                    where_conditions.append("pb.season_id = :season_id")
                    params["season_id"] = season_id

                where_clause = "WHERE " + " AND ".join(where_conditions)

                query = f"""
                    SELECT
                        fbp.deck_id,
                        COUNT(*) AS games_played,
                        SUM(fbp.is_win) AS wins,
                        (COUNT(*) - COALESCE(SUM(fbp.is_win), 0)) AS losses
                    FROM fact_battle_participants fbp
                    {join_clause}
                    {where_clause}
                    GROUP BY fbp.deck_id
                """

                result = await session.execute(text(query), params)
                row = result.fetchone()

                if row:
                    games = int(row[1])
                    wins = int(row[2])
                    win_rate = (wins / games) if games > 0 else None
                    return DeckStats(
                        deck_id=row[0],
                        games_played=games,
                        wins=wins,
                        losses=int(row[3]),
                        win_rate=win_rate,
                    )
                return None
        except DatabaseServiceError:
            raise
        except SQLAlchemyError as e:
            logger.exception("DB query failed: get_deck_stats")
            raise DatabaseQueryError(
                f"Database query failed while fetching deck stats: {e!s}"
            ) from e
        except Exception as e:
            logger.exception("Unexpected error in get_deck_stats")
            raise DatabaseServiceError(
                f"Unexpected error while fetching deck stats: {e!s}"
            ) from e

    async def get_top_decks_with_stats(
        self,
        limit: int = 50,
        sort_by: DeckSortBy = DeckSortBy.RECENT,
        min_games: int = 0,
        include_cards: bool = False,
    ) -> list[DeckWithStats]:
        """
        Get top decks with their stats, optionally sorted.
        """
        logger.info(
            f"DB query: get_top_decks_with_stats | limit={limit}, "
            f"sort_by={sort_by.value}, min_games={min_games}"
        )

        order_clause = _build_order_clause(sort_by)

        try:
            async with self.async_session() as session:
                params: dict[str, Any] = {"limit": limit, "min_games": min_games}

                query = f"""
                    WITH deck_stats_agg AS (
                        SELECT
                            fbp.deck_id,
                            COUNT(*) AS games_played,
                            SUM(fbp.is_win) AS wins,
                            (COUNT(*) - COALESCE(SUM(fbp.is_win), 0)) AS losses,
                            MAX(pb.battle_time) AS last_seen
                        FROM fact_battle_participants fbp
                        JOIN processed_battles pb ON fbp.battle_id = pb.battle_id
                        WHERE pb.source = 'ladder'
                        GROUP BY fbp.deck_id
                    )
                    SELECT
                        d.deck_id,
                        d.avg_elixir,
                        COALESCE(dsa.games_played, 0) AS games_played,
                        COALESCE(dsa.wins, 0) AS wins,
                        COALESCE(dsa.losses, 0) AS losses,
                        dsa.last_seen
                    FROM dim_decks d
                    LEFT JOIN deck_stats_agg dsa ON d.deck_id = dsa.deck_id
                    WHERE COALESCE(dsa.games_played, 0) >= :min_games
                    {order_clause}
                    LIMIT :limit
                """

                result = await session.execute(text(query), params)
                rows = result.fetchall()
                decks = _rows_to_deck_with_stats(rows)

                if include_cards and decks:
                    await _attach_cards_to_decks(session, decks)

                logger.info(
                    f"DB result: get_top_decks_with_stats returned {len(decks)} decks"
                )
                return decks
        except DatabaseServiceError:
            raise
        except SQLAlchemyError as e:
            logger.exception("DB query failed: get_top_decks_with_stats")
            raise DatabaseQueryError(
                f"Database query failed while fetching deck stats: {e!s}"
            ) from e
        except Exception as e:
            logger.exception("Unexpected error in get_top_decks_with_stats")
            raise DatabaseServiceError(
                f"Unexpected error while fetching deck stats: {e!s}"
            ) from e

    async def search_decks_with_stats(
        self,
        include_card_ids: list[str | int] | None = None,
        exclude_card_ids: list[str | int] | None = None,
        sort_by: DeckSortBy = DeckSortBy.RECENT,
        min_games: int = 0,
        limit: int = 50,
        offset: int = 0,
        include_cards: bool = False,
        season_id: int | None = None,
        game_mode: str | None = None,
    ) -> tuple[list[DeckWithStats], int]:
        """
        Search for decks with stats and filters.

        Args:
            include_card_ids: List of card IDs (int for any variant) or
                "card_id:variant" strings (e.g., "26000012:evolution")
            exclude_card_ids: Same format as include_card_ids
            sort_by: Sort order (RECENT, GAMES_PLAYED, WIN_RATE, WINS)
            min_games: Minimum games played filter
            limit: Maximum results
            offset: Pagination offset
            include_cards: Whether to populate DeckWithStats.cards via a second query
            season_id: Optional season filter via processed_battles
            game_mode: Optional game mode filter (e.g. "retroRoyale"). When set,
                filters by pb.game_mode instead of the default pb.source='ladder'.

        Returns:
            Tuple of (list of DeckWithStats, total matching count)
        """
        logger.info(
            f"DB query: search_decks_with_stats | include={include_card_ids}, "
            f"exclude={exclude_card_ids}, sort_by={sort_by.value}, "
            f"min_games={min_games}, limit={limit}, offset={offset}, "
            f"game_mode={game_mode}"
        )

        order_clause = _build_order_clause(sort_by)

        try:
            async with self.async_session() as session:
                # Build season join for the stats CTE
                params: dict[str, Any] = {
                    "min_games": min_games,
                    "limit": limit,
                    "offset": offset,
                }

                # When a specific game_mode is requested (e.g. a tournament),
                # filter by that game_mode only.
                # Default (no game_mode) restricts to ranked Path of Legends battles:
                #   - game_mode LIKE 'Ranked%' covers seasonal variants (Ranked1v1_2025_1, etc.)
                #   - battle_type = 'pathOfLegend' excludes any non-PoL ranked battles
                # This ensures tournament data never appears on the regular decks page.
                if game_mode:
                    cte_conditions = ["pb.game_mode = :game_mode"]
                    params["game_mode"] = game_mode
                else:
                    cte_conditions = [
                        "pb.game_mode LIKE 'Ranked%'",
                        "pb.battle_type = 'pathOfLegend'",
                    ]

                if season_id:
                    cte_conditions.append("pb.season_id = :season_id")
                    params["season_id"] = season_id

                season_where = "WHERE " + " AND ".join(cte_conditions)

                # Build card include/exclude conditions on dim_decks
                card_conditions = []

                if include_card_ids:
                    for i, card_spec in enumerate(include_card_ids):
                        if isinstance(card_spec, str) and ":" in card_spec:
                            card_id_str, variant = card_spec.split(":", 1)
                            card_conditions.append(
                                f"EXISTS (SELECT 1 FROM deck_card_config "
                                f"WHERE deck_id = d.deck_id AND card_id = :include_id_{i} "
                                f"AND variant::text = :include_variant_{i})"
                            )
                            params[f"include_id_{i}"] = int(card_id_str)
                            params[f"include_variant_{i}"] = variant.lower()
                        else:
                            card_conditions.append(
                                f"EXISTS (SELECT 1 FROM deck_card_config "
                                f"WHERE deck_id = d.deck_id AND card_id = :include_{i})"
                            )
                            params[f"include_{i}"] = (
                                int(card_spec)
                                if isinstance(card_spec, str)
                                else card_spec
                            )

                if exclude_card_ids:
                    for i, card_spec in enumerate(exclude_card_ids):
                        if isinstance(card_spec, str) and ":" in card_spec:
                            card_id_str, variant = card_spec.split(":", 1)
                            card_conditions.append(
                                f"NOT EXISTS (SELECT 1 FROM deck_card_config "
                                f"WHERE deck_id = d.deck_id AND card_id = :exclude_id_{i} "
                                f"AND variant::text = :exclude_variant_{i})"
                            )
                            params[f"exclude_id_{i}"] = int(card_id_str)
                            params[f"exclude_variant_{i}"] = variant.lower()
                        else:
                            card_conditions.append(
                                f"NOT EXISTS (SELECT 1 FROM deck_card_config "
                                f"WHERE deck_id = d.deck_id AND card_id = :exclude_{i})"
                            )
                            params[f"exclude_{i}"] = (
                                int(card_spec)
                                if isinstance(card_spec, str)
                                else card_spec
                            )

                card_where = ("WHERE " + " AND ".join(card_conditions)) if card_conditions else ""

                stats_cte = f"""
                    filtered_decks AS (
                        SELECT d.deck_id, d.avg_elixir
                        FROM dim_decks d
                        {card_where}
                    ),
                    deck_stats_agg AS (
                        SELECT
                            fbp.deck_id,
                            COUNT(*) AS games_played,
                            SUM(fbp.is_win) AS wins,
                            (COUNT(*) - COALESCE(SUM(fbp.is_win), 0)) AS losses,
                            MAX(pb.battle_time) AS last_seen
                        FROM fact_battle_participants fbp
                        JOIN processed_battles pb ON fbp.battle_id = pb.battle_id
                        JOIN filtered_decks fd ON fbp.deck_id = fd.deck_id
                        {season_where}
                        GROUP BY fbp.deck_id
                    )
                """

                # When filtering by game_mode we use INNER JOIN so only decks
                # that actually have battles in that mode are returned.
                # Without game_mode (ladder), LEFT JOIN preserves the existing
                # behaviour of showing decks with 0 games.
                join_type = "INNER" if game_mode else "LEFT"

                count_query = f"""
                    WITH {stats_cte}
                    SELECT COUNT(*)
                    FROM filtered_decks d
                    {join_type} JOIN deck_stats_agg dsa ON d.deck_id = dsa.deck_id
                    WHERE COALESCE(dsa.games_played, 0) >= :min_games
                """
                count_result = await session.execute(text(count_query), params)
                total_count = count_result.scalar() or 0

                data_query = f"""
                    WITH {stats_cte}
                    SELECT
                        d.deck_id,
                        d.avg_elixir,
                        COALESCE(dsa.games_played, 0) AS games_played,
                        COALESCE(dsa.wins, 0) AS wins,
                        COALESCE(dsa.losses, 0) AS losses,
                        dsa.last_seen
                    FROM filtered_decks d
                    {join_type} JOIN deck_stats_agg dsa ON d.deck_id = dsa.deck_id
                    WHERE COALESCE(dsa.games_played, 0) >= :min_games
                    {order_clause}
                    LIMIT :limit OFFSET :offset
                """

                result = await session.execute(text(data_query), params)
                rows = result.fetchall()
                decks = _rows_to_deck_with_stats(rows)

                if include_cards and decks:
                    await _attach_cards_to_decks(session, decks)

                logger.info(
                    f"DB result: search_decks_with_stats returned {len(decks)} "
                    f"decks out of {total_count} total"
                )
                return decks, total_count
        except DatabaseServiceError:
            raise
        except SQLAlchemyError as e:
            logger.exception("DB query failed: search_decks_with_stats")
            raise DatabaseQueryError(
                f"Database query failed while searching deck stats: {e!s}"
            ) from e
        except Exception as e:
            logger.exception("Unexpected error in search_decks_with_stats")
            raise DatabaseServiceError(
                f"Unexpected error while searching deck stats: {e!s}"
            ) from e

    # ===== GLOBAL TOURNAMENT ENDPOINTS =====

    async def search_global_tournament_decks(
        self,
        game_mode: str,
        include_card_ids: list[int] | None = None,
        exclude_card_ids: list[int] | None = None,
        min_games: int = 0,
        limit: int = 24,
        offset: int = 0,
    ) -> tuple[list[dict], int]:
        """
        Search decks from a global tournament filtered by game_mode.

        Global tournament battles store deck_id in fact_battle_participants as a
        pipe-separated string of "card_id.level" entries, e.g.:
            "26000000.3|26000021.3|...|tower_159000000"

        This method queries directly against that string format rather than
        going through dim_decks / deck_card_config, which only contain
        standard ladder deck data.

        Args:
            game_mode: The game_mode string in processed_battles (e.g. "RetroRoyale").
            include_card_ids: Card IDs that must appear in the deck.
            exclude_card_ids: Card IDs that must NOT appear in the deck.
            min_games: Minimum battle count.
            limit: Page size.
            offset: Pagination offset.

        Returns:
            Tuple of (list of deck dicts, total matching count).
            Each deck dict has: deck_id, avg_elixir, games_played, wins,
            losses, win_rate, last_seen, cards.
        """
        logger.info(
            f"DB query: search_global_tournament_decks | game_mode={game_mode}, "
            f"include={include_card_ids}, exclude={exclude_card_ids}, "
            f"min_games={min_games}, limit={limit}, offset={offset}"
        )

        try:
            async with self.async_session() as session:
                params: dict[str, Any] = {
                    "game_mode": game_mode,
                    "min_games": min_games,
                    "limit": limit,
                    "offset": offset,
                }

                # Build card include/exclude conditions using position() on the
                # pipe-separated deck_id string.  Each card_id is followed by
                # a '.' in the string, making it a safe unique token to search
                # for (e.g. "26000000." will not false-match "260000001.").
                card_conditions: list[str] = []
                if include_card_ids:
                    for i, card_id in enumerate(include_card_ids):
                        key = f"inc_{i}"
                        card_conditions.append(
                            f"position(:{key}_str in fbp.deck_id) > 0"
                        )
                        params[f"{key}_str"] = f"{card_id}."

                if exclude_card_ids:
                    for i, card_id in enumerate(exclude_card_ids):
                        key = f"exc_{i}"
                        card_conditions.append(
                            f"position(:{key}_str in fbp.deck_id) = 0"
                        )
                        params[f"{key}_str"] = f"{card_id}."

                card_filter = (
                    "AND " + " AND ".join(card_conditions) if card_conditions else ""
                )

                stats_cte = f"""
                    tournament_stats AS (
                        SELECT
                            fbp.deck_id,
                            COUNT(*)                            AS games_played,
                            SUM(fbp.is_win)                     AS wins,
                            COUNT(*) - SUM(fbp.is_win)          AS losses,
                            MAX(pb.battle_time)                 AS last_seen
                        FROM fact_battle_participants fbp
                        JOIN processed_battles pb ON fbp.battle_id = pb.battle_id
                        WHERE pb.game_mode = :game_mode
                        {card_filter}
                        GROUP BY fbp.deck_id
                        HAVING COUNT(*) >= :min_games
                    )
                """

                count_result = await session.execute(
                    text(f"WITH {stats_cte} SELECT COUNT(*) FROM tournament_stats"),
                    params,
                )
                total_count = count_result.scalar() or 0

                data_result = await session.execute(
                    text(
                        f"""
                        WITH {stats_cte}
                        SELECT deck_id, games_played, wins, losses, last_seen
                        FROM tournament_stats
                        ORDER BY last_seen DESC
                        LIMIT :limit OFFSET :offset
                        """
                    ),
                    params,
                )
                rows = data_result.fetchall()

                if not rows:
                    return [], total_count

                # Parse card_ids from the pipe-separated deck_id strings and
                # batch-fetch card metadata from dim_cards.
                all_card_ids: set[int] = set()
                parsed_decks: list[dict] = []
                for row in rows:
                    deck_id_str: str = row[0]
                    card_ids = _parse_retro_deck_card_ids(deck_id_str)
                    all_card_ids.update(card_ids)
                    parsed_decks.append(
                        {
                            "deck_id": deck_id_str,
                            "card_ids": card_ids,
                            "games_played": int(row[1]),
                            "wins": int(row[2]),
                            "losses": int(row[3]),
                            "last_seen": (
                                row[4].isoformat()
                                if hasattr(row[4], "isoformat")
                                else (str(row[4]) if row[4] else None)
                            ),
                        }
                    )

                # Batch fetch card info
                card_info: dict[int, dict] = {}
                if all_card_ids:
                    card_rows = await session.execute(
                        text(
                            "SELECT card_id, name, elixir_cost "
                            "FROM dim_cards "
                            "WHERE card_id = ANY(:ids)"
                        ),
                        {"ids": list(all_card_ids)},
                    )
                    for cr in card_rows.fetchall():
                        card_info[cr[0]] = {"name": cr[1], "elixir_cost": cr[2]}

                # Assemble final deck dicts
                result_decks: list[dict] = []
                for deck in parsed_decks:
                    card_ids = deck["card_ids"]
                    cards_out = [
                        {
                            "card_id": cid,
                            "card_name": card_info.get(cid, {}).get("name", str(cid)),
                            "slot_index": idx + 1,
                            "variant": "normal",
                        }
                        for idx, cid in enumerate(card_ids)
                    ]

                    elixir_costs = [
                        card_info[cid]["elixir_cost"]
                        for cid in card_ids
                        if cid in card_info and card_info[cid]["elixir_cost"] is not None
                    ]
                    avg_elixir = (
                        round(sum(elixir_costs) / len(elixir_costs), 2)
                        if elixir_costs
                        else None
                    )

                    games = deck["games_played"]
                    wins = deck["wins"]
                    win_rate = round(wins / games, 4) if games > 0 else None

                    result_decks.append(
                        {
                            "deck_id": deck["deck_id"],
                            "avg_elixir": avg_elixir,
                            "games_played": games,
                            "wins": wins,
                            "losses": deck["losses"],
                            "win_rate": win_rate,
                            "last_seen": deck["last_seen"],
                            "cards": cards_out,
                        }
                    )

                logger.info(
                    f"DB result: search_global_tournament_decks returned {len(result_decks)} "
                    f"decks out of {total_count} total"
                )
                return result_decks, total_count

        except DatabaseServiceError:
            raise
        except SQLAlchemyError as e:
            logger.exception("DB query failed: search_global_tournament_decks")
            raise DatabaseQueryError(
                f"Database query failed in search_global_tournament_decks: {e!s}"
            ) from e
        except Exception as e:
            logger.exception("Unexpected error in search_global_tournament_decks")
            raise DatabaseServiceError(
                f"Unexpected error in search_global_tournament_decks: {e!s}"
            ) from e

    # ===== PLAYER ENDPOINTS =====

    async def search_players_by_name(
        self,
        name: str,
        limit: int = 10,
    ) -> list[dict]:
        """
        Search players by name from dim_players, returning aggregated stats.

        Args:
            name: Partial name to search (case-insensitive LIKE)
            limit: Maximum results (default: 10)

        Returns:
            List of dicts with player_tag, name, last_seen, total_games,
            wins, win_rate, avg_crowns, avg_elixir_leaked
        """
        logger.info(f"DB query: search_players_by_name | name={name!r}, limit={limit}")
        try:
            async with self.async_session() as session:
                query = text("""
                    WITH matched_players AS (
                        SELECT player_tag, name, last_seen
                        FROM dim_players
                        WHERE name ILIKE :search
                    )
                    SELECT
                        p.player_tag,
                        p.name,
                        p.last_seen,
                        COUNT(*)                                                        AS total_games,
                        COALESCE(SUM(fbp.is_win), 0)                                   AS wins,
                        ROUND(
                            COALESCE(SUM(fbp.is_win), 0)::numeric / NULLIF(COUNT(*), 0) * 100,
                            1
                        )                                                               AS win_rate,
                        ROUND(AVG(fbp.crowns)::numeric, 2)                             AS avg_crowns,
                        ROUND(AVG(fbp.elixir_leaked)::numeric, 2)                      AS avg_elixir_leaked
                    FROM matched_players p
                    JOIN fact_battle_participants fbp ON p.player_tag = fbp.player_tag
                    JOIN processed_battles pb ON fbp.battle_id = pb.battle_id
                    WHERE pb.source = 'ladder'
                    GROUP BY p.player_tag, p.name, p.last_seen
                    ORDER BY total_games DESC
                    LIMIT :limit
                """)
                result = await session.execute(
                    query, {"search": f"%{name}%", "limit": limit}
                )
                rows = result.fetchall()
                players = []
                for row in rows:
                    players.append(
                        {
                            "player_tag": row[0],
                            "name": row[1],
                            "last_seen": row[2].isoformat()
                            if hasattr(row[2], "isoformat")
                            else (str(row[2]) if row[2] else None),
                            "total_games": int(row[3]),
                            "wins": int(row[4]),
                            "win_rate": float(row[5]) if row[5] is not None else None,
                            "avg_crowns": float(row[6]) if row[6] is not None else None,
                            "avg_elixir_leaked": float(row[7])
                            if row[7] is not None
                            else None,
                        }
                    )
                logger.info(
                    f"DB result: search_players_by_name returned {len(players)} players"
                )
                return players
        except DatabaseServiceError:
            raise
        except SQLAlchemyError as e:
            logger.exception("DB query failed: search_players_by_name")
            raise DatabaseQueryError(
                f"Database query failed while searching players: {e!s}"
            ) from e
        except Exception as e:
            logger.exception("Unexpected error in search_players_by_name")
            raise DatabaseServiceError(
                f"Unexpected error while searching players: {e!s}"
            ) from e

    async def get_player_top_decks(
        self,
        player_tag: str,
        limit: int = 5,
    ) -> list[dict]:
        """
        Get top decks used by a player, ordered by games played, with card details.

        Returns:
            List of dicts with deck_id, games, wins, win_rate, avg_elixir, cards
            where cards is a list of {name, variant}
        """
        logger.info(
            f"DB query: get_player_top_decks | player_tag={player_tag}, limit={limit}"
        )
        try:
            async with self.async_session() as session:
                decks_query = text("""
                    SELECT
                        fbp.deck_id,
                        COUNT(*)                                                    AS games,
                        COALESCE(SUM(fbp.is_win), 0)                               AS wins,
                        ROUND(
                            COALESCE(SUM(fbp.is_win), 0)::numeric / NULLIF(COUNT(*), 0) * 100,
                            1
                        )                                                           AS win_rate,
                        ROUND(dd.avg_elixir::numeric, 2)                           AS avg_elixir
                    FROM fact_battle_participants fbp
                    JOIN dim_decks dd ON fbp.deck_id = dd.deck_id
                    WHERE fbp.player_tag = :tag
                    GROUP BY fbp.deck_id, dd.avg_elixir
                    ORDER BY games DESC
                    LIMIT :limit
                """)
                decks_result = await session.execute(
                    decks_query, {"tag": player_tag, "limit": limit}
                )
                deck_rows = decks_result.fetchall()

                if not deck_rows:
                    return []

                deck_ids = [row[0] for row in deck_rows]
                id_params = {f"did_{i}": did for i, did in enumerate(deck_ids)}
                in_clause = ", ".join(f":did_{i}" for i in range(len(deck_ids)))

                cards_query = text(f"""
                    SELECT dcc.deck_id, dc.name, dcc.variant::text
                    FROM deck_card_config dcc
                    JOIN dim_cards dc ON dcc.card_id = dc.card_id
                    WHERE dcc.deck_id IN ({in_clause})
                    ORDER BY dcc.deck_id, dcc.slot_index
                """)
                cards_result = await session.execute(cards_query, id_params)
                cards_rows = cards_result.fetchall()

                cards_by_deck: dict[str, list[dict]] = {}
                for crow in cards_rows:
                    did = crow[0]
                    if did not in cards_by_deck:
                        cards_by_deck[did] = []
                    cards_by_deck[did].append({"name": crow[1], "variant": crow[2]})

                decks = []
                for row in deck_rows:
                    deck_id = row[0]
                    games = int(row[1])
                    wins = int(row[2])
                    decks.append(
                        {
                            "deck_id": deck_id,
                            "games": games,
                            "wins": wins,
                            "win_rate": float(row[3]) if row[3] is not None else None,
                            "avg_elixir": float(row[4]) if row[4] is not None else None,
                            "cards": cards_by_deck.get(deck_id, []),
                        }
                    )

                logger.info(
                    f"DB result: get_player_top_decks returned {len(decks)} decks"
                )
                return decks
        except DatabaseServiceError:
            raise
        except SQLAlchemyError as e:
            logger.exception("DB query failed: get_player_top_decks")
            raise DatabaseQueryError(
                f"Database query failed while fetching player top decks: {e!s}"
            ) from e
        except Exception as e:
            logger.exception("Unexpected error in get_player_top_decks")
            raise DatabaseServiceError(
                f"Unexpected error while fetching player top decks: {e!s}"
            ) from e

    async def get_player_recent_battles(
        self,
        player_tag: str,
        limit: int = 20,
    ) -> list[dict]:
        """
        Get recent battles for a player.

        Returns:
            List of dicts with battle_time, game_mode, result, crowns,
            elixir_leaked, opponent (name or None)
        """
        logger.info(
            f"DB query: get_player_recent_battles | player_tag={player_tag}, limit={limit}"
        )
        try:
            async with self.async_session() as session:
                query = text("""
                    SELECT
                        pb.battle_id,
                        pb.battle_time,
                        pb.game_mode,
                        CASE WHEN fbp.is_win = 1 THEN 'Win' ELSE 'Loss' END  AS result,
                        fbp.crowns,
                        fbp.elixir_leaked,
                        opp.name                                               AS opponent
                    FROM fact_battle_participants fbp
                    JOIN processed_battles pb ON fbp.battle_id = pb.battle_id
                    LEFT JOIN fact_battle_participants opp_fbp
                        ON opp_fbp.battle_id = fbp.battle_id
                       AND opp_fbp.player_tag != fbp.player_tag
                    LEFT JOIN dim_players opp
                        ON opp.player_tag = opp_fbp.player_tag
                    WHERE fbp.player_tag = :tag
                    ORDER BY pb.battle_time DESC
                    LIMIT :limit
                """)
                result = await session.execute(
                    query, {"tag": player_tag, "limit": limit}
                )
                rows = result.fetchall()

                battles = []
                for row in rows:
                    battles.append(
                        {
                            "battle_id": row[0],
                            "battle_time": row[1].isoformat()
                            if hasattr(row[1], "isoformat")
                            else (str(row[1]) if row[1] else None),
                            "game_mode": row[2],
                            "result": row[3],
                            "crowns": int(row[4]) if row[4] is not None else None,
                            "elixir_leaked": float(row[5])
                            if row[5] is not None
                            else None,
                            "opponent": row[6],
                        }
                    )

                logger.info(
                    f"DB result: get_player_recent_battles returned {len(battles)} battles"
                )
                return battles
        except DatabaseServiceError:
            raise
        except SQLAlchemyError as e:
            logger.exception("DB query failed: get_player_recent_battles")
            raise DatabaseQueryError(
                f"Database query failed while fetching player battles: {e!s}"
            ) from e
        except Exception as e:
            logger.exception("Unexpected error in get_player_recent_battles")
            raise DatabaseServiceError(
                f"Unexpected error while fetching player battles: {e!s}"
            ) from e

    # ===== MATCHUP ENDPOINTS =====

    async def get_deck_matchups(
        self,
        card_specs: list[tuple[int, str]],
        limit: int = 20,
        offset: int = 0,
        include_opponent_specs: list[tuple[int, str]] | None = None,
        exclude_opponent_specs: list[tuple[int, str]] | None = None,
    ) -> dict:
        """
        Find a deck by its exact 8-card composition and return aggregated matchups
        grouped by opponent deck.

        The lookup matches decks that have exactly the provided (card_id, variant)
        pairs — no more, no fewer.

        Args:
            card_specs: List of (card_id, variant) tuples for the 8-card deck.
            limit: Maximum number of opponent deck matchups to return.
            offset: Pagination offset.

        Returns:
            dict with:
              deck_id: str | None
              deck_cards: list of {card_id, card_name, variant, slot_index}
              stats: {games_played, wins, losses, win_rate}
              total_matchups: int
              matchups: list of {opponent_deck_id, games_played, wins, losses, win_rate, opponent_cards}
        """
        logger.info(
            f"DB query: get_deck_matchups | card_specs={card_specs}, "
            f"limit={limit}, offset={offset}"
        )
        if len(card_specs) != 8:
            raise DatabaseQueryError("Exactly 8 card specs are required.")

        try:
            async with self.async_session() as session:
                # ── 1. Find the deck_id that matches exactly these 8 (card_id, variant) pairs ──
                in_conditions = " OR ".join(
                    f"(dcc.card_id = :cid_{i} AND dcc.variant::text = :cvar_{i})"
                    for i in range(8)
                )
                card_params: dict[str, Any] = {}
                for i, (cid, cvar) in enumerate(card_specs):
                    card_params[f"cid_{i}"] = cid
                    card_params[f"cvar_{i}"] = cvar.lower()

                deck_lookup_query = f"""
                    WITH candidate_decks AS (
                        SELECT dcc.deck_id, COUNT(*) AS match_count
                        FROM deck_card_config dcc
                        WHERE {in_conditions}
                        GROUP BY dcc.deck_id
                        HAVING COUNT(*) = 8
                    )
                    SELECT cd.deck_id
                    FROM candidate_decks cd
                    WHERE (
                        SELECT COUNT(*) FROM deck_card_config WHERE deck_id = cd.deck_id
                    ) = 8
                    LIMIT 1
                """
                deck_result = await session.execute(
                    text(deck_lookup_query), card_params
                )
                deck_row = deck_result.fetchone()

                if not deck_row:
                    logger.info("DB result: get_deck_matchups - deck not found")
                    return {
                        "deck_id": None,
                        "deck_cards": [],
                        "stats": None,
                        "total_battles": 0,
                        "battles": [],
                    }

                deck_id = deck_row[0]

                # ── 2. Fetch deck cards with names ──
                deck_cards_query = text("""
                    SELECT dcc.card_id, dc.name, dcc.variant::text, dcc.slot_index
                    FROM deck_card_config dcc
                    JOIN dim_cards dc ON dcc.card_id = dc.card_id
                    WHERE dcc.deck_id = :deck_id
                    ORDER BY dcc.slot_index
                """)
                deck_cards_result = await session.execute(
                    deck_cards_query, {"deck_id": deck_id}
                )
                deck_cards = [
                    {
                        "card_id": r[0],
                        "card_name": r[1],
                        "variant": r[2],
                        "slot_index": r[3],
                    }
                    for r in deck_cards_result.fetchall()
                ]

                # ── 3. Aggregate stats ──
                stats_query = text("""
                    SELECT
                        COUNT(*) AS games_played,
                        COALESCE(SUM(fbp.is_win), 0) AS wins,
                        COALESCE((COUNT(*) - COALESCE(SUM(fbp.is_win), 0)), 0) AS losses
                    FROM fact_battle_participants fbp
                    JOIN processed_battles pb ON fbp.battle_id = pb.battle_id
                    WHERE fbp.deck_id = :deck_id
                      AND pb.source = 'ladder'
                """)
                stats_result = await session.execute(stats_query, {"deck_id": deck_id})
                stats_row = stats_result.fetchone()
                games = int(stats_row[0]) if stats_row and stats_row[0] else 0
                wins = int(stats_row[1]) if stats_row and stats_row[1] else 0
                losses = int(stats_row[2]) if stats_row and stats_row[2] else 0
                stats = {
                    "games_played": games,
                    "wins": wins,
                    "losses": losses,
                    "win_rate": round(wins / games, 4) if games > 0 else None,
                }

                # ── 4. Build opponent-card filter SQL fragments ──
                opp_filter_sql = ""
                opp_filter_params: dict[str, Any] = {}

                if include_opponent_specs:
                    for i, (cid, cvar) in enumerate(include_opponent_specs):
                        opp_filter_sql += (
                            f"\n    AND EXISTS (SELECT 1 FROM deck_card_config"
                            f" WHERE deck_id = fbp.opponent_deck_id"
                            f" AND card_id = :opp_inc_cid_{i}"
                            f" AND variant::text = :opp_inc_cvar_{i})"
                        )
                        opp_filter_params[f"opp_inc_cid_{i}"] = cid
                        opp_filter_params[f"opp_inc_cvar_{i}"] = cvar.lower()

                if exclude_opponent_specs:
                    exc_conditions = " OR ".join(
                        f"(card_id = :opp_exc_cid_{i} AND variant::text = :opp_exc_cvar_{i})"
                        for i in range(len(exclude_opponent_specs))
                    )
                    opp_filter_sql += (
                        f"\n    AND NOT EXISTS (SELECT 1 FROM deck_card_config"
                        f" WHERE deck_id = fbp.opponent_deck_id AND ({exc_conditions}))"
                    )
                    for i, (cid, cvar) in enumerate(exclude_opponent_specs):
                        opp_filter_params[f"opp_exc_cid_{i}"] = cid
                        opp_filter_params[f"opp_exc_cvar_{i}"] = cvar.lower()

                # ── 5. Count total distinct opponent decks for pagination ──
                count_query = text(f"""
                    SELECT COUNT(DISTINCT fbp.opponent_deck_id)
                    FROM fact_battle_participants fbp
                    JOIN processed_battles pb ON fbp.battle_id = pb.battle_id
                    WHERE fbp.deck_id = :deck_id
                      AND fbp.opponent_deck_id IS NOT NULL
                      AND pb.source = 'ladder'
                    {opp_filter_sql}
                """)
                count_result = await session.execute(
                    count_query, {"deck_id": deck_id, **opp_filter_params}
                )
                total_matchups = int(count_result.scalar() or 0)

                # ── 6. Aggregate matchups by opponent deck ──
                matchups_query = text(f"""
                    SELECT
                        fbp.opponent_deck_id,
                        COUNT(*) AS games_played,
                        COALESCE(SUM(fbp.is_win), 0) AS wins,
                        COALESCE((COUNT(*) - COALESCE(SUM(fbp.is_win), 0)), 0) AS losses
                    FROM fact_battle_participants fbp
                    JOIN processed_battles pb ON fbp.battle_id = pb.battle_id
                    WHERE fbp.deck_id = :deck_id
                      AND fbp.opponent_deck_id IS NOT NULL
                      AND pb.source = 'ladder'
                    {opp_filter_sql}
                    GROUP BY fbp.opponent_deck_id
                    ORDER BY games_played DESC
                    LIMIT :limit OFFSET :offset
                """)
                matchups_result = await session.execute(
                    matchups_query,
                    {"deck_id": deck_id, "limit": limit, "offset": offset, **opp_filter_params},
                )
                matchup_rows = matchups_result.fetchall()

                # ── 7. Batch-fetch opponent deck cards ──
                opponent_deck_ids = [r[0] for r in matchup_rows if r[0] is not None]
                opp_cards_by_deck: dict[str, list[dict]] = {}

                if opponent_deck_ids:
                    id_params = {
                        f"odid_{i}": did for i, did in enumerate(opponent_deck_ids)
                    }
                    in_clause = ", ".join(
                        f":odid_{i}" for i in range(len(opponent_deck_ids))
                    )
                    opp_cards_query = f"""
                        SELECT dcc.deck_id, dcc.card_id, dc.name, dcc.variant::text, dcc.slot_index
                        FROM deck_card_config dcc
                        JOIN dim_cards dc ON dcc.card_id = dc.card_id
                        WHERE dcc.deck_id IN ({in_clause})
                        ORDER BY dcc.deck_id, dcc.slot_index
                    """
                    opp_cards_result = await session.execute(
                        text(opp_cards_query), id_params
                    )
                    for r in opp_cards_result.fetchall():
                        did = r[0]
                        if did not in opp_cards_by_deck:
                            opp_cards_by_deck[did] = []
                        opp_cards_by_deck[did].append(
                            {
                                "card_id": r[1],
                                "card_name": r[2],
                                "variant": r[3],
                                "slot_index": r[4],
                            }
                        )

                matchups = []
                for r in matchup_rows:
                    opp_deck_id = r[0]
                    games = int(r[1])
                    wins = int(r[2])
                    losses = int(r[3])
                    matchups.append(
                        {
                            "opponent_deck_id": opp_deck_id,
                            "games_played": games,
                            "wins": wins,
                            "losses": losses,
                            "win_rate": round(wins / games, 4) if games > 0 else None,
                            "opponent_cards": opp_cards_by_deck.get(opp_deck_id, [])
                            if opp_deck_id
                            else [],
                        }
                    )

                logger.info(
                    f"DB result: get_deck_matchups deck={deck_id} | "
                    f"stats={stats}, matchups={len(matchups)}, total_matchups={total_matchups}"
                )
                return {
                    "deck_id": deck_id,
                    "deck_cards": deck_cards,
                    "stats": stats,
                    "total_matchups": total_matchups,
                    "matchups": matchups,
                }
        except DatabaseServiceError:
            raise
        except SQLAlchemyError as e:
            logger.exception("DB query failed: get_deck_matchups")
            raise DatabaseQueryError(
                f"Database query failed while fetching deck matchups: {e!s}"
            ) from e
        except Exception as e:
            logger.exception("Unexpected error in get_deck_matchups")
            raise DatabaseServiceError(
                f"Unexpected error while fetching deck matchups: {e!s}"
            ) from e

    async def get_win_condition_matchup(
        self,
        card_a_id: int,
        card_b_id: int,
        top_decks: int = 5,
    ) -> dict:
        """
        Get head-to-head win rate stats for two win condition cards.

        Looks at all battles where the player's deck contains card_a_id and
        the opponent's deck contains card_b_id, then aggregates win/loss stats
        and the top decks for each side.

        Args:
            card_a_id: Card ID for side A (e.g. 26000003 for Giant)
            card_b_id: Card ID for side B (e.g. 27000008 for X-Bow)
            top_decks: Number of top decks to return per side (default: 5)

        Returns:
            dict with card_a, card_b, total_games, wins_a, losses_a,
            win_rate_a, win_rate_b, top_decks_a, top_decks_b
        """
        logger.info(
            f"DB query: get_win_condition_matchup | "
            f"card_a_id={card_a_id}, card_b_id={card_b_id}, top_decks={top_decks}"
        )
        try:
            async with self.async_session() as session:
                import json as _json

                # ── 1. Fetch card info ──
                cards_query = text(
                    "SELECT card_id, name, icon_urls FROM dim_cards "
                    "WHERE card_id = :caid OR card_id = :cbid"
                )
                cards_result = await session.execute(
                    cards_query, {"caid": card_a_id, "cbid": card_b_id}
                )
                cards_by_id: dict[int, dict] = {}
                for row in cards_result.fetchall():
                    icon_urls_raw = row[2]
                    if isinstance(icon_urls_raw, dict):
                        icon_urls = icon_urls_raw
                    elif isinstance(icon_urls_raw, str) and icon_urls_raw.strip():
                        try:
                            icon_urls = _json.loads(icon_urls_raw)
                        except _json.JSONDecodeError:
                            icon_urls = None
                    else:
                        icon_urls = None
                    cards_by_id[row[0]] = {
                        "card_id": row[0],
                        "name": row[1],
                        "icon_urls": icon_urls,
                    }

                if card_a_id not in cards_by_id or card_b_id not in cards_by_id:
                    return {
                        "error": "One or both card IDs not found in the database.",
                        "card_a_id": card_a_id,
                        "card_b_id": card_b_id,
                    }

                # ── 2. Head-to-head aggregate (card_a decks vs card_b decks) ──
                stats_query = text("""
                    SELECT
                        COUNT(*) AS total_games,
                        COALESCE(SUM(fbp.is_win), 0) AS wins_a,
                        COALESCE((COUNT(*) - COALESCE(SUM(fbp.is_win), 0)), 0) AS losses_a
                    FROM fact_battle_participants fbp
                    JOIN processed_battles pb ON fbp.battle_id = pb.battle_id
                    WHERE fbp.opponent_deck_id IS NOT NULL
                      AND pb.source = 'ladder'
                      AND EXISTS (
                          SELECT 1 FROM deck_card_config dcc
                          WHERE dcc.deck_id = fbp.deck_id AND dcc.card_id = :card_a_id
                      )
                      AND EXISTS (
                          SELECT 1 FROM deck_card_config dcc
                          WHERE dcc.deck_id = fbp.opponent_deck_id AND dcc.card_id = :card_b_id
                      )
                """)
                stats_result = await session.execute(
                    stats_query, {"card_a_id": card_a_id, "card_b_id": card_b_id}
                )
                stats_row = stats_result.fetchone()
                total_games = int(stats_row[0]) if stats_row and stats_row[0] else 0
                wins_a = int(stats_row[1]) if stats_row and stats_row[1] else 0
                losses_a = int(stats_row[2]) if stats_row and stats_row[2] else 0
                win_rate_a = round(wins_a / total_games, 4) if total_games > 0 else None
                win_rate_b = (
                    round(losses_a / total_games, 4) if total_games > 0 else None
                )

                if total_games == 0:
                    return {
                        "card_a": cards_by_id[card_a_id],
                        "card_b": cards_by_id[card_b_id],
                        "total_games": 0,
                        "wins_a": 0,
                        "losses_a": 0,
                        "win_rate_a": None,
                        "win_rate_b": None,
                        "top_decks_a": [],
                        "top_decks_b": [],
                    }

                # ── 3. Top decks for side A ──
                top_a_query = text("""
                    SELECT
                        fbp.deck_id,
                        COUNT(*) AS games,
                        COALESCE(SUM(fbp.is_win), 0) AS wins,
                        ROUND(
                            COALESCE(SUM(fbp.is_win), 0)::numeric / NULLIF(COUNT(*), 0),
                            4
                        ) AS win_rate
                    FROM fact_battle_participants fbp
                    JOIN processed_battles pb ON fbp.battle_id = pb.battle_id
                    WHERE fbp.opponent_deck_id IS NOT NULL
                      AND pb.source = 'ladder'
                      AND EXISTS (
                          SELECT 1 FROM deck_card_config dcc
                          WHERE dcc.deck_id = fbp.deck_id AND dcc.card_id = :card_a_id
                      )
                      AND EXISTS (
                          SELECT 1 FROM deck_card_config dcc
                          WHERE dcc.deck_id = fbp.opponent_deck_id AND dcc.card_id = :card_b_id
                      )
                    GROUP BY fbp.deck_id
                    ORDER BY games DESC
                    LIMIT :top_decks
                """)
                top_a_result = await session.execute(
                    top_a_query,
                    {
                        "card_a_id": card_a_id,
                        "card_b_id": card_b_id,
                        "top_decks": top_decks,
                    },
                )
                top_a_rows = top_a_result.fetchall()

                # ── 4. Top decks for side B ──
                top_b_query = text("""
                    SELECT
                        fbp.opponent_deck_id AS deck_id,
                        COUNT(*) AS games,
                        COALESCE((COUNT(*) - COALESCE(SUM(fbp.is_win), 0)), 0) AS wins,
                        ROUND(
                            COALESCE((COUNT(*) - COALESCE(SUM(fbp.is_win), 0)), 0)::numeric
                            / NULLIF(COUNT(*), 0),
                            4
                        ) AS win_rate
                    FROM fact_battle_participants fbp
                    JOIN processed_battles pb ON fbp.battle_id = pb.battle_id
                    WHERE fbp.opponent_deck_id IS NOT NULL
                      AND pb.source = 'ladder'
                      AND EXISTS (
                          SELECT 1 FROM deck_card_config dcc
                          WHERE dcc.deck_id = fbp.deck_id AND dcc.card_id = :card_a_id
                      )
                      AND EXISTS (
                          SELECT 1 FROM deck_card_config dcc
                          WHERE dcc.deck_id = fbp.opponent_deck_id AND dcc.card_id = :card_b_id
                      )
                    GROUP BY fbp.opponent_deck_id
                    ORDER BY games DESC
                    LIMIT :top_decks
                """)
                top_b_result = await session.execute(
                    top_b_query,
                    {
                        "card_a_id": card_a_id,
                        "card_b_id": card_b_id,
                        "top_decks": top_decks,
                    },
                )
                top_b_rows = top_b_result.fetchall()

                # ── 5. Batch-fetch cards for all top decks ──
                all_deck_ids = [r[0] for r in top_a_rows if r[0]] + [
                    r[0] for r in top_b_rows if r[0]
                ]
                cards_by_deck: dict[str, list[dict]] = {}

                if all_deck_ids:
                    id_params: dict[str, Any] = {
                        f"did_{i}": did for i, did in enumerate(all_deck_ids)
                    }
                    in_clause = ", ".join(f":did_{i}" for i in range(len(all_deck_ids)))
                    deck_cards_query = f"""
                        SELECT dcc.deck_id, dcc.card_id, dc.name, dcc.variant::text, dcc.slot_index
                        FROM deck_card_config dcc
                        JOIN dim_cards dc ON dcc.card_id = dc.card_id
                        WHERE dcc.deck_id IN ({in_clause})
                        ORDER BY dcc.deck_id, dcc.slot_index
                    """
                    deck_cards_result = await session.execute(
                        text(deck_cards_query), id_params
                    )
                    for r in deck_cards_result.fetchall():
                        did = r[0]
                        if did not in cards_by_deck:
                            cards_by_deck[did] = []
                        cards_by_deck[did].append(
                            {
                                "card_id": r[1],
                                "card_name": r[2],
                                "variant": r[3],
                                "slot_index": r[4],
                            }
                        )

                def _build_deck_list(rows: list) -> list[dict]:
                    result = []
                    for r in rows:
                        deck_id = r[0]
                        games = int(r[1])
                        wins = int(r[2])
                        result.append(
                            {
                                "deck_id": deck_id,
                                "games": games,
                                "wins": wins,
                                "losses": games - wins,
                                "win_rate": float(r[3]) if r[3] is not None else None,
                                "cards": cards_by_deck.get(deck_id, [])
                                if deck_id
                                else [],
                            }
                        )
                    return result

                top_decks_a = _build_deck_list(top_a_rows)
                top_decks_b = _build_deck_list(top_b_rows)

                logger.info(
                    f"DB result: get_win_condition_matchup | "
                    f"total={total_games}, wr_a={win_rate_a}, wr_b={win_rate_b}"
                )
                return {
                    "card_a": cards_by_id[card_a_id],
                    "card_b": cards_by_id[card_b_id],
                    "total_games": total_games,
                    "wins_a": wins_a,
                    "losses_a": losses_a,
                    "win_rate_a": win_rate_a,
                    "win_rate_b": win_rate_b,
                    "top_decks_a": top_decks_a,
                    "top_decks_b": top_decks_b,
                }
        except DatabaseServiceError:
            raise
        except SQLAlchemyError as e:
            logger.exception("DB query failed: get_win_condition_matchup")
            raise DatabaseQueryError(
                f"Database query failed while fetching win condition matchup: {e!s}"
            ) from e
        except Exception as e:
            logger.exception("Unexpected error in get_win_condition_matchup")
            raise DatabaseServiceError(
                f"Unexpected error while fetching win condition matchup: {e!s}"
            ) from e

    # ===== TRACKER ENDPOINTS =====

    async def register_tracked_player(
        self,
        user_id: str,
        player_tag: str,
        player_name: str,
    ) -> dict:
        """
        Upsert a player tag into tracked_players for the given Clerk user_id.

        Args:
            user_id: Clerk user ID (primary key).
            player_tag: Clash Royale player tag (e.g. '#2PP').
            player_name: Player's display name (fetched from CR API by caller).

        Returns:
            The upserted row as a dict.
        """
        logger.info(
            f"DB query: register_tracked_player | user_id={user_id}, player_tag={player_tag}"
        )
        normalised_tag = player_tag.upper().lstrip("#")
        normalised_tag = f"#{normalised_tag}"
        try:
            async with self.async_session() as session:
                stmt = text("""
                    INSERT INTO tracked_players (user_id, player_tag, player_name, tracked_since, is_active)
                    VALUES (:user_id, :player_tag, :player_name, NOW(), TRUE)
                    ON CONFLICT (user_id)
                    DO UPDATE SET
                        player_tag    = EXCLUDED.player_tag,
                        player_name   = EXCLUDED.player_name,
                        tracked_since = NOW(),
                        is_active     = TRUE
                    RETURNING user_id, player_tag, player_name, tracked_since, is_active
                """)
                result = await session.execute(
                    stmt,
                    {
                        "user_id": user_id,
                        "player_tag": normalised_tag,
                        "player_name": player_name,
                    },
                )
                row = result.fetchone()
                await session.commit()
                if row:
                    return {
                        "user_id": row[0],
                        "player_tag": row[1],
                        "player_name": row[2],
                        "tracked_since": row[3].isoformat()
                        if hasattr(row[3], "isoformat")
                        else str(row[3]),
                        "is_active": row[4],
                    }
                raise DatabaseQueryError(
                    "Failed to upsert tracked player — no row returned."
                )
        except DatabaseServiceError:
            raise
        except SQLAlchemyError as e:
            logger.exception("DB query failed: register_tracked_player")
            raise DatabaseQueryError(f"Failed to register tracked player: {e!s}") from e
        except Exception as e:
            logger.exception("Unexpected error in register_tracked_player")
            raise DatabaseServiceError(
                f"Unexpected error in register_tracked_player: {e!s}"
            ) from e

    async def get_tracked_player(self, user_id: str) -> dict | None:
        """
        Get the tracked player row for a given Clerk user_id, or None if not found.
        """
        logger.info(f"DB query: get_tracked_player | user_id={user_id}")
        try:
            async with self.async_session() as session:
                stmt = text("""
                    SELECT user_id, player_tag, player_name, tracked_since, is_active
                    FROM tracked_players
                    WHERE user_id = :user_id AND is_active = TRUE
                """)
                result = await session.execute(stmt, {"user_id": user_id})
                row = result.fetchone()
                if row:
                    return {
                        "user_id": row[0],
                        "player_tag": row[1],
                        "player_name": row[2],
                        "tracked_since": row[3].isoformat()
                        if hasattr(row[3], "isoformat")
                        else str(row[3]),
                        "is_active": row[4],
                    }
                return None
        except DatabaseServiceError:
            raise
        except SQLAlchemyError as e:
            logger.exception("DB query failed: get_tracked_player")
            raise DatabaseQueryError(f"Failed to fetch tracked player: {e!s}") from e
        except Exception as e:
            logger.exception("Unexpected error in get_tracked_player")
            raise DatabaseServiceError(
                f"Unexpected error in get_tracked_player: {e!s}"
            ) from e

    async def get_tracker_stats(self, player_tag: str) -> dict:
        """
        Get aggregate stats for a tracked player from fact_battle_participants.

        Returns total_games, wins, losses, win_rate, avg_crowns,
        avg_elixir_leaked, and last_seen.
        """
        logger.info(f"DB query: get_tracker_stats | player_tag={player_tag}")
        try:
            async with self.async_session() as session:
                stmt = text("""
                    SELECT
                        COUNT(*)                                                  AS total_games,
                        COALESCE(SUM(fbp.is_win), 0)                            AS wins,
                        COALESCE((COUNT(*) - COALESCE(SUM(fbp.is_win), 0)), 0) AS losses,
                        ROUND(
                            COALESCE(SUM(fbp.is_win), 0)::numeric
                            / NULLIF(COUNT(*), 0) * 100, 1
                        )                                                         AS win_rate_pct,
                        ROUND(AVG(fbp.crowns)::numeric, 2)                      AS avg_crowns,
                        ROUND(AVG(fbp.elixir_leaked)::numeric, 2)               AS avg_elixir_leaked,
                        MAX(pb.battle_time)                                      AS last_seen
                    FROM fact_battle_participants fbp
                    JOIN processed_battles pb ON fbp.battle_id = pb.battle_id
                    WHERE fbp.player_tag = :tag
                """)
                result = await session.execute(stmt, {"tag": player_tag})
                row = result.fetchone()
                if row and row[0]:
                    games = int(row[0])
                    wins = int(row[1])
                    losses = int(row[2])
                    last_seen = row[6]
                    return {
                        "total_games": games,
                        "wins": wins,
                        "losses": losses,
                        "win_rate": float(row[3]) if row[3] is not None else None,
                        "avg_crowns": float(row[4]) if row[4] is not None else None,
                        "avg_elixir_leaked": float(row[5])
                        if row[5] is not None
                        else None,
                        "last_seen": last_seen.isoformat()
                        if hasattr(last_seen, "isoformat")
                        else (str(last_seen) if last_seen else None),
                    }
                return {
                    "total_games": 0,
                    "wins": 0,
                    "losses": 0,
                    "win_rate": None,
                    "avg_crowns": None,
                    "avg_elixir_leaked": None,
                    "last_seen": None,
                }
        except DatabaseServiceError:
            raise
        except SQLAlchemyError as e:
            logger.exception("DB query failed: get_tracker_stats")
            raise DatabaseQueryError(f"Failed to fetch tracker stats: {e!s}") from e
        except Exception as e:
            logger.exception("Unexpected error in get_tracker_stats")
            raise DatabaseServiceError(
                f"Unexpected error in get_tracker_stats: {e!s}"
            ) from e

    async def get_tracker_activity(self, player_tag: str, days: int = 7) -> list[dict]:
        """
        Get per-day win/loss counts for a tracked player over the last N days.
        Returns a list of {date, wins, losses} dicts ordered oldest-to-newest.
        """
        logger.info(
            f"DB query: get_tracker_activity | player_tag={player_tag}, days={days}"
        )
        try:
            async with self.async_session() as session:
                stmt = text("""
                    SELECT
                        pb.battle_time::date                                    AS day,
                        COALESCE(SUM(fbp.is_win), 0)                           AS wins,
                        COALESCE((COUNT(*) - COALESCE(SUM(fbp.is_win), 0)), 0) AS losses
                    FROM fact_battle_participants fbp
                    JOIN processed_battles pb ON fbp.battle_id = pb.battle_id
                    WHERE fbp.player_tag = :tag
                      AND pb.battle_time >= NOW() - INTERVAL '1 day' * :days
                    GROUP BY pb.battle_time::date
                    ORDER BY day ASC
                """)
                result = await session.execute(stmt, {"tag": player_tag, "days": days})
                return [
                    {
                        "date": str(row[0]),
                        "wins": int(row[1]),
                        "losses": int(row[2]),
                    }
                    for row in result.fetchall()
                ]
        except DatabaseServiceError:
            raise
        except SQLAlchemyError as e:
            logger.exception("DB query failed: get_tracker_activity")
            raise DatabaseQueryError(f"Failed to fetch tracker activity: {e!s}") from e
        except Exception as e:
            logger.exception("Unexpected error in get_tracker_activity")
            raise DatabaseServiceError(
                f"Unexpected error in get_tracker_activity: {e!s}"
            ) from e

    async def get_tracker_deck_breakdown(
        self,
        player_tag: str,
        limit: int = 10,
    ) -> list[dict]:
        """
        Get top decks used by a tracked player with win rate details.

        Returns a list of dicts: deck_id, games, wins, win_rate, avg_elixir, cards.
        """
        logger.info(
            f"DB query: get_tracker_deck_breakdown | player_tag={player_tag}, limit={limit}"
        )
        try:
            async with self.async_session() as session:
                decks_query = text("""
                    SELECT
                        fbp.deck_id,
                        COUNT(*)                                                    AS games,
                        COALESCE(SUM(fbp.is_win), 0)                               AS wins,
                        ROUND(
                            COALESCE(SUM(fbp.is_win), 0)::numeric / NULLIF(COUNT(*), 0) * 100,
                            1
                        )                                                           AS win_rate,
                        ROUND(dd.avg_elixir::numeric, 2)                           AS avg_elixir
                    FROM fact_battle_participants fbp
                    JOIN dim_decks dd ON fbp.deck_id = dd.deck_id
                    JOIN processed_battles pb ON fbp.battle_id = pb.battle_id
                    WHERE fbp.player_tag = :tag
                      AND (pb.game_mode = 'TrophyRoad' OR pb.game_mode LIKE 'Ranked%')
                    GROUP BY fbp.deck_id, dd.avg_elixir
                    ORDER BY games DESC
                    LIMIT :limit
                """)
                decks_result = await session.execute(
                    decks_query, {"tag": player_tag, "limit": limit}
                )
                deck_rows = decks_result.fetchall()

                if not deck_rows:
                    return []

                deck_ids = [row[0] for row in deck_rows]
                id_params = {f"did_{i}": did for i, did in enumerate(deck_ids)}
                in_clause = ", ".join(f":did_{i}" for i in range(len(deck_ids)))

                cards_query = text(f"""
                    SELECT dcc.deck_id, dc.name, dcc.variant::text, dcc.slot_index, dc.card_id
                    FROM deck_card_config dcc
                    JOIN dim_cards dc ON dcc.card_id = dc.card_id
                    WHERE dcc.deck_id IN ({in_clause})
                    ORDER BY dcc.deck_id, dcc.slot_index
                """)
                cards_result = await session.execute(cards_query, id_params)
                cards_rows = cards_result.fetchall()

                cards_by_deck: dict[str, list[dict]] = {}
                for crow in cards_rows:
                    did = crow[0]
                    if did not in cards_by_deck:
                        cards_by_deck[did] = []
                    cards_by_deck[did].append(
                        {
                            "name": crow[1],
                            "variant": crow[2],
                            "slot_index": crow[3],
                            "card_id": crow[4],
                        }
                    )

                decks = []
                for row in deck_rows:
                    deck_id = row[0]
                    games = int(row[1])
                    wins = int(row[2])
                    decks.append(
                        {
                            "deck_id": deck_id,
                            "games": games,
                            "wins": wins,
                            "losses": games - wins,
                            "win_rate": float(row[3]) if row[3] is not None else None,
                            "avg_elixir": float(row[4]) if row[4] is not None else None,
                            "cards": cards_by_deck.get(deck_id, []),
                        }
                    )

                logger.info(
                    f"DB result: get_tracker_deck_breakdown returned {len(decks)} decks"
                )
                return decks
        except DatabaseServiceError:
            raise
        except SQLAlchemyError as e:
            logger.exception("DB query failed: get_tracker_deck_breakdown")
            raise DatabaseQueryError(
                f"Failed to fetch tracker deck breakdown: {e!s}"
            ) from e
        except Exception as e:
            logger.exception("Unexpected error in get_tracker_deck_breakdown")
            raise DatabaseServiceError(
                f"Unexpected error in get_tracker_deck_breakdown: {e!s}"
            ) from e

    async def get_tracker_worst_matchups(
        self,
        player_tag: str,
        limit: int = 10,
        min_games: int = 3,
    ) -> list[dict]:
        """
        Get worst opponent win conditions for a tracked player.
        """
        logger.info(
            f"DB query: get_tracker_worst_matchups | player_tag={player_tag}, limit={limit}"
        )
        try:
            async with self.async_session() as session:
                in_clause = ", ".join(map(str, WIN_CONDITION_CARD_IDS))
                query = text(f"""
                    WITH opponent_win_conditions AS (
                        SELECT
                            fbp.battle_id,
                            fbp.is_win,
                            dcc.card_id AS win_con_card_id,
                            dc.name AS win_con_name
                        FROM fact_battle_participants fbp
                        JOIN deck_card_config dcc ON fbp.opponent_deck_id = dcc.deck_id
                        JOIN dim_cards dc ON dcc.card_id = dc.card_id
                        WHERE fbp.player_tag = :tag
                          AND dcc.card_id IN ({in_clause})
                    )
                    SELECT
                        win_con_card_id,
                        win_con_name,
                        COUNT(*) AS games,
                        COALESCE(SUM(is_win), 0) AS wins,
                        ROUND(
                            COALESCE(SUM(is_win), 0)::numeric / NULLIF(COUNT(*), 0) * 100,
                            1
                        ) AS win_rate
                    FROM opponent_win_conditions
                    GROUP BY win_con_card_id, win_con_name
                    HAVING COUNT(*) >= :min_games
                    ORDER BY win_rate ASC, games DESC
                    LIMIT :limit
                """)
                rows = await session.execute(
                    query, {"tag": player_tag, "min_games": min_games, "limit": limit}
                )
                result = []
                for row in rows.fetchall():
                    games = int(row[2])
                    wins = int(row[3])
                    result.append(
                        {
                            "card_id": row[0],
                            "card_name": row[1],
                            "games": games,
                            "wins": wins,
                            "losses": games - wins,
                            "win_rate": float(row[4]) if row[4] is not None else None,
                        }
                    )

                logger.info(
                    f"DB result: get_tracker_worst_matchups returned {len(result)} win conditions"
                )
                return result
        except DatabaseServiceError:
            raise
        except SQLAlchemyError as e:
            logger.exception("DB query failed: get_tracker_worst_matchups")
            raise DatabaseQueryError(
                f"Failed to fetch tracker worst matchups: {e!s}"
            ) from e
        except Exception as e:
            logger.exception("Unexpected error in get_tracker_worst_matchups")
            raise DatabaseServiceError(
                f"Unexpected error in get_tracker_worst_matchups: {e!s}"
            ) from e

    async def get_tracker_battles(
        self,
        player_tag: str,
        limit: int = 20,
        offset: int = 0,
    ) -> dict:
        """
        Get paginated battle history for a tracked player.

        Returns: { total, battles: [{battle_time, game_mode, result, crowns,
                                     elixir_leaked, opponent, opponent_deck}] }
        """
        logger.info(
            f"DB query: get_tracker_battles | player_tag={player_tag}, "
            f"limit={limit}, offset={offset}"
        )
        try:
            async with self.async_session() as session:
                count_stmt = text("""
                    SELECT COUNT(*)
                    FROM fact_battle_participants fbp
                    WHERE fbp.player_tag = :tag
                """)
                count_result = await session.execute(count_stmt, {"tag": player_tag})
                total = int(count_result.scalar() or 0)

                query = text("""
                    SELECT
                        pb.battle_time,
                        pb.game_mode,
                        CASE WHEN fbp.is_win = 1 THEN 'Win' ELSE 'Loss' END  AS result,
                        fbp.crowns,
                        fbp.elixir_leaked,
                        opp.name                                               AS opponent_name,
                        fbp.opponent_deck_id,
                        fbp.battle_id,
                        fbp.deck_id,
                        fbp.starting_trophies,
                        fbp.trophy_change
                    FROM fact_battle_participants fbp
                    JOIN processed_battles pb ON fbp.battle_id = pb.battle_id
                    LEFT JOIN fact_battle_participants opp_fbp
                        ON opp_fbp.battle_id = fbp.battle_id
                       AND opp_fbp.player_tag != fbp.player_tag
                    LEFT JOIN dim_players opp
                        ON opp.player_tag = opp_fbp.player_tag
                    WHERE fbp.player_tag = :tag
                    ORDER BY pb.battle_time DESC
                    LIMIT :limit OFFSET :offset
                """)
                result = await session.execute(
                    query, {"tag": player_tag, "limit": limit, "offset": offset}
                )
                rows = result.fetchall()

                # Batch-fetch opponent deck cards
                opponent_deck_ids = [r[6] for r in rows if r[6] is not None]
                opp_cards_by_deck: dict[str, list[dict]] = {}
                if opponent_deck_ids:
                    id_params = {
                        f"odid_{i}": did for i, did in enumerate(opponent_deck_ids)
                    }
                    in_clause = ", ".join(
                        f":odid_{i}" for i in range(len(opponent_deck_ids))
                    )
                    opp_cards_query = f"""
                        SELECT dcc.deck_id, dcc.card_id, dc.name, dcc.variant::text, dcc.slot_index
                        FROM deck_card_config dcc
                        JOIN dim_cards dc ON dcc.card_id = dc.card_id
                        WHERE dcc.deck_id IN ({in_clause})
                        ORDER BY dcc.deck_id, dcc.slot_index
                    """
                    opp_cards_result = await session.execute(
                        text(opp_cards_query), id_params
                    )
                    for r in opp_cards_result.fetchall():
                        did = r[0]
                        if did not in opp_cards_by_deck:
                            opp_cards_by_deck[did] = []
                        opp_cards_by_deck[did].append(
                            {
                                "card_id": r[1],
                                "card_name": r[2],
                                "variant": r[3],
                                "slot_index": r[4],
                            }
                        )

                # Batch-fetch player deck cards
                player_deck_ids = [r[8] for r in rows if r[8] is not None]
                player_cards_by_deck: dict[str, list[dict]] = {}
                if player_deck_ids:
                    id_params = {
                        f"pdid_{i}": did for i, did in enumerate(player_deck_ids)
                    }
                    in_clause = ", ".join(
                        f":pdid_{i}" for i in range(len(player_deck_ids))
                    )
                    player_cards_query = f"""
                        SELECT dcc.deck_id, dcc.card_id, dc.name, dcc.variant::text, dcc.slot_index
                        FROM deck_card_config dcc
                        JOIN dim_cards dc ON dcc.card_id = dc.card_id
                        WHERE dcc.deck_id IN ({in_clause})
                        ORDER BY dcc.deck_id, dcc.slot_index
                    """
                    player_cards_result = await session.execute(
                        text(player_cards_query), id_params
                    )
                    for r in player_cards_result.fetchall():
                        did = r[0]
                        if did not in player_cards_by_deck:
                            player_cards_by_deck[did] = []
                        player_cards_by_deck[did].append(
                            {
                                "card_id": r[1],
                                "card_name": r[2],
                                "variant": r[3],
                                "slot_index": r[4],
                            }
                        )

                battles = []
                for row in rows:
                    battles.append(
                        {
                            "battle_id": row[7],
                            "battle_time": row[0].isoformat()
                            if hasattr(row[0], "isoformat")
                            else (str(row[0]) if row[0] else None),
                            "game_mode": row[1],
                            "result": row[2],
                            "crowns": int(row[3]) if row[3] is not None else None,
                            "elixir_leaked": float(row[4])
                            if row[4] is not None
                            else None,
                            "opponent": row[5],
                            "deck_id": row[8],
                            "player_cards": player_cards_by_deck.get(row[8], [])
                            if row[8]
                            else [],
                            "opponent_deck_id": row[6],
                            "opponent_cards": opp_cards_by_deck.get(row[6], [])
                            if row[6]
                            else [],
                            "starting_trophies": int(row[9])
                            if row[9] is not None
                            else None,
                            "trophy_change": int(row[10])
                            if row[10] is not None
                            else None,
                        }
                    )

                logger.info(
                    f"DB result: get_tracker_battles returned {len(battles)} battles (total={total})"
                )
                return {"total": total, "battles": battles}
        except DatabaseServiceError:
            raise
        except SQLAlchemyError as e:
            logger.exception("DB query failed: get_tracker_battles")
            raise DatabaseQueryError(f"Failed to fetch tracker battles: {e!s}") from e
        except Exception as e:
            logger.exception("Unexpected error in get_tracker_battles")
            raise DatabaseServiceError(
                f"Unexpected error in get_tracker_battles: {e!s}"
            ) from e

    async def get_battle_detail(self, battle_id: str, player_tag: str) -> dict | None:
        logger.info(
            f"DB query: get_battle_detail | battle_id={battle_id}, player_tag={player_tag}"
        )
        try:
            async with self.async_session() as session:
                query = text("""
                    SELECT
                        pb.battle_time,
                        pb.game_mode,
                        CASE WHEN fbp.is_win = 1 THEN 'Win' ELSE 'Loss' END AS result,
                        fbp.crowns,
                        fbp.elixir_leaked,
                        opp.name AS opponent_name,
                        fbp.opponent_deck_id,
                        fbp.battle_id,
                        fbp.deck_id,
                        fbp.starting_trophies,
                        fbp.trophy_change,
                        p.name AS player_name
                    FROM fact_battle_participants fbp
                    JOIN processed_battles pb ON fbp.battle_id = pb.battle_id
                    LEFT JOIN fact_battle_participants opp_fbp
                        ON opp_fbp.battle_id = fbp.battle_id
                       AND opp_fbp.player_tag != fbp.player_tag
                    LEFT JOIN dim_players opp
                        ON opp.player_tag = opp_fbp.player_tag
                    LEFT JOIN dim_players p
                        ON p.player_tag = fbp.player_tag
                    WHERE fbp.player_tag = :tag AND fbp.battle_id = :battle_id
                    LIMIT 1
                """)
                result = await session.execute(
                    query, {"tag": player_tag, "battle_id": battle_id}
                )
                row = result.fetchone()
                if row is None:
                    return None

                deck_ids_to_fetch = [did for did in [row[8], row[6]] if did is not None]
                cards_by_deck: dict[str, list[dict]] = {}
                if deck_ids_to_fetch:
                    id_params = {
                        f"did_{i}": did for i, did in enumerate(deck_ids_to_fetch)
                    }
                    in_clause = ", ".join(
                        f":did_{i}" for i in range(len(deck_ids_to_fetch))
                    )
                    cards_query = f"""
                        SELECT dcc.deck_id, dcc.card_id, dc.name, dcc.variant::text, dcc.slot_index
                        FROM deck_card_config dcc
                        JOIN dim_cards dc ON dcc.card_id = dc.card_id
                        WHERE dcc.deck_id IN ({in_clause})
                        ORDER BY dcc.deck_id, dcc.slot_index
                    """
                    cards_result = await session.execute(text(cards_query), id_params)
                    for r in cards_result.fetchall():
                        did = r[0]
                        if did not in cards_by_deck:
                            cards_by_deck[did] = []
                        cards_by_deck[did].append(
                            {
                                "card_id": r[1],
                                "card_name": r[2],
                                "variant": r[3],
                                "slot_index": r[4],
                            }
                        )

                return {
                    "battle_id": row[7],
                    "battle_time": row[0].isoformat()
                    if hasattr(row[0], "isoformat")
                    else (str(row[0]) if row[0] else None),
                    "game_mode": row[1],
                    "result": row[2],
                    "crowns": int(row[3]) if row[3] is not None else None,
                    "elixir_leaked": float(row[4]) if row[4] is not None else None,
                    "opponent": row[5],
                    "deck_id": row[8],
                    "player_cards": cards_by_deck.get(row[8], []) if row[8] else [],
                    "opponent_deck_id": row[6],
                    "opponent_cards": cards_by_deck.get(row[6], []) if row[6] else [],
                    "starting_trophies": int(row[9]) if row[9] is not None else None,
                    "trophy_change": int(row[10]) if row[10] is not None else None,
                    "player_name": row[11],
                }
        except DatabaseServiceError:
            raise
        except SQLAlchemyError as e:
            logger.exception("DB query failed: get_battle_detail")
            raise DatabaseQueryError(f"Failed to fetch battle detail: {e!s}") from e
        except Exception as e:
            logger.exception("Unexpected error in get_battle_detail")
            raise DatabaseServiceError(
                f"Unexpected error in get_battle_detail: {e!s}"
            ) from e

    # ===== LOCATIONS ENDPOINTS =====

    async def get_all_locations(self) -> Locations:
        """Get all locations from the database."""
        logger.info("DB query: get_all_locations")
        try:
            async with self.async_session() as session:
                stmt = text(
                    "SELECT id, name, is_country, country_code FROM locations ORDER BY name"
                )
                result = await session.execute(stmt)
                rows = result.fetchall()

                locations = []
                for row in rows:
                    try:
                        locations.append(
                            Location(
                                id=row[0],
                                name=row[1],
                                is_country=row[2],
                                country_code=row[3],
                            )
                        )
                    except Exception as e:
                        logger.exception(
                            "Failed to parse location row in get_all_locations"
                        )
                        raise DatabaseDataError(
                            f"Failed to parse location row: {e!s}"
                        ) from e

                logger.info(
                    f"DB result: get_all_locations returned {len(locations)} locations"
                )
                return Locations(locations=locations)
        except DatabaseServiceError:
            raise
        except SQLAlchemyError as e:
            logger.exception("DB query failed: get_all_locations")
            raise DatabaseQueryError(
                f"Database query failed while fetching locations: {e!s}"
            ) from e
        except Exception as e:
            logger.exception("Unexpected error in get_all_locations")
            raise DatabaseServiceError(
                f"Unexpected error while fetching locations: {e!s}"
            ) from e


# ===== MODULE-LEVEL HELPERS =====


def _parse_retro_deck_card_ids(deck_id: str) -> list[int]:
    """
    Extract integer card_ids from a RetroRoyale pipe-separated deck_id string.

    The ETL stores deck_id as: "26000000.3|26000021.3|...|tower_159000000"
    Tower entries are skipped; the integer before the first '.' is the card_id.
    """
    card_ids: list[int] = []
    for part in deck_id.split("|"):
        if part.startswith("tower_"):
            continue
        try:
            card_ids.append(int(part.split(".")[0]))
        except (ValueError, IndexError):
            continue
    return card_ids


def _build_order_clause(sort_by: DeckSortBy) -> str:
    if sort_by == DeckSortBy.RECENT:
        return "ORDER BY dsa.last_seen DESC NULLS LAST"
    elif sort_by == DeckSortBy.GAMES_PLAYED:
        return "ORDER BY COALESCE(dsa.games_played, 0) DESC"
    elif sort_by == DeckSortBy.WIN_RATE:
        return (
            "ORDER BY CASE WHEN COALESCE(dsa.games_played, 0) > 0 "
            "THEN CAST(dsa.wins AS FLOAT) / dsa.games_played ELSE 0 END DESC"
        )
    elif sort_by == DeckSortBy.WINS:
        return "ORDER BY COALESCE(dsa.wins, 0) DESC"
    return "ORDER BY dsa.last_seen DESC NULLS LAST"


def _rows_to_deck_with_stats(rows: Any) -> list[DeckWithStats]:
    """Convert raw DB rows to DeckWithStats objects (no cards populated)."""
    decks = []
    for row in rows:
        games = int(row[2])
        wins = int(row[3])
        win_rate = (wins / games) if games > 0 else None
        last_seen = row[5]
        decks.append(
            DeckWithStats(
                deck_id=row[0],
                avg_elixir=float(row[1]) if row[1] is not None else None,
                games_played=games,
                wins=wins,
                losses=int(row[4]),
                win_rate=win_rate,
                last_seen=last_seen.isoformat()
                if hasattr(last_seen, "isoformat")
                else (str(last_seen) if last_seen else None),
            )
        )
    return decks


async def _attach_cards_to_decks(session: Any, decks: list[DeckWithStats]) -> None:
    """
    Batch-fetch cards for a list of decks and attach them in-place.
    Uses a single JOIN query to avoid N+1 queries.
    """
    if not decks:
        return

    deck_ids = [d.deck_id for d in decks]
    # Build parameterised IN clause
    id_params = {f"did_{i}": did for i, did in enumerate(deck_ids)}
    in_clause = ", ".join(f":did_{i}" for i in range(len(deck_ids)))

    cards_query = f"""
        SELECT dcc.deck_id, dcc.card_id, dcc.slot_index,
               dcc.variant::text, dc.name AS card_name
        FROM deck_card_config dcc
        JOIN dim_cards dc ON dcc.card_id = dc.card_id
        WHERE dcc.deck_id IN ({in_clause})
        ORDER BY dcc.deck_id, dcc.slot_index
    """
    cards_result = await session.execute(text(cards_query), id_params)
    cards_rows = cards_result.fetchall()

    cards_by_deck: dict[str, list[DeckCardConfig]] = {}
    for crow in cards_rows:
        did = crow[0]
        if did not in cards_by_deck:
            cards_by_deck[did] = []
        cards_by_deck[did].append(
            DeckCardConfig(
                deck_id=crow[0],
                card_id=crow[1],
                slot_index=crow[2],
                variant=crow[3],
                card_name=crow[4],
            )
        )

    for deck in decks:
        deck.cards = cards_by_deck.get(deck.deck_id, [])


# Singleton instance
_db_service: DatabaseService | None = None


def get_database_service() -> DatabaseService:
    """Get or create the database service singleton."""
    global _db_service
    if _db_service is None:
        _db_service = DatabaseService()
    return _db_service
