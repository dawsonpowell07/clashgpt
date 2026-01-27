"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { MessageSquare, User, LayoutGrid } from "lucide-react";

export function Navbar() {
  const pathname = usePathname();

  const isActive = (path: string) => pathname === path;

  return (
    <nav className="sticky top-0 z-50 w-full border-b border-border bg-card/80 backdrop-blur-lg">
      <div className="flex h-16 items-center justify-between px-6 md:px-12">
        {/* Left: Logo/Brand */}
        <Link
          href="/"
          className="group flex items-center gap-2 transition-opacity hover:opacity-80"
        >
          <span className="font-[family-name:var(--font-heading)] text-xl md:text-2xl font-bold tracking-tight text-foreground">
            ClashGPT
          </span>
        </Link>

        {/* Right: Navigation Links */}
        <div className="flex items-center gap-2 md:gap-4">
          <Link
            href="/chat"
            className={`
              group flex items-center gap-2 px-4 py-2 text-sm md:text-base font-medium rounded-lg
              transition-all duration-200
              ${
                isActive("/chat")
                  ? "bg-primary text-primary-foreground shadow-sm"
                  : "text-muted-foreground hover:bg-muted hover:text-foreground"
              }
            `}
          >
            <MessageSquare className="w-4 h-4" />
            <span className="hidden sm:inline">Chat</span>
          </Link>

          <Link
            href="/decks"
            className={`
              group flex items-center gap-2 px-4 py-2 text-sm md:text-base font-medium rounded-lg
              transition-all duration-200
              ${
                isActive("/decks")
                  ? "bg-primary text-primary-foreground shadow-sm"
                  : "text-muted-foreground hover:bg-muted hover:text-foreground"
              }
            `}
          >
            <LayoutGrid className="w-4 h-4" />
            <span className="hidden sm:inline">Decks</span>
          </Link>

          <Link
            href="/profile"
            className={`
              group flex items-center gap-2 px-4 py-2 text-sm md:text-base font-medium rounded-lg
              transition-all duration-200
              ${
                isActive("/profile")
                  ? "bg-primary text-primary-foreground shadow-sm"
                  : "text-muted-foreground hover:bg-muted hover:text-foreground"
              }
            `}
          >
            <User className="w-4 h-4" />
            <span className="hidden sm:inline">Profile</span>
          </Link>
        </div>
      </div>
    </nav>
  );
}
