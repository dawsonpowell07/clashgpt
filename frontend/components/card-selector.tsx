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

// Define the variant types matching backend: 0=Normal, 1=Evo, 2=Hero
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

const HERO_CARDS = ["Giant", "Mini P.E.K.K.A", "Knight", "Musketeer", "Wizard"];

export function CardSelector({
  cards,
  selectedIndices,
  onToggleCard,
  filterMode,
  className,
}: CardSelectorProps) {
  const [searchQuery, setSearchQuery] = useState("");
  const [isOpen, setIsOpen] = useState(true);

  // Helper to parse icon_urls which comes as a Python string like "{'medium': '...'}"
  const parseIconUrls = (iconUrls: any): { medium?: string; evolutionMedium?: string } => {
    if (typeof iconUrls === "object" && iconUrls !== null) return iconUrls;
    if (typeof iconUrls === "string") {
      try {
        // Replace single quotes with double quotes for valid JSON, but be careful of URLs
        // Simple heuristic: keys are quoted with single quotes, values start/end with single quotes
        // This is a rough parser for the specific format seen: "{'key': 'value'}"
        const standardized = iconUrls.replace(/'/g, '"');
        return JSON.parse(standardized);
      } catch (e) {
        // Fallback or regex extraction if JSON parse fails due to complex URLs
        const mediumMatch = iconUrls.match(/'medium':\s*'([^']+)'/);
        const evoMatch = iconUrls.match(/'evolutionMedium':\s*'([^']+)'/);
        return {
          medium: mediumMatch ? mediumMatch[1] : undefined,
          evolutionMedium: evoMatch ? evoMatch[1] : undefined,
        };
      }
    }
    return {};
  };

  // Process raw cards into displayable variant items
  const variantItems = useMemo(() => {
    const items: CardVariantItem[] = [];

    cards.forEach((card) => {
      const cardFileName = card.name
        .toLowerCase()
        .replace(/ /g, "_")
        .replace(/\./g, "");
      
      const icons = parseIconUrls(card.icon_urls);

      // 1. Normal Variant (Always exists)
      items.push({
        id: `${card.card_id}_${CardVariantType.NORMAL}`,
        cardId: card.card_id,
        name: card.name,
        variant: CardVariantType.NORMAL,
        imageUrl: `/cards/${cardFileName}/${cardFileName}.png`,
        elixir: card.elixir_cost,
        rarity: card.rarity,
      });

      // 2. Evolution Variant
      if (icons.evolutionMedium) {
        items.push({
          id: `${card.card_id}_${CardVariantType.EVOLUTION}`,
          cardId: card.card_id,
          name: card.name,
          variant: CardVariantType.EVOLUTION,
          imageUrl: `/cards/${cardFileName}/${cardFileName}_evolution.png`,
          elixir: card.elixir_cost,
          rarity: card.rarity,
        });
      }

      // 3. Hero Variant
      if (HERO_CARDS.includes(card.name)) {
        items.push({
          id: `${card.card_id}_${CardVariantType.HERO}`,
          cardId: card.card_id,
          name: card.name,
          variant: CardVariantType.HERO,
          imageUrl: `/cards/${cardFileName}/${cardFileName}_hero.png`,
          elixir: card.elixir_cost,
          rarity: card.rarity,
        });
      }
    });

    // Sort items: Variant type (Hero=2 > Evo=1 > Normal=0), then Name
    return items.sort((a, b) => {
      // Sort by variant type descending (Hero -> Evo -> Normal)
      if (a.variant !== b.variant) return b.variant - a.variant;
      // Then alphabetically by name
      return a.name.localeCompare(b.name);
    });
  }, [cards]);

  // Filter items based on search query
  const filteredItems = useMemo(() => {
    if (!searchQuery.trim()) return variantItems;
    const lowerQuery = searchQuery.toLowerCase();
    return variantItems.filter((item) =>
      item.name.toLowerCase().includes(lowerQuery)
    );
  }, [variantItems, searchQuery]);

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

      {isOpen && (
        <div className="grid grid-cols-4 sm:grid-cols-6 md:grid-cols-8 lg:grid-cols-10 gap-2 overflow-y-auto max-h-[300px] p-1 custom-scrollbar">
          {filteredItems.map((item) => {
            const isSelected = selectedIndices.has(item.id);
            
            return (
              <TooltipProvider key={item.id}>
                <Tooltip delayDuration={300}>
                  <TooltipTrigger asChild>
                    <button
                      onClick={() => onToggleCard(item.id)}
                      className={cn(
                        "relative aspect-[3/4] rounded-lg overflow-hidden border transition-all duration-200 group",
                        isSelected
                          ? filterMode === "INCLUDE"
                            ? "ring-2 ring-green-500 border-green-500 scale-95"
                            : "ring-2 ring-red-500 border-red-500 scale-95 opacity-50 grayscale"
                          : "border-border hover:border-primary/50 hover:scale-105"
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
                        <div className="absolute top-1 right-1 h-2 w-2 rounded-full bg-purple-500 ring-1 ring-black/50" />
                      )}
                      {item.variant === CardVariantType.HERO && (
                        <div className="absolute top-1 right-1 h-2 w-2 rounded-full bg-yellow-500 ring-1 ring-black/50" />
                      )}

                      {/* Selection Indicator Overlay */}
                      {isSelected && (
                        <div className={cn(
                          "absolute inset-0 flex items-center justify-center bg-black/20",
                          filterMode === "INCLUDE" ? "text-green-500" : "text-red-500"
                        )}>
                        </div>
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
              No cards found matching "{searchQuery}"
            </div>
          )}
        </div>
      )}
    </div>
  );
}
