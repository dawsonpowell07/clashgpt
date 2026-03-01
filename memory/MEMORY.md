# ClashGPT Project Memory

## Shared Card/Deck UI Components (standardized Feb 2026)

Two shared primitives control all card/deck rendering across the app:

- `frontend/components/card-icon.tsx` — `CardIcon` component
  - Props: `cardName: string`, `variant?: "normal" | "evolution" | "heroic"`, `className?: string`
  - Always renders `aspect-[3/4]`, `border-2`, with hover scale+rotate animation and card name on hover
  - Also exports `cardFileName(name)` helper for building `/cards/...` image paths
  - Style matches `/decks` page (deck-grid-card style)

- `frontend/components/deck-grid.tsx` — `DeckGrid` component
  - Props: `cards: Array<{ cardName: string; variant?: "normal" | "evolution" | "heroic" }>`, `className?: string`
  - Renders 2×4 `grid-cols-4` grid with internal sort (evo → hero → normal)
  - Uses `CardIcon` internally

### Files using these shared components
- `deck-search-results.tsx` — chat tool renderer for deck search
- `deck-grid-card.tsx` — full deck card on /decks page
- `deck-matchup-results.tsx` — chat matchup tool renderer
- `win-condition-matchup.tsx` — chat win-condition tool renderer
- `battle-log.tsx` — chat battle log renderer (converts `evolution_level: 0/1/2` → variant string)
- `profiles/DeckAccordion.tsx` — player profile page deck accordion
- `tracker/TrackerDashboard.tsx` — tracker page deck rows

### Mini strip pattern (collapsed preview)
For collapsed deck previews (8-card row), wrap `CardIcon` in a `w-7` div:
```tsx
<div className="w-7"><CardIcon cardName={...} variant={...} /></div>
```

## Architecture Overview
- Backend: Python ADK agent + FastAPI at clashgpt/
- Frontend: Next.js 16 + React 19 + Tailwind CSS 4 + CopilotKit
- DB: PostgreSQL (decks/cards) + MongoDB Atlas (RAG)
- Dev commands: `make local-backend` (port 8000), `npm run dev` (port 3000)
