"use client";

import { useState, useCallback, useRef, useEffect } from "react";
import { useAuth, useUser } from "@clerk/nextjs";
import { AuthGateDialog } from "@/components/auth-gate-dialog";
import {
  Search,
  Loader2,
  AlertTriangle,
  Swords,
  User,
  RefreshCw,
  Trophy,
  ArrowLeft,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

import type { PlayerSearchResult, PlayerDeck, Battle, CRPlayerInfo } from "@/components/profiles/types";
import { PlayerSearchResults, NoResults } from "@/components/profiles/PlayerSearchResults";
import { PlayerHeroCard } from "@/components/profiles/PlayerHeroCard";
import { LivePlayerData } from "@/components/profiles/LivePlayerData";
import { DeckAccordion } from "@/components/profiles/DeckAccordion";
import { RecentBattles } from "@/components/profiles/RecentBattles";
import { SectionHeading } from "@/components/profiles/SectionHeading";

const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000";

export default function ProfilesPage() {
  const { getToken } = useAuth();
  const { isSignedIn, isLoaded } = useUser();
  const [showAuthDialog, setShowAuthDialog] = useState(false);

  useEffect(() => {
    if (isLoaded && !isSignedIn) {
      setShowAuthDialog(true);
    }
  }, [isLoaded, isSignedIn]);
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
      const token = await getToken();
      const res = await fetch(
        `${API_BASE_URL}/api/players?name=${encodeURIComponent(trimmed)}`,
        { headers: { Authorization: `Bearer ${token}` } }
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
  }, [query, getToken]);

  const selectPlayer = useCallback(async (player: PlayerSearchResult) => {
    setSelectedPlayer(player);
    setCrInfo(null);
    setDecks(null);
    setBattles(null);
    setDetailsError(null);
    setIsLoadingDetails(true);

    try {
      const token = await getToken();
      const authHeader = { Authorization: `Bearer ${token}` };
      const tag = encodeURIComponent(player.player_tag);
      const [crRes, decksRes, battlesRes] = await Promise.all([
        fetch(`${API_BASE_URL}/api/players/${tag}/info`, { headers: authHeader }),
        fetch(`${API_BASE_URL}/api/players/${tag}/decks`, { headers: authHeader }),
        fetch(`${API_BASE_URL}/api/players/${tag}/battles`, { headers: authHeader }),
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
  }, [getToken]);

  return (
    <div className="min-h-screen bg-background text-foreground pb-24 relative overflow-hidden">
      <AuthGateDialog
        open={showAuthDialog}
        onOpenChange={setShowAuthDialog}
        featureName="Player Profiles"
        redirectUrl="/profiles"
      />
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
        {searchResults && searchResults.length === 0 && !isSearching && <NoResults />}

        {/* ── Multiple results ── */}
        {searchResults && searchResults.length > 1 && !selectedPlayer && (
          <PlayerSearchResults results={searchResults} onSelect={selectPlayer} />
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

            {/* Hero card */}
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

            {/* Live CR Info */}
            {!isLoadingDetails && crInfo && <LivePlayerData crInfo={crInfo} />}

            {/* Most Used Decks */}
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

            {/* Recent Battles */}
            {!isLoadingDetails && battles !== null && (
              <div>
                <SectionHeading
                  icon={<Trophy className="w-4 h-4" />}
                  label="Recent Battles"
                  sub="Last 20 battles from database"
                />
                <RecentBattles battles={battles} />
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
