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
