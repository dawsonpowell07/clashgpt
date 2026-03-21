"use client";

import Image from "next/image";
import { cn } from "@/lib/utils";
import { Orbitron } from "next/font/google";
import { Settings, Swords } from "lucide-react";
import { DeckGrid } from "./deck-grid";
import { cardFileName } from "./card-icon";

const orbitron = Orbitron({ subsets: ["latin"], weight: ["700", "900"] });

// ─── Types ────────────────────────────────────────────────────────────────────

interface WinConditionCard {
  card_id: number;
  name: string;
  icon_urls: Record<string, string> | null;
}

interface MatchupDeck {
  deck_id: string | null;
  games: number;
  wins: number;
  losses: number;
  win_rate: number | null;
  cards: Array<{
    card_id: number;
    card_name: string;
    variant: string;
    slot_index: number | null;
  }>;
}

interface WinConditionMatchupData {
  card_a: WinConditionCard;
  card_b: WinConditionCard;
  total_games: number;
  wins_a: number;
  losses_a: number;
  win_rate_a: number | null;
  win_rate_b: number | null;
  top_decks_a: MatchupDeck[];
  top_decks_b: MatchupDeck[];
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

function winRateColor(pct: number | null): string {
  if (pct == null) return "text-muted-foreground";
  if (pct >= 60) return "text-emerald-400";
  if (pct >= 40) return "text-amber-400";
  return "text-rose-400";
}

const KEY_CARD_NAMES = [
  "giant",
  "royal giant",
  "golem",
  "goblin giant",
  "hog rider",
  "goblin drill",
  "goblin barrel",
  "mortar",
  "monk",
  "three musketeers",
  "royal hogs",
  "sparky",
  "graveyard",
  "p.e.k.k.a",
  "elixir golem",
  "balloon",
  "x-bow",
  "rocket",
  "ram rider",
  "boss bandit",
  "mega knight",
  "lava hound",
  "miner",
  "electro giant",
  "battle ram",
];

function getDeckName(cards: MatchupDeck["cards"]): string {
  const keys = cards
    .filter((c) => KEY_CARD_NAMES.includes(c.card_name.toLowerCase()))
    .slice(0, 2);
  return keys.length > 0
    ? keys.map((c) => c.card_name).join(" ")
    : "Mixed Deck";
}

// ─── DeckRow ──────────────────────────────────────────────────────────────────

interface DeckRowProps {
  deck: MatchupDeck;
  side: "a" | "b";
  rank: number;
}

function DeckRow({ deck, side, rank }: DeckRowProps) {
  const pct = deck.win_rate != null ? deck.win_rate * 100 : null;
  const color = winRateColor(pct);
  const deckName = getDeckName(deck.cards);

  const accentBar = side === "a" ? "bg-blue-500" : "bg-orange-500";

  return (
    <div className="bg-card border border-border/50 rounded-xl overflow-hidden shadow-sm hover:shadow-md hover:border-border/80 transition-all">
      {/* Thin accent bar at top */}
      <div className={cn("h-0.5", accentBar)} />

      {/* Header: rank + name + win rate */}
      <div className="flex items-center justify-between gap-2 px-3 pt-2 pb-1.5">
        <div className="flex items-center gap-1.5 min-w-0">
          <span className="text-[10px] font-black text-muted-foreground/30 tabular-nums shrink-0">
            #{rank}
          </span>
          <span
            className="text-xs font-semibold text-foreground truncate"
            title={deckName}
          >
            {deckName}
          </span>
        </div>
        <span
          className={cn(
            "text-sm font-black tabular-nums shrink-0",
            orbitron.className,
            color,
          )}
        >
          {pct != null ? `${pct.toFixed(1)}%` : "—"}
        </span>
      </div>

      {/* Card grid */}
      <div className="px-2 pb-2">
        <DeckGrid
          cards={deck.cards.map((c) => ({
            cardName: c.card_name,
            variant: c.variant as "normal" | "evolution" | "heroic",
          }))}
          className="grid-cols-8 gap-0.5"
        />
      </div>

      {/* Footer: games + W/L */}
      <div className="flex items-center gap-2 px-3 py-1.5 border-t border-border/20 bg-muted/15 text-[10px] tabular-nums">
        <span className="text-muted-foreground/60">
          {deck.games.toLocaleString()}g
        </span>
        <span className="text-emerald-400 font-semibold">
          {deck.wins.toLocaleString()}W
        </span>
        <span className="text-rose-400 font-semibold">
          {deck.losses.toLocaleString()}L
        </span>
      </div>
    </div>
  );
}

// ─── TopDecksColumn ───────────────────────────────────────────────────────────

interface TopDecksColumnProps {
  decks: MatchupDeck[];
  side: "a" | "b";
  cardName: string;
}

function TopDecksColumn({ decks, side, cardName }: TopDecksColumnProps) {
  const titleColor = side === "a" ? "text-blue-400" : "text-orange-400";

  return (
    <div className="p-3 space-y-2">
      <p
        className={cn(
          "text-[10px] font-bold uppercase tracking-wider mb-2",
          titleColor,
        )}
      >
        Top {cardName} Decks
      </p>
      {decks.length === 0 ? (
        <p className="text-xs text-muted-foreground/50 text-center py-4">
          No data
        </p>
      ) : (
        <div className="space-y-2">
          {decks.map((deck, i) => (
            <DeckRow
              key={`${deck.deck_id}-${i}`}
              deck={deck}
              side={side}
              rank={i + 1}
            />
          ))}
        </div>
      )}
    </div>
  );
}

// ─── WinRateSplitBar ──────────────────────────────────────────────────────────

interface WinRateSplitBarProps {
  nameA: string;
  nameB: string;
  winRateA: number | null;
  winRateB: number | null;
}

function WinRateSplitBar({
  nameA,
  nameB,
  winRateA,
  winRateB,
}: WinRateSplitBarProps) {
  const pctA = winRateA != null ? winRateA * 100 : 50;
  const pctB = winRateB != null ? winRateB * 100 : 50;
  const total = pctA + pctB || 100;
  const barA = (pctA / total) * 100;
  const barB = (pctB / total) * 100;

  return (
    <div className="px-5 py-3 border-t border-border/20">
      <div className="flex h-2 rounded-full overflow-hidden">
        <div
          className="bg-blue-500 transition-all duration-500"
          style={{ width: `${barA}%` }}
        />
        <div
          className="bg-orange-500 transition-all duration-500"
          style={{ width: `${barB}%` }}
        />
      </div>
      <div className="flex justify-between mt-1.5">
        <span className="text-[10px] text-blue-400/80 font-semibold truncate max-w-[45%]">
          {nameA}{" "}
          <span className={cn("font-black", orbitron.className)}>
            {winRateA != null ? `${(winRateA * 100).toFixed(1)}%` : "—"}
          </span>
        </span>
        <span className="text-[10px] text-orange-400/80 font-semibold truncate max-w-[45%] text-right">
          <span className={cn("font-black", orbitron.className)}>
            {winRateB != null ? `${(winRateB * 100).toFixed(1)}%` : "—"}
          </span>{" "}
          {nameB}
        </span>
      </div>
    </div>
  );
}

// ─── CardHero ─────────────────────────────────────────────────────────────────

interface CardHeroProps {
  card: WinConditionCard;
  wins: number;
  losses: number;
  winRate: number | null;
  side: "a" | "b";
}

function CardHero({ card, wins, losses, winRate, side }: CardHeroProps) {
  const pct = winRate != null ? winRate * 100 : null;
  const color = winRateColor(pct);
  const fileName = cardFileName(card.name);

  const accentText = side === "a" ? "text-blue-400" : "text-orange-400";
  const accentBorder =
    side === "a" ? "border-blue-500/30" : "border-orange-500/30";
  const accentShadow =
    side === "a"
      ? "shadow-[0_0_16px_rgba(59,130,246,0.25)]"
      : "shadow-[0_0_16px_rgba(249,115,22,0.25)]";

  const alignClass =
    side === "a" ? "items-start text-left" : "items-end text-right";

  return (
    <div className={cn("flex flex-col gap-2", alignClass)}>
      <div
        className={cn(
          "relative w-16 h-[4.5rem] rounded-xl overflow-hidden border-2 bg-muted/50 shrink-0",
          accentBorder,
          accentShadow,
          side === "b" && "self-end",
        )}
      >
        <Image
          src={`/cards/${fileName}/${fileName}.png`}
          alt={card.name}
          fill
          className="object-contain p-1"
        />
      </div>

      <p
        className={cn(
          "text-sm font-bold text-foreground leading-tight",
          accentText,
        )}
      >
        {card.name}
      </p>

      <span
        className={cn(
          "text-2xl font-black leading-none",
          orbitron.className,
          color,
        )}
      >
        {pct != null ? `${pct.toFixed(1)}%` : "—"}
      </span>

      <div className={cn("flex gap-2 text-xs font-bold", orbitron.className)}>
        <span className="text-emerald-400">{wins.toLocaleString()}W</span>
        <span className="text-rose-400">{losses.toLocaleString()}L</span>
      </div>
    </div>
  );
}

// ─── Main Component ───────────────────────────────────────────────────────────

export function WinConditionMatchup({
  data,
  className,
}: {
  data: WinConditionMatchupData;
  className?: string;
}) {
  const winsB = data.losses_a;
  const lossesB = data.wins_a;

  if (data.total_games === 0) {
    return (
      <div
        className={cn(
          "rounded-xl border border-border/40 bg-card p-5 my-4 flex items-center gap-3",
          className,
        )}
      >
        <Swords className="w-5 h-5 text-muted-foreground/40 shrink-0" />
        <p className="text-sm text-muted-foreground">
          No battles found between {data.card_a.name} and {data.card_b.name} in
          our database.
        </p>
      </div>
    );
  }

  return (
    <div
      className={cn(
        "rounded-2xl border border-border/50 bg-card overflow-hidden my-4",
        className,
      )}
    >
      <div className="h-1 bg-gradient-to-r from-blue-500 via-purple-500 to-orange-500" />

      <div className="px-5 py-4 border-b border-border/20">
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 rounded-lg bg-primary/10 flex items-center justify-center shrink-0">
            <Settings className="w-4 h-4 text-primary" />
          </div>
          <div>
            <p className="text-sm font-bold text-foreground">
              Win Condition Matchup
            </p>
            <p className="text-xs text-muted-foreground">
              {data.total_games.toLocaleString()} battles analyzed
            </p>
          </div>
        </div>
      </div>

      <div className="px-5 py-5">
        <div className="grid grid-cols-[1fr_auto_1fr] items-center gap-4">
          <CardHero
            card={data.card_a}
            wins={data.wins_a}
            losses={data.losses_a}
            winRate={data.win_rate_a}
            side="a"
          />

          <div className="flex flex-col items-center gap-1 px-2">
            <span
              className={cn(
                "text-2xl font-black text-purple-400 leading-none",
                orbitron.className,
              )}
              style={{
                textShadow:
                  "0 0 12px rgba(168,85,247,0.6), 0 0 24px rgba(168,85,247,0.3)",
              }}
            >
              VS
            </span>
          </div>

          <CardHero
            card={data.card_b}
            wins={winsB}
            losses={lossesB}
            winRate={data.win_rate_b}
            side="b"
          />
        </div>
      </div>

      <WinRateSplitBar
        nameA={data.card_a.name}
        nameB={data.card_b.name}
        winRateA={data.win_rate_a}
        winRateB={data.win_rate_b}
      />

      {(data.top_decks_a.length > 0 || data.top_decks_b.length > 0) && (
        <div className="grid grid-cols-2 divide-x divide-border/20 border-t border-border/20">
          <TopDecksColumn
            decks={data.top_decks_a}
            side="a"
            cardName={data.card_a.name}
          />
          <TopDecksColumn
            decks={data.top_decks_b}
            side="b"
            cardName={data.card_b.name}
          />
        </div>
      )}

      <p className="text-[10px] text-muted-foreground/40 text-center px-4 py-2 border-t border-border/20">
        Based on {data.total_games.toLocaleString()} battles in our database
      </p>
    </div>
  );
}
