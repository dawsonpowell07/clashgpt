"use client";

import { CopilotSidebar } from "@copilotkit/react-ui";
import {
  SidebarInset,
  SidebarTrigger,
} from "@/components/ui/sidebar";
import { Separator } from "@/components/ui/separator";
import {
  Breadcrumb,
  BreadcrumbList,
  BreadcrumbItem,
  BreadcrumbPage,
} from "@/components/ui/breadcrumb";

export default function PlayersPage() {
  return (
    <>
      {/* Main Content Area */}
      <SidebarInset>
        {/* Header with breadcrumb */}
        <header className="flex h-16 shrink-0 items-center gap-2 border-b px-4">
          <SidebarTrigger className="-ml-1" />
          <Separator orientation="vertical" className="h-6 mr-2" />
          <Breadcrumb>
            <BreadcrumbList>
              <BreadcrumbItem>
                <BreadcrumbPage className="font-[family-name:var(--font-heading)] font-semibold">
                  Players
                </BreadcrumbPage>
              </BreadcrumbItem>
            </BreadcrumbList>
          </Breadcrumb>
        </header>

        {/* Main Content */}
        <div className="flex flex-1 flex-col gap-4 p-4">
          <div className="flex items-center justify-center h-full">
            <div className="text-center space-y-4 max-w-md">
              <h2 className="font-[family-name:var(--font-heading)] font-bold text-3xl md:text-4xl tracking-tight">
                Player Analysis
              </h2>
              <p className="text-muted-foreground text-lg">
                Look up player stats, analyze battle logs, and track
                performance over time.
              </p>
              <p className="text-sm text-muted-foreground">
                Open the AI assistant to analyze players →
              </p>
            </div>
          </div>
        </div>
      </SidebarInset>

      {/* Right CopilotKit Sidebar */}
      <CopilotSidebar
        defaultOpen={false}
        labels={{
          title: "ClashGPT Assistant",
          initial: "Ask me about player stats and battle analysis!",
        }}
      />
    </>
  );
}
