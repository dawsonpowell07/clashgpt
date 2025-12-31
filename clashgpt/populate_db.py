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

from sqlalchemy import create_engine, text
from sqlalchemy.orm import sessionmaker

from app.services.clash_royale import ClashRoyaleService
from app.settings import settings


def get_database_url() -> str:
    """
    Build the database URL from settings.

    Returns:
        Database connection URL
    """
    if settings.dev_mode:
        # Local database
        return f"postgresql+psycopg2://{settings.local_db_user}@{settings.local_db_host}:{settings.local_db_port}/{settings.local_db_name}"
    else:
        # Production database
        if settings.prod_db_password:
            return f"postgresql+psycopg2://{settings.prod_db_user}:{settings.prod_db_password}@{settings.prod_db_host}:{settings.prod_db_port}/{settings.prod_db_name}"
        else:
            return f"postgresql+psycopg2://{settings.prod_db_user}@{settings.prod_db_host}:{settings.prod_db_port}/{settings.prod_db_name}"


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
        cards = cards_response.get("items", [])
        print(f"  -> Found {len(cards)} cards")

        return cards


def populate_database(cards: list[dict]):
    """
    Populate the database with cards and locations.

    Args:
        cards: List of card objects from the API
    """
    print("\nConnecting to database...")
    db_url = get_database_url()
    engine = create_engine(db_url)
    Session = sessionmaker(bind=engine)

    with Session() as session:
        # Insert cards
        print(f"\nInserting {len(cards)} cards...")
        inserted_cards = 0
        for card in cards:
            try:
                # Convert card data to match database schema
                # Serialize icon_urls dict to JSON string for JSONB column
                card_data = {
                    "id": str(card["id"]),
                    "name": card["name"],
                    "elixir_cost": card.get("elixirCost", 0),
                    "rarity": card["rarity"].upper(),
                    "icon_urls": json.dumps(card.get("iconUrls", {}))
                }

                # Use INSERT ... ON CONFLICT DO UPDATE to handle duplicates
                stmt = text("""
                    INSERT INTO cards (id, name, elixir_cost, rarity, icon_urls)
                    VALUES (:id, :name, :elixir_cost, CAST(:rarity AS rarity_enum), CAST(:icon_urls AS jsonb))
                    ON CONFLICT (id) DO UPDATE SET
                        name = EXCLUDED.name,
                        elixir_cost = EXCLUDED.elixir_cost,
                        rarity = EXCLUDED.rarity,
                        icon_urls = EXCLUDED.icon_urls,
                        updated_at = now()
                """)

                session.execute(stmt, card_data)
                inserted_cards += 1
            except Exception as e:
                print(
                    f"  Error inserting card {card.get('name', 'unknown')}: {e}")

        print(f"  -> Successfully inserted/updated {inserted_cards} cards")

        # Commit all changes
        session.commit()
        print("\n✓ Database population complete!")


async def main():
    """Main entry point for the populate script."""
    try:
        # Fetch data from API
        cards = await fetch_api_data()

        # Populate database
        populate_database(cards)

    except Exception as e:
        print(f"\n✗ Error: {e}")
        import traceback
        traceback.print_exc()
        sys.exit(1)


if __name__ == "__main__":
    asyncio.run(main())
