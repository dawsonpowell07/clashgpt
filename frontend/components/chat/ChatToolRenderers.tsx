"use client";

import { useRenderToolCall, useHumanInTheLoop } from "@copilotkit/react-core";
import { PlayerProfile } from "@/components/player-profile";
import { BattleLog } from "@/components/battle-log";
import { DeckSearchResults } from "@/components/deck-search-results";
import { ClanInfo } from "@/components/clan-info";
import { ClanSearchResults } from "@/components/clan-search-results";
import { Leaderboard } from "@/components/leaderboard";
import { CardStats } from "@/components/card-stats";
import { DeckMatchupResults } from "@/components/deck-matchup-results";
import { WinConditionMatchup } from "@/components/win-condition-matchup";
import { DeckBuilderHITL } from "@/components/deck-builder-hitl";

const LOCATION_MAP: Record<string, string> = {
  "57000249": "US",
  "57000007": "BR",
  "57000038": "CN",
  "57000070": "FR",
  "57000074": "DE",
  "57000094": "IN",
  "57000095": "ID",
  "57000097": "IR",
  "57000151": "RU",
  "57000088": "HK",
  "57000227": "UK",
  global: "Global",
};

const HANDLED_TOOLS = [
  "get_player_info",
  "get_player_battle_log",
  "get_clan_info",
  "search_clans",
  "search_decks",
  "get_top_players",
  "get_card_stats",
  "get_deck_matchups",
  "get_win_condition_matchup",
  "request_deck_from_user",
];

function ToolLoading({ label }: { label: string }) {
  return (
    <div className="bg-primary/20 border border-primary/40 text-white p-4 rounded-xl max-w-2xl my-4">
      <div className="flex items-center gap-3">
        <div className="w-4 h-4 rounded-full border-2 border-primary/40 border-t-primary animate-spin shrink-0" />
        <span className="text-sm font-medium">{label}</span>
      </div>
    </div>
  );
}

function ToolError({ label }: { label: string }) {
  return (
    <div className="bg-destructive/20 border border-destructive/40 text-white p-6 rounded-xl max-w-2xl my-4">
      <div className="flex items-center gap-3">
        <span className="text-2xl">❌</span>
        <span className="text-lg font-medium">{label}</span>
      </div>
    </div>
  );
}

function hasToolError(result: unknown): boolean {
  return Boolean(result && typeof result === "object" && "error" in result);
}

/**
 * Registers all useRenderToolCall hooks for the chat page.
 * Must be rendered inside a CopilotKit provider.
 */
export function ChatToolRenderers() {
  useRenderToolCall({
    name: "get_player_info",
    parameters: [{ name: "player_tag", type: "string", required: true }],
    render: ({ args, result, status }) => {
      if (status !== "complete")
        return (
          <ToolLoading
            label={`Looking up player ${args.player_tag || "..."}...`}
          />
        );
      if (hasToolError(result)) return <ToolError label="Error Occurred" />;
      if (!result)
        return (
          <ToolError
            label={`Could not fetch player data for ${args.player_tag}`}
          />
        );
      return <PlayerProfile player={result} className="my-4" />;
    },
  });

  useRenderToolCall({
    name: "get_player_battle_log",
    render: ({ args, result, status }) => {
      if (status !== "complete")
        return (
          <ToolLoading
            label={`Loading battle history for ${args.player_tag || "..."}...`}
          />
        );
      if (hasToolError(result)) return <ToolError label="Error Occurred" />;
      if (!result || !result.battles)
        return (
          <ToolError
            label={`Could not fetch battle log for ${args.player_tag}`}
          />
        );
      return <BattleLog battleLog={result} className="my-4" />;
    },
  });

  useRenderToolCall({
    name: "get_clan_info",
    render: ({ args, result, status }) => {
      if (status !== "complete")
        return (
          <ToolLoading
            label={`Fetching clan info for ${args.clan_tag || "..."}...`}
          />
        );
      if (hasToolError(result)) return <ToolError label="Error Occurred" />;
      if (!result || !result.members_list)
        return (
          <ToolError label={`Could not fetch clan data for ${args.clan_tag}`} />
        );
      return <ClanInfo clan={result} className="my-4" />;
    },
  });

  useRenderToolCall({
    name: "search_clans",
    render: ({ args: _args, result, status }) => {
      if (status !== "complete")
        return <ToolLoading label="Searching for matching clans..." />;
      if (hasToolError(result)) return <ToolError label="Error Occurred" />;
      if (!result || !result.items)
        return (
          <ToolError label="Could not find any clans matching your criteria" />
        );
      return <ClanSearchResults results={result} className="my-4" />;
    },
  });

  useRenderToolCall({
    name: "search_decks",
    render: ({ args, result, status }) => {
      if (status !== "complete") {
        let loadingMessage = "Finding decks for you";
        if (args.sort_by === "WIN_RATE")
          loadingMessage = "Finding highest win rate decks";
        else if (args.sort_by === "GAMES_PLAYED")
          loadingMessage = "Finding most popular decks";
        else if (args.sort_by === "WINS")
          loadingMessage = "Finding decks with most wins";
        return <ToolLoading label={`${loadingMessage}...`} />;
      }
      if (hasToolError(result)) return <ToolError label="Error Occurred" />;
      if (!result || !result.decks)
        return (
          <ToolError label="Could not find any decks matching your criteria" />
        );
      return <DeckSearchResults results={result} className="my-4" />;
    },
  });

  useRenderToolCall({
    name: "get_top_players",
    render: ({ args, result, status }) => {
      if (status !== "complete")
        return <ToolLoading label="Loading top players leaderboard..." />;
      if (hasToolError(result)) return <ToolError label="Error Occurred" />;
      if (!result || !result.entries || result.entries.length === 0)
        return <ToolError label="Could not fetch leaderboard data" />;
      const locationId = args.location_id?.toString() || "57000249";
      const locationName =
        LOCATION_MAP[locationId] ||
        (locationId === "global" ? "Global" : locationId);
      return (
        <Leaderboard
          leaderboard={result}
          location={locationName}
          className="my-4"
        />
      );
    },
  });

  useRenderToolCall({
    name: "get_card_stats",
    render: ({ args: _args, result, status }) => {
      if (status !== "complete")
        return <ToolLoading label="Crunching card statistics..." />;
      if (hasToolError(result)) return <ToolError label="Error Occurred" />;
      if (!result || !result.card_name)
        return <ToolError label="Could not fetch card statistics" />;
      return <CardStats stats={result} className="my-4" />;
    },
  });

  useRenderToolCall({
    name: "get_deck_matchups",
    render: ({ args, result, status }) => {
      if (status !== "complete")
        return <ToolLoading label="Analysing deck matchups..." />;
      if (hasToolError(result))
        return <ToolError label="Error loading matchup data" />;
      if (!result) return <ToolError label="Could not load matchup data" />;
      return <DeckMatchupResults results={result} className="my-4" />;
    },
  });

  useRenderToolCall({
    name: "get_win_condition_matchup",
    render: ({ args, result, status }) => {
      if (status !== "complete") {
        return <ToolLoading label="Comparing win conditions..." />;
      }
      if (hasToolError(result))
        return <ToolError label="Error loading matchup data" />;
      if (!result || !result.card_a)
        return <ToolError label="Could not load win condition matchup data" />;
      return <WinConditionMatchup data={result} className="my-4" />;
    },
  });

  // Human-in-the-loop: agent asks user to build a deck
  useHumanInTheLoop({
    name: "request_deck_from_user",
    description:
      "Ask the user to select exactly 8 cards (with variants) to build their deck. " +
      "Returns a comma-separated string of card_id:variant pairs suitable for get_deck_matchups.",
    parameters: [
      {
        name: "prompt",
        type: "string",
        description:
          "Short context explaining why the deck is needed (shown to user)",
        required: false,
      },
    ],
    render: ({ args, respond, status }) => (
      <DeckBuilderHITL
        prompt={args?.prompt as string | undefined}
        respond={(value) => respond?.(value)}
        status={status}
      />
    ),
  });

  // Catch-all: show unknown tools in debug view
  useRenderToolCall({
    name: "*",
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    render: ({ name, result, status }: any) => {
      if (HANDLED_TOOLS.includes(name)) return <></>;
      return (
        <div className="bg-muted border border-border p-4 rounded-xl my-4">
          <p className="font-bold text-sm text-muted-foreground mb-2">
            Tool: {name}
          </p>
          {status !== "complete" && <p className="text-sm">Processing...</p>}
          {status === "complete" && hasToolError(result) && (
            <ToolError label="Error Occurred" />
          )}
          {status === "complete" && result && (
            <pre className="bg-background p-2 rounded text-xs overflow-auto max-h-96">
              {JSON.stringify(result, null, 2)}
            </pre>
          )}
        </div>
      );
    },
  });

  return null;
}
