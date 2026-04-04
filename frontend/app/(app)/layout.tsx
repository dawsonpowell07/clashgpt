"use client";

import "@copilotkit/react-ui/styles.css";
import { AppSidebar } from "@/components/app-sidebar";
import {
  SidebarInset,
  SidebarProvider,
  SidebarTrigger,
} from "@/components/ui/sidebar";
import { Separator } from "@/components/ui/separator";
import { usePathname } from "next/navigation";

const PAGE_TITLES: Record<string, string> = {
  "/chat": "Chat",
  "/decks": "Decks",
  "/profiles": "Profiles",
  "/matchups": "Matchups",
  "/head-to-head": "Head to Head",
  "/tracker": "Tracker",
  "/global-tournament": "Global Tournament",
  "/global-tournament/leaderboard": "Global Tournament — Leaderboard",
};

export default function AppLayout({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const pageTitle = PAGE_TITLES[pathname] ?? "ClashGPT";

  return (
    <SidebarProvider>
      <AppSidebar />
      <SidebarInset>
        <header className="flex h-16 shrink-0 items-center gap-2 border-b border-border bg-card/80 backdrop-blur-lg">
          <div className="flex items-center gap-2 px-3">
            <SidebarTrigger className="-ml-1" />
            <Separator orientation="vertical" className="mr-2 h-4" />
            <span className="text-sm font-medium text-foreground">
              {pageTitle}
            </span>
          </div>
        </header>
        <div className="overflow-y-auto">{children}</div>
      </SidebarInset>
    </SidebarProvider>
  );
}
