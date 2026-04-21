"use client";

import { useState, useCallback } from "react";
import { CopilotChat, CopilotKitCSSProperties } from "@copilotkit/react-ui";
import { AlertTriangle, X as XIcon, Loader2, Plus, LogIn } from "lucide-react";
import { Button } from "@/components/ui/button";
import { CopilotKit } from "@copilotkit/react-core";
import "@copilotkit/react-ui/styles.css";
import { cn } from "@/lib/utils";
import { CustomInput } from "@/components/chat";
import { InputContext } from "@/components/chat/input-context";
import { ChatToolRenderers } from "@/components/chat/ChatToolRenderers";
import { useAuth, useClerk } from "@clerk/nextjs";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";

const GUEST_LIMIT = 5;
const GUEST_COUNT_KEY = "clashgpt-guest-msg-count";
const GUEST_WINDOW_MS = 2 * 60 * 60 * 1000; // 2 hours

interface GuestCounter {
  count: number;
  windowStart: number;
}

function getStoredGuestCount(): number {
  if (typeof window === "undefined") return 0;
  try {
    const raw = localStorage.getItem(GUEST_COUNT_KEY);
    if (!raw) return 0;
    const parsed: GuestCounter = JSON.parse(raw);
    if (Date.now() - parsed.windowStart >= GUEST_WINDOW_MS) {
      localStorage.removeItem(GUEST_COUNT_KEY);
      return 0;
    }
    return parsed.count;
  } catch {
    localStorage.removeItem(GUEST_COUNT_KEY);
    return 0;
  }
}

function incrementGuestCount(current: number): number {
  const raw = localStorage.getItem(GUEST_COUNT_KEY);
  let windowStart = Date.now();
  try {
    if (raw) {
      const parsed: GuestCounter = JSON.parse(raw);
      if (Date.now() - parsed.windowStart < GUEST_WINDOW_MS) {
        windowStart = parsed.windowStart;
      }
    }
  } catch {
    // use fresh windowStart
  }
  const next = current + 1;
  localStorage.setItem(
    GUEST_COUNT_KEY,
    JSON.stringify({ count: next, windowStart }),
  );
  return next;
}

export default function ChatPage() {
  const { isSignedIn, isLoaded } = useAuth();
  const { openSignIn } = useClerk();

  // Guest message counter — resets hourly via localStorage timestamp
  const [guestCount, setGuestCount] = useState<number>(() => getStoredGuestCount());
  const guestLimitReached = !isSignedIn && guestCount >= GUEST_LIMIT;

  const [showLimitModal, setShowLimitModal] = useState(false);
  const [copilotError, setCopilotError] = useState<string | null>(null);

  const handleMessageSent = useCallback(() => {
    if (isSignedIn) return;
    const next = incrementGuestCount(guestCount);
    setGuestCount(next);
    if (next >= GUEST_LIMIT) {
      setShowLimitModal(true);
    }
  }, [isSignedIn, guestCount]);

  // Persist thread across page refreshes, expiring after 4 hours of inactivity
  const [threadId, setThreadId] = useState<string>(() => {
    if (typeof window === "undefined") return crypto.randomUUID();

    const expiryMs = 4 * 60 * 60 * 1000;
    const stored = localStorage.getItem("copilotkit-chat-session");

    if (stored) {
      try {
        const { id, timestamp } = JSON.parse(stored);
        if (Date.now() - timestamp < expiryMs) {
          localStorage.setItem(
            "copilotkit-chat-session",
            JSON.stringify({ id, timestamp: Date.now() }),
          );
          return id;
        }
      } catch {
        // ignore parse errors
      }
    }

    const newId = crypto.randomUUID();
    localStorage.setItem(
      "copilotkit-chat-session",
      JSON.stringify({ id: newId, timestamp: Date.now() }),
    );
    return newId;
  });

  const handleClearChat = useCallback(() => {
    const newId = crypto.randomUUID();
    localStorage.setItem(
      "copilotkit-chat-session",
      JSON.stringify({ id: newId, timestamp: Date.now() }),
    );
    setThreadId(newId);
  }, []);

  if (!isLoaded) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <>
      <CopilotKit
        runtimeUrl="/api/copilotkit"
        agent="clash_gpt"
        publicApiKey="ck_pub_9265cbc1005d6ea24830000a4f8b502c"
        threadId={threadId}
        key={threadId}
        showDevConsole={false}
        onError={(error) => {
          console.error("CopilotKit error:", error);
          setCopilotError(
            "Something went wrong with the AI assistant. Please try sending your message again.",
          );
          setTimeout(() => setCopilotError(null), 8000);
        }}
      >
        <Chat
          copilotError={copilotError}
          onDismissError={() => setCopilotError(null)}
          onClearChat={handleClearChat}
          guestLimitReached={guestLimitReached}
          onMessageSent={handleMessageSent}
          isSignedIn={!!isSignedIn}
          guestCount={guestCount}
          onShowLimitModal={() => setShowLimitModal(true)}
        />
      </CopilotKit>

      {/* Guest limit modal */}
      <Dialog open={showLimitModal} onOpenChange={setShowLimitModal}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>You&apos;ve reached the free message limit</DialogTitle>
            <DialogDescription>
              You&apos;ve used all {GUEST_LIMIT} free messages. Sign in for unlimited conversations with ClashGPT.
            </DialogDescription>
          </DialogHeader>
          <div className="flex flex-col gap-3 pt-2">
            <Button
              onClick={() => {
                setShowLimitModal(false);
                openSignIn();
              }}
              className="w-full"
            >
              <LogIn className="w-4 h-4 mr-2" />
              Sign in for unlimited access
            </Button>
            <Button
              variant="ghost"
              onClick={() => setShowLimitModal(false)}
              className="w-full text-muted-foreground"
            >
              Maybe later
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
}

interface ChatProps {
  copilotError: string | null;
  onDismissError: () => void;
  onClearChat: () => void;
  guestLimitReached: boolean;
  onMessageSent: () => void;
  isSignedIn: boolean;
  guestCount: number;
  onShowLimitModal: () => void;
}

function Chat({
  copilotError,
  onDismissError,
  onClearChat,
  guestLimitReached,
  onMessageSent,
  isSignedIn,
  guestCount,
  onShowLimitModal,
}: ChatProps) {
  const [pendingInput] = useState<string | null>(null);
  const clearPendingInput = useCallback(() => {}, []);

  const remaining = Math.max(0, GUEST_LIMIT - guestCount);

  return (
    <div className="h-[calc(100dvh-4rem)] w-full flex p-2 sm:p-4 lg:p-6 overflow-hidden">
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
          className={cn(
            "flex flex-col flex-1 min-h-0 w-full rounded-xl shadow-lg overflow-hidden",
          )}
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
          {/* Header */}
          <div className="flex items-center justify-between px-4 py-3 border-b border-[color:var(--copilot-kit-separator-color)] bg-[color:var(--copilot-kit-background-color)]">
            <span className="font-semibold text-sm text-[color:var(--copilot-kit-secondary-contrast-color)]">
              ClashGPT Chat
            </span>
            <div className="flex items-center gap-3">
              {/* Guest message counter */}
              {!isSignedIn && (
                <button
                  onClick={onShowLimitModal}
                  className="text-xs text-muted-foreground hover:text-foreground transition-colors"
                >
                  {guestLimitReached ? (
                    <span className="text-destructive font-medium">
                      Limit reached — sign in
                    </span>
                  ) : (
                    <span>
                      {remaining} free message{remaining !== 1 ? "s" : ""} left
                    </span>
                  )}
                </button>
              )}
              <Button
                onClick={onClearChat}
                variant="destructive"
                size="sm"
                className="h-8"
              >
                <Plus className="w-3.5 h-3.5 mr-1.5" />
                New Chat
              </Button>
            </div>
          </div>

          <div
            className={cn(
              "flex-1 w-full bg-[color:var(--copilot-kit-background-color)] overflow-y-auto",
            )}
          >
            <InputContext.Provider
              value={{ pendingInput, clearPendingInput, guestLimitReached, onMessageSent }}
            >
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
