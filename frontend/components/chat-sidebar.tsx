"use client";

import { useState } from "react";
import {
  Trophy,
  BarChart3,
  Swords,
  Search,
  ChevronRight,
  Sparkles,
  Trash2,
  Zap,
  Target,
} from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";

interface QuickAction {
  icon: React.ReactNode;
  label: string;
  prompt: string;
  color: string;
  /** If true, populate the input box instead of sending immediately */
  populateOnly?: boolean;
}

interface SuggestedQuery {
  label: string;
  prompt: string;
  /** If true, populate the input box instead of sending immediately */
  populateOnly?: boolean;
}

interface QueryCategory {
  title: string;
  icon: React.ReactNode;
  queries: SuggestedQuery[];
}

const QUICK_ACTIONS: QuickAction[] = [
  {
    icon: <Trophy className="w-5 h-5" />,
    label: "Top Meta Decks",
    prompt: "Show me the top meta decks right now",
    color: "from-amber-500/20 to-orange-600/20 hover:from-amber-500/30 hover:to-orange-600/30 border-amber-500/30",
  },
  {
    icon: <Search className="w-5 h-5" />,
    label: "Leaderboard",
    prompt: "Show me the top players leaderboard for ",
    color: "from-violet-500/20 to-purple-600/20 hover:from-violet-500/30 hover:to-purple-600/30 border-violet-500/30",
    populateOnly: true,
  },
  {
    icon: <BarChart3 className="w-5 h-5" />,
    label: "Card Stats",
    prompt: "Look up the stats for ",
    color: "from-emerald-500/20 to-teal-600/20 hover:from-emerald-500/30 hover:to-teal-600/30 border-emerald-500/30",
    populateOnly: true,
  },
  {
    icon: <Swords className="w-5 h-5" />,
    label: "Find Clans",
    prompt: "Find competitive clans with 40+ members",
    color: "from-sky-500/20 to-blue-600/20 hover:from-sky-500/30 hover:to-blue-600/30 border-sky-500/30",
  },
];

const QUERY_CATEGORIES: QueryCategory[] = [
  {
    title: "Decks",
    icon: <Swords className="w-4 h-4" />,
    queries: [
      { label: "Best Hog Rider decks", prompt: "Show me the best Hog Rider decks with high win rates" },
      { label: "Highest win rate decks", prompt: "What decks have the highest win rate right now?" },
      { label: "Most popular decks", prompt: "Show me the most popular decks being played right now" },
    ],
  },
  {
    title: "Players",
    icon: <Target className="w-4 h-4" />,
    queries: [
      { label: "Look up a player", prompt: "Look up player #", populateOnly: true },
      { label: "Top players by region", prompt: "Show me the top players leaderboard for ", populateOnly: true },
    ],
  },
];

interface ChatSidebarProps {
  onSendMessage: (message: string) => void;
  onPopulateInput: (text: string) => void;
  onClearChat: () => void;
}

export function ChatSidebar({ onSendMessage, onPopulateInput, onClearChat }: ChatSidebarProps) {
  const [expandedCategory, setExpandedCategory] = useState<string | null>(null);
  const [showClearDialog, setShowClearDialog] = useState(false);

  const toggleCategory = (title: string) => {
    setExpandedCategory((prev) => (prev === title ? null : title));
  };

  const handleAction = (prompt: string, populateOnly?: boolean) => {
    if (populateOnly) {
      onPopulateInput(prompt);
    } else {
      onSendMessage(prompt);
    }
  };

  const handleClearConfirm = () => {
    onClearChat();
    setShowClearDialog(false);
  };

  return (
    <div className="flex flex-col rounded-xl border border-border bg-card/50 h-full overflow-hidden">
      {/* Header */}
      <div className="p-5 border-b border-border">
        <div className="flex items-center gap-2.5">
          <div className="p-1.5 rounded-lg bg-primary/15">
            <Zap className="w-5 h-5 text-primary" />
          </div>
          <div>
            <h2 className="text-lg font-bold tracking-tight">Command Center</h2>
            <p className="text-xs text-muted-foreground">Quick actions & suggestions</p>
          </div>
        </div>
      </div>

      {/* Scrollable Content */}
      <div className="flex-1 overflow-y-auto p-4 flex flex-col gap-5">
        {/* Quick Actions */}
        <div>
          <div className="flex items-center gap-2 mb-3">
            <Sparkles className="w-3.5 h-3.5 text-primary/70" />
            <span className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
              Quick Actions
            </span>
          </div>
          <div className="grid grid-cols-2 gap-2">
            {QUICK_ACTIONS.map((action) => (
              <button
                key={action.label}
                onClick={() => handleAction(action.prompt, action.populateOnly)}
                className={`
                  group flex flex-col items-center gap-2 p-3 rounded-lg
                  bg-gradient-to-br ${action.color}
                  border transition-all duration-200
                  hover:scale-[1.02] hover:shadow-lg hover:shadow-black/20
                  active:scale-[0.98]
                `}
              >
                <span className="text-foreground/90 group-hover:text-foreground transition-colors">
                  {action.icon}
                </span>
                <span className="text-xs font-medium text-foreground/80 group-hover:text-foreground transition-colors text-center leading-tight">
                  {action.label}
                </span>
              </button>
            ))}
          </div>
        </div>

        {/* Divider */}
        <div className="h-px bg-border/60" />

        {/* Suggested Queries */}
        <div>
          <div className="flex items-center gap-2 mb-3">
            <ChevronRight className="w-3.5 h-3.5 text-primary/70" />
            <span className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
              Suggestions
            </span>
          </div>
          <div className="flex flex-col gap-1.5">
            {QUERY_CATEGORIES.map((category) => (
              <div key={category.title}>
                <button
                  onClick={() => toggleCategory(category.title)}
                  className="flex items-center gap-2 w-full px-3 py-2 rounded-lg text-sm font-medium text-foreground/80 hover:text-foreground hover:bg-muted/50 transition-all duration-150"
                >
                  <span className="text-muted-foreground">{category.icon}</span>
                  <span className="flex-1 text-left">{category.title}</span>
                  <ChevronRight
                    className={`w-3.5 h-3.5 text-muted-foreground transition-transform duration-200 ${
                      expandedCategory === category.title ? "rotate-90" : ""
                    }`}
                  />
                </button>
                {expandedCategory === category.title && (
                  <div className="ml-4 mt-1 flex flex-col gap-0.5 animate-in slide-in-from-top-1 fade-in duration-200">
                    {category.queries.map((query) => (
                      <button
                        key={query.label}
                        onClick={() => handleAction(query.prompt, query.populateOnly)}
                        className="text-left px-3 py-1.5 rounded-md text-xs text-muted-foreground hover:text-foreground hover:bg-primary/10 transition-all duration-150 leading-relaxed"
                      >
                        {query.label}
                      </button>
                    ))}
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Footer: Clear Chat */}
      <div className="p-4 border-t border-border">
        <Dialog open={showClearDialog} onOpenChange={setShowClearDialog}>
          <Button
            variant="ghost"
            className="w-full justify-center gap-2 text-muted-foreground hover:text-destructive hover:bg-destructive/10"
            onClick={() => setShowClearDialog(true)}
          >
            <Trash2 className="w-4 h-4" />
            Clear Chat & Start New
          </Button>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Clear Chat History?</DialogTitle>
              <DialogDescription>
                This will start a new conversation and clear all chat history.
                This action cannot be undone.
              </DialogDescription>
            </DialogHeader>
            <DialogFooter>
              <Button variant="outline" onClick={() => setShowClearDialog(false)}>
                Cancel
              </Button>
              <Button variant="destructive" onClick={handleClearConfirm}>
                Clear Chat
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>
    </div>
  );
}
