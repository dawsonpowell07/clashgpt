"""
Clash Royale API Service

An async wrapper for the Clash Royale API that provides a clean interface
for AI agents to interact with Clash Royale data.

This service handles authentication, request formatting, and response parsing
to make it easier for agents to retrieve player, clan, card, and ranking information.
"""

import logging
from typing import Any
from urllib.parse import quote

import httpx

from app.models.models import (
    Arena,
    Battle,
    BattleLog,
    Card,
    CardList,
    Clan,
    ClanMemberEntry,
    ClanSearchPaging,
    ClanSearchResult,
    ClanSearchResults,
    FullClan,
    Leaderboard,
    LeaderboardEntry,
    Player,
    Rarity,
)
from app.settings import settings

logger = logging.getLogger(__name__)


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
            api_token: Clash Royale API token. If not provided, will use settings.
        """
        self.api_token = api_token or settings.clash_royale_api_token
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
        logger.info(f"Clash Royale API: GET {endpoint}")

        try:
            response = await self.client.get(url, params=params)

            if response.status_code == 200:
                logger.info(f"Clash Royale API: {endpoint} | status=200")
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
    def _map_clan(clan_data: dict[str, Any]) -> Clan:
        """Map API clan response to Clan."""
        return Clan(
            tag=clan_data["tag"],
            clan_name=clan_data["name"],
            badge_id=str(clan_data["badgeId"])
        )

    @staticmethod
    def _map_arena(arena_data: dict[str, Any]) -> Arena:
        """Map API arena response to Arena."""
        return Arena(
            id=str(arena_data["id"]),
            name=arena_data["name"],
            raw_name=arena_data.get("rawName", "")
        )

    @staticmethod
    def _map_card(card_data: dict[str, Any]) -> Card:
        """Map API card response to Card."""
        elixir_cost = card_data.get("elixirCost") or 0

        return Card(
            id=str(card_data["id"]),
            name=card_data["name"],
            elixir_cost=elixir_cost,
            icon_urls=card_data.get("iconUrls", {}),
            rarity=Rarity[card_data["rarity"].upper()]
        )

    @staticmethod
    def _map_leaderboard_entry(entry_data: dict[str, Any]) -> LeaderboardEntry:
        """Map API leaderboard entry response to LeaderboardEntry."""
        clan = None
        if "clan" in entry_data:
            clan = ClashRoyaleService._map_clan(entry_data["clan"])

        return LeaderboardEntry(
            tag=entry_data["tag"],
            name=entry_data["name"],
            elo_rating=entry_data["eloRating"],
            clan=clan
        )

    @staticmethod
    def _map_player(player_data: dict[str, Any]) -> Player:
        """
        Map API player response to Player.

        Handles camelCase to snake_case conversion and only includes
        fields defined in the Player model.
        """
        # Map clan  if present
        clan = None
        if "clan" in player_data:
            clan = ClashRoyaleService._map_clan(player_data["clan"])

        # Map arena  if present
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
            current_pol_league = pol_data.get("leagueNumber")

        if "bestPathOfLegendSeasonResult" in player_data:
            pol_data = player_data["bestPathOfLegendSeasonResult"]
            best_pol_medals = pol_data.get("trophies")
            best_pol_rank = pol_data.get("rank")

        return Player(
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
            current_favorite_card=current_favorite_card,
            total_donations=player_data.get("totalDonations"),
            challenge_max_wins=player_data.get("challengeMaxWins"),
            current_path_of_legends_league=current_pol_league
        )

    @staticmethod
    def _map_battle_log(battle_log_data: list[dict[str, Any]]) -> BattleLog:
        """
        Map API battle log response to BattleLog .

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

            # Create battle
            battle = Battle(
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

    @staticmethod
    def _map_clan_member(member_data: dict[str, Any]) -> ClanMemberEntry:
        """Map API clan member response to ClanMemberEntry."""
        return ClanMemberEntry(
            tag=member_data["tag"],
            name=member_data["name"],
            role=member_data.get("role"),
            last_seen=member_data.get("lastSeen"),
            trophies=member_data.get("trophies")
        )

    @staticmethod
    def _map_full_clan(clan_data: dict[str, Any]) -> FullClan:
        """Map API clan response to FullClan."""
        # Extract location name if present
        location_name = None
        if "location" in clan_data:
            location_name = clan_data["location"].get("name")

        # Map member list
        members_list = []
        if "memberList" in clan_data:
            members_list = [
                ClashRoyaleService._map_clan_member(member)
                for member in clan_data["memberList"]
            ]

        return FullClan(
            tag=clan_data["tag"],
            name=clan_data["name"],
            type=clan_data.get("type"),
            description=clan_data.get("description"),
            clan_score=str(clan_data.get("clanScore")) if clan_data.get(
                "clanScore") is not None else None,
            clan_war_trophies=clan_data.get("clanWarTrophies"),
            location=location_name,
            required_trophies=clan_data.get("requiredTrophies"),
            donations_per_week=clan_data.get("donationsPerWeek"),
            num_members=clan_data.get("members"),
            members_list=members_list
        )

    @staticmethod
    def _map_clan_search_result(clan_data: dict[str, Any]) -> ClanSearchResult:
        """Map API clan search response to ClanSearchResult."""
        # Extract location info if present
        location_id = None
        location_name = None
        if "location" in clan_data:
            location_id = clan_data["location"].get("id")
            location_name = clan_data["location"].get("name")

        return ClanSearchResult(
            tag=clan_data["tag"],
            name=clan_data["name"],
            type=clan_data.get("type"),
            badge_id=clan_data["badgeId"],
            clan_score=clan_data.get("clanScore"),
            clan_war_trophies=clan_data.get("clanWarTrophies"),
            location_id=location_id,
            location_name=location_name,
            members=clan_data.get("members"),
            required_trophies=clan_data.get("requiredTrophies")
        )

    async def get_player(self, player_tag: str) -> Player:
        """
        Get information about a specific player.

        Args:
            player_tag: The player tag (with or without #)

        Returns:
            Player with mapped and formatted player information
        """
        encoded_tag = self._encode_tag(player_tag)
        player_data = await self._request(f"/players/{encoded_tag}")
        return self._map_player(player_data)

    async def get_player_battle_log(self, player_tag: str, limit: int | None = None) -> BattleLog:
        """
        Get a player's recent battle log.

        Args:
            player_tag: The player tag (with or without #)
            limit: Maximum number of battles to return. If None, returns all battles.

        Returns:
            BattleLog  with mapped and formatted battle information
        """
        encoded_tag = self._encode_tag(player_tag)
        result = await self._request(f"/players/{encoded_tag}/battlelog")
        # Battle log API returns a list directly (unlike other endpoints)
        if isinstance(result, list):
            battle_log_data = result[:limit] if limit is not None else result
        else:
            battle_log_data = []
        return self._map_battle_log(battle_log_data)

    # ===== CLAN ENDPOINTS =====

    async def get_clan(self, clan_tag: str) -> FullClan:
        """
        Get information about a specific clan.

        Args:
            clan_tag: The clan tag (with or without #)

        Returns:
            FullClan with mapped and formatted clan information including members
        """
        encoded_tag = self._encode_tag(clan_tag)
        clan_data = await self._request(f"/clans/{encoded_tag}")
        return self._map_full_clan(clan_data)

    async def search_clans(
        self,
        name: str | None = None,
        location_id: int | None = None,
        min_members: int | None = None,
        max_members: int | None = None,
        min_score: int | None = None,
        limit: int = 10,
        after: str | None = None,
        before: str | None = None
    ) -> ClanSearchResults:
        """
        Search for clans by name and/or various criteria.

        At least one filtering criterion must be provided. If name is used,
        it must be at least 3 characters long. Name search is a wildcard search.

        Args:
            name: Search clans by name (min 3 characters, wildcard search)
            location_id: Filter by clan location identifier
            min_members: Filter by minimum number of clan members
            max_members: Filter by maximum number of clan members
            min_score: Filter by minimum clan score
            limit: Limit the number of items returned (default: 10, max: 25)
            after: Return items after this cursor (pagination)
            before: Return items before this cursor (pagination)

        Returns:
            ClanSearchResults with list of matching clans and pagination info

        Raises:
            ClashRoyaleAPIError: If no search criteria provided or name too short
        """
        # Build query parameters
        params: dict[str, Any] = {}

        if name is not None:
            if len(name) < 3:
                raise ClashRoyaleAPIError(
                    "Clan name must be at least 3 characters long"
                )
            params["name"] = name

        if location_id is not None:
            params["locationId"] = location_id

        if min_members is not None:
            params["minMembers"] = min_members

        if max_members is not None:
            params["maxMembers"] = max_members

        if min_score is not None:
            params["minScore"] = min_score

        # Clamp limit to max of 25
        params["limit"] = min(limit, 25)

        if after is not None and before is not None:
            raise ClashRoyaleAPIError(
                "Cannot specify both 'after' and 'before' pagination markers"
            )

        if after is not None:
            params["after"] = after

        if before is not None:
            params["before"] = before

        # Ensure at least one filtering criterion is provided
        # (limit, after, before are not filtering criteria)
        has_filter = any([
            name is not None,
            location_id is not None,
            min_members is not None,
            max_members is not None,
            min_score is not None
        ])
        if not has_filter:
            raise ClashRoyaleAPIError(
                "At least one filtering criterion must be provided (name, location_id, min_members, max_members, or min_score)"
            )

        # Make the request
        response = await self._request("/clans", params=params)

        # Parse results
        items_data = response.get("items", [])
        clans = [self._map_clan_search_result(
            clan_data) for clan_data in items_data]

        # Parse paging info
        paging = None
        if "paging" in response:
            paging = ClanSearchPaging(
                cursors=response["paging"].get("cursors"))

        return ClanSearchResults(items=clans, paging=paging)

    # ===== CARD ENDPOINTS =====
    async def get_cards(self) -> CardList:
        """
        Get a list of all available cards in Clash Royale.

        Returns:
            CardList  with all cards and their properties
        """
        response = await self._request("/cards")
        # API returns {"items": [card1, card2, ...]}
        cards_data = response.get("items", [])
        cards = [self._map_card(card_data) for card_data in cards_data]
        return CardList(cards=cards)

    async def get_player_rankings(
        self,
        location_id: int,
        limit: int = 10
    ) -> Leaderboard:
        """
        Get Path of Legend player rankings for a specific location.

        Args:
            location_id: The location ID
            limit: Number of top players to return (default: 10, max: 50)

        Returns:
            Leaderboard with top ranked players
        """
        # Clamp limit between 1 and 50
        limit = max(1, min(limit, 50))

        params = {"limit": limit}
        response = await self._request(f"/locations/{location_id}/pathoflegend/players", params=params)

        # API returns {"items": [entry1, entry2, ...]}
        entries_data = response.get("items", [])
        entries = [self._map_leaderboard_entry(
            entry_data) for entry_data in entries_data]
        return Leaderboard(entries=entries)


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
