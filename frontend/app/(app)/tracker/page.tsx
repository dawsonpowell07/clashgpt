"use client";

import { useState, useEffect, useCallback } from "react";
import { useAuth, useUser } from "@clerk/nextjs";
import { Loader2 } from "lucide-react";
import { RegistrationForm } from "@/components/tracker/RegistrationForm";
import { TrackerDashboard } from "@/components/tracker/TrackerDashboard";
import { AuthGateDialog } from "@/components/auth-gate-dialog";
import type { TrackedPlayer } from "@/components/tracker/types";

const API_URL = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:8000";

export default function TrackerPage() {
  const { getToken } = useAuth();
  const { isSignedIn, isLoaded } = useUser();
  const [showAuthDialog, setShowAuthDialog] = useState(false);

  const [tracked, setTracked] = useState<TrackedPlayer | null>(null);
  const [loadingTracked, setLoadingTracked] = useState(true);

  useEffect(() => {
    if (isLoaded && !isSignedIn) {
      setShowAuthDialog(true);
      setLoadingTracked(false);
    }
  }, [isLoaded, isSignedIn]);

  const fetchTracked = useCallback(async () => {
    if (!isSignedIn) return;
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
    if (isLoaded && isSignedIn) {
      fetchTracked();
    }
  }, [isLoaded, isSignedIn, fetchTracked]);

  // Show the auth dialog over a blank page if not signed in
  if (!isLoaded || (!isSignedIn && !showAuthDialog)) {
    return (
      <div className="flex min-h-[60vh] items-center justify-center">
        <Loader2 className="w-8 h-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  if (!isSignedIn) {
    return (
      <div className="flex min-h-[60vh] items-center justify-center">
        <AuthGateDialog
          open={showAuthDialog}
          onOpenChange={setShowAuthDialog}
          featureName="Player Tracker"
          redirectUrl="/tracker"
        />
      </div>
    );
  }

  if (loadingTracked) {
    return (
      <div className="flex min-h-[60vh] items-center justify-center">
        <Loader2 className="w-8 h-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

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

  return (
    <div className="w-full max-w-[1600px] mx-auto px-4 sm:px-6 lg:px-8 py-10">
      <TrackerDashboard
        playerTag={tracked.player_tag}
        playerName={tracked.player_name}
        onChangeTag={() => setTracked(null)}
      />
    </div>
  );
}
