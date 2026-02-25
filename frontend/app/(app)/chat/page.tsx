"use client";

import { useState, useEffect, useCallback } from "react";
import { CopilotChat, CopilotKitCSSProperties } from "@copilotkit/react-ui";
import { AlertTriangle, X as XIcon, Loader2 } from "lucide-react";
import { CopilotKit, useCopilotChat } from "@copilotkit/react-core";
import "@copilotkit/react-ui/styles.css";
import { cn } from "@/lib/utils";
import { CustomInput } from "@/components/chat";
import { InputContext } from "@/components/chat/input-context";
import { ChatSidebar } from "@/components/chat-sidebar";
import { ChatToolRenderers } from "@/components/chat/ChatToolRenderers";
import { TextMessage, Role } from "@copilotkit/runtime-client-gql";
import { useAuth } from "@clerk/nextjs";
import { useRouter } from "next/navigation";

export default function ChatPage() {
  const { getToken, isSignedIn, isLoaded, userId } = useAuth();
  const router = useRouter();
  const [authHeaders, setAuthHeaders] = useState<Record<string, string>>({});
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
    const interval = setInterval(updateToken, 50_000);
    return () => clearInterval(interval);
  }, [isSignedIn, getToken, userId]);

  // Persist thread across page refreshes
  const [threadId, setThreadId] = useState<string>(() => {
    if (typeof window === "undefined") return crypto.randomUUID();
    const existing = sessionStorage.getItem("copilotkit-thread-id");
    if (existing) return existing;
    const id = crypto.randomUUID();
    sessionStorage.setItem("copilotkit-thread-id", id);
    return id;
  });

  if (!isLoaded || !isSignedIn) {
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
        setThreadId={setThreadId}
        copilotError={copilotError}
        onDismissError={() => setCopilotError(null)}
      />
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
  const [pendingInput, setPendingInput] = useState<string | null>(null);

  const handleClearChat = useCallback(() => {
    const newThreadId = crypto.randomUUID();
    sessionStorage.setItem("copilotkit-thread-id", newThreadId);
    setThreadId(newThreadId);
  }, [setThreadId]);

  const handleSendMessage = useCallback(
    (message: string) => {
      appendMessage(new TextMessage({ role: Role.User, content: message }));
    },
    [appendMessage]
  );

  const handlePopulateInput = useCallback((text: string) => setPendingInput(text), []);
  const clearPendingInput = useCallback(() => setPendingInput(null), []);

  return (
    <div
      className="h-[calc(100vh-4rem)] w-full grid p-6 gap-6"
      style={{ gridTemplateColumns: "280px 1fr" }}
    >
      {/* Tool-call renderers (registers useRenderToolCall hooks) */}
      <ChatToolRenderers />

      {/* Left side: Command Center Sidebar */}
      <ChatSidebar
        onSendMessage={handleSendMessage}
        onPopulateInput={handlePopulateInput}
        onClearChat={handleClearChat}
      />

      {/* Right side: Chat interface */}
      <div className="overflow-y-auto rounded-xl h-full">
        {/* Error Banner */}
        {copilotError && (
          <div className="mx-0 mb-3 flex items-center gap-3 px-4 py-3 rounded-xl bg-destructive/10 border border-destructive/30 text-destructive animate-in slide-in-from-top-2 duration-200">
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
          className={cn("flex flex-col h-full w-full rounded-xl shadow-sm border border-border")}
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
