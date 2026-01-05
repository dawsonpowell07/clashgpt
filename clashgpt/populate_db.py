#!/usr/bin/env python3
"""
One-time script to populate the database with cards and locations from the Clash Royale API.

This script:
1. Fetches cards from /cards endpoint
2. Fetches locations from /locations endpoint
3. Inserts them into the PostgreSQL database

Usage:
    python populate_db.py
"""

import asyncio
import json
import sys

import asyncpg

from app.services.clash_royale import ClashRoyaleService
from app.settings import settings


def get_database_dsn() -> str:
    """
    Build the database DSN for asyncpg from settings.

    Returns:
        Database connection DSN
    """
    if settings.dev_mode:
        # Local database
        return f"postgresql://{settings.local_db_user}@{settings.local_db_host}:{settings.local_db_port}/{settings.local_db_name}"
    else:
        # Production database
        if settings.prod_db_password:
            return f"postgresql://{settings.prod_db_user}:{settings.prod_db_password}@{settings.prod_db_host}:{settings.prod_db_port}/{settings.prod_db_name}"
        else:
            return f"postgresql://{settings.prod_db_user}@{settings.prod_db_host}:{settings.prod_db_port}/{settings.prod_db_name}"


async def fetch_api_data():
    """
    Fetch cards and locations from the Clash Royale API.

    Returns:
        Tuple of (cards_data, locations_data)
    """
    print("Connecting to Clash Royale API...")
    async with ClashRoyaleService() as service:
        print("Fetching cards...")
        cards_response = await service.get_cards()
        cards = cards_response.cards
        print(f"  -> Found {len(cards)} cards")

        return cards


async def populate_database(cards):
    """
    Populate the database with cards and locations.

    Args:
        cards: List of Card objects from the API
    """
    print("\nConnecting to database...")
    dsn = get_database_dsn()
    conn = await asyncpg.connect(dsn)

    try:
        # Insert cards
        print(f"\nInserting {len(cards)} cards...")
        inserted_cards = 0
        for card in cards:
            try:
                # Use INSERT ... ON CONFLICT DO UPDATE to handle duplicates
                await conn.execute(
                    """
                    INSERT INTO cards (id, name, elixir_cost, rarity, icon_urls)
                    VALUES ($1, $2, $3, $4::rarity_enum, $5::jsonb)
                    ON CONFLICT (id) DO UPDATE SET
                        name = EXCLUDED.name,
                        elixir_cost = EXCLUDED.elixir_cost,
                        rarity = EXCLUDED.rarity,
                        icon_urls = EXCLUDED.icon_urls,
                        updated_at = now()
                    """,
                    card.id,
                    card.name,
                    card.elixir_cost,
                    card.rarity.value,
                    json.dumps(card.icon_urls)
                )
                inserted_cards += 1
            except Exception as e:
                print(f"  Error inserting card {card.name}: {e}")

        print(f"  -> Successfully inserted/updated {inserted_cards} cards")
        print("\n✓ Database population complete!")

    finally:
        await conn.close()


async def main():
    """Main entry point for the populate script."""
    try:
        # Fetch data from API
        cards = await fetch_api_data()

        # Populate database
        await populate_database(cards)

    except Exception as e:
        print(f"\n✗ Error: {e}")
        import traceback
        traceback.print_exc()
        sys.exit(1)


if __name__ == "__main__":
    asyncio.run(main())
