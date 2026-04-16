"""
Response Caching via Upstash Redis

Uses Upstash Redis (HTTP REST) for distributed caching that persists across
Cloud Run instance restarts. Gracefully degrades to a no-op when not configured
(e.g. local dev without Redis credentials).

TTL strategy:
  TTL_LONG   (4h)  — DB-backed data
  TTL_MEDIUM (1h)  — DB data that may change more often (e.g. tournament decks)
  TTL_SHORT  (15m) — Live CR API proxies (leaderboard, etc.)
"""

import json
import logging
from typing import Any

from fastapi.encoders import jsonable_encoder

logger = logging.getLogger(__name__)

# TTL constants (seconds)
TTL_LONG = 14_400  # 4 hours
TTL_MEDIUM = 3_600  # 1 hour
TTL_SHORT = 900  # 15 minutes


class RedisCache:
    """Async Upstash Redis cache with JSON serialisation."""

    def __init__(self) -> None:
        self._client: Any = None

    def init(self, url: str, token: str) -> None:
        """Initialise the Upstash Redis client.  Safe to call with empty strings."""
        if not url or not token:
            logger.info("Upstash Redis not configured — caching disabled")
            return
        try:
            from upstash_redis.asyncio import Redis  # type: ignore[import-untyped]

            self._client = Redis(url=url, token=token)
            logger.info("Upstash Redis cache initialised")
        except Exception as exc:
            logger.warning("Failed to initialise Redis cache: %s", exc)

    @property
    def enabled(self) -> bool:
        return self._client is not None

    async def get(self, key: str) -> Any | None:
        """Return the deserialised value for *key*, or ``None`` on miss/error."""
        if not self.enabled:
            return None
        try:
            raw = await self._client.get(key)
            return json.loads(raw) if raw is not None else None
        except Exception as exc:
            logger.warning("Redis GET error [%s]: %s", key, exc)
            return None

    async def set(self, key: str, value: Any, ttl: int = TTL_LONG) -> None:
        """Serialise *value* and store it under *key* with the given TTL.

        Uses ``jsonable_encoder`` to handle dataclasses, Pydantic models, and
        enums before JSON serialisation.
        """
        if not self.enabled:
            return
        try:
            await self._client.set(key, json.dumps(jsonable_encoder(value)), ex=ttl)
        except Exception as exc:
            logger.warning("Redis SET error [%s]: %s", key, exc)


# ---------------------------------------------------------------------------
# Singleton — call cache.init() once during app lifespan
# ---------------------------------------------------------------------------

cache = RedisCache()


# ---------------------------------------------------------------------------
# Cache key helpers
# ---------------------------------------------------------------------------


def make_deck_cache_key(
    include: str | None,
    exclude: str | None,
    sort_by: str,
    min_games: int,
    page: int,
    page_size: int,
    include_cards: bool,
    game_mode: str | None = None,
) -> str:
    inc = ",".join(sorted(include.split(","))) if include else ""
    exc = ",".join(sorted(exclude.split(","))) if exclude else ""
    gm = game_mode or ""
    return f"decks:{inc}|{exc}|{sort_by}|{min_games}|{page}|{page_size}|{include_cards}|{gm}"


def make_cards_list_cache_key(rarity: str | None) -> str:
    return f"cards:list:{rarity or 'all'}"


def make_card_cache_key(card_id: int) -> str:
    return f"cards:{card_id}"


def make_card_stats_cache_key(card_id: int, season_id: int | None) -> str:
    return f"cards:{card_id}:stats:{season_id or 'all'}"


def make_matchup_cache_key(
    deck: str,
    page: int,
    page_size: int,
    include_opponent: str | None,
    exclude_opponent: str | None,
) -> str:
    specs = "|".join(sorted(s.strip() for s in deck.split(",") if s.strip()))
    inc = include_opponent or ""
    exc = exclude_opponent or ""
    return f"matchups:{specs}|{page}|{page_size}|{inc}|{exc}"


def make_win_condition_cache_key(card_a: int, card_b: int) -> str:
    # Symmetric key — order doesn't matter
    low, high = min(card_a, card_b), max(card_a, card_b)
    return f"wc_matchup:{low}:{high}"


def make_tourney_deck_cache_key(
    include: str | None,
    exclude: str | None,
    sort_by: str,
    min_games: int,
    page: int,
    page_size: int,
) -> str:
    inc = ",".join(sorted(include.split(","))) if include else ""
    exc = ",".join(sorted(exclude.split(","))) if exclude else ""
    return f"tourney:decks:{inc}|{exc}|{sort_by}|{min_games}|{page}|{page_size}"


def make_player_decks_cache_key(player_tag: str) -> str:
    return f"players:{player_tag}:decks"


def make_player_battles_cache_key(player_tag: str) -> str:
    return f"players:{player_tag}:battles"
