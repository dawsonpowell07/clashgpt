"use client";

import { cn } from "@/lib/utils";

interface KnowledgeSearchProps {
  query?: string;
  status: "executing" | "complete";
  className?: string;
}

export function KnowledgeSearch({ status, className }: KnowledgeSearchProps) {
  const isSearching = status === "executing";

  return (
    <div
      className={cn(
        "bg-card border border-border rounded-lg px-4 py-2.5 my-3 inline-flex items-center gap-2",
        className
      )}
    >
      <span className="text-sm text-muted-foreground">
        Let me check my notes
      </span>

      {isSearching ? (
        <div className="flex gap-1">
          <span className="w-1 h-1 bg-foreground rounded-full animate-bounce" />
          <span className="w-1 h-1 bg-foreground rounded-full animate-bounce [animation-delay:150ms]" />
          <span className="w-1 h-1 bg-foreground rounded-full animate-bounce [animation-delay:300ms]" />
        </div>
      ) : (
        <span className="text-white text-base">✓</span>
      )}
    </div>
  );
}
