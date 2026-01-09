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
from sqlalchemy.ext.asyncio import async_sessionmaker, create_async_engine

from app.models.models import (
    Card,
    CardList,
    Deck,
    DeckArchetype,
    DeckSortBy,
    DeckStats,
    DeckWithStats,
    FreeToPlayLevel,
    Location,
    Locations,
    Rarity,
)
from app.settings import settings

logger = logging.getLogger(__name__)
is_cloud_run = os.getenv("K_SERVICE") is not None


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
        if database_url is None:
            database_url = self._build_database_url()

        logger.info(f"Initializing database service | mode={'dev' if settings.dev_mode else 'prod'}")
        self.engine = create_async_engine(database_url, echo=False)
        self.async_session = async_sessionmaker(
            self.engine, expire_on_commit=False
        )

    def _build_database_url(self) -> str:
        """
        Build database URL from settings.

        Uses DEV_MODE flag to determine which database to connect to:
        - DEV_MODE=true: Always use local PostgreSQL (overrides all other settings)

        Returns:
            Async database connection URL
        """
        if settings.dev_mode:
            # Local database configuration
            # Local DB typically doesn't need password
            return f"postgresql+asyncpg://{settings.local_db_user}@{settings.local_db_host}:{settings.local_db_port}/{settings.local_db_name}"
        else:
            # Production database configuration (Google Cloud SQL)
            encoded_user = quote(settings.prod_db_user, safe="")
            encoded_pass = quote(settings.prod_db_password or "", safe="")

            # For Google Cloud SQL, check if using Cloud SQL Proxy
            # If proxy is running, it listens on localhost:5432
            # Otherwise, you'll need to use the Cloud SQL Python Connector
            if is_cloud_run and settings.connection_name:
                encoded_instance = settings.connection_name.replace(":", "%3A")
                return (
                    f"postgresql+asyncpg://{encoded_user}:{encoded_pass}@"
                    f"/{settings.prod_db_name}"
                    # asyncpg often prefers the raw string or the dir
                    f"?host=/cloudsql/{encoded_instance}"
                )
            else:
                # Direct connection (requires public IP or VPC)
                return f"postgresql+asyncpg://{settings.prod_db_user}:{settings.prod_db_password}@{settings.prod_db_host}:{settings.prod_db_port}/{settings.prod_db_name}"

    async def close(self):
        """Close database connections."""
        logger.info("Closing database connections")
        await self.engine.dispose()

    # ===== CARDS ENDPOINTS =====

    async def get_all_cards(self) -> CardList:
        """
        Get all cards from the database.

        Returns:
            CardList containing all cards
        """
        logger.info("DB query: get_all_cards")
        async with self.async_session() as session:
            stmt = text(
                "SELECT id, name, elixir_cost, rarity, icon_urls FROM cards ORDER BY name")
            result = await session.execute(stmt)
            rows = result.fetchall()

            cards = []
            for row in rows:
                card = Card(
                    id=row[0],
                    name=row[1],
                    elixir_cost=row[2],
                    rarity=Rarity(row[3]),
                    icon_urls=row[4]
                )
                cards.append(card)

            logger.info(f"DB result: get_all_cards returned {len(cards)} cards")
            return CardList(cards=cards)

    async def get_card_by_id(self, card_id: str) -> Card | None:
        """
        Get a card by its ID.

        Args:
            card_id: The card ID to fetch

        Returns:
            Card object or None if not found
        """
        logger.info(f"DB query: get_card_by_id | card_id={card_id}")
        async with self.async_session() as session:
            stmt = text(
                "SELECT id, name, elixir_cost, rarity, icon_urls FROM cards WHERE id = :card_id")
            result = await session.execute(stmt, {"card_id": card_id})
            row = result.fetchone()

            if row:
                return Card(
                    id=row[0],
                    name=row[1],
                    elixir_cost=row[2],
                    rarity=Rarity(row[3]),
                    icon_urls=row[4]
                )
            return None

    async def get_cards_by_rarity(self, rarity: Rarity) -> CardList:
        """
        Get all cards of a specific rarity.

        Args:
            rarity: The rarity to filter by

        Returns:
            CardList containing cards of the specified rarity
        """
        logger.info(f"DB query: get_cards_by_rarity | rarity={rarity.value}")
        async with self.async_session() as session:
            stmt = text(
                "SELECT id, name, elixir_cost, rarity, icon_urls FROM cards WHERE rarity = :rarity ORDER BY name"
            )
            result = await session.execute(stmt, {"rarity": rarity.value})
            rows = result.fetchall()

            cards = []
            for row in rows:
                card = Card(
                    id=row[0],
                    name=row[1],
                    elixir_cost=row[2],
                    rarity=Rarity(row[3]),
                    icon_urls=row[4]
                )
                cards.append(card)

            return CardList(cards=cards)

    # ===== DECKS ENDPOINTS =====

    async def get_top_decks(
        self,
        limit: int = 50,
        archetype: DeckArchetype | None = None
    ) -> list[Deck]:
        """
        Get top decks, optionally filtered by archetype.

        Args:
            limit: Maximum number of decks to return (default: 50)
            archetype: Optional archetype to filter by

        Returns:
            List of Deck objects ordered by last_seen_at (most recent first)
        """
        logger.info(f"DB query: get_top_decks | limit={limit}, archetype={archetype.value if archetype else None}")
        async with self.async_session() as session:
            if archetype:
                stmt = text("""
                    SELECT id, deck_hash, cards, avg_elixir, archetype, ftp_tier
                    FROM decks
                    WHERE archetype = :archetype
                    ORDER BY last_seen_at DESC
                    LIMIT :limit
                """)
                result = await session.execute(stmt, {"archetype": archetype.value, "limit": limit})
            else:
                stmt = text("""
                    SELECT id, deck_hash, cards, avg_elixir, archetype, ftp_tier
                    FROM decks
                    ORDER BY last_seen_at DESC
                    LIMIT :limit
                """)
                result = await session.execute(stmt, {"limit": limit})

            rows = result.fetchall()
            decks = []
            for row in rows:
                deck = Deck(
                    id=row[0],
                    deck_hash=row[1],
                    cards=row[2],
                    avg_elixir=float(row[3]),
                    archetype=DeckArchetype(
                        row[4]) if row[4] else DeckArchetype.BEATDOWN,
                    ftp_tier=FreeToPlayLevel(
                        row[5]) if row[5] else FreeToPlayLevel.MODERATE
                )
                decks.append(deck)

            logger.info(f"DB result: get_top_decks returned {len(decks)} decks")
            return decks

    async def search_decks(
        self,
        include_card_ids: list[str] | None = None,
        exclude_card_ids: list[str] | None = None,
        archetype: DeckArchetype | None = None,
        ftp_tier: FreeToPlayLevel | None = None,
        limit: int = 50,
        offset: int = 0
    ) -> tuple[list[Deck], int]:
        """
        Search for decks with filters.

        Args:
            include_card_ids: List of card IDs that must be in the deck
            exclude_card_ids: List of card IDs that must not be in the deck
            archetype: Optional archetype filter
            ftp_tier: Optional free-to-play tier filter
            limit: Maximum number of results (default: 50)
            offset: Number of results to skip (default: 0)

        Returns:
            Tuple of (List of Deck objects matching the filters, Total count of matching decks)
        """
        logger.info(
            f"DB query: search_decks | "
            f"include_cards={include_card_ids}, exclude_cards={exclude_card_ids}, "
            f"archetype={archetype.value if archetype else None}, "
            f"ftp_tier={ftp_tier.value if ftp_tier else None}, limit={limit}, offset={offset}"
        )
        async with self.async_session() as session:
            # Build base WHERE clause for both queries
            where_clause = "WHERE 1=1"
            params: dict[str, Any] = {}

            # Filter by included cards
            if include_card_ids:
                for i, card_id in enumerate(include_card_ids):
                    where_clause += f" AND EXISTS (SELECT 1 FROM jsonb_array_elements(cards) AS card WHERE card->>'card_id' = :include_card_{i})"
                    params[f"include_card_{i}"] = card_id

            # Filter by excluded cards
            if exclude_card_ids:
                for i, card_id in enumerate(exclude_card_ids):
                    where_clause += f" AND NOT EXISTS (SELECT 1 FROM jsonb_array_elements(cards) AS card WHERE card->>'card_id' = :exclude_card_{i})"
                    params[f"exclude_card_{i}"] = card_id

            # Filter by archetype
            if archetype:
                where_clause += " AND archetype = :archetype"
                params["archetype"] = archetype.value

            # Filter by FTP tier
            if ftp_tier:
                where_clause += " AND ftp_tier = :ftp_tier"
                params["ftp_tier"] = ftp_tier.value

            # Get total count
            count_query = f"SELECT COUNT(*) FROM decks {where_clause}"
            count_result = await session.execute(text(count_query), params)
            total_count = count_result.scalar() or 0

            # Get paginated results
            data_query = f"""
                SELECT id, deck_hash, cards, avg_elixir, archetype, ftp_tier
                FROM decks
                {where_clause}
                ORDER BY last_seen_at DESC
                LIMIT :limit OFFSET :offset
            """
            params["limit"] = limit
            params["offset"] = offset

            result = await session.execute(text(data_query), params)
            rows = result.fetchall()

            decks = []
            for row in rows:
                deck = Deck(
                    id=row[0],
                    deck_hash=row[1],
                    cards=row[2],
                    avg_elixir=float(row[3]),
                    archetype=DeckArchetype(
                        row[4]) if row[4] else DeckArchetype.BEATDOWN,
                    ftp_tier=FreeToPlayLevel(
                        row[5]) if row[5] else FreeToPlayLevel.MODERATE
                )
                decks.append(deck)

            logger.info(f"DB result: search_decks returned {len(decks)} decks out of {total_count} total")
            return decks, total_count

    async def get_top_decks_with_stats(
        self,
        limit: int = 50,
        archetype: DeckArchetype | None = None,
        sort_by: DeckSortBy = DeckSortBy.RECENT,
        min_games: int = 0
    ) -> list[DeckWithStats]:
        """
        Get top decks with their stats, optionally filtered and sorted.

        Args:
            limit: Maximum number of decks to return (default: 50)
            archetype: Optional archetype to filter by
            sort_by: How to sort the results (default: RECENT)
            min_games: Minimum number of games played (default: 0)

        Returns:
            List of DeckWithStats objects ordered by sort_by criteria
        """
        logger.info(
            f"DB query: get_top_decks_with_stats | limit={limit}, archetype={archetype.value if archetype else None}, "
            f"sort_by={sort_by.value}, min_games={min_games}"
        )

        # Build ORDER BY clause based on sort_by
        if sort_by == DeckSortBy.RECENT:
            order_clause = "ORDER BY d.last_seen_at DESC"
        elif sort_by == DeckSortBy.GAMES_PLAYED:
            order_clause = "ORDER BY COALESCE(ds.games_played, 0) DESC"
        elif sort_by == DeckSortBy.WIN_RATE:
            order_clause = "ORDER BY CASE WHEN COALESCE(ds.games_played, 0) > 0 THEN CAST(ds.wins AS FLOAT) / ds.games_played ELSE 0 END DESC"
        elif sort_by == DeckSortBy.WINS:
            order_clause = "ORDER BY COALESCE(ds.wins, 0) DESC"
        else:
            order_clause = "ORDER BY d.last_seen_at DESC"

        async with self.async_session() as session:
            # Build WHERE clause
            where_conditions = []
            params: dict[str, Any] = {"limit": limit}

            if archetype:
                where_conditions.append("d.archetype = :archetype")
                params["archetype"] = archetype.value

            if min_games > 0:
                where_conditions.append("COALESCE(ds.games_played, 0) >= :min_games")
                params["min_games"] = min_games

            where_clause = "WHERE " + " AND ".join(where_conditions) if where_conditions else ""

            query = f"""
                SELECT
                    d.id, d.deck_hash, d.cards, d.avg_elixir, d.archetype, d.ftp_tier,
                    ds.games_played, ds.wins, ds.losses, ds.unique_players
                FROM decks d
                LEFT JOIN deck_stats ds ON d.id = ds.id
                {where_clause}
                {order_clause}
                LIMIT :limit
            """

            result = await session.execute(text(query), params)
            rows = result.fetchall()

            decks = []
            for row in rows:
                games = row[6] if row[6] is not None else 0
                wins = row[7] if row[7] is not None else 0
                losses = row[8] if row[8] is not None else 0
                win_rate = (wins / games) if games > 0 else None

                deck = DeckWithStats(
                    id=row[0],
                    deck_hash=row[1],
                    cards=row[2],
                    avg_elixir=float(row[3]),
                    archetype=DeckArchetype(row[4]) if row[4] else DeckArchetype.BEATDOWN,
                    ftp_tier=FreeToPlayLevel(row[5]) if row[5] else FreeToPlayLevel.MODERATE,
                    games_played=games,
                    wins=wins,
                    losses=losses,
                    unique_players=row[9] if row[9] is not None else 0,
                    win_rate=win_rate
                )
                decks.append(deck)

            logger.info(f"DB result: get_top_decks_with_stats returned {len(decks)} decks")
            return decks

    async def search_decks_with_stats(
        self,
        include_card_ids: list[str] | None = None,
        exclude_card_ids: list[str] | None = None,
        archetype: DeckArchetype | None = None,
        ftp_tier: FreeToPlayLevel | None = None,
        sort_by: DeckSortBy = DeckSortBy.RECENT,
        min_games: int = 0,
        limit: int = 50,
        offset: int = 0
    ) -> tuple[list[DeckWithStats], int]:
        """
        Search for decks with stats and filters.

        Args:
            include_card_ids: List of card IDs that must be in the deck
            exclude_card_ids: List of card IDs that must not be in the deck
            archetype: Optional archetype filter
            ftp_tier: Optional free-to-play tier filter
            sort_by: How to sort the results (default: RECENT)
            min_games: Minimum number of games played (default: 0)
            limit: Maximum number of results (default: 50)
            offset: Number of results to skip (default: 0)

        Returns:
            Tuple of (List of DeckWithStats objects, Total count of matching decks)
        """
        logger.info(
            f"DB query: search_decks_with_stats | "
            f"include_cards={include_card_ids}, exclude_cards={exclude_card_ids}, "
            f"archetype={archetype.value if archetype else None}, "
            f"ftp_tier={ftp_tier.value if ftp_tier else None}, sort_by={sort_by.value}, "
            f"min_games={min_games}, limit={limit}, offset={offset}"
        )

        # Build ORDER BY clause based on sort_by
        if sort_by == DeckSortBy.RECENT:
            order_clause = "ORDER BY d.last_seen_at DESC"
        elif sort_by == DeckSortBy.GAMES_PLAYED:
            order_clause = "ORDER BY COALESCE(ds.games_played, 0) DESC"
        elif sort_by == DeckSortBy.WIN_RATE:
            order_clause = "ORDER BY CASE WHEN COALESCE(ds.games_played, 0) > 0 THEN CAST(ds.wins AS FLOAT) / ds.games_played ELSE 0 END DESC"
        elif sort_by == DeckSortBy.WINS:
            order_clause = "ORDER BY COALESCE(ds.wins, 0) DESC"
        else:
            order_clause = "ORDER BY d.last_seen_at DESC"

        async with self.async_session() as session:
            # Build WHERE clause
            where_clause = "WHERE 1=1"
            params: dict[str, Any] = {}

            # Filter by included cards
            if include_card_ids:
                for i, card_id in enumerate(include_card_ids):
                    where_clause += f" AND EXISTS (SELECT 1 FROM jsonb_array_elements(d.cards) AS card WHERE card->>'card_id' = :include_card_{i})"
                    params[f"include_card_{i}"] = card_id

            # Filter by excluded cards
            if exclude_card_ids:
                for i, card_id in enumerate(exclude_card_ids):
                    where_clause += f" AND NOT EXISTS (SELECT 1 FROM jsonb_array_elements(d.cards) AS card WHERE card->>'card_id' = :exclude_card_{i})"
                    params[f"exclude_card_{i}"] = card_id

            # Filter by archetype
            if archetype:
                where_clause += " AND d.archetype = :archetype"
                params["archetype"] = archetype.value

            # Filter by FTP tier
            if ftp_tier:
                where_clause += " AND d.ftp_tier = :ftp_tier"
                params["ftp_tier"] = ftp_tier.value

            # Filter by minimum games
            if min_games > 0:
                where_clause += " AND COALESCE(ds.games_played, 0) >= :min_games"
                params["min_games"] = min_games

            # Get total count
            count_query = f"""
                SELECT COUNT(*)
                FROM decks d
                LEFT JOIN deck_stats ds ON d.id = ds.id
                {where_clause}
            """
            count_result = await session.execute(text(count_query), params)
            total_count = count_result.scalar() or 0

            # Get paginated results
            data_query = f"""
                SELECT
                    d.id, d.deck_hash, d.cards, d.avg_elixir, d.archetype, d.ftp_tier,
                    ds.games_played, ds.wins, ds.losses, ds.unique_players
                FROM decks d
                LEFT JOIN deck_stats ds ON d.id = ds.id
                {where_clause}
                {order_clause}
                LIMIT :limit OFFSET :offset
            """
            params["limit"] = limit
            params["offset"] = offset

            result = await session.execute(text(data_query), params)
            rows = result.fetchall()

            decks = []
            for row in rows:
                games = row[6] if row[6] is not None else 0
                wins = row[7] if row[7] is not None else 0
                losses = row[8] if row[8] is not None else 0
                win_rate = (wins / games) if games > 0 else None

                deck = DeckWithStats(
                    id=row[0],
                    deck_hash=row[1],
                    cards=row[2],
                    avg_elixir=float(row[3]),
                    archetype=DeckArchetype(row[4]) if row[4] else DeckArchetype.BEATDOWN,
                    ftp_tier=FreeToPlayLevel(row[5]) if row[5] else FreeToPlayLevel.MODERATE,
                    games_played=games,
                    wins=wins,
                    losses=losses,
                    unique_players=row[9] if row[9] is not None else 0,
                    win_rate=win_rate
                )
                decks.append(deck)

            logger.info(f"DB result: search_decks_with_stats returned {len(decks)} decks out of {total_count} total")
            return decks, total_count

    # ===== DECK STATS ENDPOINTS =====

    async def get_deck_stats(self, deck_id: str) -> DeckStats | None:
        """
        Get statistics for a specific deck by ID.

        Args:
            deck_id: The deck ID to fetch stats for

        Returns:
            DeckStats object or None if not found
        """
        logger.info(f"DB query: get_deck_stats | deck_id={deck_id}")
        async with self.async_session() as session:
            stmt = text("""
                SELECT id, games_played, wins, losses, unique_players
                FROM deck_stats
                WHERE id = :deck_id
            """)
            result = await session.execute(stmt, {"deck_id": deck_id})
            row = result.fetchone()

            if row:
                logger.info(f"DB result: get_deck_stats found stats for deck {deck_id}")
                return DeckStats(
                    id=row[0],
                    games_played=row[1],
                    wins=row[2],
                    losses=row[3],
                    unique_players=row[4]
                )
            logger.info(f"DB result: get_deck_stats found no stats for deck {deck_id}")
            return None

    async def insert_deck_stats(self, deck_stats: DeckStats) -> DeckStats:
        """
        Insert a new deck stats record.

        Args:
            deck_stats: DeckStats object to insert

        Returns:
            The inserted DeckStats object
        """
        logger.info(f"DB query: insert_deck_stats | deck_id={deck_stats.id}")
        async with self.async_session() as session:
            stmt = text("""
                INSERT INTO deck_stats (id, games_played, wins, losses, unique_players)
                VALUES (:id, :games_played, :wins, :losses, :unique_players)
                RETURNING id, games_played, wins, losses, unique_players
            """)
            result = await session.execute(stmt, {
                "id": deck_stats.id,
                "games_played": deck_stats.games_played,
                "wins": deck_stats.wins,
                "losses": deck_stats.losses,
                "unique_players": deck_stats.unique_players
            })
            await session.commit()
            row = result.fetchone()

            logger.info(f"DB result: insert_deck_stats inserted stats for deck {deck_stats.id}")
            return DeckStats(
                id=row[0],
                games_played=row[1],
                wins=row[2],
                losses=row[3],
                unique_players=row[4]
            )

    async def upsert_deck_stats(self, deck_stats: DeckStats) -> DeckStats:
        """
        Insert or update deck stats record by replacing all values.
        If a record with the same id exists, replaces it; otherwise inserts.

        Args:
            deck_stats: DeckStats object to upsert

        Returns:
            The upserted DeckStats object
        """
        logger.info(f"DB query: upsert_deck_stats | deck_id={deck_stats.id}")
        async with self.async_session() as session:
            stmt = text("""
                INSERT INTO deck_stats (id, games_played, wins, losses, unique_players)
                VALUES (:id, :games_played, :wins, :losses, :unique_players)
                ON CONFLICT (id) DO UPDATE SET
                    games_played = EXCLUDED.games_played,
                    wins = EXCLUDED.wins,
                    losses = EXCLUDED.losses,
                    unique_players = EXCLUDED.unique_players
                RETURNING id, games_played, wins, losses, unique_players
            """)
            result = await session.execute(stmt, {
                "id": deck_stats.id,
                "games_played": deck_stats.games_played,
                "wins": deck_stats.wins,
                "losses": deck_stats.losses,
                "unique_players": deck_stats.unique_players
            })
            await session.commit()
            row = result.fetchone()

            logger.info(f"DB result: upsert_deck_stats upserted stats for deck {deck_stats.id}")
            return DeckStats(
                id=row[0],
                games_played=row[1],
                wins=row[2],
                losses=row[3],
                unique_players=row[4]
            )

    async def increment_deck_stats(self, deck_stats: DeckStats) -> DeckStats:
        """
        Increment deck stats by adding the provided values to existing stats.
        Creates a new record if the deck doesn't exist yet.

        Args:
            deck_stats: DeckStats object with values to add to existing stats

        Returns:
            The updated DeckStats object with new totals
        """
        logger.info(f"DB query: increment_deck_stats | deck_id={deck_stats.id}")
        async with self.async_session() as session:
            # Use ON CONFLICT to handle both insert and update cases
            # If record exists, add to existing values; if not, insert as new
            stmt = text("""
                INSERT INTO deck_stats (id, games_played, wins, losses, unique_players)
                VALUES (:id, :games_played, :wins, :losses, :unique_players)
                ON CONFLICT (id) DO UPDATE SET
                    games_played = deck_stats.games_played + EXCLUDED.games_played,
                    wins = deck_stats.wins + EXCLUDED.wins,
                    losses = deck_stats.losses + EXCLUDED.losses,
                    unique_players = deck_stats.unique_players + EXCLUDED.unique_players
                RETURNING id, games_played, wins, losses, unique_players
            """)
            result = await session.execute(stmt, {
                "id": deck_stats.id,
                "games_played": deck_stats.games_played,
                "wins": deck_stats.wins,
                "losses": deck_stats.losses,
                "unique_players": deck_stats.unique_players
            })
            await session.commit()
            row = result.fetchone()

            logger.info(f"DB result: increment_deck_stats updated stats for deck {deck_stats.id}")
            return DeckStats(
                id=row[0],
                games_played=row[1],
                wins=row[2],
                losses=row[3],
                unique_players=row[4]
            )

    # ===== LOCATIONS ENDPOINTS =====

    async def get_all_locations(self) -> Locations:
        """
        Get all locations from the database.

        Returns:
            Locations object containing all locations
        """
        logger.info("DB query: get_all_locations")
        async with self.async_session() as session:
            stmt = text(
                "SELECT id, name, is_country, country_code FROM locations ORDER BY name")
            result = await session.execute(stmt)
            rows = result.fetchall()

            locations = []
            for row in rows:
                location = Location(
                    id=row[0],
                    name=row[1],
                    is_country=row[2],
                    country_code=row[3]
                )
                locations.append(location)

            logger.info(f"DB result: get_all_locations returned {len(locations)} locations")
            return Locations(locations=locations)


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
