"use client";

import { useState } from "react";
import { CopilotChat, CopilotKitCSSProperties } from "@copilotkit/react-ui";
import {
  CopilotKit,
  useRenderToolCall,
  useCoAgent,
} from "@copilotkit/react-core";
import "@copilotkit/react-ui/styles.css";
import { PlayerProfile } from "@/components/player-profile";
import { BattleLog } from "@/components/battle-log";
import { DeckSearchResults } from "@/components/deck-search-results";
import { ClanInfo } from "@/components/clan-info";
import { ClanSearchResults } from "@/components/clan-search-results";
import { KnowledgeSearch } from "@/components/knowledge-search";
import { Leaderboard } from "@/components/leaderboard";
import { cn } from "@/lib/utils";
import { CustomInput } from "@/components/chat";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";

type AgentState = {
  player_tag: string;
  clan_tag?: string;
};
export default function ChatPage() {
  // Use lazy initialization to get or create threadId from sessionStorage
  const [threadId, setThreadId] = useState<string>(() => {
    // Check if we're in the browser
    if (typeof window === "undefined") {
      return crypto.randomUUID();
    }

    // Try to get existing threadId from sessionStorage
    const existingThreadId = sessionStorage.getItem("copilotkit-thread-id");
    if (existingThreadId) {
      return existingThreadId;
    }

    // Generate new threadId and store it
    const newThreadId = crypto.randomUUID();
    sessionStorage.setItem("copilotkit-thread-id", newThreadId);
    return newThreadId;
  });

  return (
    <CopilotKit
      runtimeUrl="/api/copilotkit"
      agent="clash_gpt"
      publicApiKey="ck_pub_9265cbc1005d6ea24830000a4f8b502c"
      threadId={threadId}
      key={threadId}
    >
      <Chat setThreadId={setThreadId} />
    </CopilotKit>
  );
}

interface ChatProps {
  setThreadId: (id: string) => void;
}

function Chat({ setThreadId }: ChatProps) {
  const [showClearDialog, setShowClearDialog] = useState(false);
  const [settingsApplied, setSettingsApplied] = useState(false);

  const { state: agentState, setState: setAgentState } = useCoAgent<AgentState>(
    {
      name: "clash_gpt", // MUST match the agent name in CopilotRuntime
      initialState: {
        player_tag: "unknown",
        clan_tag: undefined,
      },
    }
  );

  // Local state for form inputs - always initialize with strings to avoid uncontrolled input warning
  const [playerTagInput, setPlayerTagInput] = useState(
    agentState?.player_tag && agentState.player_tag !== "unknown"
      ? agentState.player_tag
      : ""
  );
  const [clanTagInput, setClanTagInput] = useState(agentState?.clan_tag || "");

  // Check if settings have changed
  const hasChanges = () => {
    const currentPlayerTag =
      agentState?.player_tag !== "unknown" ? agentState.player_tag : "";
    const currentClanTag = agentState?.clan_tag || "";

    return (
      playerTagInput.trim() !== currentPlayerTag ||
      clanTagInput.trim() !== currentClanTag
    );
  };

  const handleApplySettings = () => {
    setAgentState({
      ...agentState,
      player_tag: playerTagInput.trim() || "unknown",
      clan_tag: clanTagInput.trim() || undefined,
    });

    // Show success indicator
    setSettingsApplied(true);
    setTimeout(() => setSettingsApplied(false), 2000);
  };

  const handleClearChat = () => {
    const newThreadId = crypto.randomUUID();
    sessionStorage.setItem("copilotkit-thread-id", newThreadId);
    setThreadId(newThreadId);
    setShowClearDialog(false);
  };

  // Debug: Log agent state changes
  console.log("[Chat] Agent State:", agentState);

  const renderToolError = () => (
    <div className="bg-destructive/20 border border-destructive/40 text-white p-6 rounded-xl max-w-2xl my-4">
      <div className="flex items-center gap-3">
        <span className="text-2xl">❌</span>
        <span className="text-lg font-medium">Error Occurred</span>
      </div>
    </div>
  );

  const hasToolError = (result: unknown) =>
    Boolean(result && typeof result === "object" && "error" in result);

  // Render player profile when backend calls get_player_info
  useRenderToolCall({
    name: "get_player_info",
    parameters: [{ name: "player_tag", type: "string", required: true }],
    render: ({ args, result, status }) => {
      console.log("[get_player_info render]", { status, args, result });

      // Show loading state while fetching
      if (status !== "complete") {
        return (
          <div className="bg-primary/20 border border-primary/40 text-white p-6 rounded-xl max-w-2xl my-4">
            <div className="flex items-center gap-3">
              <span className="text-2xl animate-spin">⚙️</span>
              <span className="text-lg font-medium">
                Fetching player data for {args.player_tag || "..."}
              </span>
            </div>
          </div>
        );
      }

      if (hasToolError(result)) {
        return renderToolError();
      }

      // Show error state if no result
      if (!result) {
        return (
          <div className="bg-destructive/20 border border-destructive/40 text-white p-6 rounded-xl max-w-2xl my-4">
            <div className="flex items-center gap-3">
              <span className="text-2xl">❌</span>
              <span className="text-lg font-medium">
                Could not fetch player data for {args.player_tag}
              </span>
            </div>
          </div>
        );
      }

      // Show player profile with full data
      return <PlayerProfile player={result} className="my-4" />;
    },
  });

  // Render battle log when backend calls get_player_battle_log
  useRenderToolCall({
    name: "get_player_battle_log",
    render: ({ args, result, status }) => {
      console.log("[get_player_battle_log render]", { status, args, result });

      // Show loading state while fetching
      if (status !== "complete") {
        return (
          <div className="bg-primary/20 border border-primary/40 text-white p-6 rounded-xl max-w-2xl my-4">
            <div className="flex items-center gap-3">
              <span className="text-2xl animate-spin">⚙️</span>
              <span className="text-lg font-medium">
                Fetching battle log for {args.player_tag || "..."}
              </span>
            </div>
          </div>
        );
      }

      if (hasToolError(result)) {
        return renderToolError();
      }

      // Show error state if no result
      if (!result || !result.battles) {
        return (
          <div className="bg-destructive/20 border border-destructive/40 text-white p-6 rounded-xl max-w-2xl my-4">
            <div className="flex items-center gap-3">
              <span className="text-2xl">❌</span>
              <span className="text-lg font-medium">
                Could not fetch battle log for {args.player_tag}
              </span>
            </div>
          </div>
        );
      }

      // Show battle log with full data
      return <BattleLog battleLog={result} className="my-4" />;
    },
  });

  // Render clan info when backend calls get_clan_info
  useRenderToolCall({
    name: "get_clan_info",
    render: ({ args, result, status }) => {
      console.log("[get_clan_info render]", { status, args, result });

      // Show loading state while fetching
      if (status !== "complete") {
        return (
          <div className="bg-primary/20 border border-primary/40 text-white p-6 rounded-xl max-w-2xl my-4">
            <div className="flex items-center gap-3">
              <span className="text-2xl animate-spin">⚙️</span>
              <span className="text-lg font-medium">
                Fetching clan data for {args.clan_tag || "..."}
              </span>
            </div>
          </div>
        );
      }

      if (hasToolError(result)) {
        return renderToolError();
      }

      // Show error state if no result
      if (!result || !result.members_list) {
        return (
          <div className="bg-destructive/20 border border-destructive/40 text-white p-6 rounded-xl max-w-2xl my-4">
            <div className="flex items-center gap-3">
              <span className="text-2xl">❌</span>
              <span className="text-lg font-medium">
                Could not fetch clan data for {args.clan_tag}
              </span>
            </div>
          </div>
        );
      }

      // Show clan info with full data
      return <ClanInfo clan={result} className="my-4" />;
    },
  });

  // Render clan search results when backend calls search_clans
  useRenderToolCall({
    name: "search_clans",
    render: ({ args, result, status }) => {
      console.log("[search_clans render]", { status, args, result });

      // Show loading state while fetching
      if (status !== "complete") {
        return (
          <div className="bg-primary/20 border border-primary/40 text-white p-6 rounded-xl max-w-2xl my-4">
            <div className="flex items-center gap-3">
              <span className="text-2xl animate-spin">⚙️</span>
              <span className="text-lg font-medium">
                Searching for clans...
              </span>
            </div>
          </div>
        );
      }

      if (hasToolError(result)) {
        return renderToolError();
      }

      // Show error state if no result
      if (!result || !result.items) {
        return (
          <div className="bg-destructive/20 border border-destructive/40 text-white p-6 rounded-xl max-w-2xl my-4">
            <div className="flex items-center gap-3">
              <span className="text-2xl">❌</span>
              <span className="text-lg font-medium">
                Could not find any clans matching your criteria
              </span>
            </div>
          </div>
        );
      }

      // Show clan search results
      return <ClanSearchResults results={result} className="my-4" />;
    },
  });

  // Render deck results when backend calls search_decks
  useRenderToolCall({
    name: "search_decks",
    render: ({ args, result, status }) => {
      console.log("[search_decks render]", { status, args, result });
      if (result?.decks) {
        console.log("[search_decks] First deck cards:", result.decks[0]?.cards);
      }

      // Show loading state while fetching
      if (status !== "complete") {
        // Customize loading message based on sort_by parameter
        let loadingMessage = "Searching for decks";
        if (args.sort_by === "WIN_RATE") {
          loadingMessage = "Finding highest win rate decks";
        } else if (args.sort_by === "GAMES_PLAYED") {
          loadingMessage = "Finding most popular decks";
        } else if (args.sort_by === "WINS") {
          loadingMessage = "Finding decks with most wins";
        }

        return (
          <div className="bg-primary/20 border border-primary/40 text-white p-6 rounded-xl max-w-2xl my-4">
            <div className="flex items-center gap-3">
              <span className="text-2xl animate-spin">⚙️</span>
              <span className="text-lg font-medium">{loadingMessage}...</span>
            </div>
          </div>
        );
      }

      if (hasToolError(result)) {
        return renderToolError();
      }

      // Show error state if no result
      if (!result || !result.decks) {
        return (
          <div className="bg-destructive/20 border border-destructive/40 text-white p-6 rounded-xl max-w-2xl my-4">
            <div className="flex items-center gap-3">
              <span className="text-2xl">❌</span>
              <span className="text-lg font-medium">
                Could not find any decks matching your criteria
              </span>
            </div>
          </div>
        );
      }

      // Show deck results
      return <DeckSearchResults results={result} className="my-4" />;
    },
  });

  // Render knowledge search when backend calls search_knowledge_base
  useRenderToolCall({
    name: "search_knowledge_base",
    render: ({ args, result, status }) => {
      console.log("[search_knowledge_base render]", { status, args, result });

      if (status === "complete" && hasToolError(result)) {
        return renderToolError();
      }

      // Show animated knowledge search while executing
      // Component returns null when complete to let agent's text response show
      // Map inProgress to executing for component compatibility
      const mappedStatus =
        status === "inProgress"
          ? "executing"
          : status === "complete"
          ? "complete"
          : "executing";
      return (
        <KnowledgeSearch
          query={args.query}
          status={mappedStatus}
          className="my-4"
        />
      );
    },
  });

  // Render leaderboard when backend calls get_top_players
  useRenderToolCall({
    name: "get_top_players",
    render: ({ args, result, status }) => {
      console.log("[get_top_players render]", { status, args, result });

      // Show loading state while fetching
      if (status !== "complete") {
        return (
          <div className="bg-primary/20 border border-primary/40 text-white p-6 rounded-xl max-w-2xl my-4">
            <div className="flex items-center gap-3">
              <span className="text-2xl animate-spin">⚙️</span>
              <span className="text-lg font-medium">
                Fetching top players leaderboard...
              </span>
            </div>
          </div>
        );
      }

      if (hasToolError(result)) {
        return renderToolError();
      }

      // Show error state if no result
      if (!result || !result.entries || result.entries.length === 0) {
        return (
          <div className="bg-destructive/20 border border-destructive/40 text-white p-6 rounded-xl max-w-2xl my-4">
            <div className="flex items-center gap-3">
              <span className="text-2xl">❌</span>
              <span className="text-lg font-medium">
                Could not fetch leaderboard data
              </span>
            </div>
          </div>
        );
      }

      // Show leaderboard with podium
      return <Leaderboard leaderboard={result} className="my-4" />;
    },
  });

  // Debug: Catch-all renderer to see what other backend tools are being called
  useRenderToolCall({
    name: "*",
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    render: ({ name, args, result, status }: any) => {
      console.log("[catch-all render]", { name, status, args, result });

      // Skip tools we handle specifically
      if (
        name === "get_player_info" ||
        name === "get_player_battle_log" ||
        name === "get_clan_info" ||
        name === "search_clans" ||
        name === "search_decks" ||
        name === "search_knowledge_base" ||
        name === "get_top_players"
      ) {
        return <></>;
      }

      return (
        <div className="bg-muted border border-border p-4 rounded-xl my-4">
          <p className="font-bold text-sm text-muted-foreground mb-2">
            Tool: {name}
          </p>
          {status !== "complete" && <p className="text-sm">Processing...</p>}
          {status === "complete" && hasToolError(result) && renderToolError()}
          {status === "complete" && result && (
            <pre className="bg-background p-2 rounded text-xs overflow-auto max-h-96">
              {JSON.stringify(result, null, 2)}
            </pre>
          )}
        </div>
      );
    },
  });

  return (
    <div
      className="h-[calc(100vh-4rem)] w-full grid p-6 gap-6"
      style={{ gridTemplateColumns: "1fr 3fr" }}
    >
      {/* Left side: Agent Config (25%) */}
      <div className="flex flex-col rounded-xl border border-border bg-card/50 h-full overflow-y-auto">
        <div className="p-6 border-b border-border">
          <h2 className="text-2xl font-bold mb-2">Agent Config</h2>
          <p className="text-sm text-muted-foreground">
            Configure your ClashGPT assistant settings
          </p>
        </div>

        <div className="flex-1 p-6 flex flex-col gap-4">
          {/* Player Tag Input */}
          <div className="flex flex-col gap-2">
            <label
              htmlFor="player-tag"
              className="text-xs font-medium text-muted-foreground"
            >
              Player Tag
            </label>
            <input
              id="player-tag"
              type="text"
              value={playerTagInput}
              onChange={(e) => setPlayerTagInput(e.target.value)}
              placeholder="#YOURTAG"
              className="w-full px-3 py-2 rounded-md border border-border bg-background text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary text-sm"
            />
            {agentState?.player_tag && agentState.player_tag !== "unknown"}
          </div>

          {/* Clan Tag Input */}
          <div className="flex flex-col gap-2">
            <label
              htmlFor="clan-tag"
              className="text-xs font-medium text-muted-foreground"
            >
              Clan Tag
            </label>
            <input
              id="clan-tag"
              type="text"
              value={clanTagInput}
              onChange={(e) => setClanTagInput(e.target.value)}
              placeholder="#CLANTAG"
              className="w-full px-3 py-2 rounded-md border border-border bg-background text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary text-sm"
            />
            {agentState?.clan_tag && agentState.clan_tag !== "unknown"}
          </div>

          {/* Apply Settings Button */}
          <Button
            variant="default"
            className="w-full"
            onClick={handleApplySettings}
            disabled={!hasChanges()}
          >
            Apply Settings
          </Button>

          {/* Success indicator */}
          {settingsApplied && (
            <div className="flex items-center gap-2 text-sm text-green-600 dark:text-green-400 bg-green-50 dark:bg-green-950/30 border border-green-200 dark:border-green-800 rounded-md px-3 py-2 animate-in fade-in slide-in-from-top-2 duration-300">
              <svg
                className="w-4 h-4"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M5 13l4 4L19 7"
                />
              </svg>
              <span className="font-medium">
                Settings applied successfully!
              </span>
            </div>
          )}

          {/* Spacer to push Clear Chat to bottom */}
          <div className="grow" />

          {/* Clear Chat Button at bottom */}
          <Dialog open={showClearDialog} onOpenChange={setShowClearDialog}>
            <Button
              variant="destructive"
              className="w-full"
              onClick={() => setShowClearDialog(true)}
            >
              Clear Chat & Start New
            </Button>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Clear Chat History?</DialogTitle>
                <DialogDescription>
                  This will start a new conversation and clear all chat history.
                  This action cannot be undone.
                </DialogDescription>
              </DialogHeader>
              <DialogFooter>
                <Button
                  variant="outline"
                  onClick={() => setShowClearDialog(false)}
                >
                  Cancel
                </Button>
                <Button variant="destructive" onClick={handleClearChat}>
                  Clear Chat
                </Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>
        </div>
      </div>

      {/* Right side: Chat interface (75%) */}
      <div className="overflow-y-auto rounded-xl h-full">
        <div
          className={cn(
            "flex flex-col h-full w-full rounded-xl shadow-sm border border-border"
          )}
          style={
            {
              "--copilot-kit-primary-color": "var(--primary)",
              "--copilot-kit-contrast-color": "var(--primary-foreground)",
              "--copilot-kit-background-color": "var(--background)",
              "--copilot-kit-secondary-color": "var(--card)",
              "--copilot-kit-secondary-contrast-color": "var(--foreground)",
              "--copilot-kit-separator-color": "var(--border)",
              "--copilot-kit-muted-color": "var(--muted)",
            } as CopilotKitCSSProperties
          }
        >
          <div className={cn("flex-1 w-full rounded-xl overflow-y-auto")}>
            <CopilotChat className="h-full w-full" Input={CustomInput} />
          </div>
        </div>
      </div>
    </div>
  );
}
