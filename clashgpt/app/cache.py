"""
Response Caching

In-memory TTL cache for API responses. Uses cachetools for
lightweight caching without external dependencies (no Redis needed).
"""

from typing import Any

from cachetools import TTLCache

# Deck search cache: 256 entries max, 5 minute TTL
_deck_cache: TTLCache[str, Any] = TTLCache(maxsize=256, ttl=300)


def make_deck_cache_key(
    include: str | None,
    exclude: str | None,
    sort_by: str,
    min_games: int,
    page: int,
    page_size: int,
    include_cards: bool,
) -> str:
    """Generate a normalized cache key from deck search parameters."""
    # Sort comma-separated card IDs for consistent keys
    inc = ",".join(sorted(include.split(","))) if include else ""
    exc = ",".join(sorted(exclude.split(","))) if exclude else ""
    return f"decks:{inc}|{exc}|{sort_by}|{min_games}|{page}|{page_size}|{include_cards}"


def get_cached_decks(key: str) -> Any | None:
    """Retrieve a cached deck search response, or None on miss."""
    return _deck_cache.get(key)


def set_cached_decks(key: str, value: Any) -> None:
    """Store a deck search response in the cache."""
    _deck_cache[key] = value
