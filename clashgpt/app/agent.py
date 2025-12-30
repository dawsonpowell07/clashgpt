# ruff: noqa
# Copyright 2025 Google LLC
#
# Licensed under the Apache License, Version 2.0 (the "License");
# you may not use this file except in compliance with the License.
# You may obtain a copy of the License at
#
#     http://www.apache.org/licenses/LICENSE-2.0
#
# Unless required by applicable law or agreed to in writing, software
# distributed under the License is distributed on an "AS IS" BASIS,
# WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
# See the License for the specific language governing permissions and
# limitations under the License.

import datetime
from zoneinfo import ZoneInfo

from google.adk.agents import Agent
from google.adk.apps.app import App
from google.adk.models import Gemini
from google.genai import types

import os
import google.auth

from app.services.clash_royale import ClashRoyaleService

_, project_id = google.auth.default()
os.environ["GOOGLE_CLOUD_PROJECT"] = project_id
os.environ["GOOGLE_CLOUD_LOCATION"] = "global"
os.environ["GOOGLE_GENAI_USE_VERTEXAI"] = "True"


async def get_player_info(player_tag: str = "#90UUQRQC") -> dict:
    """
    Get Clash Royale player information.

    Args:
        player_tag: The player tag (with or without #). Defaults to #90UUQRQC

    Returns:
        Dictionary containing player information including name, trophies, wins, losses, clan info, etc.
    """
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
    async with ClashRoyaleService() as service:
        leaderboard = await service.get_player_rankings(location_id, limit=limit)
        return leaderboard.model_dump()


root_agent = Agent(
    name="root_agent",
    model=Gemini(
        model="gemini-2.5-flash",
        retry_options=types.HttpRetryOptions(attempts=3),
    ),
    instruction="You are a helpful AI assistant designed to provide accurate and useful information about Clash Royale players. ONLY CALL ANY TOOL ONCE. A SINGLE TIME",
    tools=[get_player_info, get_player_battle_log, get_top_players],
)

app = App(root_agent=root_agent, name="app")
