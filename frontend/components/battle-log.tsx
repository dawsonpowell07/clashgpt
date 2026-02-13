"use client";

import { useState } from "react";
import Image from "next/image";
import { cn } from "@/lib/utils";
import { ChevronDown, ChevronUp, Swords } from "lucide-react";

interface Card {
  id: string;
  name: string;
  elixir_cost: number;
  icon_urls: Record<string, string>;
  rarity: string;
  evolution_level: number; // 0=normal, 1=evolution, 2=hero
}

interface CardList {
  cards: Card[];
}

interface Arena {
  id: string;
  name: string;
  raw_name: string;
}

interface Battle {
  type: string;
  battle_time: string;
  arena: Arena;
  game_mode_name: string;
  user_name: string;
  user_trophy_change: number;
  user_deck: CardList;
  opponent_name: string;
  opponent_trophy_change: number;
  opponent_deck: CardList;
}

interface BattleLogData {
  battles: Battle[];
}

interface BattleLogProps {
  battleLog: BattleLogData;
  className?: string;
}

export function BattleLog({ battleLog, className }: BattleLogProps) {
  const wins = battleLog.battles.filter((b) => b.user_trophy_change > 0).length;
  const draws = battleLog.battles.filter(
    (b) => b.user_trophy_change === 0
  ).length;
  const losses = battleLog.battles.length - wins - draws; // Approx, assuming anything else is a loss
  const winRate =
    Math.round((wins / (battleLog.battles.length || 1)) * 100);

  return (
    <div className={cn("space-y-4", className)}>
      <div className="flex items-center justify-between bg-card border border-border p-4 rounded-xl">
        <div className="flex items-center gap-4">
          <div className="p-3 bg-primary/10 rounded-lg">
            <Swords className="w-6 h-6 text-primary" />
          </div>
          <div>
            <h2 className="text-lg font-bold text-foreground">Battle Log</h2>
            <p className="text-xs text-muted-foreground">
              Last {battleLog.battles.length} battles
            </p>
          </div>
        </div>
        
        <div className="flex items-center gap-6">
          <div className="text-center">
            <div className="text-lg font-bold text-green-500">{wins}</div>
            <div className="text-[10px] uppercase font-bold text-muted-foreground">Wins</div>
          </div>
          <div className="text-center">
            <div className="text-lg font-bold text-destructive">{losses}</div>
            <div className="text-[10px] uppercase font-bold text-muted-foreground">Losses</div>
          </div>
          {draws > 0 && (
             <div className="text-center">
             <div className="text-lg font-bold text-yellow-500">{draws}</div>
             <div className="text-[10px] uppercase font-bold text-muted-foreground">Draws</div>
           </div>
          )}
          <div className="w-px h-8 bg-border" />
           <div className="text-center">
            <div className="text-lg font-bold text-foreground">{winRate}%</div>
            <div className="text-[10px] uppercase font-bold text-muted-foreground">Win Rate</div>
          </div>
        </div>
      </div>

      <div className="space-y-2 max-h-[500px] overflow-y-auto pr-1">
        {battleLog.battles.map((battle, index) => (
          <BattleCard key={index} battle={battle} defaultOpen={index === 0} />
        ))}
      </div>
    </div>
  );
}

interface BattleCardProps {
  battle: Battle;
  defaultOpen?: boolean;
}

function formatGameMode(gameMode: string): string {
  // Map specific game modes
  if (gameMode === "Ranked1v1_NewArena") return "1v1";

  // Add other known game modes here
  const gameModeMap: Record<string, string> = {
    "2v2": "2v2",
    ChallengeMode: "Challenge",
    Tournament: "Tournament",
  };

  return gameModeMap[gameMode] || "1v1"; // Default to 1v1
}

function BattleCard({ battle, defaultOpen = false }: BattleCardProps) {
  const [isOpen, setIsOpen] = useState(defaultOpen);
  
  const isWin = battle.user_trophy_change > 0;
  const isDraw = battle.user_trophy_change === 0;

  return (
    <div className="bg-card border border-border rounded-xl overflow-hidden shadow-sm hover:shadow-md transition-all">
      {/* Header - Click to toggle */}
      <div
        className={cn(
          "px-4 py-3 border-b border-transparent cursor-pointer hover:bg-muted/50 transition-colors",
           isOpen && "border-border"
        )}
        onClick={() => setIsOpen(!isOpen)}
      >
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
             {/* Result Indicator */}
            <div
              className={cn(
                "w-8 h-8 rounded-full flex items-center justify-center text-sm font-bold border",
                isWin && "bg-green-500/20 text-green-500 border-green-500/30",
                isDraw && "bg-yellow-500/20 text-yellow-500 border-yellow-500/30",
                !isWin && !isDraw && "bg-destructive/20 text-destructive border-destructive/30"
              )}
            >
              {isWin ? "W" : isDraw ? "D" : "L"}
            </div>
            
            {/* Battle Info */}
            <div className="flex flex-col">
              <div className="flex items-center gap-2">
                 <span className="font-semibold text-sm text-foreground">
                   {isWin ? "Victory" : isDraw ? "Draw" : "Defeat"}
                 </span>
                 <span className="text-xs text-muted-foreground">•</span>
                 <span className="text-xs text-muted-foreground">
                   {formatGameMode(battle.game_mode_name)}
                 </span>
                  <span className="text-xs text-muted-foreground">•</span>
                 <span className="text-xs text-muted-foreground">
                    {battle.arena.name}
                 </span>
              </div>
               <div className="flex items-center gap-1 text-xs text-muted-foreground">
                  <span>vs {battle.opponent_name}</span>
                   {battle.user_trophy_change !== 0 && (
                     <span
                       className={cn(
                         "ml-1 font-medium",
                         isWin ? "text-green-500" : "text-destructive"
                       )}
                     >
                       {isWin && "+"}
                       {battle.user_trophy_change} 🏆
                     </span>
                   )}
               </div>
            </div>
          </div>
          
          <div className="flex items-center gap-2">
            {isOpen ? <ChevronUp className="w-4 h-4 text-muted-foreground" /> : <ChevronDown className="w-4 h-4 text-muted-foreground" />}
          </div>
        </div>
      </div>

      {/* Battle Details - Collapsible */}
      {isOpen && (
        <div className="p-4 bg-muted/20 animate-in slide-in-from-top-2 duration-200">
          <div className="grid grid-cols-2 gap-4">
            {/* User Side */}
            <div>
              <div className="flex items-center gap-2 mb-2">
                <div className="w-2 h-2 rounded-full bg-blue-500" />
                <span className="text-xs font-bold text-foreground uppercase tracking-wider">
                  You
                </span>
                 <span className="text-xs text-muted-foreground ml-auto">
                    {battle.user_name}
                 </span>
              </div>
              <DeckPreview cards={battle.user_deck.cards} />
            </div>

            {/* Opponent Side */}
            <div>
               <div className="flex items-center gap-2 mb-2">
                <div className="w-2 h-2 rounded-full bg-red-500" />
                <span className="text-xs font-bold text-foreground uppercase tracking-wider">
                  Opponent
                </span>
                 <span className="text-xs text-muted-foreground ml-auto">
                    {battle.opponent_name}
                 </span>
              </div>
              <DeckPreview cards={battle.opponent_deck.cards} />
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

// Sort cards by variant: evo cards first, then hero cards, then normal cards
function sortCardsByVariant(cards: Card[]): Card[] {
  const evoCards = cards.filter(card => card.evolution_level === 1);
  const heroCards = cards.filter(card => card.evolution_level === 2);
  const normalCards = cards.filter(card => !card.evolution_level || card.evolution_level === 0);

  const sortedCards: Card[] = [];

  // First row positions 0-1: Evolution cards (up to 2)
  sortedCards.push(...evoCards.slice(0, 2));
  const evosNeeded = 2 - Math.min(evoCards.length, 2);
  if (evosNeeded > 0) {
    sortedCards.push(...normalCards.splice(0, evosNeeded));
  }

  // First row positions 2-3: Hero cards (up to 2)
  sortedCards.push(...heroCards.slice(0, 2));
  const heroesNeeded = 2 - Math.min(heroCards.length, 2);
  if (heroesNeeded > 0) {
    sortedCards.push(...normalCards.splice(0, heroesNeeded));
  }

  // Second row: Remaining normal cards, then overflow
  sortedCards.push(...normalCards);
  if (evoCards.length > 2) sortedCards.push(...evoCards.slice(2));
  if (heroCards.length > 2) sortedCards.push(...heroCards.slice(2));

  return sortedCards;
}

interface DeckPreviewProps {
  cards: Card[];
}

function DeckPreview({ cards }: DeckPreviewProps) {
  const avgElixir =
    cards.reduce((sum, card) => sum + card.elixir_cost, 0) / cards.length;
  const sortedCards = sortCardsByVariant([...cards]);

  return (
    <div className="bg-card rounded-lg p-2 border border-border">
      <div className="grid grid-cols-4 gap-1 mb-1">
        {sortedCards.slice(0, 4).map((card, index) => (
          <BattleCardDisplay key={index} card={card} />
        ))}
      </div>
      <div className="grid grid-cols-4 gap-1 mb-2">
        {sortedCards.slice(4, 8).map((card, index) => (
          <BattleCardDisplay key={index + 4} card={card} />
        ))}
      </div>
      <div className="flex items-center justify-between px-1">
          <span className="text-[10px] text-muted-foreground font-medium">Avg Elixir</span>
          <span className="text-[10px] font-bold text-foreground flex items-center gap-1">
             <div className="w-2 h-2 rounded-full bg-purple-500/50" />
             {avgElixir.toFixed(1)}
          </span>
      </div>
    </div>
  );
}

function BattleCardDisplay({ card }: { card: Card }) {
  const isEvo = card.evolution_level === 1;
  const isHero = card.evolution_level === 2;
  const cardFileName = card.name
    .toLowerCase()
    .replace(/ /g, "_")
    .replace(/\./g, "");
  const imageSuffix = isEvo ? "_evolution" : isHero ? "_hero" : "";
  const borderColor = isEvo ? 'border-purple-500/50' : isHero ? 'border-yellow-500/50' : 'border-border';

  return (
    <div
      className={cn(
        "relative aspect-3/4 rounded overflow-hidden border bg-muted/50 group hover:scale-105 transition-transform",
        borderColor
      )}
    >
      <Image
        src={`/cards/${cardFileName}/${cardFileName}${imageSuffix}.png`}
        alt={card.name}
        fill
        className="object-contain group-hover:scale-110 transition-transform duration-300"
      />
      {isEvo && (
        <div className="absolute top-0.5 left-0.5 px-1 py-px rounded bg-purple-500/90 text-white text-[6px] font-bold uppercase leading-none z-10">
          Evo
        </div>
      )}
      {isHero && (
        <div className="absolute top-0.5 left-0.5 px-1 py-px rounded bg-yellow-500/90 text-white text-[6px] font-bold uppercase leading-none z-10">
          Hero
        </div>
      )}
      <div className="absolute inset-x-0 bottom-0 bg-linear-to-t from-black/90 via-black/60 to-transparent p-1 opacity-0 group-hover:opacity-100 transition-opacity">
        <p className="text-white text-[8px] font-medium text-center truncate leading-tight">
          {card.name}
        </p>
      </div>
    </div>
  );
}
