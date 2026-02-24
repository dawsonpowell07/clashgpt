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
        try:
            if settings.dev_mode:
                return "postgresql+asyncpg://postgres:postgres@127.0.0.1:54322/postgres"

            encoded_pass = quote(settings.supabase_db_password or "", safe="")
            return (
                f"postgresql+asyncpg://{settings.supabase_db_user}:{encoded_pass}@"
                f"{settings.supabase_db_host}:{settings.supabase_db_port}/"
                f"{settings.supabase_db_name}"
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
                        raise DatabaseDataError(f"Failed to parse card row: {e!s}") from e

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
                        raise DatabaseDataError(f"Failed to parse card row: {e!s}") from e
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
                        logger.exception("Failed to parse card row in get_cards_by_rarity")
                        raise DatabaseDataError(f"Failed to parse card row: {e!s}") from e

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
        min_uses: int = 100,
        limit: int = 50
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
                join_clause = ""
                where_conditions = []

                if season_id:
                    join_clause = "JOIN processed_battles pb ON fbp.battle_id = pb.battle_id"
                    where_conditions.append("pb.season_id = :season_id")
                    params["season_id"] = season_id

                where_clause = "WHERE " + " AND ".join(where_conditions) if where_conditions else ""

                query = f"""
                    SELECT
                        dc.card_id,
                        dc.name AS card_name,
                        COUNT(*) AS total_uses,
                        SUM(fbp.is_win) AS wins,
                        SUM(CASE WHEN fbp.is_win = 0 THEN 1 ELSE 0 END) AS losses,
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
                        stats_list.append(CardStats(
                            card_id=row[0],
                            card_name=row[1],
                            total_uses=total_uses,
                            wins=wins,
                            losses=int(row[4]),
                            win_rate=win_rate,
                        ))
                    except Exception as e:
                        logger.exception("Failed to parse card stats row")
                        raise DatabaseDataError(f"Failed to parse card stats row: {e!s}") from e

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
        limit: int = 50
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
                join_clause = ""
                where_conditions = []

                if season_id:
                    join_clause = "JOIN processed_battles pb ON fbp.battle_id = pb.battle_id"
                    where_conditions.append("pb.season_id = :season_id")
                    params["season_id"] = season_id

                where_clause = "WHERE " + " AND ".join(where_conditions) if where_conditions else ""

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
                        SUM(CASE WHEN fbp.is_win = 0 THEN 1 ELSE 0 END) AS losses,
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
                        stats_list.append(CardStats(
                            card_id=row[0],
                            card_name=row[1],
                            total_uses=total,
                            wins=wins,
                            losses=int(row[4]),
                            win_rate=(wins / total) if total > 0 else None,
                            usage_rate=float(row[5]),
                        ))
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
                    logger.info(f"DB result: get_card_stats_by_id - card {card_id} not found")
                    return None

                card_name = card_row[1]

                join_clause = ""
                season_conditions = []
                season_params: dict[str, Any] = {}
                if season_id:
                    join_clause = "JOIN processed_battles pb ON fbp.battle_id = pb.battle_id"
                    season_conditions.append("pb.season_id = :season_id")
                    season_params["season_id"] = season_id

                season_where = "WHERE " + " AND ".join(season_conditions) if season_conditions else ""

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
                total_decks_result = await session.execute(text(total_decks_query), season_params)
                total_decks = total_decks_result.scalar() or 1

                # Stats for the specific card
                card_where_conditions = [f"dcc.card_id = :card_id"]
                if season_conditions:
                    card_where_conditions.extend(season_conditions)

                card_where = "WHERE " + " AND ".join(card_where_conditions)
                card_params = {"card_id": card_id, **season_params}

                stats_query = f"""
                    SELECT
                        COUNT(*) AS total_uses,
                        SUM(fbp.is_win) AS wins,
                        SUM(CASE WHEN fbp.is_win = 0 THEN 1 ELSE 0 END) AS losses,
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
                where_conditions = ["fbp.deck_id = :deck_id"]
                params: dict[str, Any] = {"deck_id": deck_id}
                join_clause = ""

                if season_id:
                    join_clause = "JOIN processed_battles pb ON fbp.battle_id = pb.battle_id"
                    where_conditions.append("pb.season_id = :season_id")
                    params["season_id"] = season_id

                where_clause = "WHERE " + " AND ".join(where_conditions)

                query = f"""
                    SELECT
                        fbp.deck_id,
                        COUNT(*) AS games_played,
                        SUM(fbp.is_win) AS wins,
                        SUM(CASE WHEN fbp.is_win = 0 THEN 1 ELSE 0 END) AS losses
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
                            SUM(CASE WHEN fbp.is_win = 0 THEN 1 ELSE 0 END) AS losses,
                            MAX(pb.battle_time) AS last_seen
                        FROM fact_battle_participants fbp
                        JOIN processed_battles pb ON fbp.battle_id = pb.battle_id
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

        Returns:
            Tuple of (list of DeckWithStats, total matching count)
        """
        logger.info(
            f"DB query: search_decks_with_stats | include={include_card_ids}, "
            f"exclude={exclude_card_ids}, sort_by={sort_by.value}, "
            f"min_games={min_games}, limit={limit}, offset={offset}"
        )

        order_clause = _build_order_clause(sort_by)

        try:
            async with self.async_session() as session:
                # Build season join for the stats CTE
                season_join = ""
                season_where = ""
                params: dict[str, Any] = {
                    "min_games": min_games,
                    "limit": limit,
                    "offset": offset,
                }

                if season_id:
                    season_join = "JOIN processed_battles pb ON fbp.battle_id = pb.battle_id"
                    season_where = "WHERE pb.season_id = :season_id"
                    params["season_id"] = season_id

                # Build card include/exclude conditions on dim_decks
                deck_conditions = ["COALESCE(dsa.games_played, 0) >= :min_games"]

                if include_card_ids:
                    for i, card_spec in enumerate(include_card_ids):
                        if isinstance(card_spec, str) and ":" in card_spec:
                            card_id_str, variant = card_spec.split(":", 1)
                            deck_conditions.append(
                                f"EXISTS (SELECT 1 FROM deck_card_config "
                                f"WHERE deck_id = d.deck_id AND card_id = :include_id_{i} "
                                f"AND variant::text = :include_variant_{i})"
                            )
                            params[f"include_id_{i}"] = int(card_id_str)
                            params[f"include_variant_{i}"] = variant.lower()
                        else:
                            deck_conditions.append(
                                f"EXISTS (SELECT 1 FROM deck_card_config "
                                f"WHERE deck_id = d.deck_id AND card_id = :include_{i})"
                            )
                            params[f"include_{i}"] = int(card_spec) if isinstance(card_spec, str) else card_spec

                if exclude_card_ids:
                    for i, card_spec in enumerate(exclude_card_ids):
                        if isinstance(card_spec, str) and ":" in card_spec:
                            card_id_str, variant = card_spec.split(":", 1)
                            deck_conditions.append(
                                f"NOT EXISTS (SELECT 1 FROM deck_card_config "
                                f"WHERE deck_id = d.deck_id AND card_id = :exclude_id_{i} "
                                f"AND variant::text = :exclude_variant_{i})"
                            )
                            params[f"exclude_id_{i}"] = int(card_id_str)
                            params[f"exclude_variant_{i}"] = variant.lower()
                        else:
                            deck_conditions.append(
                                f"NOT EXISTS (SELECT 1 FROM deck_card_config "
                                f"WHERE deck_id = d.deck_id AND card_id = :exclude_{i})"
                            )
                            params[f"exclude_{i}"] = int(card_spec) if isinstance(card_spec, str) else card_spec

                where_clause = "WHERE " + " AND ".join(deck_conditions)

                stats_cte = f"""
                    deck_stats_agg AS (
                        SELECT
                            fbp.deck_id,
                            COUNT(*) AS games_played,
                            SUM(fbp.is_win) AS wins,
                            SUM(CASE WHEN fbp.is_win = 0 THEN 1 ELSE 0 END) AS losses,
                            MAX(pb.battle_time) AS last_seen
                        FROM fact_battle_participants fbp
                        JOIN processed_battles pb ON fbp.battle_id = pb.battle_id
                        {season_where}
                        GROUP BY fbp.deck_id
                    )
                """

                count_query = f"""
                    WITH {stats_cte}
                    SELECT COUNT(*)
                    FROM dim_decks d
                    LEFT JOIN deck_stats_agg dsa ON d.deck_id = dsa.deck_id
                    {where_clause}
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
                    FROM dim_decks d
                    LEFT JOIN deck_stats_agg dsa ON d.deck_id = dsa.deck_id
                    {where_clause}
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
                        locations.append(Location(
                            id=row[0],
                            name=row[1],
                            is_country=row[2],
                            country_code=row[3],
                        ))
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


# ===== MODULE-LEVEL HELPERS =====

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
        decks.append(DeckWithStats(
            deck_id=row[0],
            avg_elixir=float(row[1]) if row[1] is not None else None,
            games_played=games,
            wins=wins,
            losses=int(row[4]),
            win_rate=win_rate,
            last_seen=last_seen.isoformat() if hasattr(last_seen, "isoformat") else (str(last_seen) if last_seen else None),
        ))
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
        cards_by_deck[did].append(DeckCardConfig(
            deck_id=crow[0],
            card_id=crow[1],
            slot_index=crow[2],
            variant=crow[3],
            card_name=crow[4],
        ))

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
