# ClashGPT Backend Documentation

## Overview
This directory contains the backend services for ClashGPT, an AI agent designed to assist Clash Royale players. It is built using the **Google Agent Development Kit (ADK)** and **FastAPI**, serving as the intelligence layer that interacts with the Clash Royale API, manages user state, and powers the frontend chat experience.

## Technology Stack
-   **Language**: Python 3.12+
-   **Frameworks**:
    -   `google-adk`: Agent orchestration and tool management.
    -   `fastapi`: Web server for the agent API.
-   **Database**:
    -   **PostgreSQL**: Relational data (users, decks, card stats) via SQLAlchemy.
    -   **MongoDB**: Flexible data storage (battle logs, analytics) via Motor.
-   **AI Model**: Google Gemini 2.5 Flash (via ADK).
-   **Infrastructure**: Google Cloud Run, Cloud SQL.

## Project Structure (`clashgpt/clashgpt`)

```text
clashgpt/
├── app/                    # Main application logic
│   ├── agent.py            # Agent definition and configuration
│   ├── fast_api_app.py     # FastAPI entry point & lifecycle
│   ├── prompt.py           # System instructions (PROMPT)
│   ├── tools/              # Agent tools implementation
│   ├── services/           # External service integrations
│   ├── routers/            # API route definitions
│   └── models/             # Data models (Pydantic/SQLAlchemy)
├── tests/                  # Unit and integration tests
├── Dockerfile              # Container definition
├── Makefile                # Build and run commands
└── pyproject.toml          # Dependencies (uv/pip)
```

## Core Components

### 1. The Agent (`app/agent.py`)
The heart of the backend is the `root_agent`, an instance of `LlmAgent`.
-   **Model**: `gemini-2.5-flash`
-   **Instruction**: Defined in `app/prompt.py`.
-   **State**: Uses `AgentState` dataclass to track `player_tag`, `clan_tag`, and `current_player_info` across turns.
-   **Callbacks**: `on_before_agent` initializes the state recipe (defaults to "unknown" tags).

### 2. The Application (`app/fast_api_app.py`)
This file initializes the FastAPI application and ties it to the ADK.
-   **Lifecycle**: Manages connections for PostgreSQL and MongoDB on startup/shutdown.
-   **Middleware**: Handles CORS and logging.
-   **ADK Integration**: Uses `ADKAgent` and `add_adk_fastapi_endpoint` to expose the agent at `/agent`.
-   **Config**: Adapts to Dev (local DB) vs Prod (Cloud SQL) environments based on `settings.py`.

### 3. Tools (`app/tools/`)
The agent is equipped with specific tools to fetch data and perform actions:
-   **`card_tools.py`**: `get_card_stats` - Retrieve stats and info for cards.
-   **`clan_tools.py`**: `get_clan_info`, `search_clans` - Find and analyze clans.
-   **`player_tools.py`**: `get_player_info`, `get_player_battle_log` - distinct player stats and history.
-   **`deck_tools.py`**: `search_decks`, `get_top_players` - Find meta decks and top ladder players.
-   **`rag_tool.py`**: `search_knowledge_base` - RAG system for retrieving game knowledge/guides.

### 4. Services (`app/services/`)
Helper modules that handle lower-level logic and external APIs:
-   **`clash_royale.py`**: Client for the official Clash Royale API.
-   **`database.py`**: PostgreSQL database session management (SQLAlchemy).
-   **`mongo_db.py`**: MongoDB client setup (Motor).
-   **`database_decks.py`**: Specialized logic for querying deck statistics from the DB.

## Development Workflow
-   **Local Run**: `make local-backend` (starts the FastAPI server with hot reload).
-   **Dependencies**: Managed via `uv` in `pyproject.toml`.
-   **Environment**: Configured via `.env` file (API keys, DB credentials).
