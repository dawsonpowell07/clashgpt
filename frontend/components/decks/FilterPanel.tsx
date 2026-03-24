import {
  Loader2,
  Search,
  Filter,
  X,
  TrendingUp,
  RefreshCw,
} from "lucide-react";
import { AlertTriangle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { CardSelector } from "@/components/card-selector";
import { cn } from "@/lib/utils";
import { Card } from "@/lib/types";

interface FilterPanelProps {
  cards: Card[];
  isLoadingCards: boolean;
  cardsError: string | null;
  onRetryCards: () => void;
  filterMode: "INCLUDE" | "EXCLUDE";
  onSetFilterMode: (mode: "INCLUDE" | "EXCLUDE") => void;
  includedVariants: Set<string>;
  excludedVariants: Set<string>;
  onToggleCard: (id: string) => void;
  minGames: number;
  onSetMinGames: (n: number) => void;
  isSearching: boolean;
  onSearch: () => void;
  onClearFilters: () => void;
}

export function FilterPanel({
  cards,
  isLoadingCards,
  cardsError,
  onRetryCards,
  filterMode,
  onSetFilterMode,
  includedVariants,
  excludedVariants,
  onToggleCard,
  minGames,
  onSetMinGames,
  isSearching,
  onSearch,
  onClearFilters,
}: FilterPanelProps) {
  return (
    <div className="relative space-y-4 bg-gradient-to-br from-card via-card to-muted/20 border border-border/50 rounded-2xl p-6 shadow-lg backdrop-blur-sm">
      {/* Subtle glow effect */}
      <div className="absolute inset-0 rounded-2xl bg-gradient-to-br from-primary/5 to-transparent pointer-events-none" />

      <div className="relative flex flex-col gap-4">
        {/* Top Row: Mode Toggles and Min Games Filter */}
        <div className="flex flex-col sm:flex-row gap-4 justify-between items-start sm:items-center">
          {/* Mode Toggles */}
          <div className="flex items-center gap-2 p-1.5 bg-muted/60 rounded-xl shadow-inner overflow-x-auto w-full sm:w-auto">
            <span className="text-sm font-semibold text-muted-foreground px-2 shrink-0">
              Filter Mode:
            </span>
            <button
              onClick={() => onSetFilterMode("INCLUDE")}
              className={cn(
                "flex items-center gap-2 px-4 py-2 text-sm font-semibold rounded-lg transition-all duration-300 transform",
                filterMode === "INCLUDE"
                  ? "bg-gradient-to-r from-green-500 to-green-600 text-white shadow-lg shadow-green-500/30 scale-105 ring-2 ring-green-400/50"
                  : "text-muted-foreground hover:bg-muted hover:scale-105",
              )}
            >
              <Filter className="w-4 h-4" />
              Include
            </button>
            <button
              onClick={() => onSetFilterMode("EXCLUDE")}
              className={cn(
                "flex items-center gap-2 px-4 py-2 text-sm font-semibold rounded-lg transition-all duration-300 transform",
                filterMode === "EXCLUDE"
                  ? "bg-gradient-to-r from-red-500 to-red-600 text-white shadow-lg shadow-red-500/30 scale-105 ring-2 ring-red-400/50"
                  : "text-muted-foreground hover:bg-muted hover:scale-105",
              )}
            >
              <X className="w-4 h-4" />
              Exclude
            </button>
          </div>

          {/* Minimum Games Filter */}
          <div className="flex items-center gap-2 p-1.5 bg-muted/60 rounded-xl shadow-inner w-full sm:w-auto">
            <div className="flex items-center gap-2 px-2">
              <TrendingUp className="w-4 h-4 text-muted-foreground" />
              <span className="text-sm font-semibold text-muted-foreground">
                Min Games:
              </span>
            </div>
            <Select
              value={minGames.toString()}
              onValueChange={(value) => onSetMinGames(Number(value))}
            >
              <SelectTrigger className="w-[160px] font-semibold hover:border-primary/50 focus:ring-primary/50 transition-all">
                <SelectValue placeholder="Select minimum" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="0">No minimum</SelectItem>
                <SelectItem value="10">10+ games</SelectItem>
                <SelectItem value="20">20+ games</SelectItem>
                <SelectItem value="50">50+ games</SelectItem>
                <SelectItem value="100">100+ games</SelectItem>
                <SelectItem value="200">200+ games</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>

        {/* Bottom Row: Action Buttons */}
        <div className="flex flex-col-reverse sm:flex-row sm:items-center sm:justify-end gap-3 w-full">
          <Button
            variant="outline"
            size="sm"
            onClick={onClearFilters}
            disabled={
              includedVariants.size === 0 &&
              excludedVariants.size === 0 &&
              minGames === 0
            }
            className="w-full sm:w-auto hover:bg-destructive/10 hover:text-destructive hover:border-destructive/50 transition-all"
          >
            <X className="w-3.5 h-3.5 mr-1.5" />
            Clear Filters
          </Button>
          <Button
            onClick={onSearch}
            disabled={isSearching}
            className="w-full sm:w-auto bg-gradient-to-r from-primary to-primary/80 hover:from-primary/90 hover:to-primary/70 shadow-lg shadow-primary/20 transition-all transform hover:scale-105"
          >
            {isSearching ? (
              <Loader2 className="w-4 h-4 animate-spin mr-2" />
            ) : (
              <Search className="w-4 h-4 mr-2" />
            )}
            Search Decks
          </Button>
        </div>
      </div>

      <Separator />

      {/* Card Grid Selector */}
      {isLoadingCards ? (
        <div className="h-[200px] flex items-center justify-center text-muted-foreground">
          <Loader2 className="w-8 h-8 animate-spin" />
        </div>
      ) : cardsError ? (
        <div className="flex flex-col items-center justify-center py-12 px-4 bg-destructive/5 rounded-xl border border-destructive/20">
          <AlertTriangle className="w-10 h-10 text-destructive/70 mb-3" />
          <p className="text-sm font-medium text-destructive mb-3">
            {cardsError}
          </p>
          <button
            onClick={onRetryCards}
            className="inline-flex items-center gap-2 px-4 py-2 text-sm font-medium bg-destructive/10 hover:bg-destructive/20 text-destructive rounded-lg transition-colors"
          >
            <RefreshCw className="w-3.5 h-3.5" />
            Retry
          </button>
        </div>
      ) : (
        <CardSelector
          cards={cards}
          selectedIndices={
            filterMode === "INCLUDE" ? includedVariants : excludedVariants
          }
          onToggleCard={onToggleCard}
          filterMode={filterMode}
        />
      )}
    </div>
  );
}
