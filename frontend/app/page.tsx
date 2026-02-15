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
} from "lucide-react";
import { SignInButton, SignedIn, SignedOut } from "@clerk/nextjs";
import { Navbar } from "@/components/navbar";

const SAMPLE_DECKS = [
  {
    name: "Mortar Control",
    avgElixir: 3.0,
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

export default function Home() {
  return (
    <div className="min-h-screen bg-background text-foreground">
      <Navbar />

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
      <section className="relative min-h-[90vh] flex flex-col items-center justify-center px-6 md:px-12 overflow-hidden">
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[400px] bg-primary/8 rounded-full blur-[120px] pointer-events-none" />
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
        </div>

        <div className="relative z-10 max-w-5xl w-full text-center space-y-8 opacity-0 animate-[fade-in_1s_ease-out_0.2s_forwards]">
          <div className="inline-flex items-center gap-2 px-4 py-1.5 bg-card/60 border border-border/50 rounded-full backdrop-blur-sm">
            <Sparkles className="w-3.5 h-3.5 text-primary" />
            <p className="text-xs tracking-[0.2em] uppercase text-muted-foreground font-medium">
              AI-Powered Clash Royale Intelligence
            </p>
          </div>

          <h1 className="font-[family-name:var(--font-heading)] font-bold leading-[0.9] tracking-tight">
            <span className="block text-[14vw] md:text-[10vw] lg:text-[8rem] xl:text-[10rem] text-foreground">
              ClashGPT
            </span>
          </h1>

          <p className="text-base md:text-lg text-muted-foreground/80 max-w-xl mx-auto leading-relaxed">
            Real-time meta analytics, AI-powered strategy, and live tournament
            data — all in one assistant.
          </p>

          <div className="pt-4 flex flex-col sm:flex-row items-center justify-center gap-4">
            <SignedIn>
              <Link
                href="/chat"
                className="group inline-flex items-center gap-3 bg-primary text-primary-foreground px-8 py-4 text-base font-semibold rounded-xl transition-all duration-300 hover:shadow-[0_0_40px_rgba(255,159,28,0.25)] active:scale-[0.98]"
              >
                Start Chatting
                <ArrowRight className="w-4 h-4 transition-transform group-hover:translate-x-1" />
              </Link>
            </SignedIn>
            <SignedOut>
              <SignInButton mode="modal" forceRedirectUrl="/chat">
                <button className="group inline-flex items-center gap-3 bg-primary text-primary-foreground px-8 py-4 text-base font-semibold rounded-xl transition-all duration-300 hover:shadow-[0_0_40px_rgba(255,159,28,0.25)] active:scale-[0.98] cursor-pointer">
                  Start Chatting
                  <ArrowRight className="w-4 h-4 transition-transform group-hover:translate-x-1" />
                </button>
              </SignInButton>
            </SignedOut>
            <Link
              href="/decks"
              className="inline-flex items-center gap-2 text-muted-foreground hover:text-foreground px-6 py-4 text-base font-medium transition-colors"
            >
              Browse Decks
              <ChevronRight className="w-4 h-4" />
            </Link>
          </div>
        </div>

        <div className="absolute bottom-8 left-1/2 -translate-x-1/2 opacity-0 animate-[fade-in_1s_ease-out_2s_forwards]">
          <div className="w-px h-12 bg-gradient-to-b from-border to-transparent" />
        </div>
      </section>

      {/* ── Meta Deck Analytics ── */}
      <section className="relative py-24 md:py-32 px-6 md:px-12">
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
              top ladder and tournament play.
            </p>
          </div>

          {/* Deck Cards - matching existing DeckGridCard style */}
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
                      <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-pink-500/10 ring-1 ring-pink-500/20 shrink-0">
                        <div className="w-2 h-2 rounded-full bg-pink-500 animate-pulse" />
                        <span className="text-xs font-bold text-pink-500">
                          {deck.avgElixir.toFixed(1)}
                        </span>
                      </div>
                    </div>
                  </div>

                  {/* Cards Grid - 2 rows of 4 */}
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

      {/* ── AI Chat ── */}
      <section className="relative py-24 md:py-32 px-6 md:px-12 bg-card/20">
        <div className="max-w-7xl mx-auto">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-12 md:gap-16 items-center">
            {/* Chat Preview */}
            <div className="relative order-2 lg:order-1 opacity-0 animate-[fade-in_0.8s_ease-out_0.3s_forwards]">
              <div className="absolute inset-0 bg-accent/5 rounded-2xl blur-[60px] pointer-events-none" />

              <div className="relative bg-card/80 border border-border rounded-2xl overflow-hidden backdrop-blur-sm">
                <div className="flex items-center gap-3 px-5 py-4 border-b border-border/50">
                  <div className="w-8 h-8 bg-primary/15 border border-primary/25 rounded-lg flex items-center justify-center">
                    <Bot className="w-4 h-4 text-primary" />
                  </div>
                  <div>
                    <div className="text-sm font-semibold text-foreground">
                      ClashGPT
                    </div>
                    <div className="text-[10px] text-green-400">Online</div>
                  </div>
                </div>

                <div className="p-5 space-y-4">
                  {/* User message */}
                  <div className="flex justify-end">
                    <div className="bg-primary/15 border border-primary/25 rounded-xl rounded-br-sm px-4 py-2.5 max-w-[80%]">
                      <p className="text-sm text-foreground">
                        Find me the top decks with royal hogs
                      </p>
                    </div>
                  </div>

                  {/* Tool call loading state */}
                  <div className="bg-primary/20 border border-primary/40 text-white p-4 rounded-xl">
                    <div className="flex items-center gap-3">
                      <span className="text-lg animate-spin">⚙️</span>
                      <span className="text-sm font-medium">
                        Finding decks for you...
                      </span>
                    </div>
                  </div>
                </div>
              </div>
            </div>

            {/* Chat Features */}
            <div className="order-1 lg:order-2 space-y-6 opacity-0 animate-[fade-in_0.8s_ease-out_0.2s_forwards]">
              <div className="inline-flex items-center gap-2 px-4 py-1.5 bg-card/60 border border-border/50 rounded-full backdrop-blur-sm">
                <MessageSquare className="w-3.5 h-3.5 text-accent" />
                <span className="text-xs tracking-[0.2em] uppercase text-muted-foreground font-medium">
                  AI Assistant
                </span>
              </div>

              <h2 className="font-[family-name:var(--font-heading)] font-bold text-4xl md:text-5xl lg:text-6xl tracking-tight">
                Ask Anything About{" "}
                <span className="text-accent">the Arena</span>
              </h2>

              <p className="text-lg text-muted-foreground max-w-lg leading-relaxed">
                A conversational AI that knows Clash Royale inside and out. Get
                instant answers backed by live data.
              </p>

              <div className="grid grid-cols-2 gap-3 pt-2">
                {[
                  { icon: Search, label: "Player Lookup" },
                  { icon: Swords, label: "Battle Analysis" },
                  { icon: Shield, label: "Clan Intelligence" },
                  { icon: Target, label: "Deck Strategy" },
                ].map((item) => (
                  <div
                    key={item.label}
                    className="flex items-center gap-2.5 bg-card/40 border border-border/50 rounded-lg px-4 py-3 transition-all duration-300 hover:border-accent/30"
                  >
                    <item.icon className="w-4 h-4 text-accent/70" />
                    <span className="text-sm text-foreground/80 font-medium">
                      {item.label}
                    </span>
                  </div>
                ))}
              </div>

              <div className="pt-4">
                <SignedIn>
                  <Link
                    href="/chat"
                    className="group inline-flex items-center gap-2 text-accent hover:text-accent/80 font-medium transition-colors"
                  >
                    Try the assistant
                    <ArrowRight className="w-4 h-4 transition-transform group-hover:translate-x-1" />
                  </Link>
                </SignedIn>
                <SignedOut>
                  <SignInButton mode="modal" forceRedirectUrl="/chat">
                    <button className="group inline-flex items-center gap-2 text-accent hover:text-accent/80 font-medium transition-colors cursor-pointer">
                      Try the assistant
                      <ArrowRight className="w-4 h-4 transition-transform group-hover:translate-x-1" />
                    </button>
                  </SignInButton>
                </SignedOut>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ── Final CTA ── */}
      <section className="relative py-24 md:py-32 px-6 md:px-12">
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[500px] h-[300px] bg-primary/5 rounded-full blur-[100px] pointer-events-none" />

        <div className="relative max-w-4xl mx-auto text-center space-y-8">
          <div className="inline-flex items-center gap-2 px-4 py-1.5 bg-primary/10 border border-primary/20 rounded-full backdrop-blur-sm">
            <Crown className="w-3.5 h-3.5 text-primary" />
            <span className="text-xs tracking-[0.2em] uppercase text-primary font-medium">
              Join the Arena
            </span>
          </div>

          <h2 className="font-[family-name:var(--font-heading)] font-bold text-4xl md:text-5xl lg:text-7xl tracking-tight leading-[1.1] text-foreground">
            Ready to Elevate
            <br />
            Your Game?
          </h2>

          <p className="text-lg md:text-xl text-muted-foreground max-w-xl mx-auto">
            Join players using AI-powered strategy to dominate Clash Royale.
          </p>

          <div className="pt-4 flex flex-col sm:flex-row items-center justify-center gap-4">
            <SignedIn>
              <Link
                href="/chat"
                className="group inline-flex items-center gap-3 bg-primary text-primary-foreground px-10 py-4 text-lg font-semibold rounded-xl transition-all duration-300 hover:shadow-[0_0_40px_rgba(255,159,28,0.3)] active:scale-[0.98]"
              >
                Start Your Journey
                <ArrowRight className="w-5 h-5 transition-transform group-hover:translate-x-1" />
              </Link>
            </SignedIn>
            <SignedOut>
              <SignInButton mode="modal" forceRedirectUrl="/chat">
                <button className="group inline-flex items-center gap-3 bg-primary text-primary-foreground px-10 py-4 text-lg font-semibold rounded-xl transition-all duration-300 hover:shadow-[0_0_40px_rgba(255,159,28,0.3)] active:scale-[0.98] cursor-pointer">
                  Start Your Journey
                  <ArrowRight className="w-5 h-5 transition-transform group-hover:translate-x-1" />
                </button>
              </SignInButton>
            </SignedOut>
            <Link
              href="/decks"
              className="inline-flex items-center gap-2 text-muted-foreground hover:text-foreground px-6 py-4 text-lg font-medium transition-colors"
            >
              Browse Decks
              <ChevronRight className="w-4 h-4" />
            </Link>
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
            <div className="flex items-center gap-8">
              <Link
                href="/chat"
                className="text-sm text-muted-foreground hover:text-foreground transition-colors"
              >
                Chat
              </Link>
              <Link
                href="/decks"
                className="text-sm text-muted-foreground hover:text-foreground transition-colors"
              >
                Decks
              </Link>
              <Link
                href="/profile"
                className="text-sm text-muted-foreground hover:text-foreground transition-colors"
              >
                Profile
              </Link>
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
