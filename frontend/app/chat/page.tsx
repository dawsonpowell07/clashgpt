"use client";
import { CopilotKit } from "@copilotkit/react-core";
import { CopilotSidebar } from "@copilotkit/react-ui";
import "@copilotkit/react-ui/styles.css";

export default function ChatPage() {
  return (
    <CopilotKit runtimeUrl="/api/copilotkit" agent="clash_gpt">
      <CopilotSidebar
        defaultOpen={false}
        instructions={
          "You are ClashGPT, an AI-powered Clash Royale assistant. Help users with strategies, deck recommendations, card info, and meta analysis. Be enthusiastic and knowledgeable about the game!"
        }
      />
    </CopilotKit>
  );
}
