"use client";

import { useState, useEffect, useCallback } from "react";
import { CopilotChat, CopilotKitCSSProperties } from "@copilotkit/react-ui";
import { AlertTriangle, X as XIcon, Loader2 } from "lucide-react";
import {
  CopilotKit,
  useRenderToolCall,
  useCopilotChat,
} from "@copilotkit/react-core";
import "@copilotkit/react-ui/styles.css";
import { PlayerProfile } from "@/components/player-profile";
import { BattleLog } from "@/components/battle-log";
import { DeckSearchResults } from "@/components/deck-search-results";
import { ClanInfo } from "@/components/clan-info";
import { ClanSearchResults } from "@/components/clan-search-results";

import { Leaderboard } from "@/components/leaderboard";
import { CardStats } from "@/components/card-stats";
import { cn } from "@/lib/utils";
import { CustomInput } from "@/components/chat";
import { InputContext } from "@/components/chat/input-context";
import { ChatSidebar } from "@/components/chat-sidebar";
import { TextMessage, Role } from "@copilotkit/runtime-client-gql";
import { useAuth } from "@clerk/nextjs";
import { redirect } from "next/navigation";

export default function ChatPage() {
  const { getToken, isSignedIn, isLoaded, userId } = useAuth();
  const [authHeaders, setAuthHeaders] = useState<Record<string, string>>({});
  const [copilotError, setCopilotError] = useState<string | null>(null);

  // Keep the auth token fresh
  useEffect(() => {
    if (!isSignedIn) {
      setAuthHeaders({});
      return;
    }
    const updateToken = async () => {
      const token = await getToken();
      if (token) {
        setAuthHeaders({
          Authorization: `Bearer ${token}`,
          ...(userId ? { "x-user-id": userId } : {}),
        });
      }
    };
    updateToken();
  }, [isSignedIn, getToken, userId]);

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

  // Wait for Clerk to finish loading before deciding on redirect
  if (!isLoaded) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
      </div>
    );
  }

  if (!isSignedIn) {
    redirect("/");
  }

  return (
    <CopilotKit
      runtimeUrl="/api/copilotkit"
      agent="clash_gpt"
      publicApiKey="ck_pub_9265cbc1005d6ea24830000a4f8b502c"
      threadId={threadId}
      key={threadId}
      headers={authHeaders}
      showDevConsole={false}
      onError={(error) => {
        console.error("CopilotKit error:", error);
        setCopilotError(
          "Something went wrong with the AI assistant. Please try sending your message again."
        );
        // Auto-dismiss after 8 seconds
        setTimeout(() => setCopilotError(null), 8000);
      }}
    >
      <Chat setThreadId={setThreadId} copilotError={copilotError} onDismissError={() => setCopilotError(null)} />
    </CopilotKit>
  );
}

interface ChatProps {
  setThreadId: (id: string) => void;
  copilotError: string | null;
  onDismissError: () => void;
}

function Chat({ setThreadId, copilotError, onDismissError }: ChatProps) {
  const { appendMessage } = useCopilotChat();

  const handleClearChat = useCallback(() => {
    const newThreadId = crypto.randomUUID();
    sessionStorage.setItem("copilotkit-thread-id", newThreadId);
    setThreadId(newThreadId);
  }, [setThreadId]);

  const handleSendMessage = useCallback(
    (message: string) => {
      appendMessage(
        new TextMessage({
          role: Role.User,
          content: message,
        })
      );
    },
    [appendMessage]
  );

  // Pending input for populating the text box without sending
  const [pendingInput, setPendingInput] = useState<string | null>(null);

  const handlePopulateInput = useCallback((text: string) => {
    setPendingInput(text);
  }, []);

  const clearPendingInput = useCallback(() => {
    setPendingInput(null);
  }, []);

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



  // Render leaderboard when backend calls get_top_players
  useRenderToolCall({
    name: "get_top_players",
    render: ({ args, result, status }) => {


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

  // Render card stats when backend calls get_card_stats
  useRenderToolCall({
    name: "get_card_stats",
    render: ({ args, result, status }) => {


      // Show loading state while fetching
      if (status !== "complete") {
        return (
          <div className="bg-primary/20 border border-primary/40 text-white p-6 rounded-xl max-w-2xl my-4">
            <div className="flex items-center gap-3">
              <span className="text-2xl animate-spin">⚙️</span>
              <span className="text-lg font-medium">
                Fetching card statistics...
              </span>
            </div>
          </div>
        );
      }

      if (hasToolError(result)) {
        return renderToolError();
      }

      // Show error state if no result
      if (!result || !result.card_name) {
        return (
          <div className="bg-destructive/20 border border-destructive/40 text-white p-6 rounded-xl max-w-2xl my-4">
            <div className="flex items-center gap-3">
              <span className="text-2xl">❌</span>
              <span className="text-lg font-medium">
                Could not fetch card statistics
              </span>
            </div>
          </div>
        );
      }

      // Show card stats component
      return <CardStats stats={result} className="my-4" />;
    },
  });

  // Debug: Catch-all renderer to see what other backend tools are being called
  useRenderToolCall({
    name: "*",
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    render: ({ name, args, result, status }: any) => {


      // Skip tools we handle specifically
      if (
        name === "get_player_info" ||
        name === "get_player_battle_log" ||
        name === "get_clan_info" ||
        name === "search_clans" ||
        name === "search_decks" ||
        name === "get_top_players" ||
        name === "get_card_stats"
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
      style={{ gridTemplateColumns: "280px 1fr" }}
    >
      {/* Left side: Command Center Sidebar */}
      <ChatSidebar
        onSendMessage={handleSendMessage}
        onPopulateInput={handlePopulateInput}
        onClearChat={handleClearChat}
      />

      {/* Right side: Chat interface */}
      <div className="overflow-y-auto rounded-xl h-full">
        {/* CopilotKit Error Banner */}
        {copilotError && (
          <div className="mx-0 mb-3 flex items-center gap-3 px-4 py-3 rounded-xl bg-destructive/10 border border-destructive/30 text-destructive animate-in slide-in-from-top-2 duration-200">
            <AlertTriangle className="w-4 h-4 flex-shrink-0" />
            <p className="text-sm font-medium flex-1">{copilotError}</p>
            <button onClick={onDismissError} className="p-1 hover:bg-destructive/10 rounded transition-colors">
              <XIcon className="w-3.5 h-3.5" />
            </button>
          </div>
        )}
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
            <InputContext.Provider value={{ pendingInput, clearPendingInput }}>
              <CopilotChat className="h-full w-full" Input={CustomInput} />
            </InputContext.Provider>
          </div>
        </div>
      </div>
    </div>
  );
}
