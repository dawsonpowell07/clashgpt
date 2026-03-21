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
│   ├── app/
│   │   ├── agent.py       # AI agent with ADK
│   │   ├── fast_api_app.py # REST API server
│   │   ├── tools/         # Agent tools (card, deck, player, clan)
│   │   ├── services/      # External API clients
│   │   └── models/        # Data models
│   ├── tests/             # Backend tests
│   ├── Makefile           # Backend commands
│   ├── pyproject.toml     # Python dependencies
│   └── README.md          # Backend documentation
│
├── frontend/              # Frontend (Next.js/React/TypeScript)
│   ├── app/               # Next.js app directory
│   │   ├── (app)/         # Main app routes
│   │   │   ├── chat/      # AI chat interface
│   │   │   ├── decks/     # Deck browser
│   │   │   ├── profiles/  # Player profiles
│   │   │   ├── matchups/  # Matchup analyzer
│   │   │   └── tracker/   # Battle tracker
│   │   └── api/           # API routes
│   ├── components/        # React components
│   ├── lib/               # Utilities
│   ├── types/             # TypeScript types
│   ├── package.json       # Node dependencies
│   └── README.md          # Frontend documentation
│
├── Makefile               # Root-level commands
└── README.md              # This file
```

## 🎯 Features

### 🤖 AI Chat Assistant

Ask questions in natural language and get intelligent responses:

- "What are the best counters to Mega Knight?"
- "Show me popular Hog Rider decks"
- "Analyze my deck: Hog, Fireball, Log..."
- "How do I beat Graveyard decks?"

### 🎴 Deck Tools

- **Deck Browser**: Browse meta decks with filters
- **Deck Builder**: Build and save custom decks
- **Matchup Analysis**: See win rates against popular decks
- **Card Synergies**: Understand card combinations

### 👤 Player Features

- **Profile Search**: Look up any player by tag
- **Battle Log**: View recent battles and outcomes
- **Progress Tracking**: Track trophy and card progression
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
