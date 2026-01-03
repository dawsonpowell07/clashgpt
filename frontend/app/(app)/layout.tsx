"use client";

import { CopilotKit } from "@copilotkit/react-core";
import "@copilotkit/react-ui/styles.css";

import { AppSidebar } from "@/components/app-sidebar";
import { SidebarProvider } from "@/components/ui/sidebar";

export default function AppLayout({ children }: { children: React.ReactNode }) {
  return (
    <CopilotKit
      runtimeUrl="/api/copilotkit"
      agent="clash_gpt"
      publicApiKey="ck_pub_9265cbc1005d6ea24830000a4f8b502c"
    >
      <SidebarProvider>
        {/* Left Navigation Sidebar - Persistent across all pages */}
        <AppSidebar />

        {/* Page Content */}
        {children}
      </SidebarProvider>
    </CopilotKit>
  );
}
