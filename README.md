# ClashGPT

An AI-powered Clash Royale assistant that helps players analyze cards, decks, matchups, and strategies using Google's Gemini AI and the official Clash Royale API.

## 🎮 What is ClashGPT?

ClashGPT is a comprehensive Clash Royale companion that combines:

- **🤖 AI-Powered Chat**: Ask questions in natural language about cards, decks, and strategies
- **📊 Real-Time Data**: Live stats from the official Clash Royale API and RoyaleAPI
- **🎴 Card Analysis**: Detailed statistics, usage rates, and evolution information
- **🏆 Deck Builder**: Search meta decks, analyze matchups, and build winning strategies
- **👤 Player Profiles**: Track player stats, battle logs, and progression
- **🏰 Clan Search**: Find and analyze clans worldwide
- **⚔️ Matchup Calculator**: Understand deck counters and win conditions

Built with Google's Agent Development Kit (ADK), Gemini AI, Next.js, and deployed on Google Cloud Platform.

## 📁 Project Structure

This is a monorepo containing both frontend and backend:

```
clashgpt/
├── clashgpt/              # Backend (Python/FastAPI/Google ADK)
├── frontend/              # Frontend (Next.js/React/TypeScript)
├── Makefile               # Root-level commands
└── README.md              # This file
```

## 🚀 Getting Started

The root-level `Makefile` provides convenient commands to manage both frontend and backend development globally.

### Run Locally

Start both the Next.js frontend server and the FastAPI backend concurrently:
```bash
make start
```

### Formatting & Building

Run code formatting and linting (ruff for backend, eslint for frontend):
```bash
make format
```

Build the Next.js frontend:
```bash
make build
```

Run pre-deployment checks:
```bash
make pre-deploy
```

## 🎯 Features

### 🤖 AI Chat Assistant
Ask questions in natural language and get intelligent responses:
- "What are the best counters to Mega Knight?"
- "Show me popular Hog Rider decks"
- "Analyze my deck: Hog, Fireball, Log..."
- "How do I beat Graveyard decks?"

### 🎴 Deck Tools
- **Deck Browser**: Browse meta decks with advanced filters
- **Deck Builder**: Build and save custom decks
- **Matchup Analysis**: See win rates against popular decks and specific win conditions
- **Card Synergies**: Understand card combinations

### 👤 Player & Tracking Features
- **Profile Search**: Look up any player by tag
- **Battle Log**: View recent battles and outcomes
- **Progress Tracking**: Track trophy and card progression
- **Dashboard Tracker**: A bento-box UI mapping worst matchups, top decks, and loss rates
- **Leaderboards**: See top players globally

### 🏰 Clan Features
- **Clan Search**: Find clans by name, location, or requirements
- **Member Roster**: View all clan members and roles
- **Clan Wars**: Track clan war performance

### ⚔️ Strategy Tools
- **Card Counters**: Find effective counters for any card
- **Win Conditions**: Compare win condition effectiveness
- **Meta Analysis**: Understand current meta trends
- **Head-to-Head**: Compare two decks directly