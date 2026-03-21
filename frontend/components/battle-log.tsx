"use client";

import { useState } from "react";
import { cn } from "@/lib/utils";
import { ChevronDown, ChevronUp, Swords } from "lucide-react";
import { DeckGrid } from "./deck-grid";

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

function evolToVariant(level: number): "normal" | "evolution" | "heroic" {
  if (level === 1) return "evolution";
  if (level === 2) return "heroic";
  return "normal";
}

export function BattleLog({ battleLog, className }: BattleLogProps) {
  const wins = battleLog.battles.filter((b) => b.user_trophy_change > 0).length;
  const draws = battleLog.battles.filter(
    (b) => b.user_trophy_change === 0,
  ).length;
  const losses = battleLog.battles.length - wins - draws;
  const winRate = Math.round((wins / (battleLog.battles.length || 1)) * 100);

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
            <div className="text-[10px] uppercase font-bold text-muted-foreground">
              Wins
            </div>
          </div>
          <div className="text-center">
            <div className="text-lg font-bold text-destructive">{losses}</div>
            <div className="text-[10px] uppercase font-bold text-muted-foreground">
              Losses
            </div>
          </div>
          {draws > 0 && (
            <div className="text-center">
              <div className="text-lg font-bold text-yellow-500">{draws}</div>
              <div className="text-[10px] uppercase font-bold text-muted-foreground">
                Draws
              </div>
            </div>
          )}
          <div className="w-px h-8 bg-border" />
          <div className="text-center">
            <div className="text-lg font-bold text-foreground">{winRate}%</div>
            <div className="text-[10px] uppercase font-bold text-muted-foreground">
              Win Rate
            </div>
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
  if (gameMode === "Ranked1v1_NewArena") return "1v1";
  const gameModeMap: Record<string, string> = {
    "2v2": "2v2",
    ChallengeMode: "Challenge",
    Tournament: "Tournament",
  };
  return gameModeMap[gameMode] || "1v1";
}

function BattleCard({ battle, defaultOpen = false }: BattleCardProps) {
  const [isOpen, setIsOpen] = useState(defaultOpen);

  const isWin = battle.user_trophy_change > 0;
  const isDraw = battle.user_trophy_change === 0;

  return (
    <div className="bg-card border border-border rounded-xl overflow-hidden shadow-sm hover:shadow-md transition-all">
      <div
        className={cn(
          "px-4 py-3 border-b border-transparent cursor-pointer hover:bg-muted/50 transition-colors",
          isOpen && "border-border",
        )}
        onClick={() => setIsOpen(!isOpen)}
      >
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div
              className={cn(
                "w-8 h-8 rounded-full flex items-center justify-center text-sm font-bold border",
                isWin && "bg-green-500/20 text-green-500 border-green-500/30",
                isDraw &&
                  "bg-yellow-500/20 text-yellow-500 border-yellow-500/30",
                !isWin &&
                  !isDraw &&
                  "bg-destructive/20 text-destructive border-destructive/30",
              )}
            >
              {isWin ? "W" : isDraw ? "D" : "L"}
            </div>

            <div className="flex flex-col">
              <div className="flex items-center gap-2">
                <span className="font-semibold text-sm text-foreground">
                  {isWin ? "Victory" : isDraw ? "Draw" : "Defeat"}
                </span>
                <span className="text-xs text-muted-foreground">•</span>
                <span className="text-xs text-muted-foreground">Ranked</span>
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
                      isWin ? "text-green-500" : "text-destructive",
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
            {isOpen ? (
              <ChevronUp className="w-4 h-4 text-muted-foreground" />
            ) : (
              <ChevronDown className="w-4 h-4 text-muted-foreground" />
            )}
          </div>
        </div>
      </div>

      {isOpen && (
        <div className="p-4 bg-muted/20 animate-in slide-in-from-top-2 duration-200">
          <div className="grid grid-cols-2 gap-4">
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

function DeckPreview({ cards }: { cards: Card[] }) {
  const avgElixir =
    cards.reduce((sum, card) => sum + card.elixir_cost, 0) / cards.length;

  return (
    <div className="bg-card rounded-lg p-2 border border-border">
      <DeckGrid
        cards={cards.map((c) => ({
          cardName: c.name,
          variant: evolToVariant(c.evolution_level),
        }))}
        className="mb-2"
      />
      <div className="flex items-center justify-between px-1">
        <span className="text-[10px] text-muted-foreground font-medium">
          Avg Elixir
        </span>
        <span className="text-[10px] font-bold text-foreground flex items-center gap-1">
          <div className="w-2 h-2 rounded-full bg-purple-500/50" />
          {avgElixir.toFixed(1)}
        </span>
      </div>
    </div>
  );
}
