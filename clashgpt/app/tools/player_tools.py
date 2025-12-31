"""
Player-related tools for the Clash Royale agent.
"""
import logging

from app.services.clash_royale import ClashRoyaleService

logger = logging.getLogger(__name__)


async def get_player_info(player_tag: str = "#90UUQRQC") -> dict:
    """
    Get Clash Royale player information.

    Args:
        player_tag: The player tag (with or without #). Defaults to #90UUQRQC

    Returns:
        Dictionary containing player information including name, trophies, wins, losses, clan info, etc.
    """
    logger.info(f"Tool: get_player_info | player_tag={player_tag}")
    async with ClashRoyaleService() as service:
        player = await service.get_player(player_tag)
        return player.model_dump()


async def get_player_battle_log(player_tag: str = "#90UUQRQC", limit: int = 3) -> dict:
    """
    Get Clash Royale player battle log showing recent battles.

    Args:
        player_tag: The player tag (with or without #). Defaults to #90UUQRQC
        limit: Maximum number of battles to return. Defaults to 3 most recent battles.

    Returns:
        Dictionary containing recent battle information including battle type, time, opponents, decks used, and trophy changes.
    """
    logger.info(f"Tool: get_player_battle_log | player_tag={player_tag}, limit={limit}")
    async with ClashRoyaleService() as service:
        battle_log = await service.get_player_battle_log(player_tag, limit=limit)
        return battle_log.model_dump()


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
    """
    logger.info(f"Tool: get_top_players | location_id={location_id}, limit={limit}")
    async with ClashRoyaleService() as service:
        leaderboard = await service.get_player_rankings(location_id, limit=limit)
        return leaderboard.model_dump()
