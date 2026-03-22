"use client";

import * as React from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  MessageSquare,
  LayoutGrid,
  Users,
  Swords,
  BarChart2,
  ArrowLeftRight,
  LogIn,
  Lock,
} from "lucide-react";
import {
  SignInButton,
  SignedIn,
  SignedOut,
  UserButton,
  useAuth,
} from "@clerk/nextjs";
import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarGroup,
  SidebarGroupContent,
  SidebarGroupLabel,
  SidebarHeader,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarRail,
} from "@/components/ui/sidebar";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";

const NAV_SECTIONS = [
  {
    title: "Agent",
    items: [
      { title: "Chat", url: "/chat", icon: MessageSquare, requiresAuth: true },
    ],
  },
  {
    title: "Players",
    items: [
      { title: "Profiles", url: "/profiles", icon: Users, requiresAuth: false },
      {
        title: "Tracker",
        url: "/tracker",
        icon: BarChart2,
        requiresAuth: true,
      },
    ],
  },
  {
    title: "Find Decks",
    items: [
      { title: "Decks", url: "/decks", icon: LayoutGrid, requiresAuth: false },
    ],
  },
  {
    title: "Deck Analysis",
    items: [
      { title: "Matchups", url: "/matchups", icon: Swords, requiresAuth: false },
      {
        title: "Head to Head",
        url: "/head-to-head",
        icon: ArrowLeftRight,
        requiresAuth: false,
      },
    ],
  },
];

export function AppSidebar({ ...props }: React.ComponentProps<typeof Sidebar>) {
  const pathname = usePathname();
  const { isSignedIn } = useAuth();
  const [showAuthDialog, setShowAuthDialog] = React.useState(false);
  const [authDialogFeature, setAuthDialogFeature] = React.useState({
    name: "",
    redirectUrl: "/",
  });

  const openAuthDialog = (name: string, redirectUrl: string) => {
    setAuthDialogFeature({ name, redirectUrl });
    setShowAuthDialog(true);
  };

  return (
    <>
      <Sidebar {...props}>
        <SidebarHeader>
          <SidebarMenu>
            <SidebarMenuItem>
              <SidebarMenuButton size="lg" asChild>
                <Link href="/">
                  <div className="flex aspect-square size-8 items-center justify-center rounded-lg bg-primary text-primary-foreground">
                    <Swords className="size-4" />
                  </div>
                  <div className="flex flex-col gap-0.5 leading-none">
                    <span className="font-[family-name:var(--font-heading)] font-bold tracking-tight">
                      ClashGPT
                    </span>
                    <span className="text-xs text-muted-foreground">
                      AI-powered assistant
                    </span>
                  </div>
                </Link>
              </SidebarMenuButton>
            </SidebarMenuItem>
          </SidebarMenu>
        </SidebarHeader>

        <SidebarContent>
          {NAV_SECTIONS.map((section) => (
            <SidebarGroup key={section.title}>
              <SidebarGroupLabel>{section.title}</SidebarGroupLabel>
              <SidebarGroupContent>
                <SidebarMenu>
                  {section.items.map((item) => {
                    const isActive = pathname === item.url;
                    const isLocked = item.requiresAuth && !isSignedIn;

                    if (isLocked) {
                      return (
                        <SidebarMenuItem key={item.title}>
                          <SidebarMenuButton
                            onClick={() => openAuthDialog(item.title, item.url)}
                            isActive={isActive}
                            tooltip={`Sign in to access ${item.title}`}
                          >
                            <item.icon />
                            <span>{item.title}</span>
                            <Lock className="ml-auto size-3 text-muted-foreground/60" />
                          </SidebarMenuButton>
                        </SidebarMenuItem>
                      );
                    }

                    return (
                      <SidebarMenuItem key={item.title}>
                        <SidebarMenuButton asChild isActive={isActive}>
                          <Link href={item.url}>
                            <item.icon />
                            <span>{item.title}</span>
                          </Link>
                        </SidebarMenuButton>
                      </SidebarMenuItem>
                    );
                  })}
                </SidebarMenu>
              </SidebarGroupContent>
            </SidebarGroup>
          ))}
        </SidebarContent>

        <SidebarFooter>
          <SidebarMenu>
            <SidebarMenuItem>
              <SignedOut>
                <SignInButton mode="modal">
                  <SidebarMenuButton>
                    <LogIn />
                    <span>Sign In</span>
                  </SidebarMenuButton>
                </SignInButton>
              </SignedOut>
              <SignedIn>
                <SidebarMenuButton size="lg" asChild>
                  <div className="flex items-center gap-3 cursor-default">
                    <UserButton
                      appearance={{
                        elements: {
                          avatarBox:
                            "size-8 ring-2 ring-primary/50 ring-offset-2 ring-offset-sidebar",
                        },
                      }}
                    />
                    <span className="text-sm font-medium text-sidebar-foreground">
                      My Account
                    </span>
                  </div>
                </SidebarMenuButton>
              </SignedIn>
            </SidebarMenuItem>
          </SidebarMenu>
        </SidebarFooter>

        <SidebarRail />
      </Sidebar>

      <Dialog open={showAuthDialog} onOpenChange={setShowAuthDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Sign in required</DialogTitle>
            <DialogDescription>
              You need an account to access {authDialogFeature.name}. Sign in or
              create an account to get started.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter className="gap-2">
            <button
              onClick={() => setShowAuthDialog(false)}
              className="inline-flex items-center justify-center rounded-md border border-border px-4 py-2 text-sm font-medium text-muted-foreground hover:bg-muted transition-colors"
            >
              Cancel
            </button>
            <SignInButton
              mode="modal"
              forceRedirectUrl={authDialogFeature.redirectUrl}
            >
              <button
                onClick={() => setShowAuthDialog(false)}
                className="inline-flex items-center justify-center rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground hover:bg-primary/90 transition-colors"
              >
                Sign In
              </button>
            </SignInButton>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
