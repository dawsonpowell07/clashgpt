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


class ClashRoyaleNetworkError(ClashRoyaleAPIError):
    """Raised when network/connection errors occur."""
    pass


class ClashRoyaleDataError(ClashRoyaleAPIError):
    """Raised when API returns malformed or unexpected data."""
    pass


class ClashRoyaleTimeoutError(ClashRoyaleAPIError):
    """Raised when API request times out."""
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
        try:
            self.client = httpx.AsyncClient(headers=self.headers, timeout=30.0)
            return self
        except Exception as e:
            logger.error(f"Failed to initialize HTTP client: {e}", exc_info=True)
            raise ClashRoyaleNetworkError(
                f"Failed to initialize Clash Royale API client: {e!s}"
            ) from e

    async def __aexit__(self, _exc_type, _exc_val, _exc_tb):
        """Async context manager exit."""
        if self.client:
            try:
                await self.client.aclose()
            except Exception as e:
                logger.error(f"Failed to close HTTP client: {e}", exc_info=True)
                raise ClashRoyaleNetworkError(
                    f"Failed to close Clash Royale API client: {e!s}"
                ) from e

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

            # Handle successful response
            if response.status_code == 200:
                logger.info(f"Clash Royale API: {endpoint} | status=200")
                try:
                    return response.json()
                except Exception as e:
                    logger.error(f"Failed to parse JSON response from {endpoint}: {e}")
                    raise ClashRoyaleDataError(
                        f"Invalid JSON response from API: {e!s}"
                    ) from e

            # Handle authentication errors
            elif response.status_code == 401:
                logger.error(f"Clash Royale API: {endpoint} | status=401 (Invalid API token)")
                raise ClashRoyaleAuthError("Invalid API token")

            elif response.status_code == 403:
                logger.error(f"Clash Royale API: {endpoint} | status=403 (Access denied)")
                raise ClashRoyaleAuthError(f"Access denied to {endpoint}")

            # Handle not found
            elif response.status_code == 404:
                logger.warning(f"Clash Royale API: {endpoint} | status=404 (Not found)")
                raise ClashRoyaleNotFoundError(f"Resource not found: {endpoint}")

            # Handle rate limiting
            elif response.status_code == 429:
                logger.warning(f"Clash Royale API: {endpoint} | status=429 (Rate limited)")
                raise ClashRoyaleRateLimitError("Rate limit exceeded. Please try again later.")

            # Handle server errors
            elif response.status_code >= 500:
                logger.error(f"Clash Royale API: {endpoint} | status={response.status_code} (Server error)")
                raise ClashRoyaleAPIError(
                    f"Clash Royale API server error (status {response.status_code}). Please try again later."
                )

            # Handle bad request
            elif response.status_code == 400:
                logger.error(f"Clash Royale API: {endpoint} | status=400 (Bad request)")
                error_msg = f"Bad request to {endpoint}"
                try:
                    error_data = response.json()
                    if "message" in error_data:
                        error_msg = f"{error_msg}: {error_data['message']}"
                except Exception:
                    pass
                raise ClashRoyaleAPIError(error_msg)

            # Handle other status codes
            else:
                logger.error(f"Clash Royale API: {endpoint} | status={response.status_code}")
                raise ClashRoyaleAPIError(
                    f"API request failed with status {response.status_code}: {response.text!r}"
                )

        # Handle timeout errors
        except httpx.TimeoutException as e:
            logger.error(f"Clash Royale API: {endpoint} | Timeout error: {e}")
            raise ClashRoyaleTimeoutError(
                f"Request to {endpoint} timed out. Please try again."
            ) from e

        # Handle connection errors
        except httpx.ConnectError as e:
            logger.error(f"Clash Royale API: {endpoint} | Connection error: {e}")
            raise ClashRoyaleNetworkError(
                f"Failed to connect to Clash Royale API: {e!s}"
            ) from e

        # Handle other network errors
        except httpx.NetworkError as e:
            logger.error(f"Clash Royale API: {endpoint} | Network error: {e}")
            raise ClashRoyaleNetworkError(
                f"Network error while accessing {endpoint}: {e!s}"
            ) from e

        # Handle other HTTP errors
        except httpx.HTTPError as e:
            logger.error(f"Clash Royale API: {endpoint} | HTTP error: {e}")
            raise ClashRoyaleAPIError(f"HTTP error occurred: {e!s}") from e

        # Catch any other unexpected errors
        except Exception as e:
            # Don't catch our own exceptions
            if isinstance(e, ClashRoyaleAPIError):
                raise
            logger.error(f"Clash Royale API: {endpoint} | Unexpected error: {e}", exc_info=True)
            raise ClashRoyaleAPIError(
                f"Unexpected error while accessing {endpoint}: {e!s}"
            ) from e

    # ===== PLAYER ENDPOINTS =====

    @staticmethod
    def _map_clan(clan_data: dict[str, Any]) -> Clan:
        """Map API clan response to Clan."""
        try:
            if not isinstance(clan_data, dict):
                raise ClashRoyaleDataError(f"Expected dict for clan data, got {type(clan_data)}")

            required_fields = ["tag", "name", "badgeId"]
            missing_fields = [f for f in required_fields if f not in clan_data]
            if missing_fields:
                raise ClashRoyaleDataError(f"Missing required clan fields: {missing_fields}")

            return Clan(
                tag=clan_data["tag"],
                clan_name=clan_data["name"],
                badge_id=str(clan_data["badgeId"])
            )
        except ClashRoyaleDataError:
            raise
        except Exception as e:
            logger.error(f"Failed to map clan data: {e}", exc_info=True)
            raise ClashRoyaleDataError(f"Failed to parse clan data: {e!s}") from e

    @staticmethod
    def _map_arena(arena_data: dict[str, Any]) -> Arena:
        """Map API arena response to Arena."""
        try:
            if not isinstance(arena_data, dict):
                raise ClashRoyaleDataError(f"Expected dict for arena data, got {type(arena_data)}")

            required_fields = ["id", "name"]
            missing_fields = [f for f in required_fields if f not in arena_data]
            if missing_fields:
                raise ClashRoyaleDataError(f"Missing required arena fields: {missing_fields}")

            return Arena(
                id=str(arena_data["id"]),
                name=arena_data["name"],
                raw_name=arena_data.get("rawName", "")
            )
        except ClashRoyaleDataError:
            raise
        except Exception as e:
            logger.error(f"Failed to map arena data: {e}", exc_info=True)
            raise ClashRoyaleDataError(f"Failed to parse arena data: {e!s}") from e

    @staticmethod
    def _map_card(card_data: dict[str, Any]) -> Card:
        """Map API card response to Card."""
        try:
            if not isinstance(card_data, dict):
                raise ClashRoyaleDataError(f"Expected dict for card data, got {type(card_data)}")

            required_fields = ["id", "name", "rarity"]
            missing_fields = [f for f in required_fields if f not in card_data]
            if missing_fields:
                raise ClashRoyaleDataError(f"Missing required card fields: {missing_fields}")

            elixir_cost = card_data.get("elixirCost") or 0

            # Safely parse rarity
            rarity_str = card_data["rarity"].upper() if isinstance(card_data["rarity"], str) else str(card_data["rarity"]).upper()
            try:
                rarity = Rarity[rarity_str]
            except KeyError:
                logger.warning(f"Unknown rarity '{rarity_str}', using COMMON as default")
                rarity = Rarity.COMMON

            return Card(
                id=str(card_data["id"]),
                name=card_data["name"],
                elixir_cost=elixir_cost,
                icon_urls=card_data.get("iconUrls", {}),
                rarity=rarity
            )
        except ClashRoyaleDataError:
            raise
        except Exception as e:
            logger.error(f"Failed to map card data: {e}", exc_info=True)
            raise ClashRoyaleDataError(f"Failed to parse card data: {e!s}") from e

    @staticmethod
    def _map_leaderboard_entry(entry_data: dict[str, Any]) -> LeaderboardEntry:
        """Map API leaderboard entry response to LeaderboardEntry."""
        try:
            if not isinstance(entry_data, dict):
                raise ClashRoyaleDataError(f"Expected dict for leaderboard entry data, got {type(entry_data)}")

            required_fields = ["tag", "name", "eloRating"]
            missing_fields = [f for f in required_fields if f not in entry_data]
            if missing_fields:
                raise ClashRoyaleDataError(f"Missing required leaderboard entry fields: {missing_fields}")

            clan = None
            if "clan" in entry_data and entry_data["clan"]:
                try:
                    clan = ClashRoyaleService._map_clan(entry_data["clan"])
                except Exception as e:
                    logger.warning(f"Failed to map clan in leaderboard entry: {e}")

            return LeaderboardEntry(
                tag=entry_data["tag"],
                name=entry_data["name"],
                elo_rating=entry_data["eloRating"],
                clan=clan
            )
        except ClashRoyaleDataError:
            raise
        except Exception as e:
            logger.error(f"Failed to map leaderboard entry data: {e}", exc_info=True)
            raise ClashRoyaleDataError(f"Failed to parse leaderboard entry data: {e!s}") from e

    @staticmethod
    def _map_player(player_data: dict[str, Any]) -> Player:
        """
        Map API player response to Player.

        Handles camelCase to snake_case conversion and only includes
        fields defined in the Player model.
        """
        try:
            if not isinstance(player_data, dict):
                raise ClashRoyaleDataError(f"Expected dict for player data, got {type(player_data)}")

            required_fields = ["tag", "name", "trophies", "bestTrophies", "wins", "losses", "battleCount", "threeCrownWins"]
            missing_fields = [f for f in required_fields if f not in player_data]
            if missing_fields:
                raise ClashRoyaleDataError(f"Missing required player fields: {missing_fields}")

            # Map clan if present
            clan = None
            if "clan" in player_data and player_data["clan"]:
                try:
                    clan = ClashRoyaleService._map_clan(player_data["clan"])
                except Exception as e:
                    logger.warning(f"Failed to map clan in player data: {e}")

            # Map arena if present
            arena = None
            if "arena" in player_data and player_data["arena"]:
                try:
                    arena = ClashRoyaleService._map_arena(player_data["arena"])
                except Exception as e:
                    logger.warning(f"Failed to map arena in player data: {e}")

            # Map current favorite card if present
            current_favorite_card = None
            if "currentFavouriteCard" in player_data and player_data["currentFavouriteCard"]:
                try:
                    current_favorite_card = ClashRoyaleService._map_card(
                        player_data["currentFavouriteCard"]
                    )
                except Exception as e:
                    logger.warning(f"Failed to map current favorite card: {e}")

            # Extract Path of Legends data
            current_pol_medals = None
            current_pol_rank = None
            current_pol_league = None
            best_pol_medals = None
            best_pol_rank = None

            if "currentPathOfLegendSeasonResult" in player_data:
                pol_data = player_data["currentPathOfLegendSeasonResult"]
                if isinstance(pol_data, dict):
                    current_pol_medals = pol_data.get("trophies")
                    current_pol_rank = pol_data.get("rank")
                    current_pol_league = pol_data.get("leagueNumber")

            if "bestPathOfLegendSeasonResult" in player_data:
                pol_data = player_data["bestPathOfLegendSeasonResult"]
                if isinstance(pol_data, dict):
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
        except ClashRoyaleDataError:
            raise
        except Exception as e:
            logger.error(f"Failed to map player data: {e}", exc_info=True)
            raise ClashRoyaleDataError(f"Failed to parse player data: {e!s}") from e

    @staticmethod
    def _map_battle_log(battle_log_data: list[dict[str, Any]]) -> BattleLog:
        """
        Map API battle log response to BattleLog.

        Handles camelCase to snake_case conversion and maps battle data.
        """
        try:
            if not isinstance(battle_log_data, list):
                raise ClashRoyaleDataError(f"Expected list for battle log data, got {type(battle_log_data)}")

            battles = []
            for idx, battle_data in enumerate(battle_log_data):
                try:
                    if not isinstance(battle_data, dict):
                        logger.warning(f"Skipping battle {idx}: expected dict, got {type(battle_data)}")
                        continue

                    # Validate required fields
                    required_fields = ["type", "battleTime", "arena", "gameMode", "team", "opponent"]
                    missing_fields = [f for f in required_fields if f not in battle_data]
                    if missing_fields:
                        logger.warning(f"Skipping battle {idx}: missing fields {missing_fields}")
                        continue

                    # Map arena
                    arena = ClashRoyaleService._map_arena(battle_data["arena"])

                    # Validate team and opponent arrays
                    if not battle_data.get("team") or not isinstance(battle_data["team"], list) or len(battle_data["team"]) == 0:
                        logger.warning(f"Skipping battle {idx}: invalid team data")
                        continue
                    if not battle_data.get("opponent") or not isinstance(battle_data["opponent"], list) or len(battle_data["opponent"]) == 0:
                        logger.warning(f"Skipping battle {idx}: invalid opponent data")
                        continue

                    # Get user info (team[0])
                    user = battle_data["team"][0]
                    if not isinstance(user, dict):
                        logger.warning(f"Skipping battle {idx}: invalid user data")
                        continue

                    user_name = user.get("name", "Unknown")
                    user_trophy_change = user.get("trophyChange", 0)

                    # Map user cards
                    user_cards = []
                    if "cards" in user and isinstance(user["cards"], list):
                        for card in user["cards"]:
                            try:
                                user_cards.append(ClashRoyaleService._map_card(card))
                            except Exception as e:
                                logger.warning(f"Failed to map user card in battle {idx}: {e}")
                    user_deck = CardList(cards=user_cards)

                    # Get opponent info (opponent[0])
                    opponent = battle_data["opponent"][0]
                    if not isinstance(opponent, dict):
                        logger.warning(f"Skipping battle {idx}: invalid opponent data")
                        continue

                    opponent_name = opponent.get("name", "Unknown")
                    opponent_trophy_change = opponent.get("trophyChange", 0)

                    # Map opponent cards
                    opponent_cards = []
                    if "cards" in opponent and isinstance(opponent["cards"], list):
                        for card in opponent["cards"]:
                            try:
                                opponent_cards.append(ClashRoyaleService._map_card(card))
                            except Exception as e:
                                logger.warning(f"Failed to map opponent card in battle {idx}: {e}")
                    opponent_deck = CardList(cards=opponent_cards)

                    # Validate game mode
                    if not isinstance(battle_data.get("gameMode"), dict) or "name" not in battle_data["gameMode"]:
                        logger.warning(f"Skipping battle {idx}: invalid game mode data")
                        continue

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

                except Exception as e:
                    logger.warning(f"Failed to map battle {idx}, skipping: {e}")
                    continue

            return BattleLog(battles=battles)

        except ClashRoyaleDataError:
            raise
        except Exception as e:
            logger.error(f"Failed to map battle log data: {e}", exc_info=True)
            raise ClashRoyaleDataError(f"Failed to parse battle log data: {e!s}") from e

    @staticmethod
    def _map_clan_member(member_data: dict[str, Any]) -> ClanMemberEntry:
        """Map API clan member response to ClanMemberEntry."""
        try:
            if not isinstance(member_data, dict):
                raise ClashRoyaleDataError(f"Expected dict for clan member data, got {type(member_data)}")

            required_fields = ["tag", "name"]
            missing_fields = [f for f in required_fields if f not in member_data]
            if missing_fields:
                raise ClashRoyaleDataError(f"Missing required clan member fields: {missing_fields}")

            return ClanMemberEntry(
                tag=member_data["tag"],
                name=member_data["name"],
                role=member_data.get("role"),
                last_seen=member_data.get("lastSeen"),
                trophies=member_data.get("trophies")
            )
        except ClashRoyaleDataError:
            raise
        except Exception as e:
            logger.error(f"Failed to map clan member data: {e}", exc_info=True)
            raise ClashRoyaleDataError(f"Failed to parse clan member data: {e!s}") from e

    @staticmethod
    def _map_full_clan(clan_data: dict[str, Any]) -> FullClan:
        """Map API clan response to FullClan."""
        try:
            if not isinstance(clan_data, dict):
                raise ClashRoyaleDataError(f"Expected dict for full clan data, got {type(clan_data)}")

            required_fields = ["tag", "name"]
            missing_fields = [f for f in required_fields if f not in clan_data]
            if missing_fields:
                raise ClashRoyaleDataError(f"Missing required full clan fields: {missing_fields}")

            # Extract location name if present
            location_name = None
            if "location" in clan_data and isinstance(clan_data["location"], dict):
                location_name = clan_data["location"].get("name")

            # Map member list
            members_list = []
            if "memberList" in clan_data and isinstance(clan_data["memberList"], list):
                for idx, member in enumerate(clan_data["memberList"]):
                    try:
                        members_list.append(ClashRoyaleService._map_clan_member(member))
                    except Exception as e:
                        logger.warning(f"Failed to map clan member {idx}, skipping: {e}")

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
        except ClashRoyaleDataError:
            raise
        except Exception as e:
            logger.error(f"Failed to map full clan data: {e}", exc_info=True)
            raise ClashRoyaleDataError(f"Failed to parse full clan data: {e!s}") from e

    @staticmethod
    def _map_clan_search_result(clan_data: dict[str, Any]) -> ClanSearchResult:
        """Map API clan search response to ClanSearchResult."""
        try:
            if not isinstance(clan_data, dict):
                raise ClashRoyaleDataError(f"Expected dict for clan search result data, got {type(clan_data)}")

            required_fields = ["tag", "name", "badgeId"]
            missing_fields = [f for f in required_fields if f not in clan_data]
            if missing_fields:
                raise ClashRoyaleDataError(f"Missing required clan search result fields: {missing_fields}")

            # Extract location info if present
            location_id = None
            location_name = None
            if "location" in clan_data and isinstance(clan_data["location"], dict):
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
        except ClashRoyaleDataError:
            raise
        except Exception as e:
            logger.error(f"Failed to map clan search result data: {e}", exc_info=True)
            raise ClashRoyaleDataError(f"Failed to parse clan search result data: {e!s}") from e

    async def get_player(self, player_tag: str) -> Player:
        """
        Get information about a specific player.

        Args:
            player_tag: The player tag (with or without #)

        Returns:
            Player with mapped and formatted player information

        Raises:
            ClashRoyaleAPIError: If player_tag is invalid or API request fails
        """
        if not player_tag or not isinstance(player_tag, str) or not player_tag.strip():
            raise ClashRoyaleAPIError("Player tag cannot be empty")

        try:
            encoded_tag = self._encode_tag(player_tag.strip())
            player_data = await self._request(f"/players/{encoded_tag}")
            return self._map_player(player_data)
        except ClashRoyaleAPIError:
            raise
        except Exception as e:
            logger.error(f"Unexpected error getting player {player_tag}: {e}", exc_info=True)
            raise ClashRoyaleAPIError(f"Failed to get player data: {e!s}") from e

    async def get_player_battle_log(self, player_tag: str, limit: int | None = None) -> BattleLog:
        """
        Get a player's recent battle log.

        Args:
            player_tag: The player tag (with or without #)
            limit: Maximum number of battles to return. If None, returns all battles.

        Returns:
            BattleLog with mapped and formatted battle information

        Raises:
            ClashRoyaleAPIError: If player_tag is invalid or API request fails
        """
        if not player_tag or not isinstance(player_tag, str) or not player_tag.strip():
            raise ClashRoyaleAPIError("Player tag cannot be empty")

        if limit is not None and (not isinstance(limit, int) or limit <= 0):
            raise ClashRoyaleAPIError("Limit must be a positive integer")

        try:
            encoded_tag = self._encode_tag(player_tag.strip())
            result = await self._request(f"/players/{encoded_tag}/battlelog")

            # Battle log API returns a list directly (unlike other endpoints)
            if isinstance(result, list):
                battle_log_data = result[:limit] if limit is not None else result
            else:
                logger.warning(f"Expected list for battle log, got {type(result)}, returning empty battle log")
                battle_log_data = []

            return self._map_battle_log(battle_log_data)
        except ClashRoyaleAPIError:
            raise
        except Exception as e:
            logger.error(f"Unexpected error getting battle log for {player_tag}: {e}", exc_info=True)
            raise ClashRoyaleAPIError(f"Failed to get battle log: {e!s}") from e

    # ===== CLAN ENDPOINTS =====

    async def get_clan(self, clan_tag: str) -> FullClan:
        """
        Get information about a specific clan.

        Args:
            clan_tag: The clan tag (with or without #)

        Returns:
            FullClan with mapped and formatted clan information including members

        Raises:
            ClashRoyaleAPIError: If clan_tag is invalid or API request fails
        """
        if not clan_tag or not isinstance(clan_tag, str) or not clan_tag.strip():
            raise ClashRoyaleAPIError("Clan tag cannot be empty")

        try:
            encoded_tag = self._encode_tag(clan_tag.strip())
            clan_data = await self._request(f"/clans/{encoded_tag}")
            return self._map_full_clan(clan_data)
        except ClashRoyaleAPIError:
            raise
        except Exception as e:
            logger.error(f"Unexpected error getting clan {clan_tag}: {e}", exc_info=True)
            raise ClashRoyaleAPIError(f"Failed to get clan data: {e!s}") from e

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
        try:
            response = await self._request("/clans", params=params)

            # Validate response structure
            if not isinstance(response, dict):
                raise ClashRoyaleDataError(f"Expected dict response, got {type(response)}")

            # Parse results
            items_data = response.get("items", [])
            if not isinstance(items_data, list):
                logger.warning(f"Expected list for items, got {type(items_data)}, using empty list")
                items_data = []

            clans = []
            for idx, clan_data in enumerate(items_data):
                try:
                    clans.append(self._map_clan_search_result(clan_data))
                except Exception as e:
                    logger.warning(f"Failed to map clan search result {idx}, skipping: {e}")

            # Parse paging info
            paging = None
            if "paging" in response and isinstance(response["paging"], dict):
                try:
                    paging = ClanSearchPaging(
                        cursors=response["paging"].get("cursors"))
                except Exception as e:
                    logger.warning(f"Failed to parse paging info: {e}")

            return ClanSearchResults(items=clans, paging=paging)

        except ClashRoyaleAPIError:
            raise
        except Exception as e:
            logger.error(f"Unexpected error searching clans: {e}", exc_info=True)
            raise ClashRoyaleAPIError(f"Failed to search clans: {e!s}") from e

    # ===== CARD ENDPOINTS =====
    async def get_cards(self) -> CardList:
        """
        Get a list of all available cards in Clash Royale.

        Returns:
            CardList with all cards and their properties

        Raises:
            ClashRoyaleAPIError: If API request fails
        """
        try:
            response = await self._request("/cards")

            # Validate response structure
            if not isinstance(response, dict):
                raise ClashRoyaleDataError(f"Expected dict response, got {type(response)}")

            # API returns {"items": [card1, card2, ...]}
            cards_data = response.get("items", [])
            if not isinstance(cards_data, list):
                logger.warning(f"Expected list for cards, got {type(cards_data)}, using empty list")
                cards_data = []

            cards = []
            for idx, card_data in enumerate(cards_data):
                try:
                    cards.append(self._map_card(card_data))
                except Exception as e:
                    logger.warning(f"Failed to map card {idx}, skipping: {e}")

            return CardList(cards=cards)

        except ClashRoyaleAPIError:
            raise
        except Exception as e:
            logger.error(f"Unexpected error getting cards: {e}", exc_info=True)
            raise ClashRoyaleAPIError(f"Failed to get cards: {e!s}") from e

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

        Raises:
            ClashRoyaleAPIError: If location_id is invalid or API request fails
        """
        if not isinstance(location_id, int):
            raise ClashRoyaleAPIError("Location ID must be an integer")

        if not isinstance(limit, int) or limit <= 0:
            raise ClashRoyaleAPIError("Limit must be a positive integer")

        try:
            # Clamp limit between 1 and 50
            limit = max(1, min(limit, 50))

            params = {"limit": limit}
            response = await self._request(f"/locations/{location_id}/pathoflegend/players", params=params)

            # Validate response structure
            if not isinstance(response, dict):
                raise ClashRoyaleDataError(f"Expected dict response, got {type(response)}")

            # API returns {"items": [entry1, entry2, ...]}
            entries_data = response.get("items", [])
            if not isinstance(entries_data, list):
                logger.warning(f"Expected list for entries, got {type(entries_data)}, using empty list")
                entries_data = []

            entries = []
            for idx, entry_data in enumerate(entries_data):
                try:
                    entries.append(self._map_leaderboard_entry(entry_data))
                except Exception as e:
                    logger.warning(f"Failed to map leaderboard entry {idx}, skipping: {e}")

            return Leaderboard(entries=entries)

        except ClashRoyaleAPIError:
            raise
        except Exception as e:
            logger.error(f"Unexpected error getting player rankings for location {location_id}: {e}", exc_info=True)
            raise ClashRoyaleAPIError(f"Failed to get player rankings: {e!s}") from e


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
