// ─── Helpers ─────────────────────────────────────────────────────────────────

export function formatBattleTime(iso: string | null): string {
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

export function formatLastSeen(iso: string | null): string {
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

export function formatTag(tag: string): string {
  return tag.startsWith("#") ? tag : `#${tag}`;
}

export function cardImagePath(name: string, variant: string): string {
  const base = name.toLowerCase().replace(/ /g, "_").replace(/\./g, "");
  const suffix =
    variant === "evolution"
      ? "_evolution"
      : variant === "heroic"
        ? "_hero"
        : "";
  return `/cards/${base}/${base}${suffix}.png`;
}
