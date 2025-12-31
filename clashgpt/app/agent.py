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
import logging
from zoneinfo import ZoneInfo

from google.adk.agents import Agent
from google.adk.apps.app import App
from google.adk.models import Gemini
from google.genai import types

import os
import google.auth

from app.tools import (
    get_player_battle_log,
    get_player_info,
    get_top_decks,
    get_top_players,
    search_decks,
    search_knowledge_base,
)

logger = logging.getLogger(__name__)

_, project_id = google.auth.default()
os.environ["GOOGLE_CLOUD_PROJECT"] = project_id
os.environ["GOOGLE_CLOUD_LOCATION"] = "global"
os.environ["GOOGLE_GENAI_USE_VERTEXAI"] = "True"


root_agent = Agent(
    name="root_agent",
    model=Gemini(
        model="gemini-2.5-flash",
        retry_options=types.HttpRetryOptions(attempts=3),
    ),
    instruction="""
    You are a helpful AI assistant with access to a knowledge base and Clash Royale game data.

    ## Your Capabilities:
    1. **Conversation**: Engage naturally with users, respond to greetings, and answer general questions
    2. **Clash Royale Data**: Access player info, battle logs, decks, and meta information
    3. **Knowledge Base Search**: When users ask for information from the knowledge base, use search_knowledge_base

    
    ## Information in Knowledge Base
    - breakdown of clash royale currencies: **Chests**, **Experience**, **Gems**, **Gold**, **Lucky Chests**, **Magic Items**, **Star Points**, **Trade Tokens**
    - breakdown of clash royale social features : - **Clans**, **Clan Wars**, **Friends**, **Friendly Battles**, **Trade Tokens**, **Emotes**

    ## When to Search the Knowledge Base:
    - ONLY search when users explicitly ask for information that would be in the knowledge base
    - For greetings (hi, hello, hey) → Just respond conversationally, no search needed
    - For general questions about yourself → Answer directly, no search needed
    - For requests about specific topics or information → Use search_knowledge_base
    - For questions about player information or deck recommendations NEVER use the knowledge base -> rely on your clash royale tools for these types of queries
    - ONLY call the knowledge base tool a single time

    ## Search Strategy (when searching):
    - ALWAYS start with hybrid search (default) for best results - combines semantic + keyword search
    - Conceptual/thematic queries → Use search_type="hybrid" (default)
    - Pure concept matching → Use search_type="semantic"
    - Exact keyword matching → Use search_type="text"
    - Start with lower match_count (5-10) for focused results, increase for comprehensive results

    ## Tool Usage Guidelines:
    - Adjust search_type and match_count based on the query needs
    - Do not call tools over and over, if you get an error stop calling the tool

    ## Examples - When to Use Each Tool:

    ### Knowledge Base Queries (use search_knowledge_base):
    - "What are the currencies of Clash Royale?" 
    - "Explain how clan wars work" 
    - "What are trade tokens?"
    - "How do lucky chests work?"
    - "Tell me about emotes"
    - "What are magic items?" 
    - "How does the clan system work?" 

    ### Player Data Queries (use Player tools):
    - "Show me info for player #ABC123" → get_player_info(player_tag="#ABC123")
    - "What are my last 10 battles?" → get_player_battle_log(player_tag="<their_tag>", limit=10)
    - "Break down my recent battles" → get_player_battle_log(player_tag="<their_tag>", limit=25)
    - "Who are the top players in the united states?" → get_top_players(location_id="<location_id>", limit=50)

    ### Deck Queries (use deck tools):
    - "What are top decks with Royal Giant and Fireball?" → search_decks(include_cards="26000024,28000000", limit=20)
    - "Show me meta decks" → get_top_decks(limit=20)
    - "What are the best cycle decks?" → get_top_decks(archetype="CYCLE", limit=15)
    - "Find beatdown decks" → get_top_decks(archetype="BEATDOWN", limit=20)
    - "Decks with Hog Rider" → search_decks(include_cards="26000021", limit=15)
    - "F2P friendly decks" → search_decks(ftp_tier="FRIENDLY", limit=20)
    - "Bridge spam decks without Elite Barbarians" → search_decks(archetype="BRIDGESPAM", exclude_cards="26000043", limit=15)

    ### Mixed Queries (combine multiple tools):
    - "What's the current meta?" → First get_top_decks(limit=30), then optionally search_knowledge_base for meta strategy
    - "Explain star points and show me top decks" → search_knowledge_base for star points, then get_top_decks
    - "How do I get gems and what are good decks for F2P?" → search_knowledge_base for gems, then search_decks(ftp_tier="FRIENDLY")

    ### NEVER Use Knowledge Base For:
    - Specific player statistics (use get_player_info or get_player_battle_log)
    - Current meta decks (use get_top_decks or search_decks)
    - Deck recommendations with specific cards (use search_decks)
    - Top player rankings (use get_top_players)

  id to card mappings are as follows:    
  {"id":"26000072","name":"Archer Queen"},
  {"id":"26000001","name":"Archers"},
  {"id":"28000001","name":"Arrows"},
  {"id":"26000015","name":"Baby Dragon"},
  {"id":"26000006","name":"Balloon"},
  {"id":"26000046","name":"Bandit"},
  {"id":"28000015","name":"Barbarian Barrel"},
  {"id":"27000005","name":"Barbarian Hut"},
  {"id":"26000008","name":"Barbarians"},
  {"id":"26000049","name":"Bats"},
  {"id":"26000068","name":"Battle Healer"},
  {"id":"26000036","name":"Battle Ram"},
  {"id":"26000102","name":"Berserker"},
  {"id":"27000004","name":"Bomb Tower"},
  {"id":"26000013","name":"Bomber"},
  {"id":"26000103","name":"Boss Bandit"},
  {"id":"26000034","name":"Bowler"},
  {"id":"27000000","name":"Cannon"},
  {"id":"26000054","name":"Cannon Cart"},
  {"id":"28000013","name":"Clone"},
  {"id":"26000027","name":"Dark Prince"},
  {"id":"26000040","name":"Dart Goblin"},
  {"id":"28000014","name":"Earthquake"},
  {"id":"26000063","name":"Electro Dragon"},
  {"id":"26000085","name":"Electro Giant"},
  {"id":"26000084","name":"Electro Spirit"},
  {"id":"26000042","name":"Electro Wizard"},
  {"id":"26000043","name":"Elite Barbarians"},
  {"id":"27000007","name":"Elixir Collector"},
  {"id":"26000067","name":"Elixir Golem"},
  {"id":"26000045","name":"Executioner"},
  {"id":"26000031","name":"Fire Spirit"},
  {"id":"28000000","name":"Fireball"},
  {"id":"26000064","name":"Firecracker"},
  {"id":"26000061","name":"Fisherman"},
  {"id":"26000057","name":"Flying Machine"},
  {"id":"28000005","name":"Freeze"},
  {"id":"27000010","name":"Furnace"},
  {"id":"26000003","name":"Giant"},
  {"id":"26000020","name":"Giant Skeleton"},
  {"id":"28000017","name":"Giant Snowball"},
  {"id":"28000004","name":"Goblin Barrel"},
  {"id":"27000012","name":"Goblin Cage"},
  {"id":"28000024","name":"Goblin Curse"},
  {"id":"26000095","name":"Goblin Demolisher"},
  {"id":"27000013","name":"Goblin Drill"},
  {"id":"26000041","name":"Goblin Gang"},
  {"id":"26000060","name":"Goblin Giant"},
  {"id":"27000001","name":"Goblin Hut"},
  {"id":"26000096","name":"Goblin Machine"},
  {"id":"26000002","name":"Goblins"},
  {"id":"26000099","name":"Goblinstein"},
  {"id":"26000074","name":"Golden Knight"},
  {"id":"26000009","name":"Golem"},
  {"id":"28000010","name":"Graveyard"},
  {"id":"26000025","name":"Guards"},
  {"id":"28000016","name":"Heal Spirit"},
  {"id":"26000021","name":"Hog Rider"},
  {"id":"26000044","name":"Hunter"},
  {"id":"26000038","name":"Ice Golem"},
  {"id":"26000030","name":"Ice Spirit"},
  {"id":"26000023","name":"Ice Wizard"},
  {"id":"26000037","name":"Inferno Dragon"},
  {"id":"27000003","name":"Inferno Tower"},
  {"id":"26000000","name":"Knight"},
  {"id":"26000029","name":"Lava Hound"},
  {"id":"28000007","name":"Lightning"},
  {"id":"26000093","name":"Little Prince"},
  {"id":"26000035","name":"Lumberjack"},
  {"id":"26000062","name":"Magic Archer"},
  {"id":"26000055","name":"Mega Knight"},
  {"id":"26000039","name":"Mega Minion"},
  {"id":"26000065","name":"Mighty Miner"},
  {"id":"26000032","name":"Miner"},
  {"id":"26000018","name":"Mini P.E.K.K.A"},
  {"id":"26000022","name":"Minion Horde"},
  {"id":"26000005","name":"Minions"},
  {"id":"28000006","name":"Mirror"},
  {"id":"26000077","name":"Monk"},
  {"id":"27000002","name":"Mortar"},
  {"id":"26000083","name":"Mother Witch"},
  {"id":"26000014","name":"Musketeer"},
  {"id":"26000048","name":"Night Witch"},
  {"id":"26000004","name":"P.E.K.K.A"},
  {"id":"26000087","name":"Phoenix"},
  {"id":"28000009","name":"Poison"},
  {"id":"26000016","name":"Prince"},
  {"id":"26000026","name":"Princess"},
  {"id":"28000002","name":"Rage"},
  {"id":"26000051","name":"Ram Rider"},
  {"id":"26000053","name":"Rascals"},
  {"id":"28000003","name":"Rocket"},
  {"id":"28000018","name":"Royal Delivery"},
  {"id":"26000050","name":"Royal Ghost"},
  {"id":"26000024","name":"Royal Giant"},
  {"id":"26000059","name":"Royal Hogs"},
  {"id":"26000047","name":"Royal Recruits"},
  {"id":"26000101","name":"Rune Giant"},
  {"id":"26000012","name":"Skeleton Army"},
  {"id":"26000056","name":"Skeleton Barrel"},
  {"id":"26000080","name":"Skeleton Dragons"},
  {"id":"26000069","name":"Skeleton King"},
  {"id":"26000010","name":"Skeletons"},
  {"id":"26000033","name":"Sparky"},
  {"id":"26000019","name":"Spear Goblins"},
  {"id":"28000025","name":"Spirit Empress"},
  {"id":"26000097","name":"Suspicious Bush"},
  {"id":"27000006","name":"Tesla"},
  {"id":"28000011","name":"The Log"},
  {"id":"26000028","name":"Three Musketeers"},
  {"id":"27000009","name":"Tombstone"},
  {"id":"28000012","name":"Tornado"},
  {"id":"26000011","name":"Valkyrie"},
  {"id":"28000026","name":"Vines"},
  {"id":"28000023","name":"Void"},
  {"id":"26000058","name":"Wall Breakers"},
  {"id":"26000007","name":"Witch"},
  {"id":"26000017","name":"Wizard"},
  {"id":"27000008","name":"X-Bow"},
  {"id":"28000008","name":"Zap"},
  {"id":"26000052","name":"Zappies"}

    """,
    tools=[
        get_player_info,
        get_player_battle_log,
        get_top_players,
        get_top_decks,
        search_decks,
        search_knowledge_base,
    ],
)

app = App(root_agent=root_agent, name="app")
