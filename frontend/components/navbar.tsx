"use client";

import { useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { MessageSquare, LayoutGrid, LogIn } from "lucide-react";
import {
  SignInButton,
  SignedIn,
  SignedOut,
  UserButton,
  useAuth,
} from "@clerk/nextjs";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";

export function Navbar() {
  const pathname = usePathname();
  const { isSignedIn } = useAuth();
  const [showAuthDialog, setShowAuthDialog] = useState(false);

  const isActive = (path: string) => pathname === path;

  const chatLinkClasses = `
    group flex items-center gap-2 px-4 py-2 text-sm md:text-base font-medium rounded-lg
    transition-all duration-200
    ${
      isActive("/chat")
        ? "bg-primary text-primary-foreground shadow-sm"
        : "text-muted-foreground hover:bg-muted hover:text-foreground"
    }
  `;

  return (
    <>
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
            {isSignedIn ? (
              <Link href="/chat" className={chatLinkClasses}>
                <MessageSquare className="w-4 h-4" />
                <span className="hidden sm:inline">Chat</span>
              </Link>
            ) : (
              <button onClick={() => setShowAuthDialog(true)} className={chatLinkClasses}>
                <MessageSquare className="w-4 h-4" />
                <span className="hidden sm:inline">Chat</span>
              </button>
            )}

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

            {/* Auth: Sign In or User Profile */}
            <SignedOut>
              <SignInButton mode="modal">
                <button
                  className={`
                    group flex items-center gap-2 px-4 py-2 text-sm md:text-base font-medium rounded-lg
                    transition-all duration-200
                    bg-primary text-primary-foreground shadow-sm
                    hover:opacity-90
                  `}
                >
                  <LogIn className="w-4 h-4" />
                  <span className="hidden sm:inline">Sign In</span>
                </button>
              </SignInButton>
            </SignedOut>
            <SignedIn>
              <UserButton
                appearance={{
                  elements: {
                    avatarBox: "w-9 h-9 ring-2 ring-primary/50 ring-offset-2 ring-offset-card"
                  }
                }}
              />
            </SignedIn>
          </div>
        </div>
      </nav>

      {/* Auth required dialog for Chat */}
      <Dialog open={showAuthDialog} onOpenChange={setShowAuthDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Sign in required</DialogTitle>
            <DialogDescription>
              You need an account to use the AI chat assistant. Sign in or create an account to get started.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter className="gap-2">
            <button
              onClick={() => setShowAuthDialog(false)}
              className="inline-flex items-center justify-center rounded-md border border-border px-4 py-2 text-sm font-medium text-muted-foreground hover:bg-muted transition-colors"
            >
              Cancel
            </button>
            <SignInButton mode="modal" forceRedirectUrl="/chat">
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
