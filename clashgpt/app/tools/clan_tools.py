"""
Clan-related tools for the Clash Royale agent.
"""
import logging

from app.services.clash_royale import ClashRoyaleService

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
    async with ClashRoyaleService() as service:
        clan = await service.get_clan(clan_tag)
        return clan.model_dump()


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
