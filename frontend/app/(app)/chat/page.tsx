"use client";

import { useState } from "react";
import { CopilotChat, CopilotKitCSSProperties } from "@copilotkit/react-ui";
import { CopilotKit, useRenderToolCall } from "@copilotkit/react-core";
import "@copilotkit/react-ui/styles.css";
import { PlayerProfile } from "@/components/player-profile";
import { BattleLog } from "@/components/battle-log";
import { DeckSearchResults } from "@/components/deck-search-results";
import { ClanInfo } from "@/components/clan-info";
import { ClanSearchResults } from "@/components/clan-search-results";
import { KnowledgeSearch } from "@/components/knowledge-search";
import { CustomInput } from "@/components/chat";

export default function ChatPage() {
  // Use lazy initialization to get or create threadId from sessionStorage
  const [threadId] = useState<string>(() => {
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
    >
      <Chat />
    </CopilotKit>
  );
}

function Chat() {
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
        return (
          <div className="bg-primary/20 border border-primary/40 text-white p-6 rounded-xl max-w-2xl my-4">
            <div className="flex items-center gap-3">
              <span className="text-2xl animate-spin">⚙️</span>
              <span className="text-lg font-medium">
                Searching for decks...
              </span>
            </div>
          </div>
        );
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

  // Render deck results when backend calls get_top_decks
  useRenderToolCall({
    name: "get_top_decks",
    render: ({ args, result, status }) => {
      console.log("[get_top_decks render]", { status, args, result });

      // Show loading state while fetching
      if (status !== "complete") {
        return (
          <div className="bg-primary/20 border border-primary/40 text-white p-6 rounded-xl max-w-2xl my-4">
            <div className="flex items-center gap-3">
              <span className="text-2xl animate-spin">⚙️</span>
              <span className="text-lg font-medium">
                Fetching top meta decks...
              </span>
            </div>
          </div>
        );
      }

      // Show error state if no result
      if (!result || !result.decks) {
        return (
          <div className="bg-destructive/20 border border-destructive/40 text-white p-6 rounded-xl max-w-2xl my-4">
            <div className="flex items-center gap-3">
              <span className="text-2xl">❌</span>
              <span className="text-lg font-medium">
                Could not fetch top decks
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
    render: ({ args, status }) => {
      console.log("[search_knowledge_base render]", { status, args });

      // Show animated knowledge search while executing
      // Component returns null when complete to let agent's text response show
      return (
        <KnowledgeSearch query={args.query} status={status} className="my-4" />
      );
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
        name === "get_top_decks" ||
        name === "search_knowledge_base"
      ) {
        return <></>;
      }

      return (
        <div className="bg-muted border border-border p-4 rounded-xl my-4">
          <p className="font-bold text-sm text-muted-foreground mb-2">
            Tool: {name}
          </p>
          {status !== "complete" && <p className="text-sm">Processing...</p>}
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
    <div className="h-[calc(100vh-4rem)] w-full flex justify-center items-center">
      <div
        className="h-full w-full md:w-8/10 max-w-6xl"
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
        <CopilotChat
          className="h-full rounded-2xl"
          labels={{
            initial:
              "Hi I'm clashgpt! Ask me to find top decks with certain cards or anything clash related",
          }}
          Input={CustomInput}
        />
      </div>
    </div>
  );
}
