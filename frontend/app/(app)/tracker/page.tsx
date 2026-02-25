"use client";

import { useState, useEffect, useCallback } from "react";
import { useAuth, SignInButton, useUser } from "@clerk/nextjs";
import { LogIn, Loader2 } from "lucide-react";
import { RegistrationForm } from "@/components/tracker/RegistrationForm";
import { TrackerDashboard } from "@/components/tracker/TrackerDashboard";
import type { TrackedPlayer } from "@/components/tracker/types";

const API_URL = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:8000";

export default function TrackerPage() {
  const { isSignedIn, isLoaded } = useUser();
  const { getToken } = useAuth();

  const [tracked, setTracked] = useState<TrackedPlayer | null>(null);
  const [loadingTracked, setLoadingTracked] = useState(true);

  const fetchTracked = useCallback(async () => {
    if (!isSignedIn) {
      setLoadingTracked(false);
      return;
    }
    setLoadingTracked(true);
    try {
      const token = await getToken();
      const res = await fetch(`${API_URL}/api/tracker/me`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (res.status === 404) {
        setTracked(null);
      } else if (res.ok) {
        const data = await res.json();
        setTracked(data.tracked_player ?? null);
      }
    } catch {
      setTracked(null);
    } finally {
      setLoadingTracked(false);
    }
  }, [isSignedIn, getToken]);

  useEffect(() => {
    if (isLoaded) {
      fetchTracked();
    }
  }, [isLoaded, fetchTracked]);

  // ── Auth loading ──────────────────────────────────────────────────────────
  if (!isLoaded) {
    return (
      <div className="flex min-h-[60vh] items-center justify-center">
        <Loader2 className="w-8 h-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  // ── Signed out ────────────────────────────────────────────────────────────
  if (!isSignedIn) {
    return (
      <div className="flex min-h-[70vh] items-center justify-center px-6">
        <div className="text-center max-w-sm space-y-6">
          <div className="inline-flex items-center justify-center w-16 h-16 rounded-2xl bg-primary/10 border border-primary/20">
            <LogIn className="w-8 h-8 text-primary" />
          </div>
          <div className="space-y-2">
            <h1 className="font-[family-name:var(--font-heading)] text-3xl font-black text-foreground">
              Player Tracker
            </h1>
            <p className="text-sm text-muted-foreground">
              Sign in to link your Clash Royale account and view your personal battle statistics.
            </p>
          </div>
          <SignInButton mode="modal" forceRedirectUrl="/tracker">
            <button className="inline-flex items-center gap-2 px-6 py-3 rounded-xl bg-primary text-primary-foreground font-semibold text-sm hover:bg-primary/90 transition-all">
              <LogIn className="w-4 h-4" />
              Sign In to Continue
            </button>
          </SignInButton>
        </div>
      </div>
    );
  }

  // ── Fetching tracked player ───────────────────────────────────────────────
  if (loadingTracked) {
    return (
      <div className="flex min-h-[60vh] items-center justify-center">
        <Loader2 className="w-8 h-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  // ── Not registered yet ────────────────────────────────────────────────────
  if (!tracked) {
    return (
      <div className="min-h-[70vh] flex items-center justify-center px-6 py-12">
        <RegistrationForm
          onRegistered={(tag, name) => {
            setTracked({
              user_id: "",
              player_tag: tag,
              player_name: name,
              tracked_since: new Date().toISOString(),
              is_active: true,
            });
          }}
        />
      </div>
    );
  }

  // ── Dashboard ─────────────────────────────────────────────────────────────
  return (
    <div className="max-w-4xl mx-auto px-4 sm:px-6 py-10">
      <TrackerDashboard
        playerTag={tracked.player_tag}
        playerName={tracked.player_name}
        onChangeTag={() => setTracked(null)}
      />
    </div>
  );
}
