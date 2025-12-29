"""
Clash Royale API Service

An async wrapper for the Clash Royale API that provides a clean interface
for AI agents to interact with Clash Royale data.

This service handles authentication, request formatting, and response parsing
to make it easier for agents to retrieve player, clan, card, and ranking information.
"""

import os
from typing import Any
from urllib.parse import quote

import httpx

from .models import (
    ArenaObject,
    BattleLog,
    BattleObject,
    CardList,
    CardObject,
    ClanObject,
    PlayerObject,
    Rarity,
)


class ClashRoyaleAPIError(Exception):
    """Base exception for Clash Royale API errors."""
    pass


class ClashRoyaleAuthError(ClashRoyaleAPIError):
    """Raised when authentication fails."""
    pass


class ClashRoyaleNotFoundError(ClashRoyaleAPIError):
    """Raised when a resource is not found."""
    pass


class ClashRoyaleRateLimitError(ClashRoyaleAPIError):
    """Raised when rate limit is exceeded."""
    pass


class ClashRoyaleService:
    """
    Async service for interacting with the Clash Royale API.

    This service provides methods for:
    - Clan information and war logs
    - Player information and battle logs
    - Card information
    - Location-based rankings

    All methods are async and return parsed JSON responses.
    """

    BASE_URL = "https://api.clashroyale.com/v1"

    def __init__(self, api_token: str | None = None):
        """
        Initialize the Clash Royale service.

        Args:
            api_token: Clash Royale API token. If not provided, will look for
                      CLASH_ROYALE_API_TOKEN environment variable.
        """
        self.api_token = api_token or os.getenv("CLASH_ROYALE_API_TOKEN")
        if not self.api_token:
            raise ClashRoyaleAuthError(
                "API token required. Provide via parameter or CLASH_ROYALE_API_TOKEN env var."
            )

        self.headers = {
            "Authorization": f"Bearer {self.api_token}",
            "Accept": "application/json"
        }
        self.client: httpx.AsyncClient | None = None

    async def __aenter__(self):
        """Async context manager entry."""
        self.client = httpx.AsyncClient(headers=self.headers, timeout=30.0)
        return self

    async def __aexit__(self, _exc_type, _exc_val, _exc_tb):
        """Async context manager exit."""
        if self.client:
            await self.client.aclose()

    def _encode_tag(self, tag: str) -> str:
        """
        Encode a player or clan tag for use in URLs.

        Args:
            tag: The tag to encode (with or without leading #)

        Returns:
            URL-encoded tag
        """
        if not tag.startswith("#"):
            tag = f"#{tag}"
        return quote(tag, safe="")

    async def _request(self, endpoint: str, params: dict[str, Any] | None = None) -> dict[str, Any]:
        """
        Make an async request to the Clash Royale API.

        Args:
            endpoint: API endpoint path
            params: Optional query parameters

        Returns:
            Parsed JSON response

        Raises:
            ClashRoyaleAPIError: For various API errors
        """
        if not self.client:
            raise ClashRoyaleAPIError(
                "Service not initialized. Use async context manager.")

        url = f"{self.BASE_URL}{endpoint}"

        try:
            response = await self.client.get(url, params=params)

            if response.status_code == 200:
                return response.json()
            elif response.status_code == 401:
                raise ClashRoyaleAuthError("Invalid API token")
            elif response.status_code == 403:
                raise ClashRoyaleAuthError("Access denied")
            elif response.status_code == 404:
                raise ClashRoyaleNotFoundError(
                    f"Resource not found: {endpoint}")
            elif response.status_code == 429:
                raise ClashRoyaleRateLimitError("Rate limit exceeded")
            else:
                raise ClashRoyaleAPIError(
                    f"API request failed with status {response.status_code}: {response.text!r}"
                )
        except httpx.HTTPError as e:
            raise ClashRoyaleAPIError(f"HTTP error occurred: {e!s}") from e

    # ===== PLAYER ENDPOINTS =====

    @staticmethod
    def _map_clan(clan_data: dict[str, Any]) -> ClanObject:
        """Map API clan response to ClanObject."""
        return ClanObject(
            tag=clan_data["tag"],
            clan_name=clan_data["name"],
            badge_id=str(clan_data["badgeId"])
        )

    @staticmethod
    def _map_arena(arena_data: dict[str, Any]) -> ArenaObject:
        """Map API arena response to ArenaObject."""
        return ArenaObject(
            id=str(arena_data["id"]),
            name=arena_data["name"],
            raw_name=arena_data.get("rawName", "")
        )

    @staticmethod
    def _map_card(card_data: dict[str, Any]) -> CardObject:
        """Map API card response to CardObject."""
        return CardObject(
            id=str(card_data["id"]),
            name=card_data["name"],
            elixir_cost=card_data["elixirCost"],
            icon_urls=card_data.get("iconUrls", {}),
            rarity=Rarity[card_data["rarity"].upper()]
        )

    @staticmethod
    def _map_player(player_data: dict[str, Any]) -> PlayerObject:
        """
        Map API player response to PlayerObject.

        Handles camelCase to snake_case conversion and only includes
        fields defined in the PlayerObject model.
        """
        # Map clan object if present
        clan = None
        if "clan" in player_data:
            clan = ClashRoyaleService._map_clan(player_data["clan"])

        # Map arena object if present
        arena = None
        if "arena" in player_data:
            arena = ClashRoyaleService._map_arena(player_data["arena"])

        # Map current favorite card if present
        current_favorite_card = None
        if "currentFavouriteCard" in player_data:
            current_favorite_card = ClashRoyaleService._map_card(
                player_data["currentFavouriteCard"]
            )

        # Extract Path of Legends data
        current_pol_medals = None
        current_pol_rank = None
        best_pol_medals = None
        best_pol_rank = None

        if "currentPathOfLegendSeasonResult" in player_data:
            pol_data = player_data["currentPathOfLegendSeasonResult"]
            current_pol_medals = pol_data.get("trophies")
            current_pol_rank = pol_data.get("rank")

        if "bestPathOfLegendSeasonResult" in player_data:
            pol_data = player_data["bestPathOfLegendSeasonResult"]
            best_pol_medals = pol_data.get("trophies")
            best_pol_rank = pol_data.get("rank")

        return PlayerObject(
            tag=player_data["tag"],
            name=player_data["name"],
            trophies=player_data["trophies"],
            best_trophies=player_data["bestTrophies"],
            wins=player_data["wins"],
            losses=player_data["losses"],
            battles_count=player_data["battleCount"],
            three_crown_wins=player_data["threeCrownWins"],
            clan=clan,
            arena=arena,
            current_trophies=player_data["trophies"],
            current_path_of_legends_medals=current_pol_medals,
            current_path_of_legends_rank=current_pol_rank,
            best_path_of_legends_medals=best_pol_medals,
            best_path_of_legends_rank=best_pol_rank,
            current_favorite_card=current_favorite_card
        )

    @staticmethod
    def _map_battle_log(battle_log_data: list[dict[str, Any]]) -> BattleLog:
        """
        Map API battle log response to BattleLog object.

        Handles camelCase to snake_case conversion and maps battle data.
        """
        battles = []
        for battle_data in battle_log_data:
            # Map arena
            arena = ClashRoyaleService._map_arena(battle_data["arena"])

            # Get user info (team[0])
            user = battle_data["team"][0]
            user_name = user["name"]
            # Trophy change may not exist for some battle types (friendly, 2v2, etc.)
            user_trophy_change = user.get("trophyChange", 0)

            # Map user cards
            user_cards = [ClashRoyaleService._map_card(
                card) for card in user["cards"]]
            user_deck = CardList(cards=user_cards)

            # Get opponent info (opponent[0])
            opponent = battle_data["opponent"][0]
            opponent_name = opponent["name"]
            # Trophy change may not exist for some battle types
            opponent_trophy_change = opponent.get("trophyChange", 0)

            # Map opponent cards
            opponent_cards = [ClashRoyaleService._map_card(
                card) for card in opponent["cards"]]
            opponent_deck = CardList(cards=opponent_cards)

            # Create battle object
            battle = BattleObject(
                type=battle_data["type"],
                battle_time=battle_data["battleTime"],
                arena=arena,
                game_mode_name=battle_data["gameMode"]["name"],
                user_name=user_name,
                user_trophy_change=user_trophy_change,
                user_deck=user_deck,
                opponent_name=opponent_name,
                opponent_trophy_change=opponent_trophy_change,
                opponent_deck=opponent_deck
            )
            battles.append(battle)

        return BattleLog(battles=battles)

    async def get_player_raw(self, player_tag: str) -> dict[str, Any]:
        """
        Get raw player information from the API.

        Args:
            player_tag: The player tag (with or without #)

        Returns:
            Raw API response with player information
        """
        encoded_tag = self._encode_tag(player_tag)
        return await self._request(f"/players/{encoded_tag}")

    async def get_player(self, player_tag: str) -> PlayerObject:
        """
        Get information about a specific player.

        Args:
            player_tag: The player tag (with or without #)

        Returns:
            PlayerObject with mapped and formatted player information
        """
        player_data = await self.get_player_raw(player_tag)
        return self._map_player(player_data)

    async def get_player_battle_log_raw(self, player_tag: str, limit: int | None = None) -> list[dict[str, Any]]:
        """
        Get raw player battle log from the API.

        Args:
            player_tag: The player tag (with or without #)
            limit: Maximum number of battles to return. If None, returns all battles.

        Returns:
            Raw API response with battle log information (limited to N most recent battles)
        """
        encoded_tag = self._encode_tag(player_tag)
        result = await self._request(f"/players/{encoded_tag}/battlelog")
        # Battle log API returns a list directly (cast from dict to handle typing)
        battles: list[dict[str, Any]] = result if isinstance(result, list) else []
        # Trim to N most recent battles if limit is specified
        return battles[:limit] if limit is not None else battles

    async def get_player_battle_log(self, player_tag: str, limit: int | None = None) -> BattleLog:
        """
        Get a player's recent battle log.

        Args:
            player_tag: The player tag (with or without #)
            limit: Maximum number of battles to return. If None, returns all battles.

        Returns:
            BattleLog object with mapped and formatted battle information
        """
        battle_log_data = await self.get_player_battle_log_raw(player_tag, limit=limit)
        return self._map_battle_log(battle_log_data)

    # ===== CARD ENDPOINTS =====

    async def get_cards(self) -> dict[str, Any]:
        """
        Get a list of all available cards in Clash Royale.

        Returns:
            List of all cards with their properties
        """
        return await self._request("/cards")

    async def get_player_rankings(
        self,
        location_id: int,
        limit: int | None = None
    ) -> dict[str, Any]:
        """
        Get player rankings for a specific location.

        Args:
            location_id: The location ID
            limit: Limit number of results

        Returns:
            Ranked list of players
        """
        params = {}
        if limit is not None:
            params["limit"] = limit

        return await self._request(f"/locations/{location_id}/rankings/players", params=params)


# Convenience function for creating service instance
async def get_clash_royale_service(api_token: str | None = None) -> ClashRoyaleService:
    """
    Create and return a Clash Royale service instance.

    Args:
        api_token: Optional API token. If not provided, uses environment variable.

    Returns:
        Initialized ClashRoyaleService instance
    """
    return ClashRoyaleService(api_token=api_token)
