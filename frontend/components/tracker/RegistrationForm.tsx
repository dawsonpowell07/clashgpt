"use client";

import { useState, useCallback } from "react";
import { useAuth } from "@clerk/nextjs";
import { Search, CheckCircle, AlertCircle, Loader2, Shield } from "lucide-react";

const API_URL = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:8000";

interface PreviewPlayer {
  tag: string;
  name: string;
  trophies: number;
  clan?: { name: string } | null;
}

interface RegistrationFormProps {
  onRegistered: (playerTag: string, playerName: string) => void;
}

export function RegistrationForm({ onRegistered }: RegistrationFormProps) {
  const { getToken } = useAuth();
  const [input, setInput] = useState("");
  const [preview, setPreview] = useState<PreviewPlayer | null>(null);
  const [isPreviewing, setIsPreviewing] = useState(false);
  const [isRegistering, setIsRegistering] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const normaliseTag = (raw: string) => {
    const stripped = raw.trim().toUpperCase().replace(/^#/, "");
    return stripped ? `#${stripped}` : "";
  };

  const handlePreview = useCallback(async () => {
    setError(null);
    setPreview(null);
    const tag = normaliseTag(input);
    if (!tag || tag.length < 3) {
      setError("Enter a valid player tag (e.g. #2PP)");
      return;
    }

    setIsPreviewing(true);
    try {
      const token = await getToken();
      const encodedTag = encodeURIComponent(tag);
      const res = await fetch(`${API_URL}/api/players/${encodedTag}/info`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (res.status === 404) {
        setError(`Player tag ${tag} not found. Double-check the tag.`);
        return;
      }
      if (!res.ok) throw new Error(`Server error (${res.status})`);
      const data = await res.json();
      const p = data.player ?? data;
      setPreview({
        tag: p.tag,
        name: p.name,
        trophies: p.trophies ?? p.current_trophies ?? 0,
        clan: p.clan ?? null,
      });
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : "Could not look up the player. Try again.");
    } finally {
      setIsPreviewing(false);
    }
  }, [input]);

  const handleConfirm = useCallback(async () => {
    if (!preview) return;
    setError(null);
    setIsRegistering(true);
    try {
      const token = await getToken();
      if (!token) throw new Error("Not signed in.");

      const encodedTag = encodeURIComponent(preview.tag);
      const res = await fetch(
        `${API_URL}/api/tracker/register?player_tag=${encodedTag}`,
        {
          method: "POST",
          headers: {
            Authorization: `Bearer ${token}`,
            "Content-Type": "application/json",
          },
        }
      );

      if (!res.ok) {
        const body = await res.json().catch(() => ({}));
        throw new Error(body.detail ?? `Failed (${res.status})`);
      }

      onRegistered(preview.tag, preview.name);
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : "Registration failed. Please try again.");
    } finally {
      setIsRegistering(false);
    }
  }, [preview, getToken, onRegistered]);

  return (
    <div className="w-full max-w-lg mx-auto flex flex-col gap-6">
      {/* Header */}
      <div className="text-center space-y-2">
        <div className="inline-flex items-center justify-center w-14 h-14 rounded-2xl bg-primary/10 border border-primary/20 mb-2">
          <Shield className="w-7 h-7 text-primary" />
        </div>
        <h2 className="font-[family-name:var(--font-heading)] text-3xl font-bold text-foreground">
          Link Your Account
        </h2>
        <p className="text-sm text-muted-foreground">
          Enter your Clash Royale player tag to start tracking your battles and stats.
        </p>
      </div>

      {/* Input */}
      <div className="relative">
        <span className="absolute left-4 top-1/2 -translate-y-1/2 text-muted-foreground/60 font-bold text-sm pointer-events-none">
          #
        </span>
        <input
          type="text"
          placeholder="2PP (without the #)"
          value={input.startsWith("#") ? input.slice(1) : input}
          onChange={(e) => {
            setInput(e.target.value);
            setPreview(null);
            setError(null);
          }}
          onKeyDown={(e) => e.key === "Enter" && handlePreview()}
          className="w-full pl-8 pr-4 py-3 rounded-xl border border-border bg-card/60 text-foreground placeholder:text-muted-foreground/40 focus:outline-none focus:ring-2 focus:ring-primary/40 focus:border-primary/50 transition-all uppercase tracking-wider text-sm font-mono"
        />
      </div>

      {/* Error */}
      {error && (
        <div className="flex items-start gap-2 text-red-400 bg-red-500/10 border border-red-500/20 rounded-lg px-4 py-3 text-sm">
          <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
          <span>{error}</span>
        </div>
      )}

      {/* Preview card */}
      {preview && (
        <div className="rounded-xl border border-primary/30 bg-primary/5 p-4 space-y-3">
          <div className="flex items-center gap-2 text-emerald-400 text-sm font-medium">
            <CheckCircle className="w-4 h-4" />
            Player found!
          </div>
          <div className="flex items-center justify-between">
            <div>
              <p className="font-[family-name:var(--font-heading)] text-xl font-bold text-foreground">
                {preview.name}
              </p>
              <p className="text-xs text-muted-foreground font-mono">{preview.tag}</p>
              {preview.clan && (
                <p className="text-xs text-muted-foreground mt-0.5">{preview.clan.name}</p>
              )}
            </div>
            <div className="text-right">
              <p className="font-[family-name:var(--font-heading)] text-2xl font-black text-amber-400">
                {preview.trophies.toLocaleString()}
              </p>
              <p className="text-xs text-muted-foreground uppercase tracking-widest">trophies</p>
            </div>
          </div>
        </div>
      )}

      {/* Buttons */}
      <div className="flex gap-3">
        {!preview ? (
          <button
            onClick={handlePreview}
            disabled={isPreviewing || !input.trim()}
            className="flex-1 flex items-center justify-center gap-2 px-5 py-3 rounded-xl bg-primary text-primary-foreground font-semibold text-sm hover:bg-primary/90 disabled:opacity-50 disabled:cursor-not-allowed transition-all"
          >
            {isPreviewing ? (
              <Loader2 className="w-4 h-4 animate-spin" />
            ) : (
              <Search className="w-4 h-4" />
            )}
            {isPreviewing ? "Looking up…" : "Look Up Player"}
          </button>
        ) : (
          <>
            <button
              onClick={() => {
                setPreview(null);
                setError(null);
              }}
              className="px-5 py-3 rounded-xl border border-border text-muted-foreground text-sm hover:bg-muted/40 transition-all"
            >
              Change
            </button>
            <button
              onClick={handleConfirm}
              disabled={isRegistering}
              className="flex-1 flex items-center justify-center gap-2 px-5 py-3 rounded-xl bg-primary text-primary-foreground font-semibold text-sm hover:bg-primary/90 disabled:opacity-50 disabled:cursor-not-allowed transition-all"
            >
              {isRegistering ? (
                <Loader2 className="w-4 h-4 animate-spin" />
              ) : (
                <CheckCircle className="w-4 h-4" />
              )}
              {isRegistering ? "Linking…" : "Confirm & Track"}
            </button>
          </>
        )}
      </div>

      <p className="text-center text-xs text-muted-foreground/60">
        Your tag will be added to our tracker. Battle data will appear after the next scan.
      </p>
    </div>
  );
}
