"use client";

import Link from "next/link";
import { MessageSquare, Users, Trophy, BookOpen, Sparkles, Swords, Crown } from "lucide-react";

export default function Home() {
  return (
    <div className="min-h-screen bg-background text-foreground">
      {/* Grid Background */}
      <div className="fixed inset-0 pointer-events-none" style={{
        backgroundImage: `linear-gradient(to right, rgba(255, 255, 255, 0.03) 1px, transparent 1px),
                          linear-gradient(to bottom, rgba(255, 255, 255, 0.03) 1px, transparent 1px)`,
        backgroundSize: '80px 80px'
      }} />

      {/* Hero Section */}
      <section className="relative min-h-screen flex flex-col items-center justify-center px-6 md:px-12 overflow-hidden">
        {/* Floating arena elements */}
        <div className="absolute inset-0 pointer-events-none overflow-hidden">
          <div className="absolute top-20 left-10 w-2 h-2 bg-primary/30 rounded-full animate-pulse" style={{ animationDelay: "0s" }} />
          <div className="absolute top-40 right-20 w-1 h-1 bg-accent/40 rounded-full animate-pulse" style={{ animationDelay: "1s" }} />
          <div className="absolute bottom-40 left-1/4 w-1.5 h-1.5 bg-primary/25 rounded-full animate-pulse" style={{ animationDelay: "2s" }} />
          <div className="absolute top-1/3 right-1/4 w-1 h-1 bg-accent/30 rounded-full animate-pulse" style={{ animationDelay: "1.5s" }} />
        </div>

        {/* Main Content */}
        <div className="relative z-10 max-w-7xl w-full text-center space-y-12 opacity-0 animate-[fade-in_1s_ease-out_0.2s_forwards]">
          {/* Eyebrow */}
          <div className="inline-flex items-center gap-2 px-4 py-2 bg-card/50 border border-border/50 rounded-full backdrop-blur-sm">
            <Sparkles className="w-4 h-4 text-primary" />
            <p className="text-sm tracking-[0.2em] uppercase text-muted-foreground font-medium">
              AI-Powered Clash Royale Intelligence
            </p>
          </div>

          {/* Massive Headline with border effect */}
          <div className="relative inline-block">
            <h1 className="font-[family-name:var(--font-heading)] font-bold leading-[0.9] tracking-tight">
              <span className="block text-[12vw] md:text-[10vw] lg:text-[9rem] xl:text-[11rem] 2xl:text-[13rem] text-foreground">
                ClashGPT
              </span>
              <span className="block text-[6vw] md:text-[5vw] lg:text-[4rem] xl:text-[5rem] 2xl:text-[6rem] mt-4 text-primary">
                Master the Arena
              </span>
            </h1>
          </div>

          {/* Description */}
          <p className="text-lg md:text-xl lg:text-2xl text-muted-foreground max-w-3xl mx-auto leading-relaxed px-4">
            Real-time player stats, meta deck analysis, clan intelligence, and comprehensive game knowledge—all in one AI assistant.
          </p>

          {/* CTA */}
          <div className="pt-8 flex flex-col sm:flex-row items-center justify-center gap-4">
            <Link
              href="/chat"
              className="group inline-flex items-center gap-3 bg-primary text-primary-foreground px-8 py-4 text-lg font-medium rounded-lg border border-primary/20 transition-all duration-300 hover:bg-primary/90 hover:shadow-[0_0_30px_rgba(255,159,28,0.3)] active:scale-95"
            >
              Start Chatting
              <MessageSquare className="w-5 h-5 transition-transform group-hover:translate-x-1" />
            </Link>
            <a
              href="#features"
              className="inline-flex items-center gap-2 text-muted-foreground hover:text-foreground px-6 py-4 text-lg font-medium transition-colors"
            >
              Learn More
              <Crown className="w-4 h-4" />
            </a>
          </div>

          {/* Stats Bar */}
          <div className="grid grid-cols-3 gap-6 max-w-2xl mx-auto pt-12">
            <div className="text-center p-4 bg-card/30 border border-border/50 rounded-lg backdrop-blur-sm">
              <div className="text-2xl md:text-3xl font-bold text-primary font-[family-name:var(--font-heading)]">110+</div>
              <div className="text-xs md:text-sm text-muted-foreground mt-1">Cards Tracked</div>
            </div>
            <div className="text-center p-4 bg-card/30 border border-border/50 rounded-lg backdrop-blur-sm">
              <div className="text-2xl md:text-3xl font-bold text-accent font-[family-name:var(--font-heading)]">Live</div>
              <div className="text-xs md:text-sm text-muted-foreground mt-1">API Data</div>
            </div>
            <div className="text-center p-4 bg-card/30 border border-border/50 rounded-lg backdrop-blur-sm">
              <div className="text-2xl md:text-3xl font-bold text-primary font-[family-name:var(--font-heading)]">AI</div>
              <div className="text-xs md:text-sm text-muted-foreground mt-1">Powered</div>
            </div>
          </div>
        </div>

        {/* Scroll Indicator */}
        <div className="absolute bottom-12 left-1/2 -translate-x-1/2 animate-bounce opacity-0 animate-[fade-in_1s_ease-out_1.5s_forwards]">
          <div className="w-px h-16 bg-border" />
        </div>
      </section>

      {/* Features Section */}
      <section id="features" className="relative py-32 md:py-40 px-6 md:px-12 bg-muted/20">
        <div className="max-w-7xl mx-auto">
          {/* Section Header */}
          <div className="text-center mb-24 space-y-6">
            <div className="inline-flex items-center gap-2 px-4 py-2 bg-card/50 border border-border/50 rounded-full backdrop-blur-sm mb-4">
              <Swords className="w-4 h-4 text-primary" />
              <span className="text-sm tracking-wider uppercase text-muted-foreground font-medium">
                Battle-Ready Features
              </span>
            </div>
            <h2 className="font-[family-name:var(--font-heading)] font-bold text-5xl md:text-6xl lg:text-7xl xl:text-8xl tracking-tight">
              Built for Champions
            </h2>
            <p className="text-lg md:text-xl text-muted-foreground max-w-2xl mx-auto">
              Everything you need to dominate the arena
            </p>
          </div>

          {/* Feature Grid */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6 md:gap-8">
            {/* Feature 1 - Deck Recommendations */}
            <div className="group bg-card border border-border rounded-xl p-8 md:p-10 transition-all duration-300 hover:border-primary/40 hover:shadow-[0_0_30px_rgba(255,159,28,0.1)] opacity-0 animate-[fade-in_0.6s_ease-out_0.3s_forwards]">
              <div className="space-y-6">
                <div className="w-14 h-14 bg-primary/10 border border-primary/20 rounded-lg flex items-center justify-center transition-all duration-300 group-hover:bg-primary/20 group-hover:border-primary/40">
                  <Trophy className="w-7 h-7 text-primary" />
                </div>
                <h3 className="font-[family-name:var(--font-heading)] font-bold text-3xl md:text-4xl tracking-tight text-foreground">
                  Deck Recommendations
                </h3>
                <p className="text-lg text-muted-foreground leading-relaxed">
                  Discover winning decks tailored to your playstyle. Get meta-aware suggestions backed by real tournament data.
                </p>
              </div>
            </div>

            {/* Feature 2 - Player Insights */}
            <div className="group bg-card border border-border rounded-xl p-8 md:p-10 transition-all duration-300 hover:border-accent/40 hover:shadow-[0_0_30px_rgba(88,143,232,0.1)] opacity-0 animate-[fade-in_0.6s_ease-out_0.5s_forwards]">
              <div className="space-y-6">
                <div className="w-14 h-14 bg-accent/10 border border-accent/20 rounded-lg flex items-center justify-center transition-all duration-300 group-hover:bg-accent/20 group-hover:border-accent/40">
                  <MessageSquare className="w-7 h-7 text-accent" />
                </div>
                <h3 className="font-[family-name:var(--font-heading)] font-bold text-3xl md:text-4xl tracking-tight text-foreground">
                  Player Insights
                </h3>
                <p className="text-lg text-muted-foreground leading-relaxed">
                  Deep dive into player statistics, battle history, and performance trends. Understand strengths and weaknesses.
                </p>
              </div>
            </div>

            {/* Feature 3 - Clan Intelligence */}
            <div className="group bg-card border border-border rounded-xl p-8 md:p-10 transition-all duration-300 hover:border-primary/40 hover:shadow-[0_0_30px_rgba(255,159,28,0.1)] opacity-0 animate-[fade-in_0.6s_ease-out_0.7s_forwards]">
              <div className="space-y-6">
                <div className="w-14 h-14 bg-primary/10 border border-primary/20 rounded-lg flex items-center justify-center transition-all duration-300 group-hover:bg-primary/20 group-hover:border-primary/40">
                  <Users className="w-7 h-7 text-primary" />
                </div>
                <h3 className="font-[family-name:var(--font-heading)] font-bold text-3xl md:text-4xl tracking-tight text-foreground">
                  Clan Intelligence
                </h3>
                <p className="text-lg text-muted-foreground leading-relaxed">
                  Analyze clan performance, member contributions, and war statistics. Find the perfect clan or optimize yours.
                </p>
              </div>
            </div>

            {/* Feature 4 - Game Mastery */}
            <div className="group bg-card border border-border rounded-xl p-8 md:p-10 transition-all duration-300 hover:border-accent/40 hover:shadow-[0_0_30px_rgba(88,143,232,0.1)] opacity-0 animate-[fade-in_0.6s_ease-out_0.9s_forwards]">
              <div className="space-y-6">
                <div className="w-14 h-14 bg-accent/10 border border-accent/20 rounded-lg flex items-center justify-center transition-all duration-300 group-hover:bg-accent/20 group-hover:border-accent/40">
                  <BookOpen className="w-7 h-7 text-accent" />
                </div>
                <h3 className="font-[family-name:var(--font-heading)] font-bold text-3xl md:text-4xl tracking-tight text-foreground">
                  Game Mastery
                </h3>
                <p className="text-lg text-muted-foreground leading-relaxed">
                  Learn mechanics, strategies, and card interactions. Ask anything about the game and get expert answers.
                </p>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Final CTA Section */}
      <section className="relative py-32 md:py-40 px-6 md:px-12 bg-card/30 border-y border-border">
        <div className="max-w-5xl mx-auto text-center space-y-12">
          <div className="inline-flex items-center gap-2 px-4 py-2 bg-primary/10 border border-primary/20 rounded-full backdrop-blur-sm mb-4">
            <Crown className="w-4 h-4 text-primary" />
            <span className="text-sm tracking-wider uppercase text-primary font-medium">
              Join the Arena
            </span>
          </div>
          <h2 className="font-[family-name:var(--font-heading)] font-bold text-5xl md:text-6xl lg:text-7xl xl:text-8xl tracking-tight leading-[1.1] text-foreground">
            Ready to Elevate
            <br />
            Your Game?
          </h2>
          <p className="text-xl md:text-2xl text-muted-foreground max-w-2xl mx-auto">
            Join players using AI-powered strategy to dominate Clash Royale
          </p>
          <div className="pt-8">
            <Link
              href="/chat"
              className="group inline-flex items-center gap-3 bg-primary text-primary-foreground px-10 py-5 text-lg md:text-xl font-medium rounded-lg border border-primary/20 transition-all duration-300 hover:bg-primary/90 hover:shadow-[0_0_40px_rgba(255,159,28,0.4)] active:scale-95"
            >
              Start Your Journey
              <MessageSquare className="w-5 h-5 transition-transform group-hover:translate-x-1" />
            </Link>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="bg-background border-t border-border py-12 px-6 md:px-12">
        <div className="max-w-7xl mx-auto">
          <div className="flex flex-col md:flex-row items-center justify-between gap-6">
            <div className="text-center md:text-left">
              <h3 className="font-[family-name:var(--font-heading)] text-2xl font-bold text-foreground mb-2">
                ClashGPT
              </h3>
              <p className="text-sm text-muted-foreground">
                The definitive AI assistant for Clash Royale
              </p>
            </div>
            <div className="flex items-center gap-8">
              <Link href="/chat" className="text-sm text-muted-foreground hover:text-foreground transition-colors">
                Chat
              </Link>
              <Link href="/decks" className="text-sm text-muted-foreground hover:text-foreground transition-colors">
                Decks
              </Link>
              <Link href="/profile" className="text-sm text-muted-foreground hover:text-foreground transition-colors">
                Profile
              </Link>
            </div>
          </div>
          <div className="mt-8 pt-8 border-t border-border text-center">
            <p className="text-sm text-muted-foreground">
              © 2026 ClashGPT. All rights reserved.
            </p>
          </div>
        </div>
      </footer>
    </div>
  );
}
