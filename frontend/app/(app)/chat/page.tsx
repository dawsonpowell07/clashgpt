"use client";

import { useState, useEffect, useCallback } from "react";
import { CopilotChat, CopilotKitCSSProperties } from "@copilotkit/react-ui";
import { AlertTriangle, X as XIcon, Loader2 } from "lucide-react";
import { CopilotKit } from "@copilotkit/react-core";
import "@copilotkit/react-ui/styles.css";
import { cn } from "@/lib/utils";
import { CustomInput } from "@/components/chat";
import { InputContext } from "@/components/chat/input-context";
import { ChatToolRenderers } from "@/components/chat/ChatToolRenderers";
import { useAuth } from "@clerk/nextjs";
import { useRouter } from "next/navigation";

export default function ChatPage() {
  const { getToken, isSignedIn, isLoaded, userId } = useAuth();
  const router = useRouter();
  const [authHeaders, setAuthHeaders] = useState<Record<string, string> | null>(null);
  const [copilotError, setCopilotError] = useState<string | null>(null);

  // Redirect unauthenticated users
  useEffect(() => {
    if (isLoaded && !isSignedIn) {
      router.replace("/");
    }
  }, [isLoaded, isSignedIn, router]);

  // Keep the auth token fresh — Clerk JWTs expire in ~60s
  useEffect(() => {
    if (!isSignedIn) {
      setAuthHeaders(null);
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
    const interval = setInterval(updateToken, 50_000);
    return () => clearInterval(interval);
  }, [isSignedIn, getToken, userId]);

  // Persist thread across page refreshes
  const [threadId] = useState<string>(() => {
    if (typeof window === "undefined") return crypto.randomUUID();
    const existing = sessionStorage.getItem("copilotkit-thread-id");
    if (existing) return existing;
    const id = crypto.randomUUID();
    sessionStorage.setItem("copilotkit-thread-id", id);
    return id;
  });

  // Also wait for the Bearer token to be ready before mounting CopilotKit.
  // Without this, CopilotKit fires its first request with headers={} (empty),
  // which causes intermittent 401s when the Clerk session cookie is also stale.
  if (!isLoaded || !isSignedIn || authHeaders === null) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
      </div>
    );
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
        setTimeout(() => setCopilotError(null), 8000);
      }}
    >
      <Chat
        copilotError={copilotError}
        onDismissError={() => setCopilotError(null)}
      />
    </CopilotKit>
  );
}

interface ChatProps {
  copilotError: string | null;
  onDismissError: () => void;
}

function Chat({ copilotError, onDismissError }: ChatProps) {
  const [pendingInput] = useState<string | null>(null);
  const clearPendingInput = useCallback(() => {}, []);

  return (
    <div className="h-[calc(100vh-4rem)] w-full flex p-3 sm:p-4 lg:p-6">
      {/* Tool-call renderers (registers useRenderToolCall hooks) */}
      <ChatToolRenderers />

      <div className="flex-1 flex flex-col h-full min-w-0 overflow-hidden">
        {/* Error banner */}
        {copilotError && (
          <div className="flex items-center gap-3 px-4 py-2 mb-3 rounded-xl bg-destructive/10 border border-destructive/30 text-destructive animate-in slide-in-from-top-2 duration-200 shrink-0">
            <AlertTriangle className="w-4 h-4 flex-shrink-0" />
            <p className="text-sm font-medium flex-1">{copilotError}</p>
            <button
              onClick={onDismissError}
              className="p-1 hover:bg-destructive/10 rounded transition-colors"
            >
              <XIcon className="w-3.5 h-3.5" />
            </button>
          </div>
        )}

        <div
          className={cn("flex flex-col flex-1 min-h-0 w-full rounded-xl shadow-lg overflow-hidden")}
          style={
            {
              "--copilot-kit-primary-color": "oklch(0.68 0.16 45)",
              "--copilot-kit-contrast-color": "oklch(0.21 0.018 250)",
              "--copilot-kit-background-color": "oklch(0.225 0.016 250)",
              "--copilot-kit-input-background-color": "oklch(0.26 0.02 250)",
              "--copilot-kit-secondary-color": "oklch(0.28 0.02 250)",
              "--copilot-kit-secondary-contrast-color": "oklch(0.93 0.008 80)",
              "--copilot-kit-separator-color": "oklch(0.36 0.025 250)",
              "--copilot-kit-muted-color": "oklch(0.42 0.025 250)",
              "--copilot-kit-shadow-md": "0 4px 24px rgba(0,0,0,0.4)",
              border: "1px solid oklch(0.36 0.025 250)",
            } as CopilotKitCSSProperties
          }
        >
          <div className={cn("flex-1 w-full rounded-xl overflow-y-auto")}>
            <InputContext.Provider value={{ pendingInput, clearPendingInput }}>
              <CopilotChat
                className="h-full w-full"
                Input={CustomInput}
                labels={{
                  initial:
                    "Hi, I am ClashGPT! I can help you with deck suggestions, player stats, and more. What would you like to know?",
                }}
                suggestions={[
                  {
                    title: "Top Hog Rider decks",
                    message: "Find the top hog rider decks right now.",
                  },
                  {
                    title: "Royal Giant stats",
                    message: "Show me the stats for Royal Giant.",
                  },
                  {
                    title: "Player profile",
                    message: "Pull up the profile for player #G9YV9GR8R.",
                  },
                  {
                    title: "Golem decks (no Lightning)",
                    message: "Find decks with Golem that don't include Lightning.",
                  },
                ]}
              />
            </InputContext.Provider>
          </div>
        </div>
      </div>
    </div>
  );
}
