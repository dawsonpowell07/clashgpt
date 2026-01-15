"""
Database Service

Async service for interacting with the PostgreSQL database.
Provides read-only access to cards, decks, and locations.
"""
import logging
import os
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
    DeckSortBy,
    DeckStats,
    DeckWithStats,
    Location,
    Locations,
    Rarity,
)
from app.settings import settings

logger = logging.getLogger(__name__)
is_cloud_run = os.getenv("K_SERVICE") is not None


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
    from the PostgreSQL database.
    """

    def __init__(self, database_url: str | None = None):
        """
        Initialize the database service.

        Args:
            database_url: Database connection URL. If not provided, will build from env vars.
        """
        try:
            if database_url is None:
                database_url = self._build_database_url()

            if not database_url:
                raise DatabaseConnectionError("Database URL is required")

            logger.info(
                f"Initializing database service | mode={'dev' if settings.dev_mode else 'prod'}"
            )
            self.engine = create_async_engine(database_url, echo=False)
            self.async_session = async_sessionmaker(
                self.engine, expire_on_commit=False
            )
        except DatabaseServiceError:
            raise
        except Exception as e:
            logger.exception("Failed to initialize database service")
            raise DatabaseConnectionError(
                f"Failed to initialize database service: {e!s}"
            ) from e

    def _build_database_url(self) -> str:
        """
        Build database URL from settings.

        Uses DEV_MODE flag to determine which database to connect to:
        - DEV_MODE=true: Always use local PostgreSQL (overrides all other settings)

        Returns:
            Async database connection URL
        """
        try:
            if settings.dev_mode:
                # Local database configuration
                # Local DB typically doesn't need password
                return (
                    f"postgresql+asyncpg://{settings.local_db_user}@"
                    f"{settings.local_db_host}:{settings.local_db_port}/"
                    f"{settings.local_db_name}"
                )

            # Production database configuration (Google Cloud SQL)
            encoded_user = quote(settings.prod_db_user, safe="")
            encoded_pass = quote(settings.prod_db_password or "", safe="")

            if is_cloud_run and settings.connection_name:
                encoded_instance = settings.connection_name.replace(":", "%3A")
                return (
                    f"postgresql+asyncpg://{encoded_user}:{encoded_pass}@"
                    f"/{settings.prod_db_name}"
                    f"?host=/cloudsql/{encoded_instance}"
                )

            return (
                f"postgresql+asyncpg://{settings.prod_db_user}:{settings.prod_db_password}@"
                f"{settings.prod_db_host}:{settings.prod_db_port}/{settings.prod_db_name}"
            )
        except Exception as e:
            logger.exception("Failed to build database URL")
            raise DatabaseConnectionError(
                f"Failed to build database URL: {e!s}"
            ) from e

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

    async def get_all_cards(self) -> CardList:
        """
        Get all cards from the database.

        Returns:
            CardList containing all cards
        """
        logger.info("DB query: get_all_cards")
        try:
            async with self.async_session() as session:
                stmt = text(
                    "SELECT card_id, name, elixir_cost, rarity, icon_urls FROM cards ORDER BY name"
                )
                result = await session.execute(stmt)
                rows = result.fetchall()

                cards = []
                for row in rows:
                    try:
                        card = Card(
                            card_id=row[0],
                            name=row[1],
                            elixir_cost=row[2],
                            rarity=Rarity(row[3]),
                            icon_urls=row[4]
                        )
                        cards.append(card)
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
        """
        Get a card by its ID.

        Args:
            card_id: The card ID to fetch

        Returns:
            Card object or None if not found
        """
        logger.info(f"DB query: get_card_by_id | card_id={card_id}")
        try:
            async with self.async_session() as session:
                stmt = text(
                    "SELECT card_id, name, elixir_cost, rarity, icon_urls FROM cards WHERE card_id = :card_id"
                )
                result = await session.execute(stmt, {"card_id": card_id})
                row = result.fetchone()

                if row:
                    try:
                        return Card(
                            card_id=row[0],
                            name=row[1],
                            elixir_cost=row[2],
                            rarity=Rarity(row[3]),
                            icon_urls=row[4]
                        )
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
        """
        Get all cards of a specific rarity.

        Args:
            rarity: The rarity to filter by

        Returns:
            CardList containing cards of the specified rarity
        """
        logger.info(f"DB query: get_cards_by_rarity | rarity={rarity.value}")
        try:
            async with self.async_session() as session:
                stmt = text(
                    "SELECT card_id, name, elixir_cost, rarity, icon_urls FROM cards WHERE rarity = :rarity ORDER BY name"
                )
                result = await session.execute(stmt, {"rarity": rarity.value})
                rows = result.fetchall()

                cards = []
                for row in rows:
                    try:
                        card = Card(
                            card_id=row[0],
                            name=row[1],
                            elixir_cost=row[2],
                            rarity=Rarity(row[3]),
                            icon_urls=row[4]
                        )
                        cards.append(card)
                    except Exception as e:
                        logger.exception("Failed to parse card row in get_cards_by_rarity")
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
        self,
        season_id: int | None = None,
        league: str | None = None,
        min_uses: int = 100,
        limit: int = 50
    ) -> list[CardStats]:
        """
        Get card win rates calculated from card_usage_facts.

        Args:
            season_id: Optional season filter (e.g., 202601)
            league: Optional league filter (e.g., "7")
            min_uses: Minimum number of uses to include (default: 100)
            limit: Maximum number of results (default: 50)

        Returns:
            List of CardStats ordered by win_rate descending
        """
        logger.info(
            f"DB query: get_card_win_rates | season_id={season_id}, league={league}, "
            f"min_uses={min_uses}, limit={limit}"
        )
        try:
            async with self.async_session() as session:
                # Build WHERE clause
                where_conditions = []
                params: dict[str, Any] = {"min_uses": min_uses, "limit": limit}

                if season_id:
                    where_conditions.append("cuf.season_id = :season_id")
                    params["season_id"] = season_id

                if league:
                    where_conditions.append("cuf.league = :league")
                    params["league"] = league

                where_clause = "WHERE " + " AND ".join(where_conditions) if where_conditions else ""

                query = f"""
                    SELECT
                        cuf.card_id,
                        c.name AS card_name,
                        COUNT(*) AS total_uses,
                        SUM(CASE WHEN cuf.result = 'WIN' THEN 1 ELSE 0 END) AS wins,
                        SUM(CASE WHEN cuf.result = 'LOSS' THEN 1 ELSE 0 END) AS losses,
                        ROUND(
                            100.0 * SUM(CASE WHEN cuf.result = 'WIN' THEN 1 ELSE 0 END) / COUNT(*),
                            2
                        ) AS win_rate_pct
                    FROM card_usage_facts cuf
                    LEFT JOIN cards c ON cuf.card_id = c.card_id
                    {where_clause}
                    GROUP BY cuf.card_id, c.name
                    HAVING COUNT(*) >= :min_uses
                    ORDER BY win_rate_pct DESC
                    LIMIT :limit
                """

                result = await session.execute(text(query), params)
                rows = result.fetchall()

                stats_list = []
                for row in rows:
                    try:
                        total_uses = row[2]
                        wins = row[3]
                        win_rate = (wins / total_uses) if total_uses > 0 else None

                        stats = CardStats(
                            card_id=row[0],
                            card_name=row[1],
                            total_uses=total_uses,
                            wins=wins,
                            losses=row[4],
                            win_rate=win_rate
                        )
                        stats_list.append(stats)
                    except Exception as e:
                        logger.exception("Failed to parse card stats row")
                        raise DatabaseDataError(
                            f"Failed to parse card stats row: {e!s}"
                        ) from e

                logger.info(f"DB result: get_card_win_rates returned {len(stats_list)} cards")
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
        self,
        season_id: int | None = None,
        league: str | None = None,
        limit: int = 50
    ) -> list[CardStats]:
        """
        Get card usage rates (how often cards are played) from card_usage_facts.

        Args:
            season_id: Optional season filter
            league: Optional league filter
            limit: Maximum number of results

        Returns:
            List of CardStats ordered by total_uses descending
        """
        logger.info(
            f"DB query: get_card_usage_rates | season_id={season_id}, league={league}, limit={limit}"
        )
        try:
            async with self.async_session() as session:
                # Build WHERE clause
                where_conditions = []
                params: dict[str, Any] = {"limit": limit}

                if season_id:
                    where_conditions.append("cuf.season_id = :season_id")
                    params["season_id"] = season_id

                if league:
                    where_conditions.append("cuf.league = :league")
                    params["league"] = league

                where_clause = "WHERE " + " AND ".join(where_conditions) if where_conditions else ""

                # Subquery to get total battles
                total_query = f"SELECT COUNT(*) FROM card_usage_facts {where_clause}"
                total_result = await session.execute(text(total_query), params)
                total_uses = total_result.scalar() or 1  # Avoid division by zero

                query = f"""
                    SELECT
                        cuf.card_id,
                        c.name AS card_name,
                        COUNT(*) AS total_uses,
                        SUM(CASE WHEN cuf.result = 'WIN' THEN 1 ELSE 0 END) AS wins,
                        SUM(CASE WHEN cuf.result = 'LOSS' THEN 1 ELSE 0 END) AS losses,
                        ROUND(100.0 * COUNT(*) / :total_uses, 2) AS usage_rate_pct
                    FROM card_usage_facts cuf
                    LEFT JOIN cards c ON cuf.card_id = c.card_id
                    {where_clause}
                    GROUP BY cuf.card_id, c.name
                    ORDER BY total_uses DESC
                    LIMIT :limit
                """
                params["total_uses"] = total_uses

                result = await session.execute(text(query), params)
                rows = result.fetchall()

                stats_list = []
                for row in rows:
                    try:
                        total = row[2]
                        wins = row[3]

                        stats = CardStats(
                            card_id=row[0],
                            card_name=row[1],
                            total_uses=total,
                            wins=wins,
                            losses=row[4],
                            win_rate=(wins / total) if total > 0 else None,
                            usage_rate=row[5]
                        )
                        stats_list.append(stats)
                    except Exception as e:
                        logger.exception("Failed to parse card usage stats row")
                        raise DatabaseDataError(
                            f"Failed to parse card usage stats row: {e!s}"
                        ) from e

                logger.info(f"DB result: get_card_usage_rates returned {len(stats_list)} cards")
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

    # ===== DECKS ENDPOINTS (READ ONLY) =====

    async def get_deck_by_id(self, deck_id: str) -> Deck | None:
        """
        Get a deck by its ID from the decks dimension table.

        Args:
            deck_id: The deck ID (plaintext composition: card_id_variant|card_id_variant|...)

        Returns:
            Deck object or None if not found
        """
        logger.info(f"DB query: get_deck_by_id | deck_id={deck_id}")
        try:
            async with self.async_session() as session:
                stmt = text("""
                    SELECT deck_id, avg_elixir
                    FROM decks
                    WHERE deck_id = :deck_id
                """)
                result = await session.execute(stmt, {"deck_id": deck_id})
                row = result.fetchone()

                if row:
                    return Deck(deck_id=row[0], avg_elixir=float(row[1]))
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
        Get a deck with its cards from deck_cards bridge table.

        Args:
            deck_id: The deck ID

        Returns:
            DeckWithStats with cards populated, or None if not found
        """
        logger.info(f"DB query: get_deck_with_cards | deck_id={deck_id}")
        try:
            async with self.async_session() as session:
                deck_stmt = text(
                    "SELECT deck_id, avg_elixir FROM decks WHERE deck_id = :deck_id"
                )
                deck_result = await session.execute(deck_stmt, {"deck_id": deck_id})
                deck_row = deck_result.fetchone()

                if not deck_row:
                    return None

                cards_stmt = text("""
                    SELECT deck_id, card_id, evolution_level, is_support_card
                    FROM deck_cards
                    WHERE deck_id = :deck_id
                    ORDER BY card_id
                """)
                cards_result = await session.execute(cards_stmt, {"deck_id": deck_id})
                cards_rows = cards_result.fetchall()

                from app.models.models import DeckCards

                deck_cards = []
                for card_row in cards_rows:
                    deck_cards.append(
                        DeckCards(
                            deck_id=card_row[0],
                            card_id=card_row[1],
                            evolution_level=card_row[2],
                            is_support_card=card_row[3]
                        )
                    )

                return DeckWithStats(
                    deck_id=deck_row[0],
                    avg_elixir=float(deck_row[1]),
                    cards=deck_cards
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

    # ===== DECK ANALYTICS (READ ONLY) =====

    async def get_deck_stats(
        self,
        deck_id: str,
        season_id: int | None = None,
        league: str | None = None
    ) -> DeckStats | None:
        """
        Get statistics for a deck aggregated from deck_usage_facts.

        Args:
            deck_id: The deck ID
            season_id: Optional season filter
            league: Optional league filter

        Returns:
            DeckStats object with aggregated statistics, or None if deck not found
        """
        logger.info(
            f"DB query: get_deck_stats | deck_id={deck_id}, season_id={season_id}, league={league}"
        )
        try:
            async with self.async_session() as session:
                where_conditions = ["duf.deck_id = :deck_id"]
                params: dict[str, Any] = {"deck_id": deck_id}

                if season_id:
                    where_conditions.append("duf.season_id = :season_id")
                    params["season_id"] = season_id

                if league:
                    where_conditions.append("duf.league = :league")
                    params["league"] = league

                where_clause = "WHERE " + " AND ".join(where_conditions)

                query = f"""
                    SELECT
                        duf.deck_id,
                        COUNT(*) AS games_played,
                        SUM(CASE WHEN duf.result = 'WIN' THEN 1 ELSE 0 END) AS wins,
                        SUM(CASE WHEN duf.result = 'LOSS' THEN 1 ELSE 0 END) AS losses
                    FROM deck_usage_facts duf
                    {where_clause}
                    GROUP BY duf.deck_id
                """

                result = await session.execute(text(query), params)
                row = result.fetchone()

                if row:
                    games = row[1]
                    wins = row[2]
                    win_rate = (wins / games) if games > 0 else None

                    return DeckStats(
                        deck_id=row[0],
                        games_played=games,
                        wins=wins,
                        losses=row[3],
                        win_rate=win_rate
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
        archetype: object | None = None,
        sort_by: DeckSortBy = DeckSortBy.RECENT,
        min_games: int = 0
    ) -> list[DeckWithStats]:
        """
        Get top decks with their stats, optionally sorted.

        Args:
            limit: Maximum number of decks to return (default: 50)
            archetype: Deprecated (not supported in the new schema)
            sort_by: How to sort the results (default: RECENT)
            min_games: Minimum number of games played (default: 0)

        Returns:
            List of DeckWithStats objects ordered by sort_by criteria
        """
        if archetype is not None:
            logger.warning("get_top_decks_with_stats called with archetype filter; ignored.")
        logger.info(
            f"DB query: get_top_decks_with_stats | limit={limit}, sort_by={sort_by.value}, min_games={min_games}"
        )

        if sort_by == DeckSortBy.RECENT:
            order_clause = "ORDER BY dsa.last_seen DESC NULLS LAST"
        elif sort_by == DeckSortBy.GAMES_PLAYED:
            order_clause = "ORDER BY COALESCE(dsa.games_played, 0) DESC"
        elif sort_by == DeckSortBy.WIN_RATE:
            order_clause = (
                "ORDER BY CASE WHEN COALESCE(dsa.games_played, 0) > 0 "
                "THEN CAST(dsa.wins AS FLOAT) / dsa.games_played ELSE 0 END DESC"
            )
        elif sort_by == DeckSortBy.WINS:
            order_clause = "ORDER BY COALESCE(dsa.wins, 0) DESC"
        else:
            order_clause = "ORDER BY dsa.last_seen DESC NULLS LAST"

        try:
            async with self.async_session() as session:
                params: dict[str, Any] = {"limit": limit, "min_games": min_games}

                query = f"""
                    WITH deck_stats_agg AS (
                        SELECT
                            duf.deck_id,
                            COUNT(*) AS games_played,
                            SUM(CASE WHEN duf.result = 'WIN' THEN 1 ELSE 0 END) AS wins,
                            SUM(CASE WHEN duf.result = 'LOSS' THEN 1 ELSE 0 END) AS losses,
                            MAX(duf.battle_time) AS last_seen
                        FROM deck_usage_facts duf
                        GROUP BY duf.deck_id
                    )
                    SELECT
                        d.deck_id,
                        d.avg_elixir,
                        COALESCE(dsa.games_played, 0) AS games_played,
                        COALESCE(dsa.wins, 0) AS wins,
                        COALESCE(dsa.losses, 0) AS losses,
                        dsa.last_seen
                    FROM decks d
                    LEFT JOIN deck_stats_agg dsa ON d.deck_id = dsa.deck_id
                    WHERE COALESCE(dsa.games_played, 0) >= :min_games
                    {order_clause}
                    LIMIT :limit
                """

                result = await session.execute(text(query), params)
                rows = result.fetchall()

                decks = []
                for row in rows:
                    games = row[2]
                    wins = row[3]
                    win_rate = (wins / games) if games > 0 else None

                    deck = DeckWithStats(
                        deck_id=row[0],
                        avg_elixir=float(row[1]),
                        games_played=games,
                        wins=wins,
                        losses=row[4],
                        win_rate=win_rate,
                        last_seen=row[5]
                    )
                    decks.append(deck)

                logger.info(f"DB result: get_top_decks_with_stats returned {len(decks)} decks")
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
        archetype: object | None = None,
        ftp_tier: object | None = None,
        sort_by: DeckSortBy = DeckSortBy.RECENT,
        min_games: int = 0,
        limit: int = 50,
        offset: int = 0
    ) -> tuple[list[DeckWithStats], int]:
        """
        Search for decks with stats and filters.

        Args:
            include_card_ids: List of card IDs (int) or card specs with variant (str: "card_id_evolution_level")
            exclude_card_ids: List of card IDs (int) or card specs with variant (str: "card_id_evolution_level")
            archetype: Deprecated (not supported in the new schema)
            ftp_tier: Deprecated (not supported in the new schema)
            sort_by: How to sort the results (default: RECENT)
            min_games: Minimum number of games played (default: 0)
            limit: Maximum number of results (default: 50)
            offset: Number of results to skip (default: 0)

        Returns:
            Tuple of (List of DeckWithStats objects, Total count of matching decks)
        """
        if archetype is not None or ftp_tier is not None:
            logger.warning("search_decks_with_stats called with archetype/ftp_tier filters; ignored.")
        logger.info(
            f"DB query: search_decks_with_stats | include_cards={include_card_ids}, "
            f"exclude_cards={exclude_card_ids}, sort_by={sort_by.value}, "
            f"min_games={min_games}, limit={limit}, offset={offset}"
        )

        if sort_by == DeckSortBy.RECENT:
            order_clause = "ORDER BY dsa.last_seen DESC NULLS LAST"
        elif sort_by == DeckSortBy.GAMES_PLAYED:
            order_clause = "ORDER BY COALESCE(dsa.games_played, 0) DESC"
        elif sort_by == DeckSortBy.WIN_RATE:
            order_clause = (
                "ORDER BY CASE WHEN COALESCE(dsa.games_played, 0) > 0 "
                "THEN CAST(dsa.wins AS FLOAT) / dsa.games_played ELSE 0 END DESC"
            )
        elif sort_by == DeckSortBy.WINS:
            order_clause = "ORDER BY COALESCE(dsa.wins, 0) DESC"
        else:
            order_clause = "ORDER BY dsa.last_seen DESC NULLS LAST"

        try:
            async with self.async_session() as session:
                deck_conditions = ["COALESCE(dsa.games_played, 0) >= :min_games"]
                params: dict[str, Any] = {
                    "min_games": min_games,
                    "limit": limit,
                    "offset": offset
                }

                if include_card_ids:
                    for i, card_spec in enumerate(include_card_ids):
                        if isinstance(card_spec, str) and "_" in card_spec:
                            # Format: "card_id_evolution_level" (e.g., "26000012_1")
                            card_id, evo_level = card_spec.split("_", 1)
                            deck_conditions.append(
                                f"EXISTS (SELECT 1 FROM deck_cards "
                                f"WHERE deck_id = d.deck_id AND card_id = :include_id_{i} "
                                f"AND evolution_level = :include_evo_{i})"
                            )
                            params[f"include_id_{i}"] = int(card_id)
                            params[f"include_evo_{i}"] = int(evo_level)
                        else:
                            # Backward compatible: just card_id (any variant)
                            deck_conditions.append(
                                f"EXISTS (SELECT 1 FROM deck_cards "
                                f"WHERE deck_id = d.deck_id AND card_id = :include_{i})"
                            )
                            params[f"include_{i}"] = int(card_spec) if isinstance(card_spec, str) else card_spec

                if exclude_card_ids:
                    for i, card_spec in enumerate(exclude_card_ids):
                        if isinstance(card_spec, str) and "_" in card_spec:
                            # Format: "card_id_evolution_level" (e.g., "26000012_1")
                            card_id, evo_level = card_spec.split("_", 1)
                            deck_conditions.append(
                                f"NOT EXISTS (SELECT 1 FROM deck_cards "
                                f"WHERE deck_id = d.deck_id AND card_id = :exclude_id_{i} "
                                f"AND evolution_level = :exclude_evo_{i})"
                            )
                            params[f"exclude_id_{i}"] = int(card_id)
                            params[f"exclude_evo_{i}"] = int(evo_level)
                        else:
                            # Backward compatible: just card_id (any variant)
                            deck_conditions.append(
                                f"NOT EXISTS (SELECT 1 FROM deck_cards "
                                f"WHERE deck_id = d.deck_id AND card_id = :exclude_{i})"
                            )
                            params[f"exclude_{i}"] = int(card_spec) if isinstance(card_spec, str) else card_spec

                where_clause = "WHERE " + " AND ".join(deck_conditions)

                count_query = f"""
                    WITH deck_stats_agg AS (
                        SELECT
                            duf.deck_id,
                            COUNT(*) AS games_played,
                            SUM(CASE WHEN duf.result = 'WIN' THEN 1 ELSE 0 END) AS wins,
                            SUM(CASE WHEN duf.result = 'LOSS' THEN 1 ELSE 0 END) AS losses,
                            MAX(duf.battle_time) AS last_seen
                        FROM deck_usage_facts duf
                        GROUP BY duf.deck_id
                    )
                    SELECT COUNT(*)
                    FROM decks d
                    LEFT JOIN deck_stats_agg dsa ON d.deck_id = dsa.deck_id
                    {where_clause}
                """
                count_result = await session.execute(text(count_query), params)
                total_count = count_result.scalar() or 0

                data_query = f"""
                    WITH deck_stats_agg AS (
                        SELECT
                            duf.deck_id,
                            COUNT(*) AS games_played,
                            SUM(CASE WHEN duf.result = 'WIN' THEN 1 ELSE 0 END) AS wins,
                            SUM(CASE WHEN duf.result = 'LOSS' THEN 1 ELSE 0 END) AS losses,
                            MAX(duf.battle_time) AS last_seen
                        FROM deck_usage_facts duf
                        GROUP BY duf.deck_id
                    )
                    SELECT
                        d.deck_id,
                        d.avg_elixir,
                        COALESCE(dsa.games_played, 0) AS games_played,
                        COALESCE(dsa.wins, 0) AS wins,
                        COALESCE(dsa.losses, 0) AS losses,
                        dsa.last_seen
                    FROM decks d
                    LEFT JOIN deck_stats_agg dsa ON d.deck_id = dsa.deck_id
                    {where_clause}
                    {order_clause}
                    LIMIT :limit OFFSET :offset
                """

                result = await session.execute(text(data_query), params)
                rows = result.fetchall()

                decks = []
                for row in rows:
                    games = row[2]
                    wins = row[3]
                    win_rate = (wins / games) if games > 0 else None

                    deck = DeckWithStats(
                        deck_id=row[0],
                        avg_elixir=float(row[1]),
                        games_played=games,
                        wins=wins,
                        losses=row[4],
                        win_rate=win_rate,
                        last_seen=row[5]
                    )
                    decks.append(deck)

                logger.info(
                    f"DB result: search_decks_with_stats returned {len(decks)} decks out of {total_count} total"
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

    # ===== LOCATIONS ENDPOINTS =====

    async def get_all_locations(self) -> Locations:
        """
        Get all locations from the database.

        Returns:
            Locations object containing all locations
        """
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
                        location = Location(
                            id=row[0],
                            name=row[1],
                            is_country=row[2],
                            country_code=row[3]
                        )
                        locations.append(location)
                    except Exception as e:
                        logger.exception("Failed to parse location row in get_all_locations")
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


# Singleton instance
_db_service: DatabaseService | None = None


def get_database_service() -> DatabaseService:
    """
    Get or create the database service singleton.

    Returns:
        DatabaseService instance
    """
    global _db_service
    if _db_service is None:
        _db_service = DatabaseService()
    return _db_service
