"""
Clan-related tools for the Clash Royale agent.
"""
import logging

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

logger = logging.getLogger(__name__)


async def get_clan_info(clan_tag: str) -> dict:
    """
    Get Clash Royale clan information by clan tag.

    Args:
        clan_tag: The clan tag (with or without #). Example: #QPY2CU0Y

    Returns:
        Dictionary containing clan information including name, type, description,
        clan score, war trophies, location, requirements, donation stats,
        and a full list of all clan members with their roles, trophies, and last seen times.
    """
    logger.info(f"Tool: get_clan_info | clan_tag={clan_tag}")
    try:
        async with ClashRoyaleService() as service:
            clan = await service.get_clan(clan_tag)
            return clan.model_dump()
    except ClashRoyaleNotFoundError:
        error_msg = f"Clan not found: {clan_tag}. Ask the user to verify the clan tag."
        logger.warning(f"Tool: get_clan_info | {error_msg}")
        return {
            "error": error_msg,
            "error_type": "not_found",
            "clan_tag": clan_tag,
            "suggestion": "Confirm the clan tag and try again."
        }
    except ClashRoyaleAuthError as e:
        error_msg = f"Authentication failed when fetching clan info: {e}"
        logger.error(f"Tool: get_clan_info | {error_msg}")
        return {
            "error": "Unable to access Clash Royale API due to authentication issues.",
            "error_type": "authentication",
            "details": str(e),
        }
    except ClashRoyaleRateLimitError:
        error_msg = "Rate limit exceeded while fetching clan info."
        logger.warning(f"Tool: get_clan_info | {error_msg}")
        return {
            "error": "Clash Royale API rate limit exceeded. Please retry shortly.",
            "error_type": "rate_limit",
            "suggestion": "Wait a moment, then retry."
        }
    except ClashRoyaleTimeoutError:
        error_msg = f"Request timed out while fetching clan info for {clan_tag}."
        logger.warning(f"Tool: get_clan_info | {error_msg}")
        return {
            "error": "The request timed out. Please retry.",
            "error_type": "timeout",
            "clan_tag": clan_tag
        }
    except ClashRoyaleNetworkError as e:
        error_msg = f"Network error while fetching clan info: {e}"
        logger.error(f"Tool: get_clan_info | {error_msg}")
        return {
            "error": "Network error contacting Clash Royale API.",
            "error_type": "network",
            "details": str(e),
        }
    except ClashRoyaleDataError as e:
        error_msg = f"Data error while parsing clan info: {e}"
        logger.error(f"Tool: get_clan_info | {error_msg}")
        return {
            "error": "Received unexpected data from Clash Royale API.",
            "error_type": "data_error",
            "details": str(e),
        }
    except ClashRoyaleAPIError as e:
        error_msg = f"API error while fetching clan info: {e}"
        logger.error(f"Tool: get_clan_info | {error_msg}")
        return {
            "error": f"Failed to fetch clan info: {e}",
            "error_type": "api_error",
            "clan_tag": clan_tag
        }
    except Exception as e:
        error_msg = f"Unexpected error in get_clan_info: {e}"
        logger.error(f"Tool: get_clan_info | {error_msg}", exc_info=True)
        return {
            "error": "Unexpected error while fetching clan info.",
            "error_type": "unexpected",
            "details": str(e),
        }


async def search_clans(
    name: str | None = None,
    location_id: int | None = None,
    min_members: int | None = None,
    max_members: int | None = None,
    min_score: int | None = None,
    limit: int = 10
) -> dict:
    """
    Search for Clash Royale clans based on various criteria.

    Use this tool to help players find clans that match their preferences.
    At least one filtering criterion must be provided. Name search is a wildcard
    search that matches clan names containing the search term.

    Args:
        name: Search clans by name (min 3 characters). Example: "RoyalChampions"
        location_id: Filter by location ID. Use get_locations to find valid location IDs.
        min_members: Minimum number of clan members (0-50)
        max_members: Maximum number of clan members (0-50)
        min_score: Minimum clan score (trophy requirement)
        limit: Maximum number of results to return (default: 10, max: 25)

    Returns:
        Dictionary containing:
        - items: List of clans matching the search criteria, each with tag, name,
          type, badge_id, clan_score, clan_war_trophies, location, members, and required_trophies
        - paging: Pagination information with cursors for next/previous pages (if applicable)

    Examples:
        - Search by name: search_clans(name="RoyalChampions")
        - Find active clans: search_clans(min_members=40, min_score=50000)
        - Search in specific location: search_clans(location_id=57000249, min_members=30)
        - Combined search: search_clans(name="Dragon", location_id=57000249, min_members=25)
    """
    logger.info(
        f"Tool: search_clans | name={name}, location_id={location_id}, "
        f"min_members={min_members}, max_members={max_members}, "
        f"min_score={min_score}, limit={limit}"
    )
    try:
        async with ClashRoyaleService() as service:
            results = await service.search_clans(
                name=name,
                location_id=location_id,
                min_members=min_members,
                max_members=max_members,
                min_score=min_score,
                limit=limit
            )
            return results.model_dump()
    except ClashRoyaleAuthError as e:
        error_msg = f"Authentication failed when searching clans: {e}"
        logger.error(f"Tool: search_clans | {error_msg}")
        return {
            "error": "Unable to access Clash Royale API due to authentication issues.",
            "error_type": "authentication",
            "details": str(e),
            "items": []
        }
    except ClashRoyaleRateLimitError:
        error_msg = "Rate limit exceeded while searching clans."
        logger.warning(f"Tool: search_clans | {error_msg}")
        return {
            "error": "Clash Royale API rate limit exceeded. Please retry shortly.",
            "error_type": "rate_limit",
            "items": [],
            "suggestion": "Wait a moment, then retry."
        }
    except ClashRoyaleTimeoutError:
        error_msg = "Request timed out while searching clans."
        logger.warning(f"Tool: search_clans | {error_msg}")
        return {
            "error": "The request timed out. Please retry.",
            "error_type": "timeout",
            "items": []
        }
    except ClashRoyaleNetworkError as e:
        error_msg = f"Network error while searching clans: {e}"
        logger.error(f"Tool: search_clans | {error_msg}")
        return {
            "error": "Network error contacting Clash Royale API.",
            "error_type": "network",
            "details": str(e),
            "items": []
        }
    except ClashRoyaleDataError as e:
        error_msg = f"Data error while parsing clan search results: {e}"
        logger.error(f"Tool: search_clans | {error_msg}")
        return {
            "error": "Received unexpected data from Clash Royale API.",
            "error_type": "data_error",
            "details": str(e),
            "items": []
        }
    except ClashRoyaleAPIError as e:
        error_msg = f"API error while searching clans: {e}"
        logger.error(f"Tool: search_clans | {error_msg}")
        return {
            "error": f"Failed to search clans: {e}",
            "error_type": "api_error",
            "items": []
        }
    except Exception as e:
        error_msg = f"Unexpected error in search_clans: {e}"
        logger.error(f"Tool: search_clans | {error_msg}", exc_info=True)
        return {
            "error": "Unexpected error while searching clans.",
            "error_type": "unexpected",
            "details": str(e),
            "items": []
        }
