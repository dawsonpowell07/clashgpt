import {
  Shield,
  Eye,
  Database,
  Lock,
  AlertTriangle,
  ExternalLink,
  MessageSquare,
} from "lucide-react";

const sections = [
  {
    icon: Shield,
    title: "No Data Collection",
    body: "We do not collect, store, or sell your personal information. ClashGPT does not require you to create an account to use most features.",
  },
  {
    icon: Eye,
    title: "What We Access",
    body: "ClashGPT accesses publicly available Clash Royale player data via the official Clash Royale API (by Supercell). This includes player tags, battle logs, deck information, and clan data that is already public. We do not access any private account information.",
  },
  {
    icon: Lock,
    title: "Authentication",
    body: "If you choose to sign in, we only store what's needed to maintain your session — nothing more.",
  },
  {
    icon: AlertTriangle,
    title: "Affiliation Disclaimer",
    body: "ClashGPT is a player-made, independent project. It is not affiliated with, endorsed by, or sponsored by Supercell in any way. Clash Royale and all related trademarks are the property of Supercell.",
  },
  {
    icon: ExternalLink,
    title: "Contact & Questions",
    body: "If you have any questions or concerns about this privacy policy, send an email to clashgpt.inbox@gmail.com",
  },
];

export default function PrivacyPage() {
  return (
    <div className="min-h-screen bg-background text-foreground pb-24 relative overflow-hidden">
      {/* Background decorative blobs */}
      <div className="fixed top-0 left-1/4 w-96 h-96 bg-primary/5 rounded-full blur-3xl pointer-events-none" />
      <div className="fixed bottom-1/4 right-1/4 w-80 h-80 bg-accent/5 rounded-full blur-3xl pointer-events-none" />

      <div className="w-full max-w-3xl mx-auto px-4 sm:px-6 lg:px-8 py-10 space-y-10">
        {/* Header */}
        <div>
          {/* Fan project badge */}
          <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-primary/10 border border-primary/20 text-primary text-xs font-medium mb-6">
            <Shield className="size-3" />
            Fan-made project · Not affiliated with Supercell
          </div>

          <div className="w-12 h-0.5 bg-primary mb-4 rounded-full" />
          <h1 className="font-[family-name:var(--font-heading)] text-4xl sm:text-6xl font-extrabold tracking-tight mb-4">
            <span className="bg-gradient-to-br from-foreground via-foreground/90 to-foreground/60 bg-clip-text text-transparent">
              Privacy &amp; Disclaimer
            </span>
          </h1>
          <p className="mt-3 text-sm text-muted-foreground/60">
            Last updated: March 25, 2026
          </p>
        </div>

        {/* Sections */}
        <div className="space-y-4">
          {sections.map(({ icon: Icon, title, body }) => (
            <div
              key={title}
              className="bg-card border border-border rounded-xl p-6 flex gap-4"
            >
              <div className="shrink-0 mt-0.5">
                <div className="size-9 rounded-lg bg-primary/10 border border-primary/20 flex items-center justify-center">
                  <Icon className="size-4 text-primary" />
                </div>
              </div>
              <div>
                <h2 className="font-[family-name:var(--font-heading)] font-bold text-base text-foreground mb-1.5">
                  {title}
                </h2>
                <p className="text-sm text-muted-foreground leading-relaxed">
                  {body}
                </p>
              </div>
            </div>
          ))}
        </div>

        {/* Footer note */}
        <p className="text-xs text-muted-foreground/50 text-center">
          ClashGPT is an independent fan project. Clash Royale™ is a trademark
          of Supercell.
        </p>
      </div>
    </div>
  );
}
