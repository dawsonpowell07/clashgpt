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
import json
import logging
from zoneinfo import ZoneInfo

from google.adk.agents import Agent
from google.adk.apps.app import App
from google.adk.models import Gemini
from google.adk.models.llm_response import LlmResponse
from google.adk.models.llm_request import LlmRequest
from google.genai import types
from app.prompt import PROMPT
import os
import google.auth

from app.tools import (
    get_clan_info,
    get_player_battle_log,
    get_player_info,
    get_top_players,
    search_clans,
    search_decks,
    search_knowledge_base,
)
from dataclasses import dataclass
from google.adk.agents.callback_context import CallbackContext
from app.models.models import Player
logger = logging.getLogger(__name__)

_, project_id = google.auth.default()
os.environ["GOOGLE_CLOUD_PROJECT"] = project_id
os.environ["GOOGLE_CLOUD_LOCATION"] = "global"
os.environ["GOOGLE_GENAI_USE_VERTEXAI"] = "True"


@dataclass
class AgentState:
    """State for the agent."""
    player_tag: str | None
    clan_tag: str | None
    current_player_info: Player | None


def on_before_agent(callback_context: CallbackContext):
    """
    Initialize recipe state if it doesn't exist.
    """

    if "player_tag" not in callback_context.state:
        # Initialize with default recipe
        player_tag = "unknown"
        callback_context.state["player_tag"] = player_tag

    if "clan_tag" not in callback_context.state:
        # Initialize with default recipe
        clan_tag = "unknown"
        callback_context.state["clan_tag"] = clan_tag

    if "current_player_info" not in callback_context.state:
        # Initialize with default recipe
        current_player_info = {}
        callback_context.state["current_player_info"] = current_player_info

    return None


root_agent = Agent(
    name="root_agent",
    model=Gemini(
        model="gemini-2.5-flash",
        retry_options=types.HttpRetryOptions(attempts=3),
    ),
    before_agent_callback=on_before_agent,
    instruction=PROMPT,
    tools=[
        get_clan_info,
        get_player_info,
        get_player_battle_log,
        get_top_players,
        search_clans,
        search_decks,
        search_knowledge_base,
    ],
)

app = App(root_agent=root_agent, name="app")
