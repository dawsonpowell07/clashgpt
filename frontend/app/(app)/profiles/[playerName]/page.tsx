"use client";

import { useState, useCallback, useRef, useEffect } from "react";
import { useParams, useSearchParams, useRouter } from "next/navigation";
import {
  Search,
  Loader2,
  AlertTriangle,
  Swords,
  RefreshCw,
  Trophy,
  ArrowLeft,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

import type {
  PlayerSearchResult,
  PlayerDeck,
  Battle,
  CRPlayerInfo,
} from "@/components/profiles/types";
import {
  PlayerSearchResults,
  NoResults,
} from "@/components/profiles/PlayerSearchResults";
import { PlayerHeroCard } from "@/components/profiles/PlayerHeroCard";
import { LivePlayerData } from "@/components/profiles/LivePlayerData";
import { DeckAccordion } from "@/components/profiles/DeckAccordion";
import { RecentBattles } from "@/components/profiles/RecentBattles";
import { SectionHeading } from "@/components/profiles/SectionHeading";

const API_BASE_URL = "/api/backend";

export default function PlayerProfilePage() {
  const params = useParams();
  const searchParams = useSearchParams();
  const router = useRouter();

  const playerNameParam = decodeURIComponent(
    Array.isArray(params.playerName) ? params.playerName[0] : params.playerName ?? "",
  );
  const tagParam = searchParams.get("tag");

  const [query, setQuery] = useState(playerNameParam);
  const [isSearching, setIsSearching] = useState(false);
  const [searchError, setSearchError] = useState<string | null>(null);
  const [searchResults, setSearchResults] = useState<
    PlayerSearchResult[] | null
  >(null);

  const [selectedPlayer, setSelectedPlayer] =
    useState<PlayerSearchResult | null>(null);
  const [crInfo, setCrInfo] = useState<CRPlayerInfo | null>(null);
  const [decks, setDecks] = useState<PlayerDeck[] | null>(null);
  const [battles, setBattles] = useState<Battle[] | null>(null);
  const [isLoadingDetails, setIsLoadingDetails] = useState(false);
  const [detailsError, setDetailsError] = useState<string | null>(null);

  const lastSearchRef = useRef<number>(0);
  const initialLoadDone = useRef(false);

  const selectPlayer = useCallback(async (player: PlayerSearchResult) => {
    setSelectedPlayer(player);
    setCrInfo(null);
    setDecks(null);
    setBattles(null);
    setDetailsError(null);
    setIsLoadingDetails(true);
    setSearchResults(null);

    try {
      const tag = encodeURIComponent(player.player_tag);
      const [crRes, decksRes, battlesRes] = await Promise.all([
        fetch(`${API_BASE_URL}/api/players/${tag}/info`),
        fetch(`${API_BASE_URL}/api/players/${tag}/decks`),
        fetch(`${API_BASE_URL}/api/players/${tag}/battles`),
      ]);
      if (!decksRes.ok || !battlesRes.ok)
        throw new Error("Failed to fetch player details");
      const [decksData, battlesData] = await Promise.all([
        decksRes.json(),
        battlesRes.json(),
      ]);
      setDecks(decksData.decks ?? []);
      setBattles(battlesData.battles ?? []);
      if (crRes.ok) setCrInfo(await crRes.json());
    } catch {
      setDetailsError("Failed to load player details. Please try again.");
    } finally {
      setIsLoadingDetails(false);
    }
  }, []);

  const handleSearch = useCallback(
    async (overrideQuery?: string) => {
      const trimmed = (overrideQuery ?? query).trim();
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
          `${API_BASE_URL}/api/players?name=${encodeURIComponent(trimmed)}`,
        );
        if (!res.ok) throw new Error(`Request failed: ${res.status}`);
        const data = await res.json();
        const players: PlayerSearchResult[] = data.players ?? [];

        if (players.length === 1) {
          const result = players[0];
          router.replace(
            "/profiles/" +
              encodeURIComponent(result.name) +
              "?tag=" +
              encodeURIComponent(result.player_tag),
          );
          await selectPlayer(result);
          return;
        }

        setSearchResults(players);
      } catch {
        setSearchError("Failed to search players. Please try again.");
      } finally {
        setIsSearching(false);
      }
    },
    [query, router, selectPlayer],
  );

  const handleSelectFromDisambiguation = useCallback(
    (player: PlayerSearchResult) => {
      router.push(
        "/profiles/" +
          encodeURIComponent(player.name) +
          "?tag=" +
          encodeURIComponent(player.player_tag),
      );
    },
    [router],
  );

  const handleNewSearch = useCallback(() => {
    const trimmed = query.trim();
    if (!trimmed) return;
    router.push("/profiles/" + encodeURIComponent(trimmed));
  }, [query, router]);

  // Initial load: search by name to get real stats, match by tag if provided
  useEffect(() => {
    if (initialLoadDone.current) return;
    initialLoadDone.current = true;

    if (!playerNameParam) return;

    const load = async () => {
      setIsSearching(true);
      try {
        const res = await fetch(
          `${API_BASE_URL}/api/players?name=${encodeURIComponent(playerNameParam)}`,
        );
        if (!res.ok) throw new Error(`Request failed: ${res.status}`);
        const data = await res.json();
        const players: PlayerSearchResult[] = data.players ?? [];

        if (tagParam) {
          // Direct link with tag — find the exact player or fall back to synthetic
          const match = players.find((p) => p.player_tag === tagParam);
          if (match) {
            await selectPlayer(match);
          } else {
            // Tag not in search results (e.g. shared link for a player not in ladder db yet)
            await selectPlayer({
              player_tag: tagParam,
              name: playerNameParam,
              last_seen: null,
              total_games: 0,
              wins: 0,
              win_rate: null,
              avg_crowns: null,
              avg_elixir_leaked: null,
            });
          }
        } else if (players.length === 1) {
          router.replace(
            "/profiles/" +
              encodeURIComponent(players[0].name) +
              "?tag=" +
              encodeURIComponent(players[0].player_tag),
          );
          await selectPlayer(players[0]);
        } else {
          setSearchResults(players);
        }
      } catch {
        setSearchError("Failed to search players. Please try again.");
      } finally {
        setIsSearching(false);
      }
    };

    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return (
    <div className="min-h-screen bg-background text-foreground pb-24 relative overflow-hidden">
      {/* Background */}
      <div className="fixed inset-0 hexagon-pattern opacity-[0.025] pointer-events-none" />
      <div className="fixed top-[-10%] right-[-5%] w-[500px] h-[500px] bg-primary/8 rounded-full blur-[120px] pointer-events-none" />
      <div className="fixed bottom-[-10%] left-[-5%] w-[400px] h-[400px] bg-accent/6 rounded-full blur-[100px] pointer-events-none" />

      <div className="w-full max-w-[1600px] mx-auto px-4 sm:px-6 lg:px-8 py-10 space-y-8 relative z-10">
        {/* Header */}
        <div className="space-y-2 pb-6 border-b border-border/40 relative">
          <div className="absolute bottom-0 inset-x-0 h-px bg-gradient-to-r from-transparent via-primary/50 to-transparent battle-glow" />
          <div className="flex items-center gap-3 mb-1">
            <a
              href="/profiles"
              className="flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground transition-colors"
            >
              <ArrowLeft className="w-3.5 h-3.5" />
              All Profiles
            </a>
          </div>
          <h1 className="font-[family-name:var(--font-heading)] text-5xl sm:text-6xl font-extrabold tracking-tight bg-gradient-to-r from-primary via-amber-300 to-primary/70 bg-clip-text text-transparent">
            Player Profiles
          </h1>
          <p className="text-muted-foreground text-sm max-w-xl">
            Search top-ranked players from our battle database and explore their
            stats, decks, and recent history.
          </p>
        </div>

        {/* Search */}
        <div className="relative">
          <div className="flex gap-2">
            <div className="relative flex-1">
              <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground pointer-events-none" />
              <Input
                className="pl-10 h-11 bg-card border-border/60 focus-visible:border-primary/60 focus-visible:ring-primary/20 transition-all text-base"
                placeholder="Search by player name…"
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && handleNewSearch()}
              />
            </div>
            <Button
              onClick={handleNewSearch}
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

        {/* Search error */}
        {searchError && (
          <div className="flex items-center gap-3 px-4 py-3 rounded-xl bg-destructive/10 border border-destructive/30 text-destructive">
            <AlertTriangle className="w-4 h-4 shrink-0" />
            <p className="text-sm flex-1">{searchError}</p>
            <button
              onClick={() => handleSearch()}
              className="text-xs flex items-center gap-1 hover:opacity-80"
            >
              <RefreshCw className="w-3 h-3" /> Retry
            </button>
          </div>
        )}

        {/* No results */}
        {searchResults && searchResults.length === 0 && !isSearching && (
          <NoResults />
        )}

        {/* Multiple results — navigate to the selected player's URL */}
        {searchResults && searchResults.length > 1 && !selectedPlayer && (
          <PlayerSearchResults
            results={searchResults}
            onSelect={handleSelectFromDisambiguation}
          />
        )}

        {/* Initial loading state (before selectedPlayer is set) */}
        {!selectedPlayer && isLoadingDetails && (
          <div className="flex items-center justify-center gap-3 py-16 text-muted-foreground">
            <Loader2 className="w-5 h-5 animate-spin text-primary" />
            <span className="text-sm">Loading player details…</span>
          </div>
        )}

        {/* Player detail */}
        {selectedPlayer && (
          <div className="space-y-6 arena-entrance">
            {/* Hero card — always full width */}
            <PlayerHeroCard player={selectedPlayer} />

            {/* Loading */}
            {isLoadingDetails && (
              <div className="flex items-center justify-center gap-3 py-16 text-muted-foreground">
                <Loader2 className="w-5 h-5 animate-spin text-primary" />
                <span className="text-sm">Loading player details…</span>
              </div>
            )}

            {/* Details error */}
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

            {/* Two-column layout: left = live data + decks, right = sticky battles */}
            {!isLoadingDetails &&
              (crInfo != null || decks !== null || battles !== null) && (
                <div className="grid grid-cols-1 xl:grid-cols-[1fr_380px] gap-6 items-start">
                  {/* Left column */}
                  <div className="space-y-6">
                    {crInfo && <LivePlayerData crInfo={crInfo} />}

                    {decks !== null && (
                      <section className="space-y-3">
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
                              <DeckAccordion
                                key={deck.deck_id}
                                deck={deck}
                                rank={i + 1}
                              />
                            ))}
                          </div>
                        )}
                      </section>
                    )}
                  </div>

                  {/* Right column — sticky */}
                  <div className="xl:sticky xl:top-6">
                    {battles !== null && (
                      <section className="space-y-3">
                        <SectionHeading
                          icon={<Trophy className="w-4 h-4" />}
                          label="Recent Battles"
                          sub="Last 20 battles from database"
                        />
                        <div className="bg-card/40 border border-border/50 rounded-2xl p-4">
                          <RecentBattles
                            battles={battles}
                            playerTag={selectedPlayer.player_tag}
                          />
                        </div>
                      </section>
                    )}
                  </div>
                </div>
              )}
          </div>
        )}
      </div>
    </div>
  );
}
