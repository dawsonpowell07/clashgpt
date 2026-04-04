/**
 * CURRENT GLOBAL TOURNAMENT CONFIG
 *
 * Update these values each month for the new tournament:
 *   - name / subtitle: display name split across two lines in the header
 *   - description: short blurb shown under the header
 *   - cardPool: Set of card names allowed in this tournament (base variants only)
 *
 * The backend game_mode and tournament_id are set separately in:
 *   clashgpt/app/routers/api.py → CURRENT_GLOBAL_TOURNAMENT
 */

export const TOURNAMENT_CONFIG = {
  /**
   * Set to false between tournaments — the decks page will show an inactive
   * screen instead of results. The leaderboard is unaffected (always live).
   */
  enabled: false,
  /** First line of the large heading (white/foreground) */
  name: "Retro",
  /** Second line of the large heading (amber gradient) */
  subtitle: "Royale",
  /** Short description shown in the deck-browser header */
  description:
    "Browse decks from this month's Retro Royale global tournament. Card pool is restricted to base variants only.",
  /** Cards available in this tournament (base variants only — no evos or heroes) */
  cardPool: new Set([
    "Skeletons",
    "Ice Spirit",
    "The Log",
    "Knight",
    "Ice Wizard",
    "Goblin Hut",
    "Poison",
    "Graveyard",
    "Mirror",
    "Fire Spirit",
    "Goblins",
    "Spear Goblins",
    "Bomber",
    "Bats",
    "Zap",
    "Ice Golem",
    "Rage",
    "Archers",
    "Minions",
    "Arrows",
    "Tombstone",
    "Cannon",
    "Mega Minion",
    "Skeleton Army",
    "Guards",
    "Goblin Barrel",
    "Goblin Gang",
    "Skeleton Barrel",
    "Dart Goblin",
    "Princess",
    "Miner",
    "Royal Ghost",
    "Bandit",
    "Tornado",
    "Clone",
    "Musketeer",
    "Mini P.E.K.K.A",
    "Fireball",
    "Valkyrie",
    "Battle Ram",
    "Bomb Tower",
    "Mortar",
    "Hog Rider",
    "Flying Machine",
    "Baby Dragon",
    "Dark Prince",
    "Freeze",
    "Tesla",
    "Zappies",
    "Hunter",
    "Inferno Dragon",
    "Electro Wizard",
    "Lumberjack",
    "Night Witch",
    "Giant",
    "Barbarians",
    "Wizard",
    "Witch",
    "Balloon",
    "Prince",
    "Minion Horde",
    "Bowler",
    "Executioner",
    "Cannon Cart",
    "Rocket",
    "Elite Barbarians",
    "X-Bow",
    "Sparky",
    "Elixir Collector",
    "P.E.K.K.A",
    "Mega Knight",
    "Lava Hound",
    "Golem",
  ]),
} as const;
