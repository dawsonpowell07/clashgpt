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
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";
import { Inter } from "next/font/google";

const inter = Inter({
  subsets: ["latin"],
  weight: ["400", "500", "600", "700", "800"],
});

const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000";

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

function MetricCard({
  label,
  value,
  icon,
}: {
  label: string;
  value: string | number;
  icon: React.ReactNode;
}) {
  return (
    <div className="flex flex-col gap-2 bg-muted/50 rounded-xl px-4 py-3 border border-border/30 flex-1 min-w-[120px]">
      <div className="flex items-center gap-2 text-muted-foreground">
        {icon}
        <span className="text-xs font-semibold uppercase tracking-wide">{label}</span>
      </div>
      <span className="text-2xl font-bold text-foreground">{value}</span>
    </div>
  );
}

function cardImagePath(name: string, variant: string): string {
  const base = name.toLowerCase().replace(/ /g, "_").replace(/\./g, "");
  const suffix = variant === "evolution" ? "_evolution" : variant === "heroic" ? "_hero" : "";
  return `/cards/${base}/${base}${suffix}.png`;
}

function CardIcon({ card }: { card: DeckCard }) {
  const isEvo = card.variant === "evolution";
  const isHero = card.variant === "heroic";

  return (
    <div
      className={cn(
        "relative aspect-[3/4] rounded-lg overflow-hidden border-2 bg-muted group",
        "hover:scale-110 hover:z-20 transition-all duration-200 shadow-sm hover:shadow-md"
      )}
      style={{
        borderColor: isEvo
          ? "rgb(168, 85, 247)"
          : isHero
          ? "rgb(234, 179, 8)"
          : "rgba(255,255,255,0.1)",
      }}
    >
      <Image
        src={cardImagePath(card.name, card.variant)}
        alt={card.name}
        fill
        className="object-contain p-0.5"
        sizes="96px"
      />
      {/* Name tooltip on hover */}
      <div className="absolute inset-x-0 bottom-0 opacity-0 group-hover:opacity-100 transition-opacity duration-150 z-10 pointer-events-none">
        <p className="text-white text-[9px] font-bold text-center truncate px-0.5 pb-0.5 drop-shadow-[0_1px_3px_rgba(0,0,0,0.9)]">
          {card.name}
        </p>
      </div>
      {/* Variant badge */}
      {(isEvo || isHero) && (
        <div
          className={cn(
            "absolute top-0.5 right-0.5 text-[8px] font-bold px-1 py-0.5 rounded leading-none",
            isEvo ? "bg-purple-600 text-white" : "bg-yellow-500 text-black"
          )}
        >
          {isEvo ? "EVO" : "HERO"}
        </div>
      )}
    </div>
  );
}

function DeckAccordion({ deck }: { deck: PlayerDeck }) {
  const [open, setOpen] = useState(false);

  // Sort cards: evos first, then heroes, then normals (matching DeckGridCard)
  const sorted = [
    ...deck.cards.filter((c) => c.variant === "evolution"),
    ...deck.cards.filter((c) => c.variant === "heroic"),
    ...deck.cards.filter((c) => c.variant === "normal"),
  ];

  return (
    <div className="bg-card border border-border/50 rounded-xl overflow-hidden transition-all hover:shadow-md">
      <button
        onClick={() => setOpen((v) => !v)}
        className="w-full flex items-center justify-between px-5 py-4 text-left hover:bg-muted/30 transition-colors"
      >
        <div className="flex flex-wrap items-center gap-3">
          <span className="font-semibold text-sm text-foreground">
            {deck.win_rate !== null ? `${deck.win_rate}% WR` : "—% WR"}
          </span>
          <span className="text-muted-foreground text-sm">•</span>
          <span className="text-sm text-muted-foreground">{deck.games} games</span>
          <span className="text-muted-foreground text-sm">•</span>
          <span className="flex items-center gap-1 text-sm text-muted-foreground">
            <Zap className="w-3.5 h-3.5 text-yellow-500" />
            {deck.avg_elixir !== null ? deck.avg_elixir : "—"} elixir
          </span>
          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-semibold bg-green-500/15 text-green-400 border border-green-500/25">
            {deck.wins}W
          </span>
        </div>
        {open ? (
          <ChevronUp className="w-4 h-4 flex-shrink-0 text-muted-foreground" />
        ) : (
          <ChevronDown className="w-4 h-4 flex-shrink-0 text-muted-foreground" />
        )}
      </button>

      {open && (
        <div className="px-5 pb-4 pt-3 border-t border-border/30">
          {/* Card icon grid: all 8 in one row */}
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
    setDetailsError(null);

    try {
      const res = await fetch(
        `${API_BASE_URL}/api/players?name=${encodeURIComponent(trimmed)}`
      );
      if (!res.ok) throw new Error(`Request failed: ${res.status}`);
      const data = await res.json();
      const players: PlayerSearchResult[] = data.players ?? [];
      setSearchResults(players);

      // Auto-select if only one result
      if (players.length === 1) {
        await selectPlayer(players[0]);
      }
    } catch (e) {
      console.error(e);
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

      if (!decksRes.ok || !battlesRes.ok) {
        throw new Error("Failed to fetch player details");
      }

      const [decksData, battlesData] = await Promise.all([
        decksRes.json(),
        battlesRes.json(),
      ]);

      setDecks(decksData.decks ?? []);
      setBattles(battlesData.battles ?? []);

      // CR info is best-effort — don't fail the whole page if it's unavailable
      if (crRes.ok) {
        setCrInfo(await crRes.json());
      }
    } catch (e) {
      console.error(e);
      setDetailsError("Failed to load player details. Please try again.");
    } finally {
      setIsLoadingDetails(false);
    }
  }, []);

  return (
    <div
      className={cn(
        inter.className,
        "min-h-screen bg-gradient-to-b from-background via-background to-background/95 text-foreground pb-20 relative overflow-hidden"
      )}
    >
      {/* Background decoration */}
      <div className="fixed inset-0 hexagon-pattern opacity-[0.03] pointer-events-none" />
      <div className="fixed top-0 left-1/4 w-96 h-96 bg-primary/5 rounded-full blur-3xl pointer-events-none" />
      <div className="fixed bottom-0 right-1/4 w-96 h-96 bg-accent/5 rounded-full blur-3xl pointer-events-none" />

      <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-8 relative z-10">

        {/* Page Header */}
        <div className="relative flex flex-col gap-4 pb-6 border-b-2 border-border/30">
          <div className="absolute inset-x-0 bottom-0 h-[3px] bg-gradient-to-r from-transparent via-primary to-transparent opacity-60" />
          <h1 className="text-5xl sm:text-6xl font-[family-name:var(--font-heading)] font-extrabold tracking-tight bg-gradient-to-r from-primary via-primary/90 to-accent bg-clip-text text-transparent relative">
            <span className="relative inline-block">
              Player Profiles
              <span className="absolute inset-0 bg-gradient-to-r from-primary to-accent blur-2xl opacity-20 -z-10" />
            </span>
          </h1>
          <p className="text-muted-foreground text-base font-normal max-w-2xl">
            Search top-ranked players and explore their battle stats, decks, and recent history
          </p>
        </div>

        {/* Search Bar */}
        <div className="relative bg-gradient-to-br from-card via-card to-muted/20 border border-border/50 rounded-2xl p-6 shadow-lg backdrop-blur-sm">
          <div className="absolute inset-0 rounded-2xl bg-gradient-to-br from-primary/5 to-transparent pointer-events-none" />
          <div className="relative flex gap-3">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
              <Input
                className="pl-10 h-12 text-base bg-muted/50 border-border/50 focus:border-primary/50 focus:ring-primary/30"
                placeholder="Search by player name..."
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && handleSearch()}
              />
            </div>
            <Button
              onClick={handleSearch}
              disabled={isSearching || !query.trim()}
              className="h-12 px-6 bg-gradient-to-r from-primary to-primary/80 hover:from-primary/90 hover:to-primary/70 shadow-lg shadow-primary/20 transition-all transform hover:scale-105"
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

        {/* Search Error */}
        {searchError && (
          <div className="flex items-center gap-3 px-5 py-4 rounded-xl bg-destructive/10 border border-destructive/30 text-destructive">
            <AlertTriangle className="w-5 h-5 flex-shrink-0" />
            <p className="text-sm font-medium flex-1">{searchError}</p>
            <button
              onClick={handleSearch}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium bg-destructive/10 hover:bg-destructive/20 rounded-md transition-colors"
            >
              <RefreshCw className="w-3 h-3" />
              Retry
            </button>
          </div>
        )}

        {/* Empty state (no search yet) */}
        {!searchResults && !isSearching && !searchError && (
          <div className="flex flex-col items-center justify-center py-20 text-center">
            <div className="w-16 h-16 rounded-full bg-muted/50 border border-border flex items-center justify-center mb-4">
              <User className="w-8 h-8 text-muted-foreground/50" />
            </div>
            <p className="text-lg font-semibold text-muted-foreground mb-1">Find a player</p>
            <p className="text-sm text-muted-foreground/70 max-w-sm">
              Search by name to look up top-ranked players from our battle database.
            </p>
          </div>
        )}

        {/* Search Results List (when multiple) */}
        {searchResults && searchResults.length === 0 && !isSearching && (
          <div className="flex flex-col items-center justify-center py-16 px-4 bg-muted/20 rounded-2xl border border-dashed border-border">
            <Search className="w-10 h-10 text-muted-foreground/50 mb-3" />
            <p className="text-base font-semibold text-muted-foreground">No players found</p>
            <p className="text-sm text-muted-foreground/70 mt-1">Try a different name.</p>
          </div>
        )}

        {searchResults && searchResults.length > 1 && !selectedPlayer && (
          <div className="space-y-3">
            <h2 className="text-lg font-bold text-foreground px-1">
              {searchResults.length} players found — select one
            </h2>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              {searchResults.map((p) => (
                <button
                  key={p.player_tag}
                  onClick={() => selectPlayer(p)}
                  className="group text-left bg-card border border-border/50 rounded-xl px-5 py-4 hover:bg-muted/30 hover:border-primary/40 hover:shadow-md transition-all"
                >
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex-1 min-w-0">
                      <p className="font-bold text-foreground truncate group-hover:text-primary transition-colors">
                        {p.name}
                      </p>
                      <p className="text-xs text-muted-foreground font-mono mt-0.5">
                        {formatTag(p.player_tag)}
                      </p>
                    </div>
                    <div className="flex-shrink-0 text-right">
                      <p className="text-sm font-semibold text-foreground">
                        {p.total_games.toLocaleString()} games
                      </p>
                      <p className="text-xs text-muted-foreground">
                        {p.win_rate !== null ? `${p.win_rate}% WR` : "—"}
                      </p>
                    </div>
                  </div>
                </button>
              ))}
            </div>
          </div>
        )}

        {/* Player Detail View */}
        {selectedPlayer && (
          <div className="space-y-6">
            {/* Back button when multiple results were shown */}
            {searchResults && searchResults.length > 1 && (
              <button
                onClick={() => setSelectedPlayer(null)}
                className="text-sm text-muted-foreground hover:text-foreground transition-colors flex items-center gap-1"
              >
                ← Back to results
              </button>
            )}

            {/* Player Header */}
            <div className="bg-gradient-to-br from-card via-card to-muted/20 border border-border/50 rounded-2xl p-6 shadow-lg backdrop-blur-sm space-y-5">
              <div className="absolute inset-0 rounded-2xl bg-gradient-to-br from-primary/5 to-transparent pointer-events-none" />

              <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-3">
                <div>
                  <h2 className="text-3xl font-extrabold text-foreground">{selectedPlayer.name}</h2>
                  <p className="text-sm font-mono text-muted-foreground mt-1">
                    {formatTag(selectedPlayer.player_tag)}
                  </p>
                </div>
                <div className="flex items-center gap-1.5 text-xs text-muted-foreground bg-muted/50 rounded-lg px-3 py-1.5 border border-border/30 self-start">
                  <Clock className="w-3.5 h-3.5" />
                  Last seen: {formatLastSeen(selectedPlayer.last_seen)}
                </div>
              </div>

              {/* Metrics row */}
              <div className="flex flex-wrap gap-3">
                <MetricCard
                  label="Total Games Tracked"
                  value={selectedPlayer.total_games.toLocaleString()}
                  icon={<Swords className="w-3.5 h-3.5" />}
                />
                <MetricCard
                  label="Win Rate"
                  value={
                    selectedPlayer.win_rate !== null
                      ? `${selectedPlayer.win_rate}%`
                      : "—"
                  }
                  icon={<Trophy className="w-3.5 h-3.5" />}
                />
                <MetricCard
                  label="Avg Crowns"
                  value={
                    selectedPlayer.avg_crowns !== null
                      ? selectedPlayer.avg_crowns.toFixed(2)
                      : "—"
                  }
                  icon={<Crown className="w-3.5 h-3.5" />}
                />
                <MetricCard
                  label="Avg Elixir Leaked"
                  value={
                    selectedPlayer.avg_elixir_leaked !== null
                      ? selectedPlayer.avg_elixir_leaked.toFixed(2)
                      : "—"
                  }
                  icon={<Zap className="w-3.5 h-3.5" />}
                />
              </div>
            </div>

            {/* Clash Royale Live Info */}
            {!isLoadingDetails && crInfo && (
              <div className="bg-gradient-to-br from-card via-card to-muted/20 border border-border/50 rounded-2xl p-6 shadow-lg backdrop-blur-sm space-y-5">
                <div className="flex items-center gap-2 mb-1">
                  <Shield className="w-4 h-4 text-primary" />
                  <h3 className="text-base font-bold text-foreground">Live Player Info</h3>
                  <span className="ml-auto text-xs text-muted-foreground bg-muted/50 px-2 py-0.5 rounded-full border border-border/30">
                    from Clash Royale API
                  </span>
                </div>

                {/* Trophies + PoL row */}
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                  <div className="bg-muted/40 rounded-xl px-4 py-3 border border-border/30">
                    <p className="text-xs text-muted-foreground font-semibold uppercase tracking-wide mb-1 flex items-center gap-1">
                      <Trophy className="w-3 h-3 text-yellow-500" /> Trophies
                    </p>
                    <p className="text-xl font-bold text-foreground">{crInfo.trophies.toLocaleString()}</p>
                    <p className="text-xs text-muted-foreground mt-0.5">Best: {crInfo.best_trophies.toLocaleString()}</p>
                  </div>

                  <div className="bg-muted/40 rounded-xl px-4 py-3 border border-border/30">
                    <p className="text-xs text-muted-foreground font-semibold uppercase tracking-wide mb-1 flex items-center gap-1">
                      <Star className="w-3 h-3 text-blue-400" /> PoL Medals
                    </p>
                    <p className="text-xl font-bold text-foreground">
                      {crInfo.current_path_of_legends_medals?.toLocaleString() ?? "—"}
                    </p>
                    <p className="text-xs text-muted-foreground mt-0.5">
                      Best: {crInfo.best_path_of_legends_medals?.toLocaleString() ?? "—"}
                    </p>
                  </div>

                  <div className="bg-muted/40 rounded-xl px-4 py-3 border border-border/30">
                    <p className="text-xs text-muted-foreground font-semibold uppercase tracking-wide mb-1 flex items-center gap-1">
                      <TrendingUp className="w-3 h-3 text-green-400" /> W / L
                    </p>
                    <p className="text-xl font-bold text-foreground">
                      <span className="text-green-400">{crInfo.wins.toLocaleString()}</span>
                      <span className="text-muted-foreground mx-1 text-base">/</span>
                      <span className="text-red-400">{crInfo.losses.toLocaleString()}</span>
                    </p>
                    <p className="text-xs text-muted-foreground mt-0.5">
                      {crInfo.wins + crInfo.losses > 0
                        ? `${((crInfo.wins / (crInfo.wins + crInfo.losses)) * 100).toFixed(1)}% WR`
                        : "No battles"}
                    </p>
                  </div>

                  <div className="bg-muted/40 rounded-xl px-4 py-3 border border-border/30">
                    <p className="text-xs text-muted-foreground font-semibold uppercase tracking-wide mb-1 flex items-center gap-1">
                      <Crown className="w-3 h-3 text-yellow-500" /> 3-Crown Wins
                    </p>
                    <p className="text-xl font-bold text-foreground">{crInfo.three_crown_wins.toLocaleString()}</p>
                    <p className="text-xs text-muted-foreground mt-0.5">
                      {crInfo.challenge_max_wins != null ? `Best challenge: ${crInfo.challenge_max_wins}` : ""}
                    </p>
                  </div>
                </div>

                {/* Arena + Clan + Favorite card row */}
                <div className="flex flex-wrap gap-3 text-sm">
                  {crInfo.arena && (
                    <div className="flex items-center gap-2 bg-muted/40 rounded-lg px-3 py-2 border border-border/30">
                      <Shield className="w-3.5 h-3.5 text-muted-foreground" />
                      <span className="text-muted-foreground">Arena:</span>
                      <span className="font-semibold text-foreground">{crInfo.arena.name}</span>
                    </div>
                  )}
                  {crInfo.clan && (
                    <div className="flex items-center gap-2 bg-muted/40 rounded-lg px-3 py-2 border border-border/30">
                      <User className="w-3.5 h-3.5 text-muted-foreground" />
                      <span className="text-muted-foreground">Clan:</span>
                      <span className="font-semibold text-foreground">{crInfo.clan.clan_name}</span>
                    </div>
                  )}
                  {crInfo.total_donations != null && crInfo.total_donations > 0 && (
                    <div className="flex items-center gap-2 bg-muted/40 rounded-lg px-3 py-2 border border-border/30">
                      <Heart className="w-3.5 h-3.5 text-muted-foreground" />
                      <span className="text-muted-foreground">Donations:</span>
                      <span className="font-semibold text-foreground">{crInfo.total_donations.toLocaleString()}</span>
                    </div>
                  )}
                  {crInfo.current_favorite_card && (
                    <div className="flex items-center gap-2 bg-muted/40 rounded-lg px-3 py-2 border border-border/30">
                      <Star className="w-3.5 h-3.5 text-yellow-500" />
                      <span className="text-muted-foreground">Favourite:</span>
                      <span className="font-semibold text-foreground">{crInfo.current_favorite_card.name}</span>
                      {crInfo.current_favorite_card.elixir_cost != null && (
                        <span className="text-xs text-purple-400 font-bold">{crInfo.current_favorite_card.elixir_cost} elixir</span>
                      )}
                    </div>
                  )}
                </div>
              </div>
            )}

            {/* Loading state for details */}
            {isLoadingDetails && (
              <div className="flex items-center justify-center py-16 gap-3 text-muted-foreground">
                <Loader2 className="w-6 h-6 animate-spin" />
                <span className="text-sm font-medium">Loading player details...</span>
              </div>
            )}

            {/* Details error */}
            {detailsError && !isLoadingDetails && (
              <div className="flex items-center gap-3 px-5 py-4 rounded-xl bg-destructive/10 border border-destructive/30 text-destructive">
                <AlertTriangle className="w-5 h-5 flex-shrink-0" />
                <p className="text-sm font-medium flex-1">{detailsError}</p>
                <button
                  onClick={() => selectPlayer(selectedPlayer)}
                  className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium bg-destructive/10 hover:bg-destructive/20 rounded-md transition-colors"
                >
                  <RefreshCw className="w-3 h-3" />
                  Retry
                </button>
              </div>
            )}

            {/* Most Used Decks */}
            {!isLoadingDetails && decks !== null && (
              <div className="space-y-4">
                <div className="flex items-center gap-2 px-1">
                  <Swords className="w-5 h-5 text-primary" />
                  <h3 className="text-xl font-bold text-foreground">Most Used Decks</h3>
                </div>
                {decks.length === 0 ? (
                  <div className="text-sm text-muted-foreground bg-muted/20 rounded-xl px-5 py-6 text-center border border-dashed border-border">
                    No deck data available for this player.
                  </div>
                ) : (
                  <div className="space-y-3">
                    {decks.map((deck) => (
                      <DeckAccordion key={deck.deck_id} deck={deck} />
                    ))}
                  </div>
                )}
              </div>
            )}

            {/* Recent Battles */}
            {!isLoadingDetails && battles !== null && (
              <div className="space-y-4">
                <div className="flex items-center gap-2 px-1">
                  <Trophy className="w-5 h-5 text-primary" />
                  <h3 className="text-xl font-bold text-foreground">Recent Battles</h3>
                </div>
                {battles.length === 0 ? (
                  <div className="text-sm text-muted-foreground bg-muted/20 rounded-xl px-5 py-6 text-center border border-dashed border-border">
                    No recent battles found for this player.
                  </div>
                ) : (
                  <div className="bg-card border border-border/50 rounded-2xl overflow-hidden shadow-sm">
                    <div className="overflow-x-auto">
                      <table className="w-full text-sm">
                        <thead>
                          <tr className="border-b border-border/50 bg-muted/30">
                            <th className="text-left px-4 py-3 font-semibold text-muted-foreground text-xs uppercase tracking-wide">
                              Time
                            </th>
                            <th className="text-left px-4 py-3 font-semibold text-muted-foreground text-xs uppercase tracking-wide">
                              Mode
                            </th>
                            <th className="text-left px-4 py-3 font-semibold text-muted-foreground text-xs uppercase tracking-wide">
                              Result
                            </th>
                            <th className="text-center px-4 py-3 font-semibold text-muted-foreground text-xs uppercase tracking-wide">
                              Crowns
                            </th>
                            <th className="text-center px-4 py-3 font-semibold text-muted-foreground text-xs uppercase tracking-wide">
                              Elixir Leaked
                            </th>
                            <th className="text-left px-4 py-3 font-semibold text-muted-foreground text-xs uppercase tracking-wide">
                              Opponent
                            </th>
                          </tr>
                        </thead>
                        <tbody>
                          {battles.map((battle, i) => (
                            <tr
                              key={i}
                              className={cn(
                                "border-b border-border/30 last:border-0 hover:bg-muted/20 transition-colors",
                                battle.result === "Win"
                                  ? "hover:bg-green-500/5"
                                  : "hover:bg-red-500/5"
                              )}
                            >
                              <td className="px-4 py-3 text-muted-foreground text-xs whitespace-nowrap">
                                {formatBattleTime(battle.battle_time)}
                              </td>
                              <td className="px-4 py-3 text-foreground text-xs max-w-[160px] truncate">
                                {battle.game_mode ?? "—"}
                              </td>
                              <td className="px-4 py-3">
                                <span
                                  className={cn(
                                    "inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-semibold border",
                                    battle.result === "Win"
                                      ? "bg-green-500/15 text-green-400 border-green-500/25"
                                      : "bg-red-500/15 text-red-400 border-red-500/25"
                                  )}
                                >
                                  {battle.result}
                                </span>
                              </td>
                              <td className="px-4 py-3 text-center">
                                <span className="flex items-center justify-center gap-1">
                                  <Crown className="w-3 h-3 text-yellow-500" />
                                  <span className="font-semibold text-foreground">
                                    {battle.crowns ?? "—"}
                                  </span>
                                </span>
                              </td>
                              <td className="px-4 py-3 text-center text-muted-foreground">
                                {battle.elixir_leaked !== null
                                  ? battle.elixir_leaked.toFixed(1)
                                  : "—"}
                              </td>
                              <td className="px-4 py-3 text-foreground text-xs max-w-[150px] truncate">
                                {battle.opponent ?? (
                                  <span className="text-muted-foreground">Unknown</span>
                                )}
                              </td>
                            </tr>
                          ))}
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
