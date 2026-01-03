"use client";

import { CopilotChat } from "@copilotkit/react-ui";
import { SidebarInset } from "@/components/ui/sidebar";

export default function ChatPage() {
  return (
    <SidebarInset className="p-0 flex flex-col h-screen overflow-hidden">
      {/* Custom Header */}
      <div className="flex items-center justify-center p-6 bg-white dark:bg-neutral-900 border-b border-neutral-200 dark:border-neutral-700 flex-shrink-0">
        <h1 className="text-2xl font-bold font-[family-name:var(--font-heading)] tracking-tight text-black dark:text-white">
          ClashGPT Assistant
        </h1>
      </div>

      {/* Chat Container - fills remaining space */}
      <div className="flex-1 overflow-hidden">
        <CopilotChat
          className="h-full"
        />
      </div>
    </SidebarInset>
  );
}
