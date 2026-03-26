"use client";

import { useState, useEffect } from "react";
import Image from "next/image";
import { cn } from "@/lib/utils";
import { Orbitron } from "next/font/google";
import { Check, Loader2, Swords, X } from "lucide-react";
import {
  CardSelector,
  CardVariantType,
  CardVariantItem,
} from "@/components/card-selector";
import { Card } from "@/lib/types";

const orbitron = Orbitron({ subsets: ["latin"], weight: ["700", "900"] });

const API_BASE_URL = "/api/backend";

// Maps CardVariantType enum → backend variant string
const VARIANT_STRING: Record<CardVariantType, string> = {
  [CardVariantType.NORMAL]: "normal",
  [CardVariantType.EVOLUTION]: "evolution",
  [CardVariantType.HERO]: "heroic",
};

interface DeckBuilderHITLProps {
  /** Context text the agent passed when requesting a deck (e.g. "for matchup analysis") */
  prompt?: string;
  /** Call this with the deck spec string when the user submits */
  respond: (value: string) => void;
  /** CopilotKit status: "executing" = active, "complete" = user responded */
  status: string;
}

export function DeckBuilderHITL({
  prompt,
  respond,
  status,
}: DeckBuilderHITLProps) {
  const [cards, setCards] = useState<Card[]>([]);
  const [loadingCards, setLoadingCards] = useState(true);
  const [deck, setDeck] = useState<CardVariantItem[]>([]);
  const [submitted, setSubmitted] = useState(false);

  const isActive = status === "executing" && !submitted;

  // Fetch full card list from backend
  useEffect(() => {
    fetch(`${API_BASE_URL}/api/cards`)
      .then((r) => r.json())
      .then((data) => {
        setCards(data.cards ?? []);
        setLoadingCards(false);
      })
      .catch(() => setLoadingCards(false));
  }, []);

  // Build the Set<string> that CardSelector expects ("cardId_variantType")
  const selectedIds = new Set(deck.map((c) => c.id));

  const handleToggle = (id: string) => {
    if (!isActive) return;

    // Already in deck → remove
    if (selectedIds.has(id)) {
      setDeck((prev) => prev.filter((c) => c.id !== id));
      return;
    }

    // Parse the id string built by CardSelector: "{cardId}_{variantType}"
    const [cardIdStr, variantStr] = id.split("_");
    const cardId = parseInt(cardIdStr, 10);
    const variant = parseInt(variantStr, 10) as CardVariantType;

    // Find the Card record
    const card = cards.find((c) => c.card_id === cardId);
    if (!card) return;

    const cardFileName = card.name
      .toLowerCase()
      .replace(/ /g, "_")
      .replace(/\./g, "");
    const imageSuffix =
      variant === CardVariantType.EVOLUTION
        ? "_evolution"
        : variant === CardVariantType.HERO
          ? "_hero"
          : "";

    const item: CardVariantItem = {
      id,
      cardId: card.card_id,
      name: card.name,
      variant,
      imageUrl: `/cards/${cardFileName}/${cardFileName}${imageSuffix}.png`,
      elixir: card.elixir_cost ?? 0,
      rarity: card.rarity ?? "",
    };

    setDeck((prev) => {
      // Replace a different variant of the same card if one exists
      const withoutSameCard = prev.filter((c) => c.cardId !== cardId);
      // Enforce max 8
      if (withoutSameCard.length >= 8) return prev;
      return [...withoutSameCard, item];
    });
  };

  const handleRemove = (id: string) => {
    if (!isActive) return;
    setDeck((prev) => prev.filter((c) => c.id !== id));
  };

  const handleSubmit = () => {
    if (deck.length !== 8 || !isActive) return;
    setSubmitted(true);
    const deckSpec = deck
      .map((c) => `${c.cardId}:${VARIANT_STRING[c.variant]}`)
      .join(",");
    respond(deckSpec);
  };

  // Completed state
  if (submitted || status === "complete") {
    return (
      <div className="rounded-xl border border-emerald-500/30 bg-emerald-500/10 px-5 py-4 my-4 flex items-center gap-3">
        <Check className="w-4 h-4 text-emerald-400 shrink-0" />
        <p className="text-sm text-emerald-400">Deck submitted ...</p>
      </div>
    );
  }

  return (
    <div className="rounded-2xl border border-border/50 bg-card overflow-hidden my-4">
      {/* Top accent */}
      <div className="h-1 bg-gradient-to-r from-rose-600 via-amber-400 to-emerald-500" />

      {/* Header */}
      <div className="px-5 py-4 border-b border-border/20 flex items-center gap-3">
        <div className="w-8 h-8 rounded-lg bg-primary/10 flex items-center justify-center shrink-0">
          <Swords className="w-4 h-4 text-primary" />
        </div>
        <div className="flex-1 min-w-0">
          <p className="text-sm font-bold text-foreground">Build Your Deck</p>
          <p className="text-xs text-muted-foreground truncate">
            {prompt ?? "Select exactly 8 cards (including variant)"}
          </p>
        </div>
        <div
          className={cn(
            "text-sm font-black shrink-0",
            orbitron.className,
            deck.length === 8 ? "text-emerald-400" : "text-muted-foreground",
          )}
        >
          {deck.length}/8
        </div>
      </div>

      {/* Deck slots — single row of 8 fixed-size tiles */}
      <div className="px-5 py-3 border-b border-border/20">
        <div className="flex gap-1.5">
          {Array.from({ length: 8 }).map((_, i) => {
            const card = deck[i];
            const isEvo = card?.variant === CardVariantType.EVOLUTION;
            const isHero = card?.variant === CardVariantType.HERO;

            return card ? (
              <div
                key={i}
                className="relative w-10 h-12 rounded-lg overflow-hidden border-2 bg-muted/30 group shrink-0"
                style={{
                  borderColor: isEvo
                    ? "rgb(168,85,247)"
                    : isHero
                      ? "rgb(251,191,36)"
                      : "rgba(255,255,255,0.15)",
                  boxShadow: isEvo
                    ? "0 0 6px rgba(168,85,247,0.3)"
                    : isHero
                      ? "0 0 6px rgba(251,191,36,0.3)"
                      : undefined,
                }}
                title={card.name}
              >
                <Image
                  src={card.imageUrl}
                  alt={card.name}
                  fill
                  className="object-contain p-0.5"
                />
                {isActive && (
                  <button
                    onClick={() => handleRemove(card.id)}
                    className="absolute inset-0 bg-black/60 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center"
                  >
                    <X className="w-3 h-3 text-white" />
                  </button>
                )}
              </div>
            ) : (
              <div
                key={i}
                className="w-10 h-12 rounded-lg border-2 border-dashed border-border/30 bg-muted/10 flex items-center justify-center shrink-0"
              >
                <span className="text-[9px] text-muted-foreground/30">
                  {i + 1}
                </span>
              </div>
            );
          })}
        </div>
      </div>

      {/* Card selector */}
      <div className="px-5 py-4 border-b border-border/20">
        {loadingCards ? (
          <div className="flex items-center justify-center gap-2 py-8 text-muted-foreground">
            <Loader2 className="w-4 h-4 animate-spin" />
            <span className="text-sm">Loading cards...</span>
          </div>
        ) : (
          <CardSelector
            cards={cards}
            selectedIndices={selectedIds}
            onToggleCard={handleToggle}
            filterMode="INCLUDE"
          />
        )}
      </div>

      {/* Footer / Submit */}
      <div className="px-5 py-4 flex items-center justify-between gap-3">
        <p className="text-xs text-muted-foreground">
          {deck.length < 8
            ? `Select ${8 - deck.length} more card${8 - deck.length !== 1 ? "s" : ""}`
            : "Ready to submit!"}
        </p>
        <button
          onClick={handleSubmit}
          disabled={deck.length !== 8}
          className={cn(
            "flex items-center gap-2 px-5 py-2.5 rounded-xl text-sm font-bold transition-all",
            deck.length === 8
              ? "bg-primary text-primary-foreground hover:brightness-110"
              : "bg-muted/40 text-muted-foreground cursor-not-allowed",
          )}
        >
          <Check className="w-4 h-4" />
          Submit Deck
        </button>
      </div>
    </div>
  );
}
