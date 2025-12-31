#!/usr/bin/env python3
"""
Script to collect top meta decks from elite Path of Legend players.

This script:
1. Scans top 10 players from popular countries
2. Extracts decks from their Path of Legend battle logs
3. Analyzes deck composition and FTP-friendliness
4. Saves unique decks to the database

Usage:
    python top_decks.py
"""

import asyncio
import hashlib
import json
from collections import defaultdict
from datetime import datetime
from typing import Any

from sqlalchemy import create_engine, text
from sqlalchemy.orm import sessionmaker

from app.models.models import CardVariant, DeckArchetype, FreeToPlayLevel, Rarity
from app.services.clash_royale import ClashRoyaleService
from app.settings import settings

# Countries to scan for top players
COUNTRIES = [
    (57000249, "United States"),
    (57000248, "United Kingdom"),
    (57000216, "South Korea"),
    (57000056, "China"),
    (57000153, "Mexico"),
    (57000038, "Brazil"),
    (57000193, "Russia"),
]

TOP_PLAYERS_PER_COUNTRY = 25
BATTLE_LOG_LIMIT = 25  # Number of recent battles to analyze per player


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


def determine_card_variant(card_data: dict[str, Any]) -> CardVariant:
    """
    Determine the card variant based on evolutionLevel.

    Args:
        card_data: Raw card data from battle log

    Returns:
        CardVariant enum value
    """
    evolution_level = card_data.get("evolutionLevel")

    if evolution_level == 1:
        return CardVariant.EVOLUTION
    elif evolution_level == 2:
        return CardVariant.HERO
    else:
        return CardVariant.NORMAL


def normalize_card_name(name: str) -> str:
    """
    Normalize card name to lowercase with underscores.

    Args:
        name: Card name from API

    Returns:
        Normalized card name (e.g., "Mini P.E.K.K.A" -> "mini_pekka")
    """
    return name.lower().replace(".", "").replace(" ", "_")


def create_deck_hash(cards: list[dict[str, str]]) -> str:
    """
    Create a unique hash for a deck based on card names and variants.

    Args:
        cards: List of card dictionaries with 'name' and 'variant' keys

    Returns:
        Deck hash string (e.g., "archers_evolution|fireball|giant|...")
    """
    # Sort cards alphabetically by name for consistent hashing
    sorted_cards = sorted(cards, key=lambda c: c["name"])

    # Create hash components
    hash_parts = []
    for card in sorted_cards:
        name = normalize_card_name(card["name"])
        variant = card["variant"].lower()

        # Only append variant if it's not normal
        if variant == "normal":
            hash_parts.append(name)
        else:
            hash_parts.append(f"{name}_{variant}")

    return "|".join(hash_parts)


def determine_ftp_tier(cards: list[dict[str, Any]]) -> FreeToPlayLevel:
    """
    Determine the free-to-play tier based on card rarities and variants.

    Args:
        cards: List of card data from the database/API

    Returns:
        FreeToPlayLevel enum value
    """
    legendary_count = 0
    champion_count = 0
    hero_count = 0

    for card in cards:
        rarity = card.get("rarity", "").upper()
        variant = card.get("variant", "normal").lower()

        if rarity == "LEGENDARY":
            legendary_count += 1
        elif rarity == "CHAMPION":
            champion_count += 1

        if variant == "hero":
            hero_count += 1

    # More than 4 champions, heroes, or legendaries = paytowin
    if champion_count + hero_count > 4 or legendary_count > 4:
        return FreeToPlayLevel.PAYTOWIN

    # More than 2 = moderate
    if champion_count + hero_count + legendary_count > 2:
        return FreeToPlayLevel.MODERATE

    if champion_count + hero_count + legendary_count <= 2:
        return FreeToPlayLevel.FRIENDLY

    return FreeToPlayLevel.MODERATE


# Card classification helpers for archetype detection
BEATDOWN_CARDS = {
    "Giant", "Golem", "Lava Hound", "Electro Giant", "Goblin Giant", "Elixir Golem"
}

CYCLE_CARDS = {
    "Skeletons", "Ice Spirit", "Fire Spirit", "Electro Spirit", "Heal Spirit",
    "Miner", "Wall Breakers", "Goblin Drill", "Rocket"
}

CONTROL_CARDS = {
    "Miner", "Royal Giant", "Graveyard", "Goblin Hut", "Poison", "Giant Skeleton",
    "Three Musketeers", "Mighty Miner"
}

BRIDGESPAM_CARDS = {
    "Ram Rider", "Bandit", "P.E.K.K.A", "Executioner", "Heal Spirit", "Royal Ghost"
}

SIEGE_CARDS = {
    "X-Bow", "Mortar"
}

SMALL_SPELL_BAIT = {
    "Goblin Barrel", "Suspicious Bush", "Skeleton Barrel", "Dart Goblin"
}

FIREBALL_BAIT = {
    "Mother Witch", "Flying Machine", "Royal Hogs", "Zappies", "Musketeer", "Wizard"
}

MIDLADDER_CARDS = {
    "Elixir Golem", "Elite Barbarians"
}


def determine_archetype(cards: list[dict[str, Any]]) -> DeckArchetype:
    """
    Determine the deck archetype based on card composition.

    Args:
        cards: List of card data with name, elixir_cost, rarity

    Returns:
        DeckArchetype enum value
    """
    card_names = [card.get("name") for card in cards]
    avg_elixir = calculate_avg_elixir(cards)

    # Rule 6: If a deck has X-Bow or Mortar, it's ALWAYS SIEGE
    for card_name in card_names:
        if card_name in SIEGE_CARDS:
            return DeckArchetype.SIEGE

    # Rule 8: Any deck with Elixir Golem or Elite Barbarians is MIDLADDERMENACE
    for card_name in card_names:
        if card_name in MIDLADDER_CARDS:
            return DeckArchetype.MIDLADDERMENACE

    # If deck has Goblin Drill, it's ALWAYS CONTROL
    if "Goblin Drill" in card_names:
        return DeckArchetype.CONTROL

    # Rule 1: If avg elixir < 3.0, it's CYCLE
    if avg_elixir <= 3.0:
        return DeckArchetype.CYCLE

    # Rule 2: If deck has beatdown tanks, it's BEATDOWN
    for card_name in card_names:
        if card_name in BEATDOWN_CARDS:
            return DeckArchetype.BEATDOWN

    # Rule 4: Royal Hogs special cases
    has_royal_hogs = "Royal Hogs" in card_names
    has_royal_recruits = "Royal Recruits" in card_names
    has_flying_machine = "Flying Machine" in card_names
    has_zappies = "Zappies" in card_names
    has_musketeer = "Musketeer" in card_names

    if has_royal_hogs and (has_royal_recruits or has_flying_machine or has_zappies):
        return DeckArchetype.BAIT
    elif has_royal_hogs and has_musketeer:
        return DeckArchetype.CONTROL

    # Rule 7: Bait decks (small spell bait or fireball bait)
    small_spell_bait_count = 0
    fireball_bait_count = 0

    for card_name in card_names:
        if card_name == "Goblin Barrel":
            return DeckArchetype.BAIT
        if card_name in SMALL_SPELL_BAIT:
            small_spell_bait_count += 1
        if card_name in FIREBALL_BAIT:
            fireball_bait_count += 1

    # If deck has 2+ small spell bait or 3+ fireball bait cards
    if small_spell_bait_count >= 2 or fireball_bait_count >= 3:
        return DeckArchetype.BAIT

    # Rule 9: Three Musketeers decks are CONTROL
    if "Three Musketeers" in card_names:
        return DeckArchetype.CONTROL

    # Rule 3: Control decks (Miner, Royal Giant, Graveyard, etc.)
    for card_name in card_names:
        if card_name in CONTROL_CARDS:
            return DeckArchetype.CONTROL

    # Rule 5: Bridge spam detection
    bridge_spam_count = 0
    for card_name in card_names:
        if card_name in BRIDGESPAM_CARDS:
            bridge_spam_count += 1

    if bridge_spam_count >= 2:
        return DeckArchetype.BRIDGESPAM

    # Default to MIDLADDERMENACE
    return DeckArchetype.MIDLADDERMENACE


def calculate_avg_elixir(cards: list[dict[str, Any]]) -> float:
    """
    Calculate average elixir cost of a deck.

    Args:
        cards: List of card data with elixir_cost

    Returns:
        Average elixir cost rounded to 2 decimal places
    """
    total_elixir = sum(card.get("elixir_cost", 0) for card in cards)
    return round(total_elixir / len(cards), 2) if cards else 0.0


async def fetch_top_players_from_country(
    service: ClashRoyaleService,
    location_id: int,
    country_name: str
) -> list[str]:
    """
    Fetch top player tags from a specific country.

    Args:
        service: ClashRoyaleService instance
        location_id: Location ID for the country
        country_name: Country name for logging

    Returns:
        List of player tags
    """
    print(
        f"  Fetching top {TOP_PLAYERS_PER_COUNTRY} players from {country_name}...")

    try:
        leaderboard = await service.get_player_rankings(
            location_id=location_id,
            limit=TOP_PLAYERS_PER_COUNTRY
        )

        player_tags = [entry.tag for entry in leaderboard.entries]
        print(f"    -> Found {len(player_tags)} players")
        return player_tags

    except Exception as e:
        print(f"    ✗ Error fetching players from {country_name}: {e}")
        return []


def extract_deck_from_battle(team_data: dict[str, Any]) -> list[dict[str, str]] | None:
    """
    Extract deck information from battle team data.

    Args:
        team_data: Team data from battle log (contains 'cards' list)

    Returns:
        List of card dictionaries with 'name' and 'variant', or None if invalid
    """
    cards_data = team_data.get("cards", [])

    # Deck must have exactly 8 cards
    if len(cards_data) != 8:
        return None

    deck = []
    for card in cards_data:
        variant = determine_card_variant(card)
        deck.append({
            "name": card["name"],
            "variant": variant.value
        })

    return deck


async def collect_decks_from_player(
    service: ClashRoyaleService,
    player_tag: str,
    decks_set: set[str]
) -> int:
    """
    Collect unique decks from a player's battle log.

    Args:
        service: ClashRoyaleService instance
        player_tag: Player tag to fetch battles for
        decks_set: Set to add deck hashes to (modified in place)

    Returns:
        Number of new decks found
    """
    try:
        battle_log = await service.get_player_battle_log(
            player_tag=player_tag,
            limit=BATTLE_LOG_LIMIT
        )

        new_decks = 0
        for battle in battle_log.battles:
            # Only process Path of Legend battles
            if battle.type != "pathOfLegend":
                continue

            # Extract user deck (the player we're analyzing)
            user_deck = []
            for card in battle.user_deck.cards:
                variant = CardVariant.NORMAL  # Will be determined from raw data
                # Note: The current Battle model uses CardList which doesn't include evolutionLevel
                # We'll need the raw battle data for this. For now, use NORMAL variant.
                user_deck.append({
                    "name": card.name,
                    "variant": variant.value
                })

            if len(user_deck) == 8:
                deck_hash = create_deck_hash(user_deck)
                if deck_hash not in decks_set:
                    decks_set.add(deck_hash)
                    new_decks += 1

            # Extract opponent deck
            opponent_deck = []
            for card in battle.opponent_deck.cards:
                variant = CardVariant.NORMAL
                opponent_deck.append({
                    "name": card.name,
                    "variant": variant.value
                })

            if len(opponent_deck) == 8:
                deck_hash = create_deck_hash(opponent_deck)
                if deck_hash not in decks_set:
                    decks_set.add(deck_hash)
                    new_decks += 1

        return new_decks

    except Exception as e:
        print(f"    ✗ Error processing {player_tag}: {e}")
        return 0


async def collect_all_decks() -> dict[str, list[dict[str, str]]]:
    """
    Collect decks from top players across all countries.

    Returns:
        Dictionary mapping deck_hash to list of cards
    """
    print("Starting deck collection from top players...")
    print(
        f"Countries: {len(COUNTRIES)}, Players per country: {TOP_PLAYERS_PER_COUNTRY}")
    print(f"Battles per player: {BATTLE_LOG_LIMIT}\n")

    # Store unique deck hashes
    deck_hashes: set[str] = set()
    # Store deck hash -> cards mapping
    decks_data: dict[str, list[dict[str, str]]] = {}

    async with ClashRoyaleService() as service:
        # Collect player tags from all countries
        all_player_tags: list[str] = []

        print("Phase 1: Collecting top player tags...")
        for location_id, country_name in COUNTRIES:
            player_tags = await fetch_top_players_from_country(
                service, location_id, country_name
            )
            all_player_tags.extend(player_tags)

        print(f"\n  Total players to analyze: {len(all_player_tags)}\n")

        # Collect decks from each player
        print("Phase 2: Analyzing battle logs and extracting decks...")
        total_decks = 0

        for i, player_tag in enumerate(all_player_tags, 1):
            print(
                f"  [{i}/{len(all_player_tags)}] Analyzing {player_tag}...", end=" ")

            # We need to fetch raw battle log data to get evolutionLevel
            # Let's make a direct request instead of using the service method
            encoded_tag = service._encode_tag(player_tag)
            try:
                result = await service._request(f"/players/{encoded_tag}/battlelog")
                battle_log_data = result if isinstance(result, list) else []

                # Limit to BATTLE_LOG_LIMIT
                battle_log_data = battle_log_data[:BATTLE_LOG_LIMIT]

                new_decks = 0
                for battle in battle_log_data:
                    # Only process Path of Legend battles
                    if battle.get("type") != "pathOfLegend":
                        continue

                    # Extract user deck
                    if "team" in battle and len(battle["team"]) > 0:
                        user_deck = extract_deck_from_battle(battle["team"][0])
                        if user_deck:
                            deck_hash = create_deck_hash(user_deck)
                            if deck_hash not in deck_hashes:
                                deck_hashes.add(deck_hash)
                                decks_data[deck_hash] = user_deck
                                new_decks += 1
                                total_decks += 1

                    # Extract opponent deck
                    if "opponent" in battle and len(battle["opponent"]) > 0:
                        opponent_deck = extract_deck_from_battle(
                            battle["opponent"][0])
                        if opponent_deck:
                            deck_hash = create_deck_hash(opponent_deck)
                            if deck_hash not in deck_hashes:
                                deck_hashes.add(deck_hash)
                                decks_data[deck_hash] = opponent_deck
                                new_decks += 1
                                total_decks += 1

                print(
                    f"Found {new_decks} new unique decks (Total: {total_decks})")

            except Exception as e:
                print(f"✗ Error: {e}")

    print(f"\n✓ Collection complete! Found {len(decks_data)} unique decks\n")
    return decks_data


def preview_decks(decks_data: dict[str, list[dict[str, str]]], count: int = 5):
    """
    Preview a sample of collected decks.

    Args:
        decks_data: Dictionary of deck_hash -> cards
        count: Number of decks to preview
    """
    print(f"\n{'='*80}")
    print(
        f"PREVIEW: Showing {min(count, len(decks_data))} of {len(decks_data)} collected decks")
    print(f"{'='*80}\n")

    for i, (deck_hash, cards) in enumerate(list(decks_data.items())[:count], 1):
        print(f"Deck #{i}")
        print(f"  Hash: {deck_hash}")
        print(f"  Cards:")
        for card in cards:
            variant_suffix = f" ({card['variant']})" if card['variant'] != 'normal' else ""
            print(f"    - {card['name']}{variant_suffix}")
        print()


def get_card_data_from_db(session, card_name: str) -> dict[str, Any] | None:
    """
    Fetch card data from the database.

    Args:
        session: SQLAlchemy session
        card_name: Card name to fetch

    Returns:
        Card data dictionary or None if not found
    """
    stmt = text(
        "SELECT id, name, elixir_cost, rarity FROM cards WHERE LOWER(name) = LOWER(:name)")
    result = session.execute(stmt, {"name": card_name}).fetchone()

    if result:
        return {
            "id": result[0],
            "name": result[1],
            "elixir_cost": result[2],
            "rarity": result[3]
        }
    return None


def upload_decks_to_database(decks_data: dict[str, list[dict[str, str]]]):
    """
    Upload collected decks to the database.

    Args:
        decks_data: Dictionary of deck_hash -> cards
    """
    print("\nConnecting to database...")
    db_url = get_database_url()
    engine = create_engine(db_url)
    Session = sessionmaker(bind=engine)

    with Session() as session:
        print(f"Processing {len(decks_data)} decks...\n")

        inserted = 0
        updated = 0
        errors = 0

        for deck_hash, cards in decks_data.items():
            try:
                # Fetch full card data from database
                cards_with_data = []
                missing_cards = []
                for card in cards:
                    card_data = get_card_data_from_db(session, card["name"])
                    if card_data:
                        cards_with_data.append({
                            **card_data,
                            "variant": card["variant"]
                        })
                    else:
                        missing_cards.append(card["name"])

                # Skip if we couldn't find all cards
                if len(cards_with_data) != 8:
                    print(
                        f"  ⚠ Skipping deck (missing cards: {', '.join(missing_cards)})")
                    errors += 1
                    continue

                # Calculate deck metrics
                avg_elixir = calculate_avg_elixir(cards_with_data)
                ftp_tier = determine_ftp_tier(cards_with_data)
                archetype = determine_archetype(cards_with_data)

                # Prepare cards JSON for database
                cards_json = json.dumps([
                    {"card_id": c["id"], "card_name": c["name"],
                        "card_variant": c["variant"]}
                    for c in cards_with_data
                ])

                # Check if deck already exists
                check_stmt = text(
                    "SELECT id, last_seen_at FROM decks WHERE deck_hash = :deck_hash")
                existing = session.execute(
                    check_stmt, {"deck_hash": deck_hash}).fetchone()

                if existing:
                    # Update last_seen_at
                    update_stmt = text("""
                        UPDATE decks
                        SET last_seen_at = now()
                        WHERE deck_hash = :deck_hash
                    """)
                    session.execute(update_stmt, {"deck_hash": deck_hash})
                    session.commit()
                    updated += 1
                else:
                    # Insert new deck
                    insert_stmt = text("""
                        INSERT INTO decks (
                            deck_hash,
                            cards,
                            avg_elixir,
                            ftp_tier,
                            archetype,
                            created_at,
                            last_seen_at
                        )
                        VALUES (
                            :deck_hash,
                            CAST(:cards AS jsonb),
                            :avg_elixir,
                            CAST(:ftp_tier AS ftp_tier_enum),
                            CAST(:archetype AS deck_archetype_enum),
                            now(),
                            now()
                        )
                    """)

                    session.execute(insert_stmt, {
                        "deck_hash": deck_hash,
                        "cards": cards_json,
                        "avg_elixir": avg_elixir,
                        "ftp_tier": ftp_tier.value,
                        "archetype": archetype.value
                    })
                    session.commit()
                    inserted += 1

            except Exception as e:
                print(f"  ✗ Error processing deck {deck_hash[:50]}...: {e}")
                session.rollback()
                errors += 1

        print(f"\n{'='*80}")
        print("Database upload complete!")
        print(f"  Inserted: {inserted}")
        print(f"  Updated (last_seen_at): {updated}")
        print(f"  Errors: {errors}")
        print(f"{'='*80}\n")


async def main():
    """Main entry point for the deck collection script."""
    try:
        # Collect decks from top players
        decks_data = await collect_all_decks()

        if not decks_data:
            print("No decks collected. Exiting.")
            return

        # Preview some decks
        preview_decks(decks_data, count=5)

        # Ask for confirmation
        print("\nDo you want to upload these decks to the database?")
        confirmation = input("Type 'yes' to continue: ").strip().lower()

        if confirmation == "yes":
            upload_decks_to_database(decks_data)
        else:
            print("\nUpload cancelled. No changes made to the database.")

    except Exception as e:
        print(f"\n✗ Error: {e}")
        import traceback
        traceback.print_exc()


if __name__ == "__main__":
    asyncio.run(main())
