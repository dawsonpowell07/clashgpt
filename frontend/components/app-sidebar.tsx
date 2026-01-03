import * as React from "react";
import Link from "next/link";
import { Trophy, Users, User, BookOpen, Home, Moon, Sun } from "lucide-react";
import { useTheme } from "next-themes";

import {
  Sidebar,
  SidebarContent,
  SidebarGroup,
  SidebarGroupContent,
  SidebarGroupLabel,
  SidebarHeader,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarRail,
  SidebarFooter,
} from "@/components/ui/sidebar";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

// ClashGPT navigation data
const data = {
  navMain: [
    {
      title: "Main",
      items: [
        {
          title: "Home",
          url: "/",
          icon: Home,
        },
        {
          title: "Chat",
          url: "/chat",
          icon: BookOpen,
          isActive: true,
        },
      ],
    },
    {
      title: "Analyze",
      items: [
        {
          title: "Decks",
          url: "/decks",
          icon: Trophy,
        },
        {
          title: "Players",
          url: "/players",
          icon: User,
        },
        {
          title: "Clans",
          url: "/clans",
          icon: Users,
        },
      ],
    },
  ],
};

export function AppSidebar({ ...props }: React.ComponentProps<typeof Sidebar>) {
  const { setTheme } = useTheme();

  return (
    <Sidebar {...props}>
      <SidebarHeader>
        <div className="flex items-center gap-2 px-2 py-4">
          <div className="flex size-8 items-center justify-center rounded-md bg-black text-white dark:bg-white dark:text-black transition-colors">
            <Trophy className="size-4" />
          </div>
          <div className="flex flex-col gap-0.5 leading-none">
            <span className="font-[family-name:var(--font-heading)] font-bold text-lg">
              ClashGPT
            </span>
            <span className="text-xs text-muted-foreground">AI Assistant</span>
          </div>
        </div>
      </SidebarHeader>
      <SidebarContent>
        {/* We create a SidebarGroup for each section. */}
        {data.navMain.map((section) => (
          <SidebarGroup key={section.title}>
            <SidebarGroupLabel>{section.title}</SidebarGroupLabel>
            <SidebarGroupContent>
              <SidebarMenu>
                {section.items.map((item) => (
                  <SidebarMenuItem key={item.title}>
                    <SidebarMenuButton asChild isActive={item.isActive}>
                      <Link href={item.url}>
                        {item.icon && <item.icon />}
                        <span>{item.title}</span>
                      </Link>
                    </SidebarMenuButton>
                  </SidebarMenuItem>
                ))}
              </SidebarMenu>
            </SidebarGroupContent>
          </SidebarGroup>
        ))}
      </SidebarContent>
      <SidebarFooter>
        <SidebarMenu>
          <SidebarMenuItem>
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <SidebarMenuButton tooltip="Toggle theme">
                  <Sun className="size-4 scale-100 rotate-0 transition-all dark:scale-0 dark:-rotate-90" />
                  <Moon className="absolute size-4 scale-0 rotate-90 transition-all dark:scale-100 dark:rotate-0" />
                  <span>Theme</span>
                </SidebarMenuButton>
              </DropdownMenuTrigger>
              <DropdownMenuContent side="right" align="end" className="w-40">
                <DropdownMenuItem onClick={() => setTheme("light")}>
                  <Sun className="size-4 mr-2" />
                  Light
                </DropdownMenuItem>
                <DropdownMenuItem onClick={() => setTheme("dark")}>
                  <Moon className="size-4 mr-2" />
                  Dark
                </DropdownMenuItem>
                <DropdownMenuItem onClick={() => setTheme("system")}>
                  <span className="size-4 mr-2 flex items-center justify-center">
                    💻
                  </span>
                  System
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </SidebarMenuItem>
        </SidebarMenu>
        <div className="px-2 py-2 text-xs text-muted-foreground">
          © 2026 ClashGPT
        </div>
      </SidebarFooter>
      <SidebarRail />
    </Sidebar>
  );
}
