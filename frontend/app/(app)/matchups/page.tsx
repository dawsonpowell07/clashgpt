"use client";

import { useState, useCallback, useRef, useEffect, Suspense } from "react";
import { useSearchParams } from "next/navigation";
import Image from "next/image";
import {
  AlertTriangle,
  RefreshCw,
  Swords,
  Trophy,
  ChevronLeft,
  ChevronRight,
  Shield,
  X,
  Filter,
  ChevronDown,
  ChevronUp,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { Orbitron } from "next/font/google";
import { Card } from "@/lib/types";
import { CardSelector } from "@/components/card-selector";
import { CardIcon } from "@/components/card-icon";

const orbitron = Orbitron({ subsets: ["latin"], weight: ["700", "900"] });

const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000";

// ─── Types ────────────────────────────────────────────────────────────────────

interface MatchupCard {
  card_id: number;
  card_name: string;
  variant: string;
  slot_index: number | null;
}

interface MatchupStats {
  games_played: number;
  wins: number;
  losses: number;
  win_rate: number | null;
}

interface OpponentMatchup {
  opponent_deck_id: string | null;
  games_played: number;
  wins: number;
  losses: number;
  win_rate: number | null;
  opponent_cards: MatchupCard[];
}

interface MatchupResponse {
  deck_id: string | null;
  deck_cards: MatchupCard[];
  stats: MatchupStats | null;
  matchups: OpponentMatchup[];
  total: number;
  page: number;
  page_size: number;
  total_pages: number;
  has_next: boolean;
  has_previous: boolean;
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

function variantIdToMatchupParam(id: string): string {
  const [cardIdStr, variantStr] = id.split("_");
  const variant = parseInt(variantStr);
  if (variant === 1) return `${cardIdStr}:evolution`;
  if (variant === 2) return `${cardIdStr}:heroic`;
  return `${cardIdStr}:normal`;
}

function sortDeckCards(cards: MatchupCard[]): MatchupCard[] {
  const evo = cards.filter((c) => c.variant === "evolution");
  const hero = cards.filter((c) => c.variant === "heroic");
  const normal = cards.filter((c) => c.variant === "normal");
  return [...evo, ...hero, ...normal].slice(0, 8);
}

// ─── Card tile ────────────────────────────────────────────────────────────────

function CardTile({
  card,
  size = "md",
}: {
  card: MatchupCard;
  size?: "sm" | "md" | "lg";
}) {
  const isEvo = card.variant === "evolution";
  const isHero = card.variant === "heroic";
  const cardFileName = (card.card_name || "unknown")
    .toLowerCase()
    .replace(/ /g, "_")
    .replace(/\./g, "");
  const imageSuffix = isEvo ? "_evolution" : isHero ? "_hero" : "";

  const sizeClass =
    size === "lg"
      ? "w-20 sm:w-24 lg:w-28 aspect-[3/4]"
      : size === "md"
        ? "w-16 sm:w-20 lg:w-24 aspect-[3/4]"
        : "w-12 sm:w-14 lg:w-16 aspect-[3/4]";

  const glowColor = isEvo
    ? "shadow-purple-500/40"
    : isHero
      ? "shadow-amber-400/40"
      : "shadow-black/20";

  return (
    <div
      className={cn(
        "relative rounded-xl overflow-hidden shrink-0 border-2 bg-muted/50",
        "shadow-lg transition-transform duration-200 [@media(hover:hover)]:hover:scale-105 [@media(hover:hover)]:hover:z-10",
        glowColor,
        sizeClass,
      )}
      style={{
        borderColor: isEvo
          ? "rgb(168,85,247)"
          : isHero
            ? "rgb(251,191,36)"
            : "rgba(255,255,255,0.08)",
        boxShadow: isEvo
          ? "0 0 12px rgba(168,85,247,0.35), inset 0 0 8px rgba(168,85,247,0.1)"
          : isHero
            ? "0 0 12px rgba(251,191,36,0.35), inset 0 0 8px rgba(251,191,36,0.1)"
            : undefined,
      }}
      title={`${card.card_name}${isEvo ? " (Evo)" : isHero ? " (Hero)" : ""}`}
    >
      <Image
        src={`/cards/${cardFileName}/${cardFileName}${imageSuffix}.png`}
        alt={card.card_name}
        fill
        className="object-contain p-0.5"
      />
      {/* Variant indicator strip */}
      {(isEvo || isHero) && (
        <div
          className="absolute bottom-0 inset-x-0 h-[3px]"
          style={{ background: isEvo ? "rgb(168,85,247)" : "rgb(251,191,36)" }}
        />
      )}
    </div>
  );
}

// ─── Deck grid (4×2) ─────────────────────────────────────────────────────────

function DeckGrid({
  cards,
  deckId,
  size = "md",
}: {
  cards: MatchupCard[];
  deckId: string | null;
  size?: "sm" | "md" | "lg";
}) {
  if (!cards || cards.length === 0) {
    return (
      <span className="text-sm text-muted-foreground/50 italic">
        Unknown deck
      </span>
    );
  }
  const sorted = sortDeckCards(cards);
  const row1 = sorted.slice(0, 4);
  const row2 = sorted.slice(4, 8);

  return (
    <div className="flex flex-col gap-2">
      <div className="flex gap-2">
        {row1.map((card, i) => (
          <CardTile
            key={`${deckId}-r1-${card.card_id}-${i}`}
            card={card}
            size={size}
          />
        ))}
      </div>
      {row2.length > 0 && (
        <div className="flex gap-2">
          {row2.map((card, i) => (
            <CardTile
              key={`${deckId}-r2-${card.card_id}-${i}`}
              card={card}
              size={size}
            />
          ))}
        </div>
      )}
    </div>
  );
}

// ─── Deck slot preview ────────────────────────────────────────────────────────

function DeckSlotPreview({
  selectedVariants,
  cards,
}: {
  selectedVariants: Set<string>;
  cards: Card[];
}) {
  const filled = Array.from(selectedVariants).map((id) => {
    const [cardIdStr, variantStr] = id.split("_");
    const cardId = parseInt(cardIdStr);
    const variant = parseInt(variantStr);
    const card = cards.find((c) => c.card_id === cardId);
    return {
      cardId,
      cardName: card?.name || `Card ${cardId}`,
      variant: (variant === 1
        ? "evolution"
        : variant === 2
          ? "heroic"
          : "normal") as "normal" | "evolution" | "heroic",
    };
  });

  const all = [...filled, ...Array(8 - filled.length).fill(null)];

  return (
    <div className="flex flex-col items-center gap-1.5 sm:gap-2 w-full">
      <div className="grid grid-cols-4 gap-1.5 sm:gap-2 w-full max-w-[320px] sm:max-w-[280px]">
        {all.slice(0, 4).map((card, i) =>
          card ? (
            <CardIcon
              key={`slot-${card.cardId}-${i}`}
              cardName={card.cardName}
              variant={card.variant}
              className="w-full"
            />
          ) : (
            <div
              key={`empty-r1-${i}`}
              className="w-full aspect-[3/4] rounded-lg border-2 border-dashed border-border/30 bg-muted/10 flex items-center justify-center"
            >
              <span className="text-muted-foreground/20 text-sm sm:text-lg font-bold">
                {i + 1}
              </span>
            </div>
          ),
        )}
      </div>
      <div className="grid grid-cols-4 gap-1.5 sm:gap-2 w-full max-w-[320px] sm:max-w-[280px]">
        {all.slice(4, 8).map((card, i) =>
          card ? (
            <CardIcon
              key={`slot-${card.cardId}-${i}`}
              cardName={card.cardName}
              variant={card.variant}
              className="w-full"
            />
          ) : (
            <div
              key={`empty-r2-${i}`}
              className="w-full aspect-[3/4] rounded-lg border-2 border-dashed border-border/30 bg-muted/10 flex items-center justify-center"
            >
              <span className="text-muted-foreground/20 text-sm sm:text-lg font-bold">
                {i + 5}
              </span>
            </div>
          ),
        )}
      </div>
    </div>
  );
}

// ─── Stats hero ───────────────────────────────────────────────────────────────

function StatsHero({ stats }: { stats: MatchupStats }) {
  const winRatePct = stats.win_rate != null ? stats.win_rate * 100 : null;
  const display = winRatePct != null ? winRatePct.toFixed(1) : null;

  const ratingColor =
    winRatePct == null
      ? "text-muted-foreground"
      : winRatePct >= 55
        ? "text-emerald-400"
        : winRatePct >= 50
          ? "text-amber-400"
          : "text-rose-400";

  const ratingGlow =
    winRatePct == null
      ? ""
      : winRatePct >= 55
        ? "drop-shadow-[0_0_24px_rgba(52,211,153,0.5)]"
        : winRatePct >= 50
          ? "drop-shadow-[0_0_24px_rgba(251,191,36,0.5)]"
          : "drop-shadow-[0_0_24px_rgba(251,113,133,0.5)]";

  const barWidth =
    winRatePct != null ? Math.max(0, Math.min(100, winRatePct)) : 0;

  const barColor =
    winRatePct == null
      ? "bg-muted"
      : winRatePct >= 55
        ? "bg-emerald-400"
        : winRatePct >= 50
          ? "bg-amber-400"
          : "bg-rose-400";

  return (
    <div className="relative overflow-hidden rounded-2xl border border-border/50 bg-card">
      {/* Ambient glow behind win rate */}
      <div
        className="absolute -top-16 left-1/2 -translate-x-1/2 w-64 h-64 rounded-full blur-3xl opacity-10 pointer-events-none"
        style={{
          background:
            winRatePct != null && winRatePct >= 55
              ? "rgb(52,211,153)"
              : winRatePct != null && winRatePct >= 50
                ? "rgb(251,191,36)"
                : "rgb(251,113,133)",
        }}
      />

      <div className="relative z-10 px-8 py-6">
        {/* Headline row */}
        <div className="flex flex-col sm:flex-row items-start sm:items-center gap-6">
          {/* Win rate - the hero stat */}
          <div className="flex flex-col items-start">
            <span className="text-xs font-semibold uppercase tracking-[0.2em] text-muted-foreground mb-1">
              Win Rate
            </span>
            <div className="flex items-baseline gap-1">
              <span
                className={cn(
                  orbitron.className,
                  "text-6xl font-black leading-none tabular-nums",
                  ratingColor,
                  ratingGlow,
                )}
              >
                {display ?? "—"}
              </span>
              {display && (
                <span
                  className={cn(
                    orbitron.className,
                    "text-2xl font-bold",
                    ratingColor,
                  )}
                >
                  %
                </span>
              )}
            </div>
          </div>

          {/* Divider */}
          <div className="hidden sm:block w-px h-16 bg-border/50" />

          {/* W / L / Games */}
          <div className="flex gap-6">
            <div className="flex flex-col">
              <span className="text-xs font-semibold uppercase tracking-[0.15em] text-muted-foreground mb-0.5">
                Wins
              </span>
              <span
                className={cn(
                  orbitron.className,
                  "text-3xl font-black text-emerald-400 tabular-nums",
                )}
              >
                {stats.wins.toLocaleString()}
              </span>
            </div>
            <div className="flex flex-col">
              <span className="text-xs font-semibold uppercase tracking-[0.15em] text-muted-foreground mb-0.5">
                Losses
              </span>
              <span
                className={cn(
                  orbitron.className,
                  "text-3xl font-black text-rose-400 tabular-nums",
                )}
              >
                {stats.losses.toLocaleString()}
              </span>
            </div>
            <div className="flex flex-col">
              <span className="text-xs font-semibold uppercase tracking-[0.15em] text-muted-foreground mb-0.5">
                Games
              </span>
              <span
                className={cn(
                  orbitron.className,
                  "text-3xl font-black text-foreground tabular-nums",
                )}
              >
                {stats.games_played.toLocaleString()}
              </span>
            </div>
          </div>
        </div>

        {/* Win rate bar */}
        <div className="mt-5">
          <div className="h-1.5 rounded-full bg-muted/40 overflow-hidden">
            <div
              className={cn(
                "h-full rounded-full transition-all duration-700",
                barColor,
              )}
              style={{ width: `${barWidth}%` }}
            />
          </div>
          <div className="flex justify-between mt-1">
            <span className="text-[10px] text-muted-foreground/50">0%</span>
            <span className="text-[10px] text-muted-foreground/50">50%</span>
            <span className="text-[10px] text-muted-foreground/50">100%</span>
          </div>
        </div>
      </div>
    </div>
  );
}

// ─── Matchup card (per opponent deck) ─────────────────────────────────────────

function MatchRecord({
  matchup,
  index,
}: {
  matchup: OpponentMatchup;
  index: number;
}) {
  const winRatePct = matchup.win_rate != null ? matchup.win_rate * 100 : null;
  const isGood = winRatePct != null && winRatePct >= 50;

  const ratingColor =
    winRatePct == null
      ? "text-muted-foreground"
      : winRatePct >= 55
        ? "text-emerald-400"
        : winRatePct >= 50
          ? "text-amber-400"
          : "text-rose-400";

  return (
    <div
      className={cn(
        "group relative rounded-2xl overflow-hidden border transition-all duration-200",
        "hover:-translate-y-0.5 hover:shadow-xl",
        isGood
          ? "border-amber-500/20 bg-card hover:border-amber-500/40 hover:shadow-amber-500/10"
          : "border-border/40 bg-card hover:border-border/60 hover:shadow-black/20",
      )}
      style={{ animationDelay: `${index * 40}ms` }}
    >
      {/* Top accent stripe */}
      <div
        className={cn(
          "h-0.5 w-full",
          isGood
            ? "bg-gradient-to-r from-amber-400 via-amber-500 to-primary"
            : "bg-gradient-to-r from-slate-600 via-slate-500 to-slate-600",
        )}
      />

      <div className="p-4 space-y-3">
        {/* Header: win rate + W / L / games */}
        <div className="flex items-center gap-3 flex-wrap">
          {/* Win rate pill */}
          <div
            className={cn(
              "flex items-center justify-center rounded-lg px-3 py-1 shrink-0",
              orbitron.className,
              "text-sm font-black",
              ratingColor,
              isGood
                ? "bg-amber-500/10 ring-1 ring-amber-500/25"
                : winRatePct != null && winRatePct < 50
                  ? "bg-rose-500/10 ring-1 ring-rose-500/20"
                  : "bg-muted/30 ring-1 ring-border/40",
            )}
          >
            {winRatePct != null ? `${winRatePct.toFixed(1)}%` : "—"}
          </div>

          {/* W / L */}
          <div
            className={cn(
              "flex items-center gap-1 text-sm font-bold",
              orbitron.className,
            )}
          >
            <span className="text-emerald-400">{matchup.wins}W</span>
            <span className="text-muted-foreground/40 font-normal">/</span>
            <span className="text-rose-400">{matchup.losses}L</span>
          </div>

          {/* Games count */}
          <span className="text-xs text-muted-foreground ml-auto">
            {matchup.games_played} games
          </span>
        </div>

        {/* Opponent deck */}
        <div className="space-y-1.5">
          <span className="text-[10px] font-semibold uppercase tracking-[0.18em] text-muted-foreground/60">
            Opponent Deck
          </span>
          <DeckGrid
            cards={matchup.opponent_cards}
            deckId={matchup.opponent_deck_id}
            size="sm"
          />
        </div>
      </div>
    </div>
  );
}

// ─── Page ─────────────────────────────────────────────────────────────────────

function MatchupsPageInner() {
  const searchParams = useSearchParams();

  const [cards, setCards] = useState<Card[]>([]);
  const [isLoadingCards, setIsLoadingCards] = useState(true);
  const [cardsError, setCardsError] = useState<string | null>(null);

  const [selectedVariants, setSelectedVariants] = useState<Set<string>>(
    new Set(),
  );

  // Opponent card filters (applied when Analyze is run)
  const [opponentFilterMode, setOpponentFilterMode] = useState<
    "INCLUDE" | "EXCLUDE"
  >("INCLUDE");
  const [opponentIncluded, setOpponentIncluded] = useState<Set<string>>(
    new Set(),
  );
  const [opponentExcluded, setOpponentExcluded] = useState<Set<string>>(
    new Set(),
  );
  const [showOpponentFilter, setShowOpponentFilter] = useState(false);

  const [matchupData, setMatchupData] = useState<MatchupResponse | null>(null);
  const [isSearching, setIsSearching] = useState(false);
  const [searchError, setSearchError] = useState<string | null>(null);
  const [page, setPage] = useState(1);

  const lastSearchRef = useRef<number>(0);
  const shouldAutoSearch = useRef(false);

  const fetchCards = useCallback(async () => {
    setIsLoadingCards(true);
    setCardsError(null);
    try {
      const res = await fetch(`${API_BASE_URL}/api/cards`);
      if (!res.ok) throw new Error("Failed to fetch cards");
      const data = await res.json();
      const TOWER_TROOP_NAMES = new Set([
        "Tower Princess",
        "Royal Chef",
        "Dagger Duchess",
        "Cannoneer",
      ]);
      setCards(
        (data.cards || []).filter(
          (card: Card) =>
            !String(card.card_id).startsWith("159") &&
            !TOWER_TROOP_NAMES.has(card.name),
        ),
      );
    } catch {
      setCardsError("Failed to load cards. Please check your connection.");
    } finally {
      setIsLoadingCards(false);
    }
  }, []);

  useEffect(() => {
    fetchCards();
  }, [fetchCards]);

  // Pre-fill deck from URL param (e.g. coming from Decks page)
  useEffect(() => {
    const deckParam = searchParams.get("deck");
    if (!deckParam) return;
    const specs = deckParam.split(",").filter(Boolean);
    if (specs.length !== 8) return;
    const variants = new Set<string>();
    for (const spec of specs) {
      const [cardIdStr, variant] = spec.split(":");
      if (!cardIdStr || !variant) continue;
      const variantInt =
        variant === "evolution" ? 1 : variant === "heroic" ? 2 : 0;
      variants.add(`${cardIdStr}_${variantInt}`);
    }
    if (variants.size === 8) {
      shouldAutoSearch.current = true;
      setSelectedVariants(variants);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const searchMatchups = useCallback(
    async (pageNum: number) => {
      if (selectedVariants.size !== 8) return;
      const now = Date.now();
      if (now - lastSearchRef.current < 500) return;
      lastSearchRef.current = now;

      const deckParam = Array.from(selectedVariants)
        .map(variantIdToMatchupParam)
        .join(",");

      setIsSearching(true);
      setSearchError(null);
      try {
        const params = new URLSearchParams({
          deck: deckParam,
          page: pageNum.toString(),
          page_size: "21",
        });
        const includeParam = Array.from(opponentIncluded)
          .map(variantIdToMatchupParam)
          .join(",");
        const excludeParam = Array.from(opponentExcluded)
          .map(variantIdToMatchupParam)
          .join(",");
        if (includeParam) params.set("include_opponent", includeParam);
        if (excludeParam) params.set("exclude_opponent", excludeParam);
        const res = await fetch(`${API_BASE_URL}/api/matchups?${params}`);
        if (res.status === 429) {
          setSearchError(
            "Too many requests — please wait before searching again.",
          );
          return;
        }
        if (!res.ok) {
          const b = await res.json().catch(() => ({}));
          setSearchError(b.detail || "Failed to search matchups.");
          return;
        }
        setMatchupData(await res.json());
      } catch {
        setSearchError("Failed to search matchups. Please try again.");
      } finally {
        setIsSearching(false);
      }
    },
    [selectedVariants, opponentIncluded, opponentExcluded],
  );

  // Auto-search once when selectedVariants is populated from URL param
  useEffect(() => {
    if (shouldAutoSearch.current && selectedVariants.size === 8) {
      shouldAutoSearch.current = false;
      searchMatchups(1);
    }
  }, [selectedVariants, searchMatchups]);

  const handleToggleCard = (id: string) => {
    setSelectedVariants((prev) => {
      const next = new Set(prev);
      if (next.has(id)) {
        next.delete(id);
      } else if (next.size < 8) {
        next.add(id);
      }
      return next;
    });
  };

  const handleToggleOpponentCard = (id: string) => {
    if (opponentFilterMode === "INCLUDE") {
      setOpponentIncluded((prev) => {
        const next = new Set(prev);
        if (next.has(id)) next.delete(id);
        else next.add(id);
        return next;
      });
      setOpponentExcluded((prev) => {
        if (!prev.has(id)) return prev;
        const next = new Set(prev);
        next.delete(id);
        return next;
      });
    } else {
      setOpponentExcluded((prev) => {
        const next = new Set(prev);
        if (next.has(id)) next.delete(id);
        else next.add(id);
        return next;
      });
      setOpponentIncluded((prev) => {
        if (!prev.has(id)) return prev;
        const next = new Set(prev);
        next.delete(id);
        return next;
      });
    }
  };

  const handleSearch = () => {
    setPage(1);
    searchMatchups(1);
  };
  const handlePageChange = (newPage: number) => {
    setPage(newPage);
    searchMatchups(newPage);
    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  const canSearch = selectedVariants.size === 8;
  const deckNotFound = matchupData && matchupData.deck_id === null;
  const hasMatchups =
    matchupData && matchupData.matchups && matchupData.matchups.length > 0;
  const count = selectedVariants.size;

  return (
    <div className="min-h-screen bg-background text-foreground pb-24 relative overflow-hidden">
      {/* Ambient background */}
      <div className="fixed inset-0 hexagon-pattern opacity-[0.025] pointer-events-none" />
      <div
        className="fixed top-0 right-0 w-[600px] h-[600px] rounded-full pointer-events-none"
        style={{
          background:
            "radial-gradient(circle, rgba(168,107,18,0.06) 0%, transparent 70%)",
        }}
      />
      <div
        className="fixed bottom-0 left-0 w-[500px] h-[500px] rounded-full pointer-events-none"
        style={{
          background:
            "radial-gradient(circle, rgba(59,94,168,0.06) 0%, transparent 70%)",
        }}
      />

      <div className="w-full max-w-[1600px] mx-auto px-4 sm:px-6 lg:px-8 py-10 relative z-10 space-y-10">
        {/* ── Header ─────────────────────────────────────────────────────── */}
        <div className="relative">
          {/* Thin gold rule above */}
          <div className="w-12 h-0.5 bg-primary mb-4 rounded-full" />

          <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-4">
            <div>
              <p className="text-xs font-semibold uppercase tracking-[0.25em] text-primary/80 mb-2">
                Battle Analysis
              </p>
              <h1 className="font-[family-name:var(--font-heading)] text-5xl sm:text-7xl font-extrabold tracking-tight leading-none">
                <span className="bg-gradient-to-br from-foreground via-foreground/90 to-foreground/60 bg-clip-text text-transparent">
                  Deck
                </span>
                <br />
                <span className="bg-gradient-to-r from-primary via-primary/90 to-amber-300 bg-clip-text text-transparent battle-glow">
                  Matchups
                </span>
              </h1>
            </div>
            <p className="text-sm text-muted-foreground max-w-xs leading-relaxed pb-1">
              Select 8 cards to see every recorded battle with that exact deck
              and its results
            </p>
          </div>

          {/* Decorative bottom rule */}
          <div className="mt-6 h-px bg-gradient-to-r from-primary/40 via-border/50 to-transparent" />
        </div>

        {/* ── Deck Builder Panel ──────────────────────────────────────────── */}
        <div className="relative rounded-2xl border border-border/50 bg-card overflow-hidden shadow-2xl shadow-black/20">
          {/* Top accent bar */}
          <div className="h-0.5 bg-gradient-to-r from-transparent via-primary/60 to-transparent" />

          {/* Panel header */}
          <div className="flex flex-wrap items-start sm:items-center justify-between gap-3 px-4 sm:px-6 pt-5 pb-4 border-b border-border/30">
            <div className="flex items-center gap-3">
              <div className="w-8 h-8 rounded-lg bg-primary/10 flex items-center justify-center">
                <Swords className="w-4 h-4 text-primary" />
              </div>
              <div>
                <h2 className="font-[family-name:var(--font-heading)] text-lg font-bold tracking-tight text-foreground">
                  Build Your Deck
                </h2>
                <p className="text-xs text-muted-foreground mt-0.5">
                  Select exactly 8 cards — include variants (Evo, Hero) to
                  narrow the search
                </p>
              </div>
            </div>

            {/* Progress pill + actions */}
            <div className="flex items-center gap-3 shrink-0">
              {/* Progress dots */}
              <div className="hidden sm:flex items-center gap-1">
                {Array.from({ length: 8 }).map((_, i) => (
                  <div
                    key={i}
                    className={cn(
                      "w-2 h-2 rounded-full transition-all duration-300",
                      i < count ? "bg-primary scale-110" : "bg-muted/50",
                    )}
                  />
                ))}
              </div>

              {/* Count badge */}
              <div
                className={cn(
                  "text-sm font-bold px-3 py-1.5 rounded-lg tabular-nums transition-all",
                  orbitron.className,
                  count === 8
                    ? "bg-primary/20 text-primary ring-1 ring-primary/40"
                    : "bg-muted/40 text-muted-foreground",
                )}
              >
                {count}/8
              </div>

              {/* Clear */}
              <button
                onClick={() => setSelectedVariants(new Set())}
                disabled={count === 0}
                className="flex items-center gap-1 px-3 py-1.5 text-sm rounded-lg border border-border/50 text-muted-foreground hover:text-destructive hover:border-destructive/40 hover:bg-destructive/5 transition-all disabled:opacity-30 disabled:cursor-not-allowed"
              >
                <X className="w-3.5 h-3.5" />
                Clear
              </button>

              {/* Search */}
              <button
                onClick={handleSearch}
                disabled={!canSearch || isSearching}
                className={cn(
                  "flex items-center gap-2 px-5 py-2 text-sm font-semibold rounded-lg transition-all",
                  "bg-gradient-to-r from-primary to-amber-500 text-primary-foreground shadow-lg",
                  "hover:from-primary/90 hover:to-amber-500/90 hover:shadow-primary/30 hover:-translate-y-0.5",
                  "disabled:opacity-40 disabled:cursor-not-allowed disabled:translate-y-0 disabled:shadow-none",
                )}
              >
                {isSearching ? (
                  <RefreshCw className="w-4 h-4 animate-spin" />
                ) : (
                  <Shield className="w-4 h-4" />
                )}
                Analyze
              </button>
            </div>
          </div>

          {/* Deck slot preview */}
          <div className="px-4 sm:px-6 py-4 border-b border-border/20 bg-muted/10">
            <p className="text-[10px] font-semibold uppercase tracking-[0.2em] text-muted-foreground/60 mb-3">
              Selected Deck
            </p>
            <DeckSlotPreview
              selectedVariants={selectedVariants}
              cards={cards}
            />
          </div>

          {/* Card selector */}
          <div className="px-4 sm:px-6 py-4">
            {isLoadingCards ? (
              <div className="flex items-center justify-center py-20 gap-3 text-muted-foreground">
                <RefreshCw className="w-5 h-5 animate-spin text-primary" />
                <span className="text-sm font-medium">
                  Loading card catalogue…
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
              <CardSelector
                cards={cards}
                selectedIndices={selectedVariants}
                onToggleCard={handleToggleCard}
                filterMode="INCLUDE"
              />
            )}
          </div>
        </div>

        {/* ── Search error ────────────────────────────────────────────────── */}
        {searchError && (
          <div className="flex items-center gap-3 px-5 py-4 rounded-xl bg-destructive/8 border border-destructive/25 text-destructive">
            <AlertTriangle className="w-5 h-5 shrink-0" />
            <p className="text-sm font-medium flex-1">{searchError}</p>
            <button
              onClick={() => {
                setSearchError(null);
                searchMatchups(page);
              }}
              className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium bg-destructive/10 hover:bg-destructive/20 rounded-lg transition-colors"
            >
              <RefreshCw className="w-3 h-3" /> Retry
            </button>
          </div>
        )}

        {/* ── Results ─────────────────────────────────────────────────────── */}
        {matchupData && (
          <div className="space-y-8 arena-entrance">
            {deckNotFound ? (
              /* Not found state */
              <div className="flex flex-col items-center justify-center py-24 gap-5 rounded-2xl border border-dashed border-border/40 bg-muted/5">
                <div className="w-16 h-16 rounded-2xl bg-muted/30 flex items-center justify-center">
                  <Swords className="w-8 h-8 text-muted-foreground/30" />
                </div>
                <div className="text-center space-y-2">
                  <h3 className="font-[family-name:var(--font-heading)] text-xl font-bold text-foreground">
                    Deck not found
                  </h3>
                  <p className="text-sm text-muted-foreground max-w-sm leading-relaxed">
                    This exact deck (with these specific variants) hasn&apos;t
                    been recorded in our battle database. Try adjusting the card
                    variants or composition.
                  </p>
                </div>
              </div>
            ) : (
              <>
                {/* Stats */}
                {matchupData.stats && (
                  <div className="space-y-3">
                    <div className="flex items-center gap-2">
                      <Trophy className="w-4 h-4 text-primary" />
                      <h2 className="font-[family-name:var(--font-heading)] text-base font-bold uppercase tracking-widest text-foreground">
                        Performance
                      </h2>
                    </div>
                    <StatsHero stats={matchupData.stats} />
                  </div>
                )}

                {/* Opponent deck matchups */}
                <div className="space-y-4">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <Swords className="w-4 h-4 text-primary" />
                      <h2 className="font-[family-name:var(--font-heading)] text-base font-bold uppercase tracking-widest text-foreground">
                        Opponent Decks
                      </h2>
                    </div>
                    <div className="flex items-center gap-2">
                      {matchupData.total > 0 && (
                        <span className="text-xs font-medium text-muted-foreground bg-muted/40 px-2.5 py-1 rounded-full">
                          {matchupData.total.toLocaleString()} unique decks
                        </span>
                      )}
                      <button
                        onClick={() =>
                          setShowOpponentFilter((v) => !v)
                        }
                        className={cn(
                          "flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold rounded-lg border transition-all",
                          (opponentIncluded.size > 0 || opponentExcluded.size > 0)
                            ? "border-primary/40 bg-primary/10 text-primary"
                            : "border-border/50 bg-card text-muted-foreground hover:border-primary/30 hover:text-foreground",
                        )}
                      >
                        <Filter className="w-3.5 h-3.5" />
                        Filter
                        {(opponentIncluded.size + opponentExcluded.size) > 0 && (
                          <span className="bg-primary text-primary-foreground rounded-full w-4 h-4 flex items-center justify-center text-[10px] font-bold">
                            {opponentIncluded.size + opponentExcluded.size}
                          </span>
                        )}
                        {showOpponentFilter ? (
                          <ChevronUp className="w-3 h-3" />
                        ) : (
                          <ChevronDown className="w-3 h-3" />
                        )}
                      </button>
                    </div>
                  </div>

                  {/* Opponent card filter panel */}
                  {showOpponentFilter && (
                    <div className="rounded-xl border border-border/50 bg-card p-4 space-y-3">
                      <div className="flex flex-wrap items-center justify-between gap-3">
                        {/* Mode toggle */}
                        <div className="flex items-center gap-2 p-1 bg-muted/60 rounded-lg">
                          <span className="text-xs font-semibold text-muted-foreground px-1">
                            Filter Mode:
                          </span>
                          <button
                            onClick={() => setOpponentFilterMode("INCLUDE")}
                            className={cn(
                              "flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold rounded-md transition-all",
                              opponentFilterMode === "INCLUDE"
                                ? "bg-green-500 text-white shadow-sm"
                                : "text-muted-foreground hover:bg-muted/50",
                            )}
                          >
                            <Filter className="w-3 h-3" />
                            Include
                          </button>
                          <button
                            onClick={() => setOpponentFilterMode("EXCLUDE")}
                            className={cn(
                              "flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold rounded-md transition-all",
                              opponentFilterMode === "EXCLUDE"
                                ? "bg-red-500 text-white shadow-sm"
                                : "text-muted-foreground hover:bg-muted/50",
                            )}
                          >
                            <X className="w-3 h-3" />
                            Exclude
                          </button>
                        </div>

                        <div className="flex items-center gap-2">
                          {(opponentIncluded.size > 0 || opponentExcluded.size > 0) && (
                            <button
                              onClick={() => {
                                setOpponentIncluded(new Set());
                                setOpponentExcluded(new Set());
                              }}
                              className="text-xs text-muted-foreground hover:text-destructive transition-colors"
                            >
                              Clear
                            </button>
                          )}
                          <button
                            onClick={() => {
                              setPage(1);
                              searchMatchups(1);
                            }}
                            disabled={isSearching}
                            className={cn(
                              "flex items-center gap-1.5 px-4 py-1.5 text-xs font-semibold rounded-lg transition-all",
                              "bg-gradient-to-r from-primary to-amber-500 text-primary-foreground shadow",
                              "hover:from-primary/90 hover:to-amber-500/90 disabled:opacity-40 disabled:cursor-not-allowed",
                            )}
                          >
                            {isSearching ? (
                              <RefreshCw className="w-3 h-3 animate-spin" />
                            ) : (
                              <Shield className="w-3 h-3" />
                            )}
                            Apply
                          </button>
                        </div>
                      </div>

                      {isLoadingCards ? (
                        <div className="flex items-center justify-center py-8 gap-2 text-muted-foreground">
                          <RefreshCw className="w-4 h-4 animate-spin text-primary" />
                          <span className="text-xs">Loading cards…</span>
                        </div>
                      ) : (
                        <CardSelector
                          cards={cards}
                          selectedIndices={
                            opponentFilterMode === "INCLUDE"
                              ? opponentIncluded
                              : opponentExcluded
                          }
                          onToggleCard={handleToggleOpponentCard}
                          filterMode={opponentFilterMode}
                        />
                      )}
                    </div>
                  )}

                  {!hasMatchups ? (
                    <div className="flex flex-col items-center justify-center py-16 gap-3 rounded-2xl border border-dashed border-border/40">
                      <Swords className="w-7 h-7 text-muted-foreground/25" />
                      <p className="text-sm text-muted-foreground">
                        No matchup data found for this deck.
                      </p>
                    </div>
                  ) : (
                    <div className="grid grid-cols-1 lg:grid-cols-2 2xl:grid-cols-3 gap-2.5">
                      {matchupData.matchups.map((matchup, i) => (
                        <MatchRecord
                          key={`${matchup.opponent_deck_id}-${i}`}
                          matchup={matchup}
                          index={i}
                        />
                      ))}
                    </div>
                  )}

                  {/* Pagination */}
                  {matchupData.total_pages > 1 && (
                    <div className="flex items-center justify-between pt-2">
                      <button
                        onClick={() => handlePageChange(page - 1)}
                        disabled={!matchupData.has_previous || isSearching}
                        className="flex items-center gap-2 px-5 py-2.5 text-sm font-medium rounded-xl border border-border/50 bg-card hover:bg-muted hover:border-border transition-all disabled:opacity-30 disabled:cursor-not-allowed"
                      >
                        <ChevronLeft className="w-4 h-4" />
                        Previous
                      </button>
                      <span
                        className={cn(
                          orbitron.className,
                          "text-sm font-bold text-muted-foreground",
                        )}
                      >
                        {matchupData.page} / {matchupData.total_pages}
                      </span>
                      <button
                        onClick={() => handlePageChange(page + 1)}
                        disabled={!matchupData.has_next || isSearching}
                        className="flex items-center gap-2 px-5 py-2.5 text-sm font-medium rounded-xl border border-border/50 bg-card hover:bg-muted hover:border-border transition-all disabled:opacity-30 disabled:cursor-not-allowed"
                      >
                        Next
                        <ChevronRight className="w-4 h-4" />
                      </button>
                    </div>
                  )}
                </div>
              </>
            )}
          </div>
        )}
      </div>
    </div>
  );
}

export default function MatchupsPage() {
  return (
    <Suspense>
      <MatchupsPageInner />
    </Suspense>
  );
}
