import { useState, useMemo } from "react";
import Image from "next/image";
import { Search, Info, ChevronDown, ChevronUp } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";

import { Card } from "@/lib/types";

// Internal variant enum for selector UI state (translated to API format on submission)
export enum CardVariantType {
  NORMAL = 0,
  EVOLUTION = 1,
  HERO = 2,
}

// A flat item for the grid display
export interface CardVariantItem {
  id: string; // Unique string ID for selection (e.g., "26000000_0")
  cardId: number;
  name: string;
  variant: CardVariantType;
  imageUrl: string;
  elixir: number;
  rarity: string;
}

interface CardSelectorProps {
  cards: Card[];
  selectedIndices: Set<string>; // Set of generic IDs "cardId_variantType"
  onToggleCard: (id: string) => void;
  filterMode: "INCLUDE" | "EXCLUDE";
  className?: string;
}

export function CardSelector({
  cards,
  selectedIndices,
  onToggleCard,
  filterMode,
  className,
}: CardSelectorProps) {
  const [searchQuery, setSearchQuery] = useState("");
  const [isOpen, setIsOpen] = useState(true);
  const [variantFilter, setVariantFilter] = useState<CardVariantType | "All">(
    "All",
  );
  const [rarityFilter, setRarityFilter] = useState<string>("All");

  // Process raw cards into displayable variant items
  const variantItems = useMemo(() => {
    const items: CardVariantItem[] = [];

    cards.forEach((card) => {
      const cardFileName = card.name
        .toLowerCase()
        .replace(/ /g, "_")
        .replace(/\./g, "");

      // 1. Normal Variant (Always exists)
      items.push({
        id: `${card.card_id}_${CardVariantType.NORMAL}`,
        cardId: card.card_id,
        name: card.name,
        variant: CardVariantType.NORMAL,
        imageUrl: `/cards/${cardFileName}/${cardFileName}.png`,
        elixir: card.elixir_cost ?? 0,
        rarity: card.rarity ?? "",
      });

      // 2. Evolution Variant (from dim_cards.can_evolve)
      if (card.can_evolve) {
        items.push({
          id: `${card.card_id}_${CardVariantType.EVOLUTION}`,
          cardId: card.card_id,
          name: card.name,
          variant: CardVariantType.EVOLUTION,
          imageUrl: `/cards/${cardFileName}/${cardFileName}_evolution.png`,
          elixir: card.elixir_cost ?? 0,
          rarity: card.rarity ?? "",
        });
      }

      // 3. Hero Variant (from dim_cards.can_be_heroic)
      if (card.can_be_heroic) {
        items.push({
          id: `${card.card_id}_${CardVariantType.HERO}`,
          cardId: card.card_id,
          name: card.name,
          variant: CardVariantType.HERO,
          imageUrl: `/cards/${cardFileName}/${cardFileName}_hero.png`,
          elixir: card.elixir_cost ?? 0,
          rarity: card.rarity ?? "",
        });
      }
    });

    // Sort items: Variant type (Hero=2 > Evo=1 > Normal=0), then elixir cost ascending, then name
    return items.sort((a, b) => {
      if (a.variant !== b.variant) return b.variant - a.variant;
      if (a.elixir !== b.elixir) return a.elixir - b.elixir;
      return a.name.localeCompare(b.name);
    });
  }, [cards]);

  // Filter items based on search query, variant filter, and rarity filter
  const filteredItems = useMemo(() => {
    let items = variantItems;

    if (variantFilter !== "All") {
      items = items.filter((item) => item.variant === variantFilter);
    }

    if (rarityFilter !== "All") {
      items = items.filter(
        (item) => item.rarity.toLowerCase() === rarityFilter.toLowerCase(),
      );
    }

    if (!searchQuery.trim()) return items;
    const lowerQuery = searchQuery.toLowerCase();
    return items.filter((item) => item.name.toLowerCase().includes(lowerQuery));
  }, [variantItems, searchQuery, variantFilter, rarityFilter]);

  return (
    <div className={cn("flex flex-col gap-4", className)}>
      <div className="flex items-center gap-2">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Search cards..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-9 bg-muted/40"
          />
        </div>
        <Button
          variant="outline"
          size="sm"
          onClick={() => setIsOpen(!isOpen)}
          className="shrink-0"
        >
          {isOpen ? (
            <>
              <ChevronUp className="h-4 w-4 mr-2" />
              Hide Cards
            </>
          ) : (
            <>
              <ChevronDown className="h-4 w-4 mr-2" />
              Show Cards
            </>
          )}
        </Button>
      </div>

      {/* Filters - Natural Layout */}
      {isOpen && (
        <div className="flex flex-col gap-3 sm:flex-row sm:flex-wrap sm:items-center sm:gap-x-6 pb-2 border-b border-border/50 mb-1">
          {/* Variant Filter mb-0 for mobile wrap */}
          <div className="flex flex-col gap-1.5 sm:flex-row sm:items-center sm:gap-2">
            <span className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
              Type
            </span>
            <div className="flex items-center border rounded-md overflow-hidden bg-muted/20 shadow-sm">
              <button
                onClick={() => setVariantFilter("All")}
                className={cn(
                  "px-3 text-xs h-8 font-medium transition-colors border-r",
                  variantFilter === "All"
                    ? "bg-primary text-primary-foreground"
                    : "text-muted-foreground hover:bg-muted/50",
                )}
              >
                All
              </button>
              <button
                onClick={() => setVariantFilter(CardVariantType.HERO)}
                className={cn(
                  "px-3 text-xs h-8 font-medium transition-colors border-r",
                  variantFilter === CardVariantType.HERO
                    ? "bg-yellow-500/10 text-yellow-500 hover:bg-yellow-500/20"
                    : "text-muted-foreground hover:bg-muted/50",
                )}
              >
                Heroes
              </button>
              <button
                onClick={() => setVariantFilter(CardVariantType.EVOLUTION)}
                className={cn(
                  "px-3 text-xs h-8 font-medium transition-colors border-r",
                  variantFilter === CardVariantType.EVOLUTION
                    ? "bg-purple-500/10 text-purple-500 hover:bg-purple-500/20"
                    : "text-muted-foreground hover:bg-muted/50",
                )}
              >
                Evolutions
              </button>
              <button
                onClick={() => setVariantFilter(CardVariantType.NORMAL)}
                className={cn(
                  "px-3 text-xs h-8 font-medium transition-colors",
                  variantFilter === CardVariantType.NORMAL
                    ? "bg-primary text-primary-foreground"
                    : "text-muted-foreground hover:bg-muted/50",
                )}
              >
                Base
              </button>
            </div>
          </div>

          {/* Rarity Filter */}
          <div className="flex flex-col gap-1.5 sm:flex-row sm:items-center sm:gap-2">
            <span className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
              Rarity
            </span>
            <div className="flex items-center border rounded-md overflow-x-auto bg-muted/20 shadow-sm">
              {["All", "Common", "Rare", "Epic", "Legendary", "Champion"].map(
                (rarity, index) => (
                  <button
                    key={rarity}
                    onClick={() => setRarityFilter(rarity)}
                    className={cn(
                      "px-3 text-xs h-8 font-medium transition-colors",
                      index !== 5 && "border-r",
                      rarityFilter === rarity
                        ? "bg-primary text-primary-foreground"
                        : "text-muted-foreground hover:bg-muted/50",
                    )}
                  >
                    {rarity}
                  </button>
                ),
              )}
            </div>
          </div>
        </div>
      )}

      {isOpen && (
        <div className="grid grid-cols-5 sm:grid-cols-10 md:grid-cols-[repeat(14,minmax(0,1fr))] lg:grid-cols-[repeat(16,minmax(0,1fr))] gap-1.5 sm:gap-1 overflow-y-auto max-h-[360px] sm:max-h-[220px] p-1 custom-scrollbar [&>*]:isolate">
          {filteredItems.map((item) => {
            const isSelected = selectedIndices.has(item.id);

            return (
              <TooltipProvider key={item.id}>
                <Tooltip delayDuration={300}>
                  <TooltipTrigger asChild>
                    <button
                      onClick={() => onToggleCard(item.id)}
                      className={cn(
                        "relative w-full aspect-[3/4] rounded-lg overflow-hidden border transition-all duration-200 group",
                        isSelected
                          ? filterMode === "INCLUDE"
                            ? "ring-2 ring-green-500 border-green-500 scale-95"
                            : "ring-2 ring-red-500 border-red-500 scale-95 opacity-50 grayscale"
                          : "border-border [@media(hover:hover)]:hover:border-primary/50 [@media(hover:hover)]:hover:scale-105",
                      )}
                    >
                      <Image
                        src={item.imageUrl}
                        alt={`${item.name} ${item.variant}`}
                        fill
                        className="object-contain p-0.5"
                        loading="lazy"
                      />

                      {/* Badge for Variants */}
                      {item.variant === CardVariantType.EVOLUTION && (
                        <div className="absolute top-0.5 right-0.5 h-1.5 w-1.5 rounded-full bg-purple-500 ring-1 ring-black/50" />
                      )}
                      {item.variant === CardVariantType.HERO && (
                        <div className="absolute top-0.5 right-0.5 h-1.5 w-1.5 rounded-full bg-yellow-500 ring-1 ring-black/50" />
                      )}

                      {/* Selection Indicator Overlay */}
                      {isSelected && (
                        <div
                          className={cn(
                            "absolute inset-0 flex items-center justify-center bg-black/20",
                            filterMode === "INCLUDE"
                              ? "text-green-500"
                              : "text-red-500",
                          )}
                        ></div>
                      )}
                    </button>
                  </TooltipTrigger>
                  <TooltipContent side="bottom" className="text-xs">
                    <p>{item.name}</p>
                    <p className="text-[10px] text-muted-foreground uppercase opacity-75">
                      {item.variant === CardVariantType.EVOLUTION
                        ? "Evolution"
                        : item.variant === CardVariantType.HERO
                          ? "Hero"
                          : "Normal"}
                    </p>
                  </TooltipContent>
                </Tooltip>
              </TooltipProvider>
            );
          })}

          {filteredItems.length === 0 && (
            <div className="col-span-full py-8 text-center text-muted-foreground text-sm">
              No cards found matching &quot;{searchQuery}&quot;
            </div>
          )}
        </div>
      )}
    </div>
  );
}
