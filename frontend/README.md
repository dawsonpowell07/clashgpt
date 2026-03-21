# ClashGPT Frontend

A modern, responsive web application for ClashGPT built with Next.js 16, React 19, and CopilotKit. Provides an intuitive interface for interacting with the AI agent and exploring Clash Royale data.

## 🎯 Overview

The ClashGPT frontend is a feature-rich Next.js application that provides:

- **🤖 AI Chat Interface**: Conversational AI powered by CopilotKit and Google Gemini
- **🎴 Deck Browser**: Explore and filter meta decks with advanced search
- **👤 Player Profiles**: Search and view detailed player statistics
- **⚔️ Matchup Analyzer**: Compare decks and analyze win rates
- **📊 Battle Tracker**: Track and analyze battle history
- **🏰 Clan Search**: Find and explore clans worldwide
- **🎨 Modern UI**: Beautiful, responsive design with dark mode support
- **🔐 Authentication**: Secure user management with Clerk

## 🤖 AI Integration

### CopilotKit

The chat interface uses CopilotKit for AI interactions:

**Configuration** (`app/api/copilotkit/route.ts`):
```typescript
const runtime = new CopilotRuntime({
  agents: {
    clash_gpt: new HttpAgent({
      url: `${BACKEND_URL}/agent`,
      headers: {
        'x-api-key': BACKEND_API_KEY,
      },
    }),
  },
});
```
