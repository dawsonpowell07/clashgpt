import Image from "next/image";
import { cn } from "@/lib/utils";

interface Card {
  id: string;
  name: string;
  elixir_cost: number;
  icon_urls: Record<string, string>;
  rarity: string;
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
  return (
    <div className={cn("space-y-4", className)}>
      <div className="flex items-center justify-between">
        <h2 className="text-xl font-bold text-foreground">Recent Battles</h2>
        <span className="text-sm text-muted-foreground">
          {battleLog.battles.length} battles
        </span>
      </div>

      <div className="space-y-3">
        {battleLog.battles.map((battle, index) => (
          <BattleCard key={index} battle={battle} />
        ))}
      </div>
    </div>
  );
}

interface BattleCardProps {
  battle: Battle;
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

function BattleCard({ battle }: BattleCardProps) {
  const isWin = battle.user_trophy_change > 0;
  const isDraw = battle.user_trophy_change === 0;

  return (
    <div className="bg-card border border-border rounded-xl overflow-hidden shadow-sm hover:shadow-md transition-all">
      {/* Header */}
      <div
        className={cn(
          "px-4 py-3 border-b border-border",
          isWin && "bg-green-500/10 border-green-500/20",
          isDraw && "bg-yellow-500/10 border-yellow-500/20",
          !isWin && !isDraw && "bg-destructive/10 border-destructive/20"
        )}
      >
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div
              className={cn(
                "w-10 h-10 rounded-full flex items-center justify-center text-2xl font-bold",
                isWin && "bg-green-500/20 text-green-400",
                isDraw && "bg-yellow-500/20 text-yellow-400",
                !isWin && !isDraw && "bg-destructive/20 text-destructive"
              )}
            >
              {isWin ? "W" : isDraw ? "D" : "L"}
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="font-semibold text-foreground">
                  {formatGameMode(battle.game_mode_name)}
                </span>
                <span
                  className={cn(
                    "text-sm font-medium",
                    isWin && "text-green-400",
                    isDraw && "text-yellow-400",
                    !isWin && !isDraw && "text-destructive"
                  )}
                >
                  {battle.user_trophy_change > 0 && "+"}
                  {battle.user_trophy_change} 🏆
                </span>
              </div>
              <div className="text-xs text-muted-foreground">
                {battle.arena.name}
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Battle Details */}
      <div className="p-4">
        <div className="grid grid-cols-2 gap-4">
          {/* User Side */}
          <div>
            <div className="flex items-center justify-between mb-2">
              <span className="text-sm font-semibold text-foreground">
                {battle.user_name}
              </span>
            </div>
            <DeckPreview cards={battle.user_deck.cards} />
          </div>

          {/* Opponent Side */}
          <div>
            <div className="flex items-center justify-between mb-2">
              <span className="text-sm font-semibold text-foreground">
                {battle.opponent_name}
              </span>
            </div>
            <DeckPreview cards={battle.opponent_deck.cards} />
          </div>
        </div>
      </div>
    </div>
  );
}

interface DeckPreviewProps {
  cards: Card[];
}

function DeckPreview({ cards }: DeckPreviewProps) {
  const avgElixir =
    cards.reduce((sum, card) => sum + card.elixir_cost, 0) / cards.length;

  return (
    <div>
      <div className="grid grid-cols-4 gap-1 mb-2">
        {cards.map((card, index) => (
          <div
            key={index}
            className="relative aspect-3/4 rounded overflow-hidden border border-border bg-muted"
          >
            <Image
              src={`/cards/${card.name
                .toLowerCase()
                .replace(/ /g, "_")}/${card.name
                .toLowerCase()
                .replace(/ /g, "_")}.png`}
              alt={card.name}
              fill
              className="object-contain"
            />
            <div className="absolute top-0.5 right-0.5 w-4 h-4 flex items-center justify-center rounded-full bg-primary/90 text-primary-foreground text-[8px] font-bold">
              {card.elixir_cost}
            </div>
          </div>
        ))}
      </div>
      <div className="text-xs text-muted-foreground text-center">
        Avg Elixir: {avgElixir.toFixed(1)}
      </div>
    </div>
  );
}
