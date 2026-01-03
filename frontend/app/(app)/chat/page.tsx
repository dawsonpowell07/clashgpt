"use client";

import { CopilotChat, CopilotKitCSSProperties } from "@copilotkit/react-ui";
import { CopilotKit } from "@copilotkit/react-core";
import "@copilotkit/react-ui/styles.css";
import {
  CustomUserMessage,
  CustomAssistantMessage,
  CustomInput,
} from "@/components/chat";

export default function ChatPage() {
  return (
    <CopilotKit
      runtimeUrl="/api/copilotkit"
      agent="clash_gpt"
      publicApiKey="ck_pub_9265cbc1005d6ea24830000a4f8b502c"
    >
      <div className="h-[calc(100vh-4rem)] w-full flex justify-center items-center">
        <div
          className="h-full w-full md:w-8/10 max-w-6xl"
          style={
            {
              "--copilot-kit-background-color": "oklch(0.22 0.015 250", // Main page background
            } as CopilotKitCSSProperties
          }
        >
          <CopilotChat
            className="h-full rounded-2xl"
            labels={{
              initial:
                "Hi I'm clashgpt! Ask me to find top decks with certain cards or anything clash related",
            }}
            UserMessage={CustomUserMessage}
            AssistantMessage={CustomAssistantMessage}
            Input={CustomInput}
          />
        </div>
      </div>
    </CopilotKit>
  );
}
