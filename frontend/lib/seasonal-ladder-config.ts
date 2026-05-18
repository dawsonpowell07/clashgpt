/**
 * CURRENT SEASONAL LADDER CONFIG
 *
 * Update each season with the new mode:
 *   - name / subtitle: display name split across two lines in the header
 *   - description: short blurb shown under the header
 *
 * The backend game_mode is set separately in:
 *   clashgpt/app/routers/seasonal_ladder.py → CURRENT_SEASONAL_LADDER
 */

export const SEASONAL_LADDER_CONFIG = {
  /**
   * Set to false between seasons — the decks page will show an inactive
   * screen instead of results.
   */
  enabled: true,
  /** First line of the large heading (white/foreground) */
  name: "Sudden",
  /** Second line of the large heading (blue gradient) */
  subtitle: "Death",
  /** Short description shown in the deck-browser header */
  description:
    "Browse decks from this season's Sudden Death league. Stats are from ranked Sudden Death battles only.",
} as const;
