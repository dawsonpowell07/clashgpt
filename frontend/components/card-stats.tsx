import Image from "next/image";
import { cn } from "@/lib/utils";
import {
  PieChart,
  Pie,
  Cell,
  Label,
  ResponsiveContainer,
  Tooltip,
} from "recharts";

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
  const winRatePercent = (stats.win_rate * 100).toFixed(1);
  const deckAppearancePercent = stats.deck_appearance_rate.toFixed(1);

  const cardFileName = (stats.card_name || "unknown")
    .toLowerCase()
    .replace(/ /g, "_")
    .replace(/\./g, "");

  const wrValue = parseFloat(winRatePercent);

  return (
    <div
      className={cn(
        "bg-card border border-border rounded-xl overflow-hidden shadow-sm hover:shadow-md transition-all w-full max-w-lg",
        className,
      )}
    >
      {/* Header */}
      <div className="flex items-center gap-4 px-5 py-4 bg-muted/30 border-b border-border">
        <div className="relative w-16 h-20 rounded-lg overflow-hidden border border-border bg-muted shadow-md shrink-0">
          <Image
            src={`/cards/${cardFileName}/${cardFileName}.png`}
            alt={stats.card_name}
            fill
            className="object-contain"
          />
        </div>
        <div>
          <h3 className="text-xl font-bold text-foreground">
            {stats.card_name}
          </h3>
          <p className="text-xs text-muted-foreground mt-0.5">
            Performance Statistics
          </p>
          <div className="flex items-center gap-2 mt-2">
            <span className="text-xs px-2 py-0.5 rounded-full bg-muted/60 border border-border text-muted-foreground">
              {stats.total_uses.toLocaleString()} uses
            </span>
            <span className="text-xs px-2 py-0.5 rounded-full bg-muted/60 border border-border text-green-400">
              {stats.wins.toLocaleString()}W
            </span>
            <span className="text-xs px-2 py-0.5 rounded-full bg-muted/60 border border-border text-red-400">
              {stats.losses.toLocaleString()}L
            </span>
          </div>
        </div>
      </div>

      {/* Charts row */}
      <div className="grid grid-cols-2 divide-x divide-border">
        {/* Win Rate donut */}
        <div className="flex flex-col items-center py-4 px-3">
          <p className="text-[10px] font-semibold text-muted-foreground uppercase tracking-widest mb-1">
            Win Rate
          </p>
          <div className="w-full h-36">
            <WinRateDonut
              wins={stats.wins}
              losses={stats.losses}
              winRatePercent={winRatePercent}
            />
          </div>
        </div>

        {/* Deck appearance */}
        <div className="flex flex-col items-center justify-center py-4 px-3 gap-1">
          <p className="text-[10px] font-semibold text-muted-foreground uppercase tracking-widest">
            In Decks
          </p>
          <p className="text-4xl font-bold text-foreground tabular-nums">
            {deckAppearancePercent}%
          </p>
          <p className="text-xs text-muted-foreground">of all decks</p>
        </div>
      </div>
    </div>
  );
}

function WinRateDonut({
  wins,
  losses,
  winRatePercent,
}: {
  wins: number;
  losses: number;
  winRatePercent: string;
}) {
  const data = [
    { name: "Wins", value: wins },
    { name: "Losses", value: losses },
  ];

  return (
    <ResponsiveContainer width="100%" height="100%">
      <PieChart>
        <defs>
          <linearGradient id="pieCardStatsBlueGrad" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="#60a5fa" />
            <stop offset="100%" stopColor="#2563eb" />
          </linearGradient>
          <linearGradient id="pieCardStatsRedGrad" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="#f87171" />
            <stop offset="100%" stopColor="#dc2626" />
          </linearGradient>
        </defs>
        <Pie
          data={data}
          cx="50%"
          cy="50%"
          innerRadius={38}
          outerRadius={56}
          dataKey="value"
          strokeWidth={0}
          isAnimationActive={false}
          paddingAngle={3}
          cornerRadius={4}
        >
          <Cell fill="url(#pieCardStatsBlueGrad)" />
          <Cell fill="url(#pieCardStatsRedGrad)" />
          <Label
            value={`${winRatePercent}%`}
            position="center"
            style={{ fontSize: "16px", fontWeight: 700, fill: "#f3f4f6" }}
          />
        </Pie>
        <Tooltip
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          formatter={(value: any, name: any) => [
            value?.toLocaleString() ?? "",
            name,
          ]}
          contentStyle={{
            background: "#1e2433",
            border: "1px solid #3d4560",
            borderRadius: "8px",
            fontSize: "12px",
          }}
          itemStyle={{ color: "#e5e7eb" }}
          labelStyle={{ color: "#9ca3af", display: "none" }}
        />
      </PieChart>
    </ResponsiveContainer>
  );
}
