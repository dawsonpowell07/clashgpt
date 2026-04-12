"use client";

import Image from "next/image";
import Link from "next/link";
import {
  MessageSquare,
  Trophy,
  Sparkles,
  Crown,
  TrendingUp,
  BarChart3,
  Zap,
  Bot,
  ArrowRight,
  Swords,
  Search,
  Shield,
  Target,
  ChevronRight,
  User,
  Users,
  GitCompare,
  Activity,
  Crosshair,
  LayoutGrid,
} from "lucide-react";
import { SignInButton, SignedIn, SignedOut } from "@clerk/nextjs";

const SAMPLE_DECKS = [
  {
    name: "Mortar Control",
    avgElixir: 3.0,
    winRate: 54.2,
    cards: [
      {
        name: "Mortar",
        variant: "evolved",
        image: "/cards/mortar/mortar_evolution.png",
      },
      {
        name: "Skeleton Barrel",
        variant: "evolved",
        image: "/cards/skeleton_barrel/skeleton_barrel_evolution.png",
      },
      {
        name: "Knight",
        variant: "hero",
        image: "/cards/knight/knight_hero.png",
      },
      {
        name: "Goblins",
        variant: "hero",
        image: "/cards/goblins/goblins_hero.png",
      },
      {
        name: "Fireball",
        variant: "normal",
        image: "/cards/fireball/fireball.png",
      },
      {
        name: "the log",
        variant: "normal",
        image: "/cards/the_log/the_log.png",
      },
      {
        name: "Minions",
        variant: "normal",
        image: "/cards/minions/minions.png",
      },
      {
        name: "Dart Goblin",
        variant: "normal",
        image: "/cards/dart_goblin/dart_goblin.png",
      },
    ],
  },
  {
    name: "Royal Hogs Hero Wiz Cycle",
    avgElixir: 3.5,
    winRate: 51.8,
    cards: [
      {
        name: "Royal Hogs",
        variant: "evolved",
        image: "/cards/royal_hogs/royal_hogs_evolution.png",
      },
      {
        name: "Royal Ghost",
        variant: "evolved",
        image: "/cards/royal_ghost/royal_ghost_evolution.png",
      },
      {
        name: "Wizard",
        variant: "hero",
        image: "/cards/wizard/wizard_hero.png",
      },
      {
        name: "Goblins",
        variant: "hero",
        image: "/cards/goblins/goblins_hero.png",
      },
      {
        name: "Lightning",
        variant: "normal",
        image: "/cards/lightning/lightning.png",
      },
      {
        name: "Barbarian Barrel",
        variant: "normal",
        image: "/cards/barbarian_barrel/barbarian_barrel.png",
      },
      {
        name: "Goblin Hut",
        variant: "normal",
        image: "/cards/goblin_hut/goblin_hut.png",
      },
      {
        name: "Skeletons",
        variant: "normal",
        image: "/cards/skeletons/skeletons.png",
      },
    ],
  },
];

// ── Feature Bento Card Preview Components ─────────────────────────────────────

function ChatPreviewCard() {
  return (
    <div className="relative bg-card/80 border border-border rounded-xl overflow-hidden backdrop-blur-sm h-full flex flex-col">
      <div className="flex items-center gap-2.5 px-4 py-3 border-b border-border/50 bg-muted/20">
        <div className="w-6 h-6 bg-primary/15 border border-primary/25 rounded-md flex items-center justify-center">
          <Bot className="w-3 h-3 text-primary" />
        </div>
        <span className="text-xs font-semibold text-foreground">ClashGPT</span>
        <div className="ml-auto flex items-center gap-1">
          <div className="w-1.5 h-1.5 rounded-full bg-green-400 animate-pulse" />
          <span className="text-[9px] text-green-400">Online</span>
        </div>
      </div>
      <div className="flex-1 p-4 space-y-3 overflow-hidden">
        <div className="flex justify-end">
          <div className="bg-primary/15 border border-primary/25 rounded-xl rounded-br-sm px-3 py-2 max-w-[85%]">
            <p className="text-xs text-foreground">
              What&apos;s the best counter to Hog Rider?
            </p>
          </div>
        </div>
        <div className="flex justify-start max-w-[90%]">
          <div className="bg-muted/30 border border-border/40 rounded-xl rounded-bl-sm px-3 py-2">
            <p className="text-xs text-muted-foreground leading-relaxed">
              Based on live battle data,{" "}
              <span className="text-primary font-medium">Cannon</span> and{" "}
              <span className="text-primary font-medium">Mini P.E.K.K.A</span>{" "}
              are the highest win-rate counters at 58%+...
            </p>
          </div>
        </div>
        <div className="flex justify-end">
          <div className="bg-primary/15 border border-primary/25 rounded-xl rounded-br-sm px-3 py-2 max-w-[85%]">
            <p className="text-xs text-foreground">
              Show me top decks with Hog Rider evo
            </p>
          </div>
        </div>
        <div className="flex items-center gap-2 px-3 py-2 bg-primary/10 border border-primary/20 rounded-lg">
          <div className="w-3 h-3 border border-primary/60 border-t-primary rounded-full animate-spin shrink-0" />
          <span className="text-xs text-primary/80">
            Searching deck database…
          </span>
        </div>
      </div>
    </div>
  );
}

function MatchupPreviewCard() {
  const matchups = [
    { vs: "Log Bait", wr: 58.4, games: 1240, good: true },
    { vs: "X-Bow Cycle", wr: 47.2, games: 830, good: false },
    { vs: "Miner Control", wr: 52.1, games: 960, good: true },
  ];
  return (
    <div className="space-y-2">
      <div className="flex items-center gap-2 mb-3">
        <div className="text-xs font-bold text-foreground/60 uppercase tracking-widest">
          Win Rate
        </div>
        <div
          className="ml-auto text-2xl font-black text-emerald-400 tabular-nums"
          style={{ fontFamily: "var(--font-heading)" }}
        >
          53.2%
        </div>
      </div>
      <div className="h-1.5 rounded-full bg-muted/40 overflow-hidden mb-4">
        <div
          className="h-full rounded-full bg-emerald-400"
          style={{ width: "53.2%" }}
        />
      </div>
      {matchups.map((m) => (
        <div
          key={m.vs}
          className={`flex items-center gap-2 px-3 py-2 rounded-lg border text-xs ${m.good ? "border-emerald-500/20 bg-emerald-500/5" : "border-rose-500/15 bg-rose-500/5"}`}
        >
          <span
            className={`font-bold tabular-nums w-10 ${m.good ? "text-emerald-400" : "text-rose-400"}`}
          >
            {m.wr}%
          </span>
          <span className="text-foreground/70 flex-1 truncate">{m.vs}</span>
          <span className="text-muted-foreground/50 text-[10px]">
            {m.games}g
          </span>
        </div>
      ))}
    </div>
  );
}

function ProfilePreviewCard() {
  return (
    <div className="space-y-3">
      <div className="flex items-center gap-3">
        <div className="w-10 h-10 rounded-full bg-primary/15 border border-primary/30 flex items-center justify-center">
          <Crown className="w-5 h-5 text-primary" />
        </div>
        <div>
          <div className="font-bold text-sm text-foreground">SkyWarrior99</div>
          <div className="text-[10px] text-muted-foreground">#2YVR8Q0</div>
        </div>
        <div className="ml-auto px-2 py-1 bg-emerald-500/10 border border-emerald-500/20 rounded-md">
          <span className="text-[10px] font-bold text-emerald-400">
            Ultimate Champion
          </span>
        </div>
      </div>
      <div className="grid grid-cols-3 gap-2">
        {[
          { label: "Trophies", val: "7,842", color: "text-primary" },
          { label: "Medals", val: "3,240", color: "text-accent" },
          { label: "W/L", val: "1.4", color: "text-emerald-400" },
        ].map((s) => (
          <div
            key={s.label}
            className="bg-muted/20 border border-border/30 rounded-lg p-2 text-center"
          >
            <div className={`font-black text-sm tabular-nums ${s.color}`}>
              {s.val}
            </div>
            <div className="text-[9px] text-muted-foreground mt-0.5">
              {s.label}
            </div>
          </div>
        ))}
      </div>
      <div className="text-[10px] font-semibold uppercase tracking-widest text-muted-foreground/60 mt-1">
        Most Used Deck
      </div>
      <div className="grid grid-cols-8 gap-1">
        {[
          "hog_rider",
          "musketeer",
          "ice_golem",
          "fireball",
          "the_log",
          "skeletons",
          "ice_spirit",
          "cannon",
        ].map((card, i) => (
          <div
            key={i}
            className="aspect-[3/4] rounded-md bg-muted/40 border border-border/30 overflow-hidden relative"
          >
            <Image
              src={`/cards/${card}/${card}.png`}
              alt={card}
              fill
              className="object-contain p-px"
            />
          </div>
        ))}
      </div>
    </div>
  );
}

function TrackerPreviewCard() {
  const players = [
    { name: "DarkKnight", tag: "#QRP8Y2", change: "+120", up: true },
    { name: "IceWizard", tag: "#LP0JK4", change: "-85", up: false },
    { name: "GoblinKing", tag: "#8R2VX9", change: "+43", up: true },
  ];
  return (
    <div className="space-y-2">
      <div className="flex items-center gap-1.5 mb-3">
        <div className="w-1.5 h-1.5 rounded-full bg-green-400 animate-pulse" />
        <span className="text-[10px] text-green-400 font-medium uppercase tracking-widest">
          Live Tracking
        </span>
      </div>
      {players.map((p) => (
        <div
          key={p.tag}
          className="flex items-center gap-2.5 px-3 py-2 bg-muted/20 border border-border/30 rounded-lg"
        >
          <div className="w-7 h-7 rounded-full bg-primary/10 border border-primary/20 flex items-center justify-center shrink-0">
            <User className="w-3.5 h-3.5 text-primary/60" />
          </div>
          <div className="flex-1 min-w-0">
            <div className="text-xs font-semibold text-foreground truncate">
              {p.name}
            </div>
            <div className="text-[9px] text-muted-foreground">{p.tag}</div>
          </div>
          <div
            className={`text-xs font-bold tabular-nums ${p.up ? "text-emerald-400" : "text-rose-400"}`}
          >
            {p.change}
          </div>
        </div>
      ))}
    </div>
  );
}

function HeadToHeadPreviewCard() {
  return (
    <div className="space-y-3">
      <div className="grid grid-cols-2 gap-2">
        <div className="bg-primary/10 border border-primary/25 rounded-lg p-2.5 text-center">
          <div className="text-[10px] text-muted-foreground mb-1 uppercase tracking-wider">
            Win Condition A
          </div>
          <div className="text-sm font-bold text-primary">Hog Rider</div>
          <div className="text-2xl font-black text-emerald-400 mt-1">54.8%</div>
        </div>
        <div className="bg-accent/10 border border-accent/25 rounded-lg p-2.5 text-center">
          <div className="text-[10px] text-muted-foreground mb-1 uppercase tracking-wider">
            Win Condition B
          </div>
          <div className="text-sm font-bold text-accent">Royal Hogs</div>
          <div className="text-2xl font-black text-rose-400 mt-1">45.2%</div>
        </div>
      </div>
      <div className="h-1.5 rounded-full overflow-hidden bg-muted/30 flex">
        <div
          className="h-full bg-emerald-400 rounded-l-full"
          style={{ width: "54.8%" }}
        />
        <div className="h-full bg-rose-400 rounded-r-full flex-1" />
      </div>
      <div className="text-center">
        <span className="text-[10px] text-muted-foreground">Based on </span>
        <span className="text-[10px] font-semibold text-foreground">
          2,430 recorded battles
        </span>
      </div>
    </div>
  );
}

export default function Home() {
  return (
    <div className="min-h-screen bg-background text-foreground">
      {/* Grid Background */}
      <div
        className="fixed inset-0 pointer-events-none"
        style={{
          backgroundImage: `linear-gradient(to right, rgba(255, 255, 255, 0.03) 1px, transparent 1px),
                            linear-gradient(to bottom, rgba(255, 255, 255, 0.03) 1px, transparent 1px)`,
          backgroundSize: "80px 80px",
        }}
      />

      {/* ── Hero ── */}
      <section className="relative min-h-[88vh] flex flex-col items-center justify-center px-6 md:px-12 overflow-hidden">
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[700px] h-[400px] bg-primary/8 rounded-full blur-[120px] pointer-events-none" />
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-[40%] w-[400px] h-[300px] bg-accent/5 rounded-full blur-[100px] pointer-events-none" />

        <div className="absolute inset-0 pointer-events-none overflow-hidden">
          <div className="absolute top-20 left-10 w-1.5 h-1.5 bg-primary/30 rounded-full animate-pulse" />
          <div
            className="absolute top-40 right-20 w-1 h-1 bg-accent/40 rounded-full animate-pulse"
            style={{ animationDelay: "1s" }}
          />
          <div
            className="absolute bottom-40 left-1/4 w-1 h-1 bg-primary/20 rounded-full animate-pulse"
            style={{ animationDelay: "2s" }}
          />
          <div
            className="absolute top-1/3 right-1/3 w-1.5 h-1.5 bg-accent/25 rounded-full animate-pulse"
            style={{ animationDelay: "1.5s" }}
          />
          <div
            className="absolute top-60 left-1/3 w-1 h-1 bg-primary/15 rounded-full animate-pulse"
            style={{ animationDelay: "0.7s" }}
          />
        </div>

        <div className="relative z-10 max-w-5xl w-full text-center space-y-8 opacity-0 animate-[fade-in_1s_ease-out_0.2s_forwards]">
          <div className="inline-flex items-center gap-2 px-4 py-1.5 bg-card/60 border border-border/50 rounded-full backdrop-blur-sm">
            <Sparkles className="w-3.5 h-3.5 text-primary" />
            <p className="text-xs tracking-[0.2em] uppercase text-muted-foreground font-medium">
              All-In-One Clash Royale Analytics
            </p>
          </div>

          <h1 className="font-[family-name:var(--font-heading)] font-bold leading-[0.9] tracking-tight">
            <span className="block text-[14vw] md:text-[10vw] lg:text-[8rem] xl:text-[10rem] text-foreground">
              ClashGPT
            </span>
          </h1>

          <p className="text-base md:text-lg text-muted-foreground/80 max-w-2xl mx-auto leading-relaxed">
            Real-time analytics, AI chat, matchup analysis, player profiles, and
            meta tracking — all in one place.
          </p>

          {/* Feature pill row */}
          <div className="flex flex-wrap items-center justify-center gap-2 pt-2">
            {[
              { icon: MessageSquare, label: "AI Chat" },
              { icon: Swords, label: "Matchups" },
              { icon: User, label: "Profiles" },
              { icon: BarChart3, label: "Deck Meta" },
              { icon: GitCompare, label: "Head-to-Head" },
            ].map((f) => (
              <div
                key={f.label}
                className="inline-flex items-center gap-1.5 px-3 py-1 bg-card/40 border border-border/40 rounded-full backdrop-blur-sm"
              >
                <f.icon className="w-3 h-3 text-primary/70" />
                <span className="text-[11px] text-muted-foreground font-medium">
                  {f.label}
                </span>
              </div>
            ))}
          </div>

          <div className="pt-4 w-full max-w-2xl mx-auto flex flex-col gap-3">
            {/* Row 1 — 2 items */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <Link
                href="/decks"
                className="group flex flex-col items-center gap-2 px-4 py-4 flex-1 bg-card/60 border border-border/50 rounded-xl hover:bg-card hover:border-border transition-all duration-200"
              >
                <LayoutGrid className="w-5 h-5 text-muted-foreground group-hover:text-foreground transition-colors" />
                <span className="text-sm font-semibold text-foreground">
                  Decks
                </span>
                <span className="text-[10px] text-muted-foreground text-center leading-tight">
                  Browse meta decks &amp; win rates
                </span>
              </Link>
              <Link
                href="/head-to-head"
                className="group flex flex-col items-center gap-2 px-4 py-4 flex-1 bg-card/60 border border-border/50 rounded-xl hover:bg-card hover:border-border transition-all duration-200"
              >
                <GitCompare className="w-5 h-5 text-muted-foreground group-hover:text-foreground transition-colors" />
                <span className="text-sm font-semibold text-foreground">
                  Head to Head
                </span>
                <span className="text-[10px] text-muted-foreground text-center leading-tight">
                  Compare win coditions head-to-head
                </span>
              </Link>
            </div>
            {/* Row 2 — 3 items */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              <Link
                href="/profiles"
                className="group flex flex-col items-center gap-2 px-4 py-4 flex-1 bg-card/60 border border-border/50 rounded-xl hover:bg-card hover:border-border transition-all duration-200"
              >
                <Users className="w-5 h-5 text-muted-foreground group-hover:text-foreground transition-colors" />
                <span className="text-sm font-semibold text-foreground">
                  Profiles
                </span>
                <span className="text-[10px] text-muted-foreground text-center leading-tight">
                  Look up any top player&apos;s stats
                </span>
              </Link>
              <Link
                href="/matchups"
                className="group flex flex-col items-center gap-2 px-4 py-4 flex-1 bg-card/60 border border-border/50 rounded-xl hover:bg-card hover:border-border transition-all duration-200"
              >
                <Swords className="w-5 h-5 text-muted-foreground group-hover:text-foreground transition-colors" />
                <span className="text-sm font-semibold text-foreground">
                  Matchups
                </span>
                <span className="text-[10px] text-muted-foreground text-center leading-tight">
                  See how your deck performs against other decks
                </span>
              </Link>

              <Link
                href="/chat"
                className="group flex flex-col items-center gap-2 px-4 py-4 flex-1 bg-primary/10 border border-primary/30 rounded-xl hover:bg-primary/15 hover:border-primary/50 transition-all duration-200"
              >
                <MessageSquare className="w-5 h-5 text-primary" />
                <span className="text-sm font-semibold text-foreground">
                  AI Chat
                </span>
                <span className="text-[10px] text-muted-foreground text-center leading-tight">
                  Ask our agent to find you decks!
                </span>
              </Link>
            </div>
          </div>
        </div>

        <div className="absolute bottom-8 left-1/2 -translate-x-1/2 opacity-0 animate-[fade-in_1s_ease-out_2s_forwards]">
          <div className="w-px h-12 bg-gradient-to-b from-border to-transparent" />
        </div>
      </section>

      {/* ── Features Bento Grid ── */}
      <section className="relative py-24 md:py-32 px-6 md:px-12">
        <div className="max-w-7xl mx-auto">
          <div className="text-center mb-16 space-y-4 opacity-0 animate-[fade-in_0.8s_ease-out_0.2s_forwards]">
            <div className="inline-flex items-center gap-2 px-4 py-1.5 bg-card/60 border border-border/50 rounded-full backdrop-blur-sm">
              <Zap className="w-3.5 h-3.5 text-primary" />
              <span className="text-xs tracking-[0.2em] uppercase text-muted-foreground font-medium">
                Everything You Need
              </span>
            </div>
            <h2 className="font-[family-name:var(--font-heading)] font-bold text-4xl md:text-5xl lg:text-6xl tracking-tight">
              Six Tools. <span className="text-primary">One Platform.</span>
            </h2>
            <p className="text-lg text-muted-foreground max-w-2xl mx-auto">
              Every insight you need to dominate Clash Royale, from AI-powered
              chat to deep battle analytics.
            </p>
          </div>

          {/* Bento Grid */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 opacity-0 animate-[fade-in_0.8s_ease-out_0.4s_forwards]">
            {/* AI Chat — large card, spans 2 cols */}
            <Link
              href="/chat"
              className="group lg:col-span-2 relative bg-card border border-border/50 rounded-2xl overflow-hidden hover:border-primary/30 hover:shadow-[0_0_40px_rgba(255,159,28,0.08)] transition-all duration-300 hover:-translate-y-0.5"
            >
              <div className="absolute top-0 left-0 right-0 h-px bg-gradient-to-r from-transparent via-primary/50 to-transparent" />
              <div className="p-6 h-full flex flex-col">
                <div className="flex items-start justify-between mb-5">
                  <div className="space-y-2">
                    <div className="inline-flex items-center gap-1.5 px-2.5 py-1 bg-primary/10 border border-primary/30 rounded-full">
                      <MessageSquare className="w-3 h-3 text-primary" />
                      <span className="text-[10px] font-semibold text-primary uppercase tracking-widest">
                        AI Chat
                      </span>
                    </div>
                    <h3 className="font-[family-name:var(--font-heading)] text-2xl font-bold text-foreground">
                      Ask Anything About
                      <br />
                      Clash Royale
                    </h3>
                    <p className="text-sm text-muted-foreground max-w-sm leading-relaxed">
                      Conversational AI grounded in live data. Get deck
                      recommendations, player analysis, and meta insights in
                      seconds.
                    </p>
                  </div>
                  <ArrowRight className="w-4 h-4 text-muted-foreground group-hover:text-primary group-hover:translate-x-0.5 transition-all shrink-0 mt-1" />
                </div>
                <div className="flex-1 min-h-[200px]">
                  <ChatPreviewCard />
                </div>
              </div>
            </Link>

            {/* Matchup Analyzer */}
            <Link
              href="/matchups"
              className="group relative bg-card border border-border/50 rounded-2xl overflow-hidden hover:border-emerald-500/30 hover:shadow-[0_0_30px_rgba(52,211,153,0.06)] transition-all duration-300 hover:-translate-y-0.5"
            >
              <div className="absolute top-0 left-0 right-0 h-px bg-gradient-to-r from-transparent via-emerald-500/40 to-transparent" />
              <div className="p-6 flex flex-col h-full">
                <div className="flex items-start justify-between mb-5">
                  <div className="space-y-2">
                    <div className="inline-flex items-center gap-1.5 px-2.5 py-1 bg-emerald-500/10 border border-emerald-500/30 rounded-full">
                      <Swords className="w-3 h-3 text-emerald-400" />
                      <span className="text-[10px] font-semibold text-emerald-400 uppercase tracking-widest">
                        Matchup Analyzer
                      </span>
                    </div>
                    <h3 className="font-[family-name:var(--font-heading)] text-xl font-bold text-foreground">
                      Analyze Any Deck&apos;s Matchups
                    </h3>
                    <p className="text-sm text-muted-foreground leading-relaxed">
                      Select 8 cards to see head-to-head win rates against every
                      opponent deck in our database.
                    </p>
                  </div>
                  <ArrowRight className="w-4 h-4 text-muted-foreground group-hover:text-emerald-400 group-hover:translate-x-0.5 transition-all shrink-0 mt-1" />
                </div>
                <div className="flex-1">
                  <MatchupPreviewCard />
                </div>
              </div>
            </Link>

            {/* Player Profiles */}
            <Link
              href="/profiles"
              className="group relative bg-card border border-border/50 rounded-2xl overflow-hidden hover:border-accent/30 hover:shadow-[0_0_30px_rgba(80,120,200,0.06)] transition-all duration-300 hover:-translate-y-0.5"
            >
              <div className="absolute top-0 left-0 right-0 h-px bg-gradient-to-r from-transparent via-accent/40 to-transparent" />
              <div className="p-6 flex flex-col h-full">
                <div className="flex items-start justify-between mb-5">
                  <div className="space-y-2">
                    <div className="inline-flex items-center gap-1.5 px-2.5 py-1 bg-accent/10 border border-accent/30 rounded-full">
                      <User className="w-3 h-3 text-accent" />
                      <span className="text-[10px] font-semibold text-accent uppercase tracking-widest">
                        Player Profiles
                      </span>
                    </div>
                    <h3 className="font-[family-name:var(--font-heading)] text-xl font-bold text-foreground">
                      Player Breakdowns
                    </h3>
                    <p className="text-sm text-muted-foreground leading-relaxed">
                      Search top-ranked players. View their stats, most-played
                      decks, and recent battle history.
                    </p>
                  </div>
                  <ArrowRight className="w-4 h-4 text-muted-foreground group-hover:text-accent group-hover:translate-x-0.5 transition-all shrink-0 mt-1" />
                </div>
                <div className="flex-1">
                  <ProfilePreviewCard />
                </div>
              </div>
            </Link>

            {/* Deck Browser */}
            <Link
              href="/decks"
              className="group relative bg-card border border-border/50 rounded-2xl overflow-hidden hover:border-primary/30 hover:shadow-[0_0_30px_rgba(255,159,28,0.06)] transition-all duration-300 hover:-translate-y-0.5"
            >
              <div className="absolute top-0 left-0 right-0 h-px bg-gradient-to-r from-transparent via-primary/40 to-transparent" />
              <div className="p-6 flex flex-col h-full">
                <div className="flex items-start justify-between mb-5">
                  <div className="space-y-2">
                    <div className="inline-flex items-center gap-1.5 px-2.5 py-1 bg-primary/10 border border-primary/30 rounded-full">
                      <BarChart3 className="w-3 h-3 text-primary" />
                      <span className="text-[10px] font-semibold text-primary uppercase tracking-widest">
                        Deck Browser
                      </span>
                    </div>
                    <h3 className="font-[family-name:var(--font-heading)] text-xl font-bold text-foreground">
                      Track the Meta in Real Time
                    </h3>
                    <p className="text-sm text-muted-foreground leading-relaxed">
                      Win rates, W/L records, and card variant data from
                      thousands of top-ranked battles. Updated daily.
                    </p>
                  </div>
                  <ArrowRight className="w-4 h-4 text-muted-foreground group-hover:text-primary group-hover:translate-x-0.5 transition-all shrink-0 mt-1" />
                </div>
                {/* Mini deck preview */}
                <div className="flex-1 space-y-2">
                  {[
                    {
                      name: "Mortar Control",
                      wr: 54.2,
                      colors: [
                        "evolved",
                        "evolved",
                        "hero",
                        "hero",
                        "normal",
                        "normal",
                        "normal",
                        "normal",
                      ],
                    },
                    {
                      name: "Royal Hogs Cycle",
                      wr: 51.8,
                      colors: [
                        "evolved",
                        "evolved",
                        "hero",
                        "hero",
                        "normal",
                        "normal",
                        "normal",
                        "normal",
                      ],
                    },
                  ].map((deck) => (
                    <div
                      key={deck.name}
                      className="flex items-center gap-3 px-3 py-2 bg-muted/20 border border-border/30 rounded-lg"
                    >
                      <div className="flex gap-px">
                        {deck.colors.map((v, i) => (
                          <div
                            key={i}
                            className={`w-4 h-5 rounded-sm ${v === "evolved" ? "bg-purple-500/60" : v === "hero" ? "bg-yellow-500/60" : "bg-muted/60"}`}
                          />
                        ))}
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="text-xs font-semibold text-foreground truncate">
                          {deck.name}
                        </div>
                      </div>
                      <div
                        className={`text-xs font-bold tabular-nums ${deck.wr >= 53 ? "text-emerald-400" : "text-amber-400"}`}
                      >
                        {deck.wr}%
                      </div>
                    </div>
                  ))}
                  <div className="grid grid-cols-3 gap-2 pt-1">
                    {[
                      { icon: TrendingUp, label: "Win Rates" },
                      { icon: Zap, label: "Daily Data" },
                      { icon: Trophy, label: "Top Meta" },
                    ].map((f) => (
                      <div
                        key={f.label}
                        className="flex flex-col items-center gap-1 py-2 bg-muted/10 rounded-lg"
                      >
                        <f.icon className="w-3.5 h-3.5 text-primary/60" />
                        <span className="text-[9px] text-muted-foreground">
                          {f.label}
                        </span>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            </Link>

            {/* Head-to-Head */}
            <Link
              href="/head-to-head"
              className="group relative bg-card border border-border/50 rounded-2xl overflow-hidden hover:border-purple-500/30 hover:shadow-[0_0_30px_rgba(168,85,247,0.06)] transition-all duration-300 hover:-translate-y-0.5"
            >
              <div className="absolute top-0 left-0 right-0 h-px bg-gradient-to-r from-transparent via-purple-500/40 to-transparent" />
              <div className="p-6 flex flex-col h-full">
                <div className="flex items-start justify-between mb-5">
                  <div className="space-y-2">
                    <div className="inline-flex items-center gap-1.5 px-2.5 py-1 bg-purple-500/10 border border-purple-500/30 rounded-full">
                      <GitCompare className="w-3 h-3 text-purple-400" />
                      <span className="text-[10px] font-semibold text-purple-400 uppercase tracking-widest">
                        Head-to-Head
                      </span>
                    </div>
                    <h3 className="font-[family-name:var(--font-heading)] text-xl font-bold text-foreground">
                      Compare Win Conditions
                    </h3>
                    <p className="text-sm text-muted-foreground leading-relaxed">
                      Pit any two win conditions against each other to see which
                      dominates the current ladder.
                    </p>
                  </div>
                  <ArrowRight className="w-4 h-4 text-muted-foreground group-hover:text-purple-400 group-hover:translate-x-0.5 transition-all shrink-0 mt-1" />
                </div>
                <div className="flex-1">
                  <HeadToHeadPreviewCard />
                </div>
              </div>
            </Link>
          </div>
        </div>
      </section>

      {/* ── Meta Deck Analytics ── */}
      <section className="relative py-24 md:py-32 px-6 md:px-12 bg-card/20">
        <div className="max-w-7xl mx-auto">
          <div className="text-center mb-16 md:mb-20 space-y-4 opacity-0 animate-[fade-in_0.8s_ease-out_0.2s_forwards]">
            <div className="inline-flex items-center gap-2 px-4 py-1.5 bg-card/60 border border-border/50 rounded-full backdrop-blur-sm">
              <BarChart3 className="w-3.5 h-3.5 text-primary" />
              <span className="text-xs tracking-[0.2em] uppercase text-muted-foreground font-medium">
                Deck Analytics
              </span>
            </div>
            <h2 className="font-[family-name:var(--font-heading)] font-bold text-4xl md:text-5xl lg:text-6xl tracking-tight">
              Track the Meta in <span className="text-primary">Real Time</span>
            </h2>
            <p className="text-lg text-muted-foreground max-w-2xl mx-auto">
              Win rates, W/L records, games played, and card variant data from
              top ranked players.
            </p>
          </div>

          {/* Deck Cards */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6 md:gap-8 max-w-4xl mx-auto mb-16 opacity-0 animate-[fade-in_0.8s_ease-out_0.4s_forwards]">
            {SAMPLE_DECKS.map((deck) => (
              <div
                key={deck.name}
                className="group relative bg-card border border-border/50 rounded-2xl overflow-hidden shadow-md hover:shadow-lg transition-all duration-300 hover:-translate-y-1"
              >
                {/* Header */}
                <div className="px-5 py-4 bg-muted/20 border-b border-border/30">
                  <div className="flex items-center justify-between gap-3">
                    <div className="flex items-center gap-2 min-w-0 flex-1">
                      <Swords className="w-4 h-4 text-primary shrink-0" />
                      <h3 className="text-base font-bold text-foreground truncate">
                        {deck.name}
                      </h3>
                    </div>
                    <div className="flex items-center gap-2 shrink-0">
                      <div
                        className={`text-xs font-bold tabular-nums ${deck.winRate >= 53 ? "text-emerald-400" : "text-amber-400"}`}
                      >
                        {deck.winRate}% WR
                      </div>
                      <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-pink-500/10 ring-1 ring-pink-500/20">
                        <div className="w-2 h-2 rounded-full bg-pink-500 animate-pulse" />
                        <span className="text-xs font-bold text-pink-500">
                          {deck.avgElixir.toFixed(1)}
                        </span>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Cards Grid */}
                <div className="p-5">
                  <div className="grid grid-cols-4 gap-2.5">
                    {deck.cards.slice(0, 4).map((card) => (
                      <div
                        key={card.name}
                        className={`relative aspect-[3/4] rounded-lg overflow-hidden border-2 bg-muted group/card hover:scale-[1.08] hover:z-20 transition-all duration-300 shadow-md hover:shadow-lg ${
                          card.variant === "evolved"
                            ? "border-purple-500/50"
                            : card.variant === "hero"
                              ? "border-yellow-500/50"
                              : "border-white/10"
                        }`}
                      >
                        <Image
                          src={card.image}
                          alt={card.name}
                          fill
                          className="object-contain p-0.5"
                        />
                        {card.variant === "evolved" && (
                          <div className="absolute top-0.5 left-0.5 px-1 py-px rounded bg-purple-500/90 text-white text-[6px] font-bold uppercase leading-none z-10">
                            Evo
                          </div>
                        )}
                        {card.variant === "hero" && (
                          <div className="absolute top-0.5 left-0.5 px-1 py-px rounded bg-yellow-500/90 text-white text-[6px] font-bold uppercase leading-none z-10">
                            Hero
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                  <div className="grid grid-cols-4 gap-2.5 mt-2.5">
                    {deck.cards.slice(4, 8).map((card) => (
                      <div
                        key={card.name}
                        className={`relative aspect-[3/4] rounded-lg overflow-hidden border-2 bg-muted group/card hover:scale-[1.08] hover:z-20 transition-all duration-300 shadow-md hover:shadow-lg ${
                          card.variant === "evolved"
                            ? "border-purple-500/50"
                            : card.variant === "hero"
                              ? "border-yellow-500/50"
                              : "border-white/10"
                        }`}
                      >
                        <Image
                          src={card.image}
                          alt={card.name}
                          fill
                          className="object-contain p-0.5"
                        />
                        {card.variant === "evolved" && (
                          <div className="absolute top-0.5 left-0.5 px-1 py-px rounded bg-purple-500/90 text-white text-[6px] font-bold uppercase leading-none z-10">
                            Evo
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            ))}
          </div>

          {/* Feature Pills */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 opacity-0 animate-[fade-in_0.8s_ease-out_0.6s_forwards]">
            {[
              {
                icon: TrendingUp,
                title: "Win Rate Tracking",
                desc: "Performance stats across all deck archetypes",
              },
              {
                icon: Zap,
                title: "Updated Daily",
                desc: "Fresh data from ranked play every day",
              },
              {
                icon: Trophy,
                title: "Competitive Advantage",
                desc: "See what decks the best of the best are using",
              },
            ].map((feature) => (
              <div
                key={feature.title}
                className="group bg-card/40 border border-border/50 rounded-xl p-5 transition-all duration-300 hover:border-primary/30 backdrop-blur-sm"
              >
                <feature.icon className="w-5 h-5 text-primary mb-3" />
                <h4 className="font-semibold text-sm text-foreground mb-1">
                  {feature.title}
                </h4>
                <p className="text-xs text-muted-foreground leading-relaxed">
                  {feature.desc}
                </p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── Footer ── */}
      <footer className="bg-background border-t border-border py-12 px-6 md:px-12">
        <div className="max-w-7xl mx-auto">
          <div className="flex flex-col md:flex-row items-center justify-between gap-6">
            <div className="text-center md:text-left">
              <h3 className="font-[family-name:var(--font-heading)] text-xl font-bold text-foreground mb-1">
                ClashGPT
              </h3>
              <p className="text-sm text-muted-foreground">
                AI-powered Clash Royale intelligence
              </p>
            </div>
            <div className="flex items-center gap-8 flex-wrap justify-center">
              {[
                { href: "/chat", label: "Chat" },
                { href: "/decks", label: "Decks" },
                { href: "/profiles", label: "Profiles" },
                { href: "/matchups", label: "Matchups" },
                { href: "/head-to-head", label: "Head-to-Head" },
                { href: "/tracker", label: "Tracker" },
              ].map((link) => (
                <Link
                  key={link.href}
                  href={link.href}
                  className="text-sm text-muted-foreground hover:text-foreground transition-colors"
                >
                  {link.label}
                </Link>
              ))}
            </div>
          </div>
          <div className="mt-8 pt-8 border-t border-border/50 text-center">
            <p className="text-xs text-muted-foreground/60">
              &copy; 2026 ClashGPT. All rights reserved.
            </p>
          </div>
        </div>
      </footer>
    </div>
  );
}
