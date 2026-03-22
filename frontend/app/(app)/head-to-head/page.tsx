"use client";

import { useState, useCallback, useEffect } from "react";
import Image from "next/image";
import { Orbitron } from "next/font/google";
import {
  AlertTriangle,
  RefreshCw,
  Swords,
  X,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { WinConditionMatchup } from "@/components/win-condition-matchup";
import { CardIcon, cardFileName } from "@/components/card-icon";

const orbitron = Orbitron({ subsets: ["latin"], weight: ["700", "900"] });

const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000";

// ─── Win Condition IDs ────────────────────────────────────────────────────────

const WIN_CONDITION_IDS = new Set([
  27000002, 26000024, 26000067, 26000036, 26000021, 26000003, 26000059,
  26000058, 28000004, 27000013, 26000006, 26000060, 26000085, 27000008,
  26000009, 26000032, 26000051, 28000010, 26000029, 26000028, 28000003,
  26000056,
]);

// ─── Types ────────────────────────────────────────────────────────────────────

interface Card {
  card_id: number;
  name: string;
  elixir_cost: number | null;
  rarity: string | null;
  card_type: string | null;
  can_evolve: boolean;
  can_be_heroic: boolean;
  icon_urls: Record<string, string> | null;
}

interface WinConditionMatchupData {
  card_a: {
    card_id: number;
    name: string;
    icon_urls: Record<string, string> | null;
  };
  card_b: {
    card_id: number;
    name: string;
    icon_urls: Record<string, string> | null;
  };
  total_games: number;
  wins_a: number;
  losses_a: number;
  win_rate_a: number | null;
  win_rate_b: number | null;
  top_decks_a: Array<{
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
  }>;
  top_decks_b: Array<{
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
  }>;
}

// ─── CardPickerTile ───────────────────────────────────────────────────────────

interface CardPickerTileProps {
  card: Card;
  selectionState: "none" | "selected-a" | "selected-b" | "disabled";
  onSelect: () => void;
}

function CardPickerTile({
  card,
  selectionState,
  onSelect,
}: CardPickerTileProps) {
  const isSelectedA = selectionState === "selected-a";
  const isSelectedB = selectionState === "selected-b";
  const isDisabled = selectionState === "disabled";

  return (
    <button
      onClick={onSelect}
      disabled={isDisabled}
      className={cn(
        "relative flex flex-col items-center rounded-xl overflow-hidden transition-all duration-150",
        "focus:outline-none focus-visible:ring-2 focus-visible:ring-ring",
        isDisabled && "opacity-30 cursor-not-allowed",
        !isDisabled && "cursor-pointer",
      )}
    >
      {/* Card image — CardIcon style with selection border override */}
      <div
        className={cn(
          "relative w-full aspect-[3/4] rounded-lg overflow-hidden border-2 bg-muted group shadow-md",
          "transition-all duration-300",
          !isDisabled &&
            "hover:scale-[1.15] hover:z-20 hover:rotate-2 hover:shadow-lg",
          isSelectedA && "shadow-[0_0_12px_rgba(59,130,246,0.5)]",
          isSelectedB && "shadow-[0_0_12px_rgba(249,115,22,0.5)]",
        )}
        style={{
          borderColor: isSelectedA
            ? "rgb(59,130,246)"
            : isSelectedB
              ? "rgb(249,115,22)"
              : "rgba(255,255,255,0.1)",
        }}
        title={card.name}
      >
        <Image
          src={`/cards/${cardFileName(card.name)}/${cardFileName(card.name)}.png`}
          alt={card.name}
          fill
          className="object-contain p-0.5 relative z-10 group-hover:scale-105 transition-transform duration-300"
        />
        {/* Card name hover overlay — same as CardIcon */}
        <div className="absolute inset-x-0 bottom-0 p-1.5 pt-4 opacity-0 group-hover:opacity-100 transition-opacity duration-200 z-20">
          <p className="text-white text-[10px] font-bold text-center truncate drop-shadow-[0_2px_4px_rgba(0,0,0,0.8)]">
            {card.name}
          </p>
        </div>
      </div>

      {/* Card name label below the tile */}
      <span className="w-full mt-0.5 px-0.5 text-center text-[9px] font-medium leading-tight truncate text-foreground/70">
        {card.name}
      </span>
    </button>
  );
}

// ─── SelectedCardPreview ──────────────────────────────────────────────────────

interface SelectedCardPreviewProps {
  card: Card | null;
  side: "a" | "b";
  onClear: () => void;
}

function SelectedCardPreview({
  card,
  side,
  onClear,
}: SelectedCardPreviewProps) {
  const isA = side === "a";
  const accentText = isA ? "text-blue-400" : "text-orange-400";
  const accentBorder = isA ? "border-blue-500/40" : "border-orange-500/40";
  const accentBg = isA ? "bg-blue-500/5" : "bg-orange-500/5";
  const accentShadow = isA
    ? "shadow-[0_0_20px_rgba(59,130,246,0.18)]"
    : "shadow-[0_0_20px_rgba(249,115,22,0.18)]";
  const label = isA ? "Your Win Condition" : "Opponent's Win Condition";

  if (!card) {
    return (
      <div
        className={cn(
          "flex flex-col items-center justify-center gap-2 rounded-xl border-2 border-dashed p-5 h-28",
          isA ? "border-blue-500/20" : "border-orange-500/20",
          isA ? "bg-blue-500/3" : "bg-orange-500/3",
        )}
      >
        <div
          className={cn(
            "w-10 h-10 rounded-lg border-2 border-dashed flex items-center justify-center",
            isA ? "border-blue-500/30" : "border-orange-500/30",
          )}
        >
          <span
            className={cn(
              "text-xl font-black",
              orbitron.className,
              accentText,
              "opacity-30",
            )}
          >
            {isA ? "A" : "B"}
          </span>
        </div>
        <p className={cn("text-xs font-semibold", accentText, "opacity-50")}>
          {label}
        </p>
      </div>
    );
  }

  return (
    <div
      className={cn(
        "relative flex items-center gap-4 rounded-xl border-2 p-4 h-28 transition-all",
        accentBorder,
        accentBg,
        accentShadow,
      )}
    >
      {/* Card image — shared CardIcon component */}
      <div className="w-16 shrink-0">
        <CardIcon cardName={card.name} variant="normal" />
      </div>

      {/* Info */}
      <div className="flex flex-col gap-1 min-w-0 flex-1">
        <p
          className={cn(
            "text-[10px] font-bold uppercase tracking-wider",
            accentText,
          )}
        >
          {label}
        </p>
        <p className="text-sm font-bold text-foreground leading-tight truncate">
          {card.name}
        </p>
        {card.elixir_cost != null && (
          <p className="text-xs text-muted-foreground">
            {card.elixir_cost} elixir
          </p>
        )}
      </div>

      {/* Clear button */}
      <button
        onClick={onClear}
        className="absolute top-2 right-2 w-5 h-5 rounded-full bg-muted/60 hover:bg-destructive/20 hover:text-destructive flex items-center justify-center transition-colors"
        title="Clear selection"
      >
        <X className="w-3 h-3" />
      </button>
    </div>
  );
}

// ─── CardGrid ─────────────────────────────────────────────────────────────────

interface CardGridProps {
  cards: Card[];
  selectedA: number | null;
  selectedB: number | null;
  side: "a" | "b";
  onSelect: (cardId: number) => void;
}

function CardGrid({
  cards,
  selectedA,
  selectedB,
  side,
  onSelect,
}: CardGridProps) {
  return (
    <div className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-4 gap-2 overflow-y-auto max-h-[320px] pr-1">
      {cards.map((card) => {
        const isThisSideSelected =
          side === "a"
            ? selectedA === card.card_id
            : selectedB === card.card_id;
        const isOtherSideSelected =
          side === "a"
            ? selectedB === card.card_id
            : selectedA === card.card_id;

        let state: "none" | "selected-a" | "selected-b" | "disabled";
        if (isThisSideSelected) {
          state = side === "a" ? "selected-a" : "selected-b";
        } else if (isOtherSideSelected) {
          state = "disabled";
        } else {
          state = "none";
        }

        return (
          <CardPickerTile
            key={card.card_id}
            card={card}
            selectionState={state}
            onSelect={() => onSelect(card.card_id)}
          />
        );
      })}
    </div>
  );
}

// ─── Page ─────────────────────────────────────────────────────────────────────

export default function HeadToHeadPage() {
  const [allCards, setAllCards] = useState<Card[]>([]);
  const [winConditionCards, setWinConditionCards] = useState<Card[]>([]);
  const [isLoadingCards, setIsLoadingCards] = useState(true);
  const [cardsError, setCardsError] = useState<string | null>(null);

  const [selectedA, setSelectedA] = useState<number | null>(null);
  const [selectedB, setSelectedB] = useState<number | null>(null);

  const [matchupData, setMatchupData] =
    useState<WinConditionMatchupData | null>(null);
  const [isAnalysing, setIsAnalysing] = useState(false);
  const [searchError, setSearchError] = useState<string | null>(null);

  const fetchCards = useCallback(async () => {
    setIsLoadingCards(true);
    setCardsError(null);
    try {
      const res = await fetch(`${API_BASE_URL}/api/cards`);
      if (!res.ok) throw new Error("Failed to fetch cards");
      const data = await res.json();
      const cards: Card[] = data.cards || [];
      setAllCards(cards);
      setWinConditionCards(
        cards.filter((c) => WIN_CONDITION_IDS.has(c.card_id)),
      );
    } catch {
      setCardsError(
        "Failed to load win conditions. Please check your connection.",
      );
    } finally {
      setIsLoadingCards(false);
    }
  }, []);

  useEffect(() => {
    fetchCards();
  }, [fetchCards]);

  const cardMapById = new Map(allCards.map((c) => [c.card_id, c]));

  const cardA = selectedA != null ? (cardMapById.get(selectedA) ?? null) : null;
  const cardB = selectedB != null ? (cardMapById.get(selectedB) ?? null) : null;

  const canAnalyse = selectedA != null && selectedB != null && !isAnalysing;

  const handleSelectA = (cardId: number) => {
    setSelectedA((prev) => (prev === cardId ? null : cardId));
    setMatchupData(null);
    setSearchError(null);
  };

  const handleSelectB = (cardId: number) => {
    setSelectedB((prev) => (prev === cardId ? null : cardId));
    setMatchupData(null);
    setSearchError(null);
  };

  const handleClear = () => {
    setSelectedA(null);
    setSelectedB(null);
    setMatchupData(null);
    setSearchError(null);
  };

  const handleSwap = () => {
    setSelectedA(selectedB);
    setSelectedB(selectedA);
    setMatchupData(null);
    setSearchError(null);
  };

  const handleAnalyse = useCallback(async () => {
    if (selectedA == null || selectedB == null) return;
    setIsAnalysing(true);
    setSearchError(null);
    setMatchupData(null);
    try {
      const params = new URLSearchParams({
        card_a: selectedA.toString(),
        card_b: selectedB.toString(),
      });
      const res = await fetch(
        `${API_BASE_URL}/api/win-condition-matchup?${params}`,
      );
      if (res.status === 429) {
        setSearchError(
          "Too many requests — please wait before searching again.",
        );
        return;
      }
      if (!res.ok) {
        const body = await res.json().catch(() => ({}));
        setSearchError(body.detail || "Failed to fetch matchup data.");
        return;
      }
      setMatchupData(await res.json());
    } catch {
      setSearchError("Failed to fetch matchup data. Please try again.");
    } finally {
      setIsAnalysing(false);
    }
  }, [selectedA, selectedB]);

  return (
    <div className="min-h-screen bg-background text-foreground pb-24 relative overflow-hidden">
      {/* Ambient background */}
      <div className="fixed inset-0 hexagon-pattern opacity-[0.025] pointer-events-none" />
      <div
        className="fixed top-0 right-0 w-[600px] h-[600px] rounded-full pointer-events-none"
        style={{
          background:
            "radial-gradient(circle, rgba(59,130,246,0.07) 0%, transparent 70%)",
        }}
      />
      <div
        className="fixed bottom-0 left-0 w-[500px] h-[500px] rounded-full pointer-events-none"
        style={{
          background:
            "radial-gradient(circle, rgba(249,115,22,0.07) 0%, transparent 70%)",
        }}
      />
      <div
        className="fixed top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[700px] h-[400px] rounded-full pointer-events-none"
        style={{
          background:
            "radial-gradient(circle, rgba(168,85,247,0.04) 0%, transparent 70%)",
        }}
      />

      <div className="w-full max-w-[1200px] mx-auto px-4 sm:px-6 lg:px-8 py-10 relative z-10 space-y-10">
        {/* ── Header ──────────────────────────────────────────────────── */}
        <div className="relative">
          <div className="w-12 h-0.5 bg-primary mb-4 rounded-full" />

          <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-4">
            <div>
              <p className="text-xs font-semibold uppercase tracking-[0.25em] text-primary/80 mb-2">
                Win Condition
              </p>
              <h1 className="font-[family-name:var(--font-heading)] text-5xl sm:text-7xl font-extrabold tracking-tight leading-none">
                <span className="bg-gradient-to-br from-foreground via-foreground/90 to-foreground/60 bg-clip-text text-transparent">
                  Head
                </span>
                <br />
                <span className="bg-gradient-to-r from-primary via-primary/90 to-amber-300 bg-clip-text text-transparent battle-glow">
                  to Head
                </span>
              </h1>
            </div>
            <p className="text-sm text-muted-foreground max-w-xs leading-relaxed pb-1">
              Select two win conditions to see how they match up in real battles
            </p>
          </div>

          <div className="mt-6 h-px bg-gradient-to-r from-primary/40 via-border/50 to-transparent" />
        </div>

        {/* ── Picker Panel ────────────────────────────────────────────── */}
        <div className="relative rounded-2xl border border-border/50 bg-card overflow-hidden shadow-2xl shadow-black/20">
          {/* Top accent bar */}
          <div className="h-0.5 bg-gradient-to-r from-blue-500 via-purple-500 to-orange-500" />

          {/* Panel header */}
          <div className="flex flex-wrap items-start sm:items-center justify-between gap-3 px-4 sm:px-6 pt-5 pb-4 border-b border-border/30">
            <div className="flex items-center gap-3">
              <div className="w-8 h-8 rounded-lg bg-primary/10 flex items-center justify-center">
                <Swords className="w-4 h-4 text-primary" />
              </div>
              <div>
                <h2 className="font-[family-name:var(--font-heading)] text-lg font-bold tracking-tight text-foreground">
                  Choose Your Cards
                </h2>
                <p className="text-xs text-muted-foreground mt-0.5">
                  Select one win condition for each side
                </p>
              </div>
            </div>

            {/* Action buttons */}
            <div className="flex items-center gap-2 shrink-0">
              {/* Clear */}
              <button
                onClick={handleClear}
                disabled={selectedA == null && selectedB == null}
                className="flex items-center gap-1.5 px-3 py-1.5 text-sm rounded-lg border border-border/50 text-muted-foreground hover:text-destructive hover:border-destructive/40 hover:bg-destructive/5 transition-all disabled:opacity-30 disabled:cursor-not-allowed"
              >
                <X className="w-3.5 h-3.5" />
                Clear
              </button>

              {/* Analyze */}
              <button
                onClick={handleAnalyse}
                disabled={!canAnalyse}
                className={cn(
                  "flex items-center gap-2 px-5 py-2 text-sm font-semibold rounded-lg transition-all",
                  "bg-gradient-to-r from-primary to-amber-500 text-primary-foreground shadow-lg",
                  "hover:from-primary/90 hover:to-amber-500/90 hover:shadow-primary/30 hover:-translate-y-0.5",
                  "disabled:opacity-40 disabled:cursor-not-allowed disabled:translate-y-0 disabled:shadow-none",
                )}
              >
                {isAnalysing ? (
                  <RefreshCw className="w-4 h-4 animate-spin" />
                ) : (
                  <Swords className="w-4 h-4" />
                )}
                Analyze
              </button>
            </div>
          </div>

          {/* Selection previews */}
          <div className="grid grid-cols-2 gap-4 px-4 sm:px-6 pt-5 pb-4 border-b border-border/20 bg-muted/5">
            <SelectedCardPreview
              card={cardA}
              side="a"
              onClear={() => {
                setSelectedA(null);
                setMatchupData(null);
                setSearchError(null);
              }}
            />
            <SelectedCardPreview
              card={cardB}
              side="b"
              onClear={() => {
                setSelectedB(null);
                setMatchupData(null);
                setSearchError(null);
              }}
            />
          </div>

          {/* Card pickers */}
          {isLoadingCards ? (
            <div className="flex items-center justify-center py-20 gap-3 text-muted-foreground">
              <RefreshCw className="w-5 h-5 animate-spin text-primary" />
              <span className="text-sm font-medium">
                Loading win conditions…
              </span>
            </div>
          ) : cardsError ? (
            <div className="flex flex-col items-center justify-center py-16 gap-4">
              <div className="w-14 h-14 rounded-full bg-destructive/10 flex items-center justify-center">
                <AlertTriangle className="w-7 h-7 text-destructive/70" />
              </div>
              <p className="text-sm text-destructive font-medium">
                {cardsError}
              </p>
              <button
                onClick={fetchCards}
                className="flex items-center gap-2 px-4 py-2 text-sm font-medium bg-destructive/10 hover:bg-destructive/20 text-destructive rounded-lg transition-colors"
              >
                <RefreshCw className="w-3.5 h-3.5" /> Retry
              </button>
            </div>
          ) : (
            <div className="grid grid-cols-2 divide-x divide-border/30 px-0">
              {/* Side A */}
              <div className="px-4 sm:px-6 py-5 space-y-3">
                <div className="flex items-center gap-2">
                  <div className="w-2 h-2 rounded-full bg-blue-500 shrink-0" />
                  <p className="text-xs font-bold uppercase tracking-[0.18em] text-blue-400">
                    Your Win Condition
                  </p>
                </div>
                <CardGrid
                  cards={winConditionCards}
                  selectedA={selectedA}
                  selectedB={selectedB}
                  side="a"
                  onSelect={handleSelectA}
                />
              </div>

              {/* Side B */}
              <div className="px-4 sm:px-6 py-5 space-y-3">
                <div className="flex items-center gap-2">
                  <div className="w-2 h-2 rounded-full bg-orange-500 shrink-0" />
                  <p className="text-xs font-bold uppercase tracking-[0.18em] text-orange-400">
                    Opponent&apos;s Win Condition
                  </p>
                </div>
                <CardGrid
                  cards={winConditionCards}
                  selectedA={selectedA}
                  selectedB={selectedB}
                  side="b"
                  onSelect={handleSelectB}
                />
              </div>
            </div>
          )}

          {/* Bottom status row */}
          {!isLoadingCards && !cardsError && (
            <div className="flex items-center px-4 sm:px-6 py-4 border-t border-border/20 bg-muted/5">
              <p
                className={cn(
                  "text-xs tabular-nums font-semibold",
                  orbitron.className,
                  "text-muted-foreground",
                )}
              >
                {selectedA != null && selectedB != null
                  ? "Ready to analyze"
                  : selectedA != null || selectedB != null
                    ? "Pick one more card"
                    : "Select both cards to begin"}
              </p>
            </div>
          )}
        </div>

        {/* ── Search error ─────────────────────────────────────────────── */}
        {searchError && (
          <div className="flex items-center gap-3 px-5 py-4 rounded-xl bg-destructive/8 border border-destructive/25 text-destructive">
            <AlertTriangle className="w-5 h-5 shrink-0" />
            <p className="text-sm font-medium flex-1">{searchError}</p>
            <button
              onClick={() => {
                setSearchError(null);
                handleAnalyse();
              }}
              className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium bg-destructive/10 hover:bg-destructive/20 rounded-lg transition-colors shrink-0"
            >
              <RefreshCw className="w-3 h-3" /> Retry
            </button>
          </div>
        )}

        {/* ── Result ───────────────────────────────────────────────────── */}
        {matchupData && (
          <div className="arena-entrance">
            <div className="flex items-center gap-2 mb-4">
              <Swords className="w-4 h-4 text-primary" />
              <h2 className="font-[family-name:var(--font-heading)] text-base font-bold uppercase tracking-widest text-foreground">
                Matchup Results
              </h2>
            </div>
            <WinConditionMatchup data={matchupData} />
          </div>
        )}

        {/* ── Empty prompt (no result yet, both selected) ───────────────── */}
        {!matchupData &&
          !isAnalysing &&
          selectedA != null &&
          selectedB != null &&
          !searchError && (
            <div className="flex flex-col items-center justify-center py-12 gap-4 rounded-2xl border border-dashed border-border/30 bg-muted/5 animate-fade-in">
              <div className="w-14 h-14 rounded-2xl bg-primary/10 flex items-center justify-center">
                <Swords className="w-7 h-7 text-primary/60" />
              </div>
              <div className="text-center space-y-1.5">
                <p className="text-sm font-semibold text-foreground">
                  {cardA?.name ?? ""} vs {cardB?.name ?? ""}
                </p>
                <p className="text-xs text-muted-foreground">
                  Press Analyze to see how these win conditions compare
                </p>
              </div>
            </div>
          )}
      </div>
    </div>
  );
}
