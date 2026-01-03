"use client";

import { CopilotPopup } from "@copilotkit/react-ui";
import { CopilotKit } from "@copilotkit/react-core";
import "@copilotkit/react-ui/styles.css";

export default function DecksPage() {
  return (
    <div>
      <CopilotKit
        runtimeUrl="/api/copilotkit"
        agent="clash_gpt"
        publicApiKey="ck_pub_9265cbc1005d6ea24830000a4f8b502c"
      >
        <div className="flex min-h-[60vh] flex-col gap-8 pb-6">
          <CopilotPopup
            defaultOpen={false}
            labels={{
              title: "ClashGPT Assistant",
              initial: "Ask me about decks, archetypes, or the meta!",
            }}
          />
        </div>
      </CopilotKit>
    </div>
  );
}
