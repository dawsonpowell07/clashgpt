"use client";

import { useState, useCallback, useRef } from "react";
import Image from "next/image";
import {
  Search,
  ChevronDown,
  ChevronUp,
  Loader2,
  AlertTriangle,
  Crown,
  Zap,
  Trophy,
  Swords,
  User,
  RefreshCw,
  Clock,
  Shield,
  Star,
  Heart,
  TrendingUp,
  ArrowLeft,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";

const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000";

// ─── Types ──────────────────────────────────────────────────────────────────

interface PlayerSearchResult {
  player_tag: string;
  name: string;
  last_seen: string | null;
  total_games: number;
  wins: number;
  win_rate: number | null;
  avg_crowns: number | null;
  avg_elixir_leaked: number | null;
}

interface DeckCard {
  name: string;
  variant: string;
}

interface PlayerDeck {
  deck_id: string;
  games: number;
  wins: number;
  win_rate: number | null;
  avg_elixir: number | null;
  cards: DeckCard[];
}

interface Battle {
  battle_time: string | null;
  game_mode: string | null;
  result: string;
  crowns: number | null;
  elixir_leaked: number | null;
  opponent: string | null;
}

interface CRClan {
  tag: string;
  clan_name: string;
  badge_id: string;
}

interface CRArena {
  id: string;
  name: string;
}

interface CRFavoriteCard {
  card_id: number;
  name: string;
  elixir_cost: number | null;
  rarity: string | null;
}

interface CRPlayerInfo {
  tag: string;
  name: string;
  trophies: number;
  best_trophies: number;
  wins: number;
  losses: number;
  battles_count: number;
  three_crown_wins: number;
  clan: CRClan | null;
  arena: CRArena | null;
  current_trophies: number;
  current_path_of_legends_medals: number | null;
  current_path_of_legends_rank: number | null;
  best_path_of_legends_medals: number | null;
  best_path_of_legends_rank: number | null;
  current_favorite_card: CRFavoriteCard | null;
  total_donations: number | null;
  challenge_max_wins: number | null;
  current_path_of_legends_league: number | null;
}

// ─── Helpers ─────────────────────────────────────────────────────────────────

function formatBattleTime(iso: string | null): string {
  if (!iso) return "—";
  try {
    const d = new Date(iso);
    return d.toLocaleString("en-US", {
      month: "short",
      day: "numeric",
      year: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });
  } catch {
    return iso;
  }
}

function formatLastSeen(iso: string | null): string {
  if (!iso) return "Unknown";
  try {
    const d = new Date(iso);
    return d.toLocaleDateString("en-US", {
      month: "short",
      day: "numeric",
      year: "numeric",
    });
  } catch {
    return iso;
  }
}

function formatTag(tag: string): string {
  return tag.startsWith("#") ? tag : `#${tag}`;
}

function cardImagePath(name: string, variant: string): string {
  const base = name.toLowerCase().replace(/ /g, "_").replace(/\./g, "");
  const suffix =
    variant === "evolution" ? "_evolution" : variant === "heroic" ? "_hero" : "";
  return `/cards/${base}/${base}${suffix}.png`;
}

// ─── Sub-components ──────────────────────────────────────────────────────────

function SectionHeading({
  icon,
  label,
  sub,
}: {
  icon: React.ReactNode;
  label: string;
  sub?: string;
}) {
  return (
    <div className="flex items-center gap-3 mb-5">
      <div className="flex items-center justify-center w-8 h-8 rounded-lg bg-primary/15 border border-primary/25 text-primary shrink-0">
        {icon}
      </div>
      <div>
        <h3 className="font-[family-name:var(--font-heading)] text-lg font-bold text-foreground leading-none">
          {label}
        </h3>
        {sub && <p className="text-xs text-muted-foreground mt-0.5">{sub}</p>}
      </div>
      <div className="flex-1 h-px bg-gradient-to-r from-border/60 to-transparent ml-2" />
    </div>
  );
}

function StatBlock({
  label,
  value,
  sub,
  accent,
}: {
  label: string;
  value: string;
  sub?: string;
  accent?: "gold" | "blue" | "green" | "red";
}) {
  const accentClass = {
    gold: "text-amber-400",
    blue: "text-blue-400",
    green: "text-emerald-400",
    red: "text-red-400",
  }[accent ?? "gold"] ?? "text-foreground";

  return (
    <div className="flex flex-col gap-1 min-w-0">
      <span className="text-[10px] font-semibold uppercase tracking-widest text-muted-foreground/70">
        {label}
      </span>
      <span
        className={cn(
          "font-[family-name:var(--font-heading)] text-2xl font-bold leading-none",
          accentClass
        )}
      >
        {value}
      </span>
      {sub && (
        <span className="text-[11px] text-muted-foreground truncate">{sub}</span>
      )}
    </div>
  );
}

function CardIcon({ card }: { card: DeckCard }) {
  const isEvo = card.variant === "evolution";
  const isHero = card.variant === "heroic";

  return (
    <div
      className="relative aspect-[3/4] rounded-md overflow-hidden border bg-muted group hover:scale-110 hover:z-20 transition-all duration-200 shadow-sm hover:shadow-lg"
      style={{
        borderColor: isEvo
          ? "rgba(168, 85, 247, 0.7)"
          : isHero
          ? "rgba(234, 179, 8, 0.7)"
          : "rgba(255,255,255,0.08)",
      }}
    >
      <Image
        src={cardImagePath(card.name, card.variant)}
        alt={card.name}
        fill
        className="object-contain p-0.5"
        sizes="96px"
      />
      <div className="absolute inset-x-0 bottom-0 opacity-0 group-hover:opacity-100 transition-opacity duration-150 z-10 pointer-events-none">
        <p className="text-white text-[9px] font-bold text-center truncate px-0.5 pb-0.5 drop-shadow-[0_1px_3px_rgba(0,0,0,0.95)]">
          {card.name}
        </p>
      </div>
      {(isEvo || isHero) && (
        <div
          className={cn(
            "absolute top-0.5 right-0.5 text-[7px] font-black px-1 py-0.5 rounded-sm leading-none tracking-wider",
            isEvo ? "bg-purple-600 text-white" : "bg-yellow-400 text-black"
          )}
        >
          {isEvo ? "EVO" : "HERO"}
        </div>
      )}
    </div>
  );
}

function DeckAccordion({ deck, rank }: { deck: PlayerDeck; rank: number }) {
  const [open, setOpen] = useState(false);

  const sorted = [
    ...deck.cards.filter((c) => c.variant === "evolution"),
    ...deck.cards.filter((c) => c.variant === "heroic"),
    ...deck.cards.filter((c) => c.variant === "normal"),
  ];

  const wr = deck.win_rate ?? 0;
  const wrColor =
    wr >= 55 ? "text-emerald-400" : wr >= 50 ? "text-amber-400" : "text-red-400";
  const wrBarColor =
    wr >= 55 ? "bg-emerald-500" : wr >= 50 ? "bg-amber-500" : "bg-red-500";

  return (
    <div
      className={cn(
        "rounded-xl border bg-card/60 backdrop-blur-sm overflow-hidden transition-all duration-200",
        open ? "border-border shadow-lg" : "border-border/50 hover:border-border/80 hover:shadow-md"
      )}
    >
      <button
        onClick={() => setOpen((v) => !v)}
        className="w-full flex items-center gap-4 px-5 py-4 text-left hover:bg-muted/20 transition-colors"
      >
        {/* Rank */}
        <span className="font-[family-name:var(--font-heading)] text-2xl font-black text-muted-foreground/30 w-6 shrink-0 text-center">
          {rank}
        </span>

        {/* Mini card strip (collapsed preview) */}
        {!open && sorted.length > 0 && (
          <div className="hidden sm:flex items-center gap-1 shrink-0">
            {sorted.slice(0, 8).map((card, i) => {
              const base = card.name.toLowerCase().replace(/ /g, "_").replace(/\./g, "");
              const suffix = card.variant === "evolution" ? "_evolution" : card.variant === "heroic" ? "_hero" : "";
              return (
                <div key={i} className="relative w-7 aspect-[3/4] rounded overflow-hidden bg-muted border border-white/5">
                  <Image src={`/cards/${base}/${base}${suffix}.png`} alt={card.name} fill className="object-contain" sizes="28px" />
                </div>
              );
            })}
          </div>
        )}

        {/* Stats */}
        <div className="flex-1 flex flex-wrap items-center gap-x-5 gap-y-1 min-w-0">
          <span className={cn("font-[family-name:var(--font-heading)] text-lg font-bold", wrColor)}>
            {deck.win_rate !== null ? `${deck.win_rate}%` : "—"}
            <span className="text-xs font-normal text-muted-foreground ml-1">WR</span>
          </span>
          <span className="text-sm text-muted-foreground">
            {deck.games.toLocaleString()} games
          </span>
          <span className="flex items-center gap-1 text-sm text-muted-foreground">
            <Zap className="w-3.5 h-3.5 text-purple-400" />
            {deck.avg_elixir ?? "—"}
          </span>
          <span className="text-sm text-emerald-400 font-semibold">
            {deck.wins}W
          </span>
        </div>

        {open ? (
          <ChevronUp className="w-4 h-4 shrink-0 text-muted-foreground" />
        ) : (
          <ChevronDown className="w-4 h-4 shrink-0 text-muted-foreground" />
        )}
      </button>

      {open && (
        <div className="px-5 pb-5 pt-2 border-t border-border/40 space-y-3">
          {/* Win rate bar */}
          <div className="flex items-center gap-3">
            <div className="flex-1 h-1.5 bg-muted/60 rounded-full overflow-hidden">
              <div
                className={cn("h-full rounded-full transition-all duration-500", wrBarColor)}
                style={{ width: `${Math.min(wr, 100)}%` }}
              />
            </div>
            <span className={cn("text-xs font-bold tabular-nums", wrColor)}>
              {deck.win_rate !== null ? `${deck.win_rate}%` : "—"}
            </span>
          </div>

          {/* Card grid */}
          <div className="grid grid-cols-8 gap-2">
            {sorted.slice(0, 8).map((card, i) => (
              <CardIcon key={i} card={card} />
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

// ─── Page ────────────────────────────────────────────────────────────────────

export default function ProfilesPage() {
  const [query, setQuery] = useState("");
  const [isSearching, setIsSearching] = useState(false);
  const [searchError, setSearchError] = useState<string | null>(null);
  const [searchResults, setSearchResults] = useState<PlayerSearchResult[] | null>(null);

  const [selectedPlayer, setSelectedPlayer] = useState<PlayerSearchResult | null>(null);
  const [crInfo, setCrInfo] = useState<CRPlayerInfo | null>(null);
  const [decks, setDecks] = useState<PlayerDeck[] | null>(null);
  const [battles, setBattles] = useState<Battle[] | null>(null);
  const [isLoadingDetails, setIsLoadingDetails] = useState(false);
  const [detailsError, setDetailsError] = useState<string | null>(null);

  const lastSearchRef = useRef<number>(0);

  const handleSearch = useCallback(async () => {
    const trimmed = query.trim();
    if (!trimmed) return;
    const now = Date.now();
    if (now - lastSearchRef.current < 400) return;
    lastSearchRef.current = now;

    setIsSearching(true);
    setSearchError(null);
    setSearchResults(null);
    setSelectedPlayer(null);
    setDecks(null);
    setBattles(null);
    setCrInfo(null);
    setDetailsError(null);

    try {
      const res = await fetch(
        `${API_BASE_URL}/api/players?name=${encodeURIComponent(trimmed)}`
      );
      if (!res.ok) throw new Error(`Request failed: ${res.status}`);
      const data = await res.json();
      const players: PlayerSearchResult[] = data.players ?? [];
      setSearchResults(players);
      if (players.length === 1) await selectPlayer(players[0]);
    } catch {
      setSearchError("Failed to search players. Please try again.");
    } finally {
      setIsSearching(false);
    }
  }, [query]);

  const selectPlayer = useCallback(async (player: PlayerSearchResult) => {
    setSelectedPlayer(player);
    setCrInfo(null);
    setDecks(null);
    setBattles(null);
    setDetailsError(null);
    setIsLoadingDetails(true);

    try {
      const tag = encodeURIComponent(player.player_tag);
      const [crRes, decksRes, battlesRes] = await Promise.all([
        fetch(`${API_BASE_URL}/api/players/${tag}/info`),
        fetch(`${API_BASE_URL}/api/players/${tag}/decks`),
        fetch(`${API_BASE_URL}/api/players/${tag}/battles`),
      ]);
      if (!decksRes.ok || !battlesRes.ok) throw new Error("Failed to fetch player details");
      const [decksData, battlesData] = await Promise.all([decksRes.json(), battlesRes.json()]);
      setDecks(decksData.decks ?? []);
      setBattles(battlesData.battles ?? []);
      if (crRes.ok) setCrInfo(await crRes.json());
    } catch {
      setDetailsError("Failed to load player details. Please try again.");
    } finally {
      setIsLoadingDetails(false);
    }
  }, []);

  return (
    <div className="min-h-screen bg-background text-foreground pb-24 relative overflow-hidden">
      {/* Background */}
      <div className="fixed inset-0 hexagon-pattern opacity-[0.025] pointer-events-none" />
      <div className="fixed top-[-10%] right-[-5%] w-[500px] h-[500px] bg-primary/8 rounded-full blur-[120px] pointer-events-none" />
      <div className="fixed bottom-[-10%] left-[-5%] w-[400px] h-[400px] bg-accent/6 rounded-full blur-[100px] pointer-events-none" />

      <div className="max-w-4xl mx-auto px-4 sm:px-6 py-10 space-y-8 relative z-10">

        {/* ── Header ── */}
        <div className="space-y-2 pb-6 border-b border-border/40 relative">
          <div className="absolute bottom-0 inset-x-0 h-px bg-gradient-to-r from-transparent via-primary/50 to-transparent battle-glow" />
          <h1 className="font-[family-name:var(--font-heading)] text-5xl sm:text-6xl font-extrabold tracking-tight bg-gradient-to-r from-primary via-amber-300 to-primary/70 bg-clip-text text-transparent">
            Player Profiles
          </h1>
          <p className="text-muted-foreground text-sm max-w-xl">
            Search top-ranked players from our battle database and explore their stats, decks, and recent history.
          </p>
        </div>

        {/* ── Search ── */}
        <div className="relative">
          <div className="flex gap-2">
            <div className="relative flex-1">
              <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground pointer-events-none" />
              <Input
                className="pl-10 h-11 bg-card border-border/60 focus-visible:border-primary/60 focus-visible:ring-primary/20 transition-all text-base"
                placeholder="Search by player name…"
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && handleSearch()}
              />
            </div>
            <Button
              onClick={handleSearch}
              disabled={isSearching || !query.trim()}
              className="h-11 px-5 bg-primary text-primary-foreground hover:bg-primary/90 shadow-md shadow-primary/20 font-semibold transition-all"
            >
              {isSearching ? (
                <Loader2 className="w-4 h-4 animate-spin" />
              ) : (
                <Search className="w-4 h-4" />
              )}
              <span className="ml-2 hidden sm:inline">Search</span>
            </Button>
          </div>
        </div>

        {/* ── Search error ── */}
        {searchError && (
          <div className="flex items-center gap-3 px-4 py-3 rounded-xl bg-destructive/10 border border-destructive/30 text-destructive">
            <AlertTriangle className="w-4 h-4 shrink-0" />
            <p className="text-sm flex-1">{searchError}</p>
            <button onClick={handleSearch} className="text-xs flex items-center gap-1 hover:opacity-80">
              <RefreshCw className="w-3 h-3" /> Retry
            </button>
          </div>
        )}

        {/* ── Empty state ── */}
        {!searchResults && !isSearching && !searchError && (
          <div className="flex flex-col items-center justify-center py-24 text-center">
            <div className="w-14 h-14 rounded-full border border-border/50 bg-card flex items-center justify-center mb-4">
              <User className="w-6 h-6 text-muted-foreground/40" />
            </div>
            <p className="font-[family-name:var(--font-heading)] text-lg font-bold text-muted-foreground/60">
              Find a player
            </p>
            <p className="text-sm text-muted-foreground/40 mt-1 max-w-xs">
              Search by name to look up players seen in top-ranked battles.
            </p>
          </div>
        )}

        {/* ── No results ── */}
        {searchResults && searchResults.length === 0 && !isSearching && (
          <div className="flex flex-col items-center justify-center py-16 rounded-2xl border border-dashed border-border/50 bg-muted/10">
            <Search className="w-8 h-8 text-muted-foreground/30 mb-3" />
            <p className="font-semibold text-muted-foreground">No players found</p>
            <p className="text-xs text-muted-foreground/60 mt-1">Try a different name.</p>
          </div>
        )}

        {/* ── Multiple results ── */}
        {searchResults && searchResults.length > 1 && !selectedPlayer && (
          <div className="space-y-3 arena-entrance">
            <p className="text-sm text-muted-foreground px-1">
              <span className="text-foreground font-semibold">{searchResults.length} players</span> matched — select one
            </p>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
              {searchResults.map((p, i) => (
                <button
                  key={p.player_tag}
                  onClick={() => selectPlayer(p)}
                  className="group flex items-center gap-4 text-left bg-card border border-border/50 rounded-xl px-5 py-4 hover:bg-muted/30 hover:border-primary/40 hover:shadow-md transition-all"
                >
                  <span className="font-[family-name:var(--font-heading)] text-xl font-black text-muted-foreground/30 w-5 shrink-0">
                    {i + 1}
                  </span>
                  <div className="flex-1 min-w-0">
                    <p className="font-semibold text-foreground truncate group-hover:text-primary transition-colors">
                      {p.name}
                    </p>
                    <p className="text-xs text-muted-foreground font-mono mt-0.5">
                      {formatTag(p.player_tag)}
                    </p>
                  </div>
                  <div className="text-right shrink-0">
                    <p className="text-sm font-bold text-foreground tabular-nums">
                      {p.total_games.toLocaleString()}
                      <span className="text-xs font-normal text-muted-foreground ml-1">games</span>
                    </p>
                    {p.win_rate !== null && (
                      <p className="text-xs text-muted-foreground">{p.win_rate}% WR</p>
                    )}
                  </div>
                </button>
              ))}
            </div>
          </div>
        )}

        {/* ── Player detail ── */}
        {selectedPlayer && (
          <div className="space-y-6 arena-entrance">

            {/* Back */}
            {searchResults && searchResults.length > 1 && (
              <button
                onClick={() => setSelectedPlayer(null)}
                className="flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground transition-colors"
              >
                <ArrowLeft className="w-3.5 h-3.5" />
                Back to results
              </button>
            )}

            {/* ── Player hero card ── */}
            <div className="relative rounded-2xl border border-border/60 bg-card overflow-hidden shadow-xl">
              {/* Gold accent bar */}
              <div className="h-1 w-full bg-gradient-to-r from-primary/40 via-primary to-amber-300/60 battle-glow" />

              <div className="p-6 sm:p-8">
                {/* Name row */}
                <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-4 mb-8">
                  <div>
                    <h2 className="font-[family-name:var(--font-heading)] text-4xl sm:text-5xl font-extrabold text-foreground leading-none">
                      {selectedPlayer.name}
                    </h2>
                    <p className="font-mono text-sm text-muted-foreground/70 mt-2">
                      {formatTag(selectedPlayer.player_tag)}
                    </p>
                  </div>
                  <div className="flex items-center gap-1.5 text-xs text-muted-foreground bg-muted/50 rounded-lg px-3 py-2 border border-border/40 self-start shrink-0">
                    <Clock className="w-3 h-3" />
                    Last seen {formatLastSeen(selectedPlayer.last_seen)}
                  </div>
                </div>

                {/* DB Analytics stats */}
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-6">
                  <StatBlock
                    label="Games Tracked"
                    value={selectedPlayer.total_games.toLocaleString()}
                    accent="gold"
                  />
                  <StatBlock
                    label="Win Rate"
                    value={selectedPlayer.win_rate !== null ? `${selectedPlayer.win_rate}%` : "—"}
                    sub={`${selectedPlayer.wins.toLocaleString()} wins`}
                    accent={
                      (selectedPlayer.win_rate ?? 0) >= 55
                        ? "green"
                        : (selectedPlayer.win_rate ?? 0) >= 50
                        ? "gold"
                        : "red"
                    }
                  />
                  <StatBlock
                    label="Avg Crowns Taken"
                    value={selectedPlayer.avg_crowns !== null ? selectedPlayer.avg_crowns.toFixed(2) : "—"}
                    accent="blue"
                  />
                  <StatBlock
                    label="Elixir Leaked"
                    value={
                      selectedPlayer.avg_elixir_leaked !== null
                        ? selectedPlayer.avg_elixir_leaked.toFixed(2)
                        : "—"
                    }
                    sub="avg per game"
                    accent="gold"
                  />
                </div>
              </div>
            </div>

            {/* ── Loading ── */}
            {isLoadingDetails && (
              <div className="flex items-center justify-center gap-3 py-16 text-muted-foreground">
                <Loader2 className="w-5 h-5 animate-spin text-primary" />
                <span className="text-sm">Loading player details…</span>
              </div>
            )}

            {/* ── Error ── */}
            {detailsError && !isLoadingDetails && (
              <div className="flex items-center gap-3 px-4 py-3 rounded-xl bg-destructive/10 border border-destructive/30 text-destructive">
                <AlertTriangle className="w-4 h-4 shrink-0" />
                <p className="text-sm flex-1">{detailsError}</p>
                <button
                  onClick={() => selectPlayer(selectedPlayer)}
                  className="text-xs flex items-center gap-1 hover:opacity-80"
                >
                  <RefreshCw className="w-3 h-3" /> Retry
                </button>
              </div>
            )}

            {/* ── Live CR Info ── */}
            {!isLoadingDetails && crInfo && (
              <div className="rounded-2xl border border-border/60 bg-card overflow-hidden shadow-lg">
                <div className="px-6 pt-5 pb-4 border-b border-border/40">
                  <div className="flex items-center gap-2">
                    <Shield className="w-4 h-4 text-primary" />
                    <span className="font-[family-name:var(--font-heading)] font-bold text-foreground">
                      Live Player Data
                    </span>
                    <span className="flex items-center gap-1.5 ml-auto text-[10px] text-emerald-400 font-semibold uppercase tracking-wider">
                      <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
                      Clash Royale API
                    </span>
                  </div>
                </div>

                <div className="p-6 space-y-6">
                  {/* Core stats grid */}
                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-6">
                    <StatBlock
                      label="Trophies"
                      value={crInfo.trophies.toLocaleString()}
                      sub={`Best: ${crInfo.best_trophies.toLocaleString()}`}
                      accent="gold"
                    />
                    <StatBlock
                      label="PoL Medals"
                      value={crInfo.current_path_of_legends_medals?.toLocaleString() ?? "—"}
                      sub={`Best: ${crInfo.best_path_of_legends_medals?.toLocaleString() ?? "—"}`}
                      accent="blue"
                    />
                    <div className="flex flex-col gap-1 min-w-0">
                      <span className="text-[10px] font-semibold uppercase tracking-widest text-muted-foreground/70">
                        Wins / Losses
                      </span>
                      <span className="font-[family-name:var(--font-heading)] text-2xl font-bold leading-none">
                        <span className="text-emerald-400">{crInfo.wins.toLocaleString()}</span>
                        <span className="text-muted-foreground/50 mx-1">/</span>
                        <span className="text-red-400">{crInfo.losses.toLocaleString()}</span>
                      </span>
                      {crInfo.wins + crInfo.losses > 0 && (
                        <span className="text-[11px] text-muted-foreground truncate">
                          {((crInfo.wins / (crInfo.wins + crInfo.losses)) * 100).toFixed(1)}% WR
                        </span>
                      )}
                    </div>
                    <StatBlock
                      label="3-Crown Wins"
                      value={crInfo.three_crown_wins.toLocaleString()}
                      sub={
                        crInfo.challenge_max_wins != null
                          ? `Best challenge: ${crInfo.challenge_max_wins}`
                          : undefined
                      }
                      accent="gold"
                    />
                  </div>

                  {/* Tags row */}
                  <div className="flex flex-wrap gap-2">
                    {crInfo.arena && (
                      <div className="flex items-center gap-1.5 text-xs bg-muted/50 border border-border/40 rounded-lg px-3 py-1.5">
                        <Shield className="w-3 h-3 text-muted-foreground" />
                        <span className="text-muted-foreground">Arena</span>
                        <span className="font-semibold text-foreground">{crInfo.arena.name}</span>
                      </div>
                    )}
                    {crInfo.clan && (
                      <div className="flex items-center gap-1.5 text-xs bg-muted/50 border border-border/40 rounded-lg px-3 py-1.5">
                        <User className="w-3 h-3 text-muted-foreground" />
                        <span className="text-muted-foreground">Clan</span>
                        <span className="font-semibold text-foreground">{crInfo.clan.clan_name}</span>
                      </div>
                    )}
                    {crInfo.total_donations != null && crInfo.total_donations > 0 && (
                      <div className="flex items-center gap-1.5 text-xs bg-muted/50 border border-border/40 rounded-lg px-3 py-1.5">
                        <Heart className="w-3 h-3 text-muted-foreground" />
                        <span className="text-muted-foreground">Donations</span>
                        <span className="font-semibold text-foreground">{crInfo.total_donations.toLocaleString()}</span>
                      </div>
                    )}
                    {crInfo.current_favorite_card && (
                      <div className="flex items-center gap-1.5 text-xs bg-amber-500/10 border border-amber-500/25 rounded-lg px-3 py-1.5">
                        <Star className="w-3 h-3 text-amber-400" />
                        <span className="text-muted-foreground">Favourite</span>
                        <span className="font-semibold text-foreground">{crInfo.current_favorite_card.name}</span>
                      </div>
                    )}
                  </div>
                </div>
              </div>
            )}

            {/* ── Most Used Decks ── */}
            {!isLoadingDetails && decks !== null && (
              <div>
                <SectionHeading
                  icon={<Swords className="w-4 h-4" />}
                  label="Most Used Decks"
                  sub="Top 5 by games played"
                />
                {decks.length === 0 ? (
                  <div className="text-sm text-muted-foreground/60 text-center py-10 rounded-xl border border-dashed border-border/40">
                    No deck data available for this player.
                  </div>
                ) : (
                  <div className="space-y-2">
                    {decks.map((deck, i) => (
                      <DeckAccordion key={deck.deck_id} deck={deck} rank={i + 1} />
                    ))}
                  </div>
                )}
              </div>
            )}

            {/* ── Recent Battles ── */}
            {!isLoadingDetails && battles !== null && (
              <div>
                <SectionHeading
                  icon={<Trophy className="w-4 h-4" />}
                  label="Recent Battles"
                  sub="Last 20 battles from database"
                />
                {battles.length === 0 ? (
                  <div className="text-sm text-muted-foreground/60 text-center py-10 rounded-xl border border-dashed border-border/40">
                    No recent battles found.
                  </div>
                ) : (
                  <div className="rounded-xl border border-border/50 bg-card overflow-hidden shadow-sm">
                    <div className="overflow-x-auto">
                      <table className="w-full text-sm">
                        <thead>
                          <tr className="border-b border-border/50 bg-muted/20">
                            <th className="text-left px-4 py-3 text-[10px] font-bold uppercase tracking-widest text-muted-foreground/60 w-4" />
                            <th className="text-left px-4 py-3 text-[10px] font-bold uppercase tracking-widest text-muted-foreground/60">Time</th>
                            <th className="text-left px-4 py-3 text-[10px] font-bold uppercase tracking-widest text-muted-foreground/60">Mode</th>
                            <th className="text-center px-4 py-3 text-[10px] font-bold uppercase tracking-widest text-muted-foreground/60">Crowns</th>
                            <th className="text-center px-4 py-3 text-[10px] font-bold uppercase tracking-widest text-muted-foreground/60">Elixir</th>
                            <th className="text-left px-4 py-3 text-[10px] font-bold uppercase tracking-widest text-muted-foreground/60">Opponent</th>
                          </tr>
                        </thead>
                        <tbody>
                          {battles.map((battle, i) => {
                            const isWin = battle.result === "Win";
                            return (
                              <tr
                                key={i}
                                className="border-b border-border/25 last:border-0 hover:bg-muted/15 transition-colors group"
                              >
                                {/* Color strip */}
                                <td className="pl-0 pr-0 py-0 w-1">
                                  <div
                                    className={cn(
                                      "w-1 h-full min-h-[44px]",
                                      isWin ? "bg-emerald-500/70" : "bg-red-500/50"
                                    )}
                                  />
                                </td>
                                <td className="px-4 py-3 text-xs text-muted-foreground whitespace-nowrap">
                                  {formatBattleTime(battle.battle_time)}
                                </td>
                                <td className="px-4 py-3 text-xs text-foreground/80 max-w-[150px] truncate">
                                  {battle.game_mode ?? "—"}
                                </td>
                                <td className="px-4 py-3 text-center">
                                  <span className="inline-flex items-center gap-1 font-bold text-foreground tabular-nums">
                                    <Crown className="w-3 h-3 text-amber-400" />
                                    {battle.crowns ?? "—"}
                                  </span>
                                </td>
                                <td className="px-4 py-3 text-center text-xs text-muted-foreground tabular-nums">
                                  {battle.elixir_leaked !== null ? battle.elixir_leaked.toFixed(1) : "—"}
                                </td>
                                <td className="px-4 py-3 text-xs text-foreground/70 max-w-[140px] truncate">
                                  {battle.opponent ?? (
                                    <span className="text-muted-foreground/40">Unknown</span>
                                  )}
                                </td>
                              </tr>
                            );
                          })}
                        </tbody>
                      </table>
                    </div>
                  </div>
                )}
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
