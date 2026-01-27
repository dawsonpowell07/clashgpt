import Image from "next/image";
import { cn } from "@/lib/utils";

interface CardStatsData {
  card_id: number;
  card_name: string;
  total_uses: number;
  wins: number;
  losses: number;
  win_rate: number;
  usage_rate: number;
  deck_appearance_rate: number;
}

interface CardStatsProps {
  stats: CardStatsData;
  className?: string;
}

export function CardStats({ stats, className }: CardStatsProps) {
  // win_rate comes as decimal (0.464 = 46.4%), multiply by 100
  const winRatePercent = (stats.win_rate * 100).toFixed(1);
  // usage_rate and deck_appearance_rate come as percentages already (7.09 = 7.09%)
  const usageRatePercent = stats.usage_rate.toFixed(2);
  const deckAppearancePercent = stats.deck_appearance_rate.toFixed(1);

  const cardFileName = (stats.card_name || "unknown")
    .toLowerCase()
    .replace(/ /g, "_")
    .replace(/\./g, "");

  return (
    <div
      className={cn(
        "bg-card border border-border rounded-xl overflow-hidden shadow-sm hover:shadow-md transition-all max-w-md",
        className
      )}
    >
      {/* Header with card name */}
      <div className="px-4 py-3 bg-muted/30 border-b border-border">
        <h3 className="text-lg font-bold text-foreground">{stats.card_name}</h3>
        <p className="text-xs text-muted-foreground">Performance Statistics</p>
      </div>

      {/* Card Image and Stats Grid */}
      <div className="p-4 flex gap-4">
        {/* Card Image */}
        <div className="shrink-0">
          <div className="relative w-24 h-32 rounded-lg overflow-hidden border border-border bg-muted shadow-md">
            <Image
              src={`/cards/${cardFileName}/${cardFileName}.png`}
              alt={stats.card_name}
              fill
              className="object-contain"
            />
          </div>
        </div>

        {/* Stats Grid */}
        <div className="flex-1 grid grid-cols-2 gap-3">
          {/* Win Rate - Primary stat */}
          <div className="col-span-2 bg-muted/50 rounded-lg p-3">
            <div className="flex items-center justify-between">
              <span className="text-xs font-medium text-muted-foreground uppercase tracking-wide">
                Win Rate
              </span>
              <span
                className={cn(
                  "text-2xl font-bold",
                  parseFloat(winRatePercent) >= 55
                    ? "text-green-500"
                    : parseFloat(winRatePercent) >= 50
                    ? "text-yellow-500"
                    : "text-red-500"
                )}
              >
                {winRatePercent}%
              </span>
            </div>
            {/* Win rate bar */}
            <div className="mt-2 h-2 bg-muted rounded-full overflow-hidden">
              <div
                className={cn(
                  "h-full rounded-full transition-all",
                  parseFloat(winRatePercent) >= 55
                    ? "bg-green-500"
                    : parseFloat(winRatePercent) >= 50
                    ? "bg-yellow-500"
                    : "bg-red-500"
                )}
                style={{ width: `${Math.min(100, stats.win_rate * 100)}%` }}
              />
            </div>
          </div>

          {/* Deck Appearance Rate */}
          <div className="bg-muted/30 rounded-lg p-2.5">
            <span className="text-[10px] font-medium text-muted-foreground uppercase tracking-wide block">
              In Decks
            </span>
            <span className="text-lg font-bold text-foreground">
              {deckAppearancePercent}%
            </span>
          </div>

          {/* Usage Rate */}
          <div className="bg-muted/30 rounded-lg p-2.5">
            <span className="text-[10px] font-medium text-muted-foreground uppercase tracking-wide block">
              Usage Rate
            </span>
            <span className="text-lg font-bold text-foreground">
              {usageRatePercent}%
            </span>
          </div>

          {/* Total Uses */}
          <div className="bg-muted/30 rounded-lg p-2.5">
            <span className="text-[10px] font-medium text-muted-foreground uppercase tracking-wide block">
              Total Uses
            </span>
            <span className="text-lg font-bold text-foreground">
              {stats.total_uses.toLocaleString()}
            </span>
          </div>

          {/* W/L Record */}
          <div className="bg-muted/30 rounded-lg p-2.5">
            <span className="text-[10px] font-medium text-muted-foreground uppercase tracking-wide block">
              Record
            </span>
            <div className="flex items-center gap-1">
              <span className="text-lg font-bold text-green-500">
                {stats.wins.toLocaleString()}
              </span>
              <span className="text-muted-foreground">-</span>
              <span className="text-lg font-bold text-red-500">
                {stats.losses.toLocaleString()}
              </span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
