"use client";

import { useState, useEffect } from "react";
import { useParams, useSearchParams } from "next/navigation";
import { CardIcon } from "@/components/card-icon";
import { cn } from "@/lib/utils";
import {
  Crown,
  Zap,
  Swords,
  ArrowLeft,
  Loader2,
  TrendingUp,
  TrendingDown,
} from "lucide-react";

const API_URL = "/api/backend";

interface BattleCard {
  card_id: number;
  card_name: string;
  variant: string | null;
  slot_index: number;
}

interface BattleDetail {
  battle_id: string;
  battle_time: string | null;
  game_mode: string | null;
  result: "Win" | "Loss";
  crowns: number | null;
  elixir_leaked: number | null;
  opponent: string | null;
  deck_id: string | null;
  player_cards: BattleCard[];
  opponent_deck_id: string | null;
  opponent_cards: BattleCard[];
  starting_trophies: number | null;
  trophy_change: number | null;
  player_name: string | null;
}

function formatGameMode(gameMode: string | null): string {
  if (!gameMode) return "Ranked";
  if (gameMode === "TrophyRoad") return "Trophy Road";
  if (gameMode === "ChaosMode") return "Chaos Mode";
  if (gameMode === "RetroRoyale") return "Retro Royale";
  if (gameMode.startsWith("Ranked")) return "Ranked";
  return gameMode;
}

function toUtcDate(iso: string): Date {
  const normalized =
    iso.includes("Z") || iso.includes("+")
      ? iso
      : iso.replace(" ", "T") + "Z";
  return new Date(normalized);
}

function fmtDate(iso: string | null) {
  if (!iso) return "—";
  return toUtcDate(iso).toLocaleDateString(undefined, {
    weekday: "short",
    month: "short",
    day: "numeric",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

function sortCards(cards: BattleCard[]) {
  return [
    ...cards.filter((c) => c.variant === "evolution"),
    ...cards.filter((c) => c.variant === "heroic"),
    ...cards.filter((c) => c.variant === "normal" || !c.variant),
  ].slice(0, 8);
}

function DeckGrid({
  cards,
  label,
  playerName,
}: {
  cards: BattleCard[];
  label: string;
  playerName: string | null;
}) {
  const sorted = sortCards(cards);

  return (
    <div className="flex flex-col gap-3">
      <p className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground/60 text-center">
        {label}
      </p>
      {sorted.length === 0 ? (
        <div className="flex items-center justify-center h-24 rounded-xl border border-border/40 bg-muted/20">
          <p className="text-xs text-muted-foreground/50">No deck data</p>
        </div>
      ) : (
        <div className="grid grid-cols-4 gap-1.5">
          {sorted.map((card, i) => (
            <CardIcon
              key={i}
              cardName={card.card_name}
              variant={
                (card.variant ?? "normal") as "normal" | "evolution" | "heroic"
              }
            />
          ))}
        </div>
      )}
      {playerName && (
        <p className="text-xs text-muted-foreground text-center truncate">
          {playerName}
        </p>
      )}
    </div>
  );
}

export default function ProfileBattleDetailPage() {
  const params = useParams();
  const searchParams = useSearchParams();
  const battleId = decodeURIComponent(params.battleId as string);
  const playerTag = searchParams.get("player") ?? "";

  const [battle, setBattle] = useState<BattleDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [hasOpener, setHasOpener] = useState(false);

  useEffect(() => {
    setHasOpener(window.opener !== null);
  }, []);

  useEffect(() => {
    if (!playerTag) {
      setError("Missing player tag.");
      setLoading(false);
      return;
    }

    setLoading(true);
    setError(null);

    fetch(
      `${API_URL}/api/players/${encodeURIComponent(playerTag)}/battles/${encodeURIComponent(battleId)}`
    )
      .then(async (res) => {
        if (!res.ok) {
          const body = await res.json().catch(() => ({}));
          throw new Error(body.detail ?? `Request failed (${res.status})`);
        }
        return res.json() as Promise<BattleDetail>;
      })
      .then((data) => setBattle(data))
      .catch((e) => setError(e.message))
      .finally(() => setLoading(false));
  }, [battleId, playerTag]);

  const isWin = battle?.result === "Win";

  return (
    <div className="min-h-screen bg-background">
      <div className="max-w-3xl mx-auto px-4 py-8">
        {/* Top navigation */}
        <div className="mb-6">
          {hasOpener ? (
            <button
              onClick={() => window.close()}
              className="flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground transition-colors"
            >
              <ArrowLeft className="w-4 h-4" />
              Close Tab
            </button>
          ) : (
            <a
              href="/profiles"
              className="flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground transition-colors"
            >
              <ArrowLeft className="w-4 h-4" />
              Back to Profiles
            </a>
          )}
        </div>

        {/* Loading */}
        {loading && (
          <div className="flex items-center justify-center py-24">
            <Loader2 className="w-8 h-8 animate-spin text-muted-foreground/40" />
          </div>
        )}

        {/* Error */}
        {!loading && error && (
          <div className="rounded-2xl border border-red-500/20 bg-red-500/5 p-10 text-center space-y-2">
            <p className="font-[family-name:var(--font-heading)] text-lg font-bold text-red-400">
              Battle not found
            </p>
            <p className="text-sm text-muted-foreground">{error}</p>
          </div>
        )}

        {/* Content */}
        {!loading && !error && battle && (
          <div className="space-y-6">
            {/* Header */}
            <div className="flex flex-wrap items-center gap-3">
              <span
                className={cn(
                  "text-sm font-black uppercase tracking-widest px-3 py-1.5 rounded-lg",
                  isWin
                    ? "bg-emerald-500/20 text-emerald-400"
                    : "bg-red-500/20 text-red-400"
                )}
              >
                {isWin ? "WIN" : "LOSS"}
              </span>
              <div className="flex items-center gap-1.5 text-sm text-muted-foreground">
                <Swords className="w-3.5 h-3.5" />
                <span>{formatGameMode(battle.game_mode)}</span>
              </div>
              <p className="text-sm text-muted-foreground ml-auto">
                {fmtDate(battle.battle_time)}
              </p>
            </div>

            {/* Decks */}
            <div className="rounded-2xl border border-border/50 bg-card/40 p-5">
              {/* Mobile: stacked */}
              <div className="flex flex-col gap-5 md:hidden">
                <DeckGrid
                  cards={battle.player_cards}
                  label="Player Deck"
                  playerName={battle.player_name ?? playerTag}
                />
                <div className="flex items-center gap-3">
                  <div className="flex-1 h-px bg-border/40" />
                  <span className="text-xs font-bold uppercase tracking-widest text-muted-foreground/50">
                    VS
                  </span>
                  <div className="flex-1 h-px bg-border/40" />
                </div>
                <DeckGrid
                  cards={battle.opponent_cards}
                  label="Opponent Deck"
                  playerName={battle.opponent}
                />
              </div>

              {/* Desktop: side by side */}
              <div className="hidden md:grid md:grid-cols-[1fr_auto_1fr] gap-5 items-start">
                <DeckGrid
                  cards={battle.player_cards}
                  label="Player Deck"
                  playerName={battle.player_name ?? playerTag}
                />
                <div className="flex flex-col items-center justify-center self-stretch">
                  <div className="flex-1 w-px bg-border/40" />
                  <span className="text-xs font-bold uppercase tracking-widest text-muted-foreground/50 py-2">
                    VS
                  </span>
                  <div className="flex-1 w-px bg-border/40" />
                </div>
                <DeckGrid
                  cards={battle.opponent_cards}
                  label="Opponent Deck"
                  playerName={battle.opponent}
                />
              </div>
            </div>

            {/* Stats */}
            <div className="rounded-2xl border border-border/50 bg-card/40 p-5 sm:p-7">
              <p className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground/60 mb-5">
                Battle Stats
              </p>
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 sm:gap-6">
                <div className="flex flex-col gap-2 bg-muted/30 border border-border/40 rounded-xl p-4 sm:p-5">
                  <Crown className="w-5 h-5 sm:w-6 sm:h-6 text-amber-400" />
                  <p className="text-[10px] text-muted-foreground uppercase tracking-widest font-bold">
                    Crowns
                  </p>
                  <p className="text-2xl sm:text-3xl font-black font-[family-name:var(--font-heading)] text-amber-400 leading-none">
                    {battle.crowns ?? "—"}
                  </p>
                </div>
                <div className="flex flex-col gap-2 bg-muted/30 border border-border/40 rounded-xl p-4 sm:p-5">
                  <Zap className="w-5 h-5 sm:w-6 sm:h-6 text-purple-400" />
                  <p className="text-[10px] text-muted-foreground uppercase tracking-widest font-bold">
                    Elixir Leaked
                  </p>
                  <p className="text-2xl sm:text-3xl font-black font-[family-name:var(--font-heading)] text-purple-400 leading-none">
                    {battle.elixir_leaked !== null
                      ? battle.elixir_leaked.toFixed(1)
                      : "—"}
                  </p>
                </div>
                <div className="flex flex-col gap-2 bg-muted/30 border border-border/40 rounded-xl p-4 sm:p-5 min-w-0">
                  <Swords className="w-5 h-5 sm:w-6 sm:h-6 text-muted-foreground/60" />
                  <p className="text-[10px] text-muted-foreground uppercase tracking-widest font-bold">
                    Game Mode
                  </p>
                  <p className="text-lg sm:text-xl font-black font-[family-name:var(--font-heading)] text-foreground leading-none">
                    {formatGameMode(battle.game_mode)}
                  </p>
                </div>
                {battle.trophy_change !== null && (
                  <div
                    className={cn(
                      "flex flex-col gap-2 border rounded-xl p-4 sm:p-5",
                      battle.trophy_change > 0
                        ? "bg-emerald-500/10 border-emerald-500/20"
                        : "bg-red-500/10 border-red-500/20"
                    )}
                  >
                    {battle.trophy_change > 0 ? (
                      <TrendingUp className="w-5 h-5 sm:w-6 sm:h-6 text-emerald-400" />
                    ) : (
                      <TrendingDown className="w-5 h-5 sm:w-6 sm:h-6 text-red-400" />
                    )}
                    <p className="text-[10px] text-muted-foreground uppercase tracking-widest font-bold">
                      Medals
                    </p>
                    <p
                      className={cn(
                        "text-2xl sm:text-3xl font-black font-[family-name:var(--font-heading)] leading-none",
                        battle.trophy_change > 0
                          ? "text-emerald-400"
                          : "text-red-400"
                      )}
                    >
                      {battle.trophy_change > 0 ? "+" : ""}
                      {battle.trophy_change}
                    </p>
                    {battle.starting_trophies !== null && (
                      <p className="text-[10px] text-muted-foreground">
                        from {battle.starting_trophies}
                      </p>
                    )}
                  </div>
                )}
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
