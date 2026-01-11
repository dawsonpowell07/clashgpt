import logging

from google.adk.tools.tool_context import ToolContext

from app.services.clash_royale import (
    ClashRoyaleAPIError,
    ClashRoyaleAuthError,
    ClashRoyaleDataError,
    ClashRoyaleNetworkError,
    ClashRoyaleNotFoundError,
    ClashRoyaleRateLimitError,
    ClashRoyaleService,
    ClashRoyaleTimeoutError,
)

"""
Player-related tools for the Clash Royale agent.
"""


logger = logging.getLogger(__name__)


async def get_player_info(tool_context: ToolContext, player_tag: str = "#90UUQRQC") -> dict:
    """
    Get Clash Royale player information.

    Args:
        player_tag: The player tag (with or without #). Defaults to #90UUQRQC

    Returns:
        Dictionary containing player information including name, trophies, wins, losses, clan info, etc.
        On error, returns a dictionary with 'error' key containing the error message.
    """
    logger.info(f"Tool: get_player_info | player_tag={player_tag}")

    try:
        async with ClashRoyaleService() as service:
            player = await service.get_player(player_tag)
            tool_context.state["current_player_info"] = player
            return player.model_dump()

    except ClashRoyaleNotFoundError as e:
        error_msg = f"Player not found: {player_tag}. Please verify the player tag is correct."
        logger.warning(f"Tool: get_player_info | {error_msg}")
        return {
            "error": error_msg,
            "error_type": "not_found",
            "player_tag": player_tag
        }

    except ClashRoyaleAuthError as e:
        error_msg = f"Authentication failed when fetching player info: {e}"
        logger.error(f"Tool: get_player_info | {error_msg}")
        return {
            "error": "Unable to access Clash Royale API due to authentication issues. Please contact support.",
            "error_type": "authentication",
            "details": str(e)
        }

    except ClashRoyaleRateLimitError as e:
        error_msg = "Rate limit exceeded. Please try again in a few moments."
        logger.warning(f"Tool: get_player_info | {error_msg}")
        return {
            "error": error_msg,
            "error_type": "rate_limit",
            "suggestion": "Please wait a moment before trying again."
        }

    except ClashRoyaleTimeoutError as e:
        error_msg = f"Request timed out while fetching player info for {player_tag}."
        logger.warning(f"Tool: get_player_info | {error_msg}")
        return {
            "error": "The request took too long to complete. Please try again.",
            "error_type": "timeout",
            "player_tag": player_tag
        }

    except ClashRoyaleNetworkError as e:
        error_msg = f"Network error while fetching player info: {e}"
        logger.error(f"Tool: get_player_info | {error_msg}")
        return {
            "error": "Unable to connect to Clash Royale API. Please check your internet connection and try again.",
            "error_type": "network",
            "details": str(e)
        }

    except ClashRoyaleDataError as e:
        error_msg = f"Data error while parsing player info: {e}"
        logger.error(f"Tool: get_player_info | {error_msg}")
        return {
            "error": "Received invalid data from Clash Royale API. This may be a temporary issue.",
            "error_type": "data_error",
            "details": str(e)
        }

    except ClashRoyaleAPIError as e:
        error_msg = f"API error while fetching player info: {e}"
        logger.error(f"Tool: get_player_info | {error_msg}")
        return {
            "error": f"Failed to fetch player information: {e}",
            "error_type": "api_error",
            "player_tag": player_tag
        }

    except Exception as e:
        error_msg = f"Unexpected error in get_player_info: {e}"
        logger.error(f"Tool: get_player_info | {error_msg}", exc_info=True)
        return {
            "error": "An unexpected error occurred while fetching player information.",
            "error_type": "unexpected",
            "details": str(e)
        }


async def get_player_battle_log(player_tag: str = "#90UUQRQC", limit: int = 3) -> dict:
    """
    Get Clash Royale player battle log showing recent battles.

    Args:
        player_tag: The player tag (with or without #). Defaults to #90UUQRQC
        limit: Maximum number of battles to return. Defaults to 3 most recent battles.

    Returns:
        Dictionary containing recent battle information including battle type, time, opponents, decks used, and trophy changes.
        On error, returns a dictionary with 'error' key containing the error message.
    """
    logger.info(
        f"Tool: get_player_battle_log | player_tag={player_tag}, limit={limit}")

    try:
        async with ClashRoyaleService() as service:
            battle_log = await service.get_player_battle_log(player_tag, limit=limit)
            return battle_log.model_dump()

    except ClashRoyaleNotFoundError as e:
        error_msg = f"Player not found: {player_tag}. Please verify the player tag is correct."
        logger.warning(f"Tool: get_player_battle_log | {error_msg}")
        return {
            "error": error_msg,
            "error_type": "not_found",
            "player_tag": player_tag,
            "battles": []
        }

    except ClashRoyaleAuthError as e:
        error_msg = f"Authentication failed when fetching battle log: {e}"
        logger.error(f"Tool: get_player_battle_log | {error_msg}")
        return {
            "error": "Unable to access Clash Royale API due to authentication issues. Please contact support.",
            "error_type": "authentication",
            "details": str(e),
            "battles": []
        }

    except ClashRoyaleRateLimitError as e:
        error_msg = "Rate limit exceeded. Please try again in a few moments."
        logger.warning(f"Tool: get_player_battle_log | {error_msg}")
        return {
            "error": error_msg,
            "error_type": "rate_limit",
            "suggestion": "Please wait a moment before trying again.",
            "battles": []
        }

    except ClashRoyaleTimeoutError as e:
        error_msg = f"Request timed out while fetching battle log for {player_tag}."
        logger.warning(f"Tool: get_player_battle_log | {error_msg}")
        return {
            "error": "The request took too long to complete. Please try again.",
            "error_type": "timeout",
            "player_tag": player_tag,
            "battles": []
        }

    except ClashRoyaleNetworkError as e:
        error_msg = f"Network error while fetching battle log: {e}"
        logger.error(f"Tool: get_player_battle_log | {error_msg}")
        return {
            "error": "Unable to connect to Clash Royale API. Please check your internet connection and try again.",
            "error_type": "network",
            "details": str(e),
            "battles": []
        }

    except ClashRoyaleDataError as e:
        error_msg = f"Data error while parsing battle log: {e}"
        logger.error(f"Tool: get_player_battle_log | {error_msg}")
        return {
            "error": "Received invalid data from Clash Royale API. This may be a temporary issue.",
            "error_type": "data_error",
            "details": str(e),
            "battles": []
        }

    except ClashRoyaleAPIError as e:
        error_msg = f"API error while fetching battle log: {e}"
        logger.error(f"Tool: get_player_battle_log | {error_msg}")
        return {
            "error": f"Failed to fetch battle log: {e}",
            "error_type": "api_error",
            "player_tag": player_tag,
            "battles": []
        }

    except Exception as e:
        error_msg = f"Unexpected error in get_player_battle_log: {e}"
        logger.error(
            f"Tool: get_player_battle_log | {error_msg}", exc_info=True)
        return {
            "error": "An unexpected error occurred while fetching battle log.",
            "error_type": "unexpected",
            "details": str(e),
            "battles": []
        }


async def get_top_players(location_id: int = 57000249, limit: int = 10) -> dict:
    """
    Get the top Path of Legend players for a specific location.

    Args:
        location_id: The location ID to get rankings for. Defaults to 57000249 (United States).
            Common location IDs:
            - 57000249: United States
            - 57000007: Brazil
            - 57000038: China
            - 57000070: France
            - 57000074: Germany
            - 57000094: India
            - 57000095: Indonesia
            - 57000097: Iran
            - 57000151: Russia
            - 57000088: Hong Kong
            - 57000227: United Kingdom
        limit: Number of top players to return (default: 10, max: 50).

    Returns:
        Dictionary containing the leaderboard with top players including their tags, names, ELO ratings, and clan information.
        On error, returns a dictionary with 'error' key containing the error message.
    """
    logger.info(
        f"Tool: get_top_players | location_id={location_id}, limit={limit}")

    try:
        async with ClashRoyaleService() as service:
            leaderboard = await service.get_player_rankings(location_id, limit=limit)
            return leaderboard.model_dump()

    except ClashRoyaleNotFoundError as e:
        error_msg = f"Location not found: {location_id}. Please verify the location ID is valid."
        logger.warning(f"Tool: get_top_players | {error_msg}")
        return {
            "error": error_msg,
            "error_type": "not_found",
            "location_id": location_id,
            "entries": []
        }

    except ClashRoyaleAuthError as e:
        error_msg = f"Authentication failed when fetching top players: {e}"
        logger.error(f"Tool: get_top_players | {error_msg}")
        return {
            "error": "Unable to access Clash Royale API due to authentication issues. Please contact support.",
            "error_type": "authentication",
            "details": str(e),
            "entries": []
        }

    except ClashRoyaleRateLimitError as e:
        error_msg = "Rate limit exceeded. Please try again in a few moments."
        logger.warning(f"Tool: get_top_players | {error_msg}")
        return {
            "error": error_msg,
            "error_type": "rate_limit",
            "suggestion": "Please wait a moment before trying again.",
            "entries": []
        }

    except ClashRoyaleTimeoutError as e:
        error_msg = f"Request timed out while fetching top players for location {location_id}."
        logger.warning(f"Tool: get_top_players | {error_msg}")
        return {
            "error": "The request took too long to complete. Please try again.",
            "error_type": "timeout",
            "location_id": location_id,
            "entries": []
        }

    except ClashRoyaleNetworkError as e:
        error_msg = f"Network error while fetching top players: {e}"
        logger.error(f"Tool: get_top_players | {error_msg}")
        return {
            "error": "Unable to connect to Clash Royale API. Please check your internet connection and try again.",
            "error_type": "network",
            "details": str(e),
            "entries": []
        }

    except ClashRoyaleDataError as e:
        error_msg = f"Data error while parsing top players: {e}"
        logger.error(f"Tool: get_top_players | {error_msg}")
        return {
            "error": "Received invalid data from Clash Royale API. This may be a temporary issue.",
            "error_type": "data_error",
            "details": str(e),
            "entries": []
        }

    except ClashRoyaleAPIError as e:
        error_msg = f"API error while fetching top players: {e}"
        logger.error(f"Tool: get_top_players | {error_msg}")
        return {
            "error": f"Failed to fetch top players: {e}",
            "error_type": "api_error",
            "location_id": location_id,
            "entries": []
        }

    except Exception as e:
        error_msg = f"Unexpected error in get_top_players: {e}"
        logger.error(f"Tool: get_top_players | {error_msg}", exc_info=True)
        return {
            "error": "An unexpected error occurred while fetching top players.",
            "error_type": "unexpected",
            "details": str(e),
            "entries": []
        }
