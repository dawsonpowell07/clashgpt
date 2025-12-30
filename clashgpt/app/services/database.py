"""
Database Service

Async service for interacting with the PostgreSQL database.
Provides read-only access to cards, decks, and locations.
"""

import os
from typing import Any

from dotenv import load_dotenv
from sqlalchemy import text
from sqlalchemy.ext.asyncio import async_sessionmaker, create_async_engine

from app.models.models import (
    Card,
    CardList,
    Deck,
    DeckArchetype,
    FreeToPlayLevel,
    Location,
    Locations,
    Rarity,
    SkillTier,
)

load_dotenv()


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

        self.engine = create_async_engine(database_url, echo=False)
        self.async_session = async_sessionmaker(
            self.engine, expire_on_commit=False
        )

    def _build_database_url(self) -> str:
        """
        Build database URL from environment variables.

        Returns:
            Async database connection URL
        """
        db_user = os.environ.get("DB_USER", "postgres")
        db_name = os.environ.get("DB_NAME", "postgres")
        db_pass = os.environ.get("DB_PASS", "")
        db_host = os.environ.get("DB_HOST", "localhost")
        db_port = os.environ.get("DB_PORT", "5432")

        if db_pass:
            return f"postgresql+asyncpg://{db_user}:{db_pass}@{db_host}:{db_port}/{db_name}"
        else:
            return f"postgresql+asyncpg://{db_user}@{db_host}:{db_port}/{db_name}"

    async def close(self):
        """Close database connections."""
        await self.engine.dispose()

    # ===== CARDS ENDPOINTS =====

    async def get_all_cards(self) -> CardList:
        """
        Get all cards from the database.

        Returns:
            CardList containing all cards
        """
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

            return CardList(cards=cards)

    async def get_card_by_id(self, card_id: str) -> Card | None:
        """
        Get a card by its ID.

        Args:
            card_id: The card ID to fetch

        Returns:
            Card object or None if not found
        """
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
        async with self.async_session() as session:
            if archetype:
                stmt = text("""
                    SELECT id, deck_hash, cards, avg_elixir, archetype, ftp_tier, skill_level
                    FROM decks
                    WHERE archetype = :archetype
                    ORDER BY last_seen_at DESC
                    LIMIT :limit
                """)
                result = await session.execute(stmt, {"archetype": archetype.value, "limit": limit})
            else:
                stmt = text("""
                    SELECT id, deck_hash, cards, avg_elixir, archetype, ftp_tier, skill_level
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
                        row[5]) if row[5] else FreeToPlayLevel.MODERATE,
                    skill=SkillTier(row[6]) if row[6] else SkillTier.MEDIUM
                )
                decks.append(deck)

            return decks

    async def search_decks(
        self,
        include_card_ids: list[str] | None = None,
        exclude_card_ids: list[str] | None = None,
        archetype: DeckArchetype | None = None,
        ftp_tier: FreeToPlayLevel | None = None,
        skill: SkillTier | None = None,
        limit: int = 50
    ) -> list[Deck]:
        """
        Search for decks with filters.

        Args:
            include_card_ids: List of card IDs that must be in the deck
            exclude_card_ids: List of card IDs that must not be in the deck
            archetype: Optional archetype filter
            ftp_tier: Optional free-to-play tier filter
            skill: Optional skill tier filter
            limit: Maximum number of results (default: 50)

        Returns:
            List of Deck objects matching the filters
        """
        async with self.async_session() as session:
            # Build dynamic query
            query = """
                SELECT id, deck_hash, cards, avg_elixir, archetype, ftp_tier, skill_level
                FROM decks
                WHERE 1=1
            """
            params: dict[str, Any] = {}

            # Filter by included cards
            if include_card_ids:
                for i, card_id in enumerate(include_card_ids):
                    # Check if the cards JSONB array contains an object with this card_id
                    query += f" AND EXISTS (SELECT 1 FROM jsonb_array_elements(cards) AS card WHERE card->>'card_id' = :include_card_{i})"
                    params[f"include_card_{i}"] = card_id

            # Filter by excluded cards
            if exclude_card_ids:
                for i, card_id in enumerate(exclude_card_ids):
                    # Check that no card in the array has this card_id
                    query += f" AND NOT EXISTS (SELECT 1 FROM jsonb_array_elements(cards) AS card WHERE card->>'card_id' = :exclude_card_{i})"
                    params[f"exclude_card_{i}"] = card_id

            # Filter by archetype
            if archetype:
                query += " AND archetype = :archetype"
                params["archetype"] = archetype.value

            # Filter by FTP tier
            if ftp_tier:
                query += " AND ftp_tier = :ftp_tier"
                params["ftp_tier"] = ftp_tier.value

            # Filter by skill tier
            if skill:
                query += " AND skill_level = :skill_level"
                params["skill_level"] = skill.value

            # Order by most recently seen and apply limit
            query += " ORDER BY last_seen_at DESC LIMIT :limit"
            params["limit"] = limit

            result = await session.execute(text(query), params)
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
                        row[5]) if row[5] else FreeToPlayLevel.MODERATE,
                    skill=SkillTier(row[6]) if row[6] else SkillTier.MEDIUM
                )
                decks.append(deck)

            return decks

    # ===== LOCATIONS ENDPOINTS =====

    async def get_all_locations(self) -> Locations:
        """
        Get all locations from the database.

        Returns:
            Locations object containing all locations
        """
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
