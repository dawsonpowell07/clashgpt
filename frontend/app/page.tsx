"use client";

import Link from "next/link";
import { MessageSquare, Users, Trophy, BookOpen } from "lucide-react";

export default function Home() {
  return (
    <div className="min-h-screen bg-white text-black">
      {/* Hero Section */}
      <section className="relative min-h-screen flex flex-col items-center justify-center px-6 md:px-12 overflow-hidden">
        {/* Subtle background texture */}
        <div className="absolute inset-0 opacity-[0.015] pointer-events-none">
          <div className="absolute inset-0" style={{
            backgroundImage: `url("data:image/svg+xml,%3Csvg width='60' height='60' viewBox='0 0 60 60' xmlns='http://www.w3.org/2000/svg'%3E%3Cg fill='none' fill-rule='evenodd'%3E%3Cg fill='%23000000' fill-opacity='1'%3E%3Cpath d='M36 34v-4h-2v4h-4v2h4v4h2v-4h4v-2h-4zm0-30V0h-2v4h-4v2h4v4h2V6h4V4h-4zM6 34v-4H4v4H0v2h4v4h2v-4h4v-2H6zM6 4V0H4v4H0v2h4v4h2V6h4V4H6z'/%3E%3C/g%3E%3C/g%3E%3C/svg%3E")`
          }} />
        </div>

        {/* Main Content */}
        <div className="relative z-10 max-w-7xl w-full text-center space-y-12 animate-fade-in">
          {/* Eyebrow */}
          <div className="inline-block">
            <p className="text-sm md:text-base tracking-[0.3em] uppercase text-neutral-500 font-medium">
              The Definitive AI Assistant
            </p>
          </div>

          {/* Massive Headline */}
          <h1 className="font-[family-name:var(--font-heading)] font-bold leading-[0.9] tracking-tight">
            <span className="block text-[12vw] md:text-[10vw] lg:text-[9rem] xl:text-[11rem] 2xl:text-[13rem]">
              ClashGPT
            </span>
            <span className="block text-[6vw] md:text-[5vw] lg:text-[4rem] xl:text-[5rem] 2xl:text-[6rem] mt-4 text-neutral-700">
              Master Clash Royale
            </span>
          </h1>

          {/* Description */}
          <p className="text-lg md:text-xl lg:text-2xl text-neutral-600 max-w-3xl mx-auto leading-relaxed px-4">
            Expert insights on decks, players, clans, and game mechanics.
            <br className="hidden md:block" />
            All powered by AI.
          </p>

          {/* CTA */}
          <div className="pt-8">
            <Link
              href="/chat"
              className="group inline-flex items-center gap-3 bg-black text-white px-10 py-5 text-lg md:text-xl font-medium transition-all duration-300 hover:bg-neutral-800 hover:gap-4 hover:shadow-2xl active:scale-95"
            >
              Start Chatting
              <MessageSquare className="w-5 h-5 transition-transform group-hover:rotate-12" />
            </Link>
          </div>
        </div>

        {/* Scroll Indicator */}
        <div className="absolute bottom-12 left-1/2 -translate-x-1/2 animate-bounce">
          <div className="w-px h-16 bg-gradient-to-b from-transparent via-neutral-300 to-transparent" />
        </div>
      </section>

      {/* Features Section */}
      <section className="relative py-32 md:py-40 px-6 md:px-12 bg-neutral-50">
        <div className="max-w-7xl mx-auto">
          {/* Section Header */}
          <div className="text-center mb-24 space-y-6">
            <h2 className="font-[family-name:var(--font-heading)] font-bold text-5xl md:text-6xl lg:text-7xl xl:text-8xl tracking-tight">
              Built for Champions
            </h2>
            <p className="text-lg md:text-xl text-neutral-600 max-w-2xl mx-auto">
              Everything you need to dominate the arena
            </p>
          </div>

          {/* Feature Grid */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-8 md:gap-12 lg:gap-16">
            {/* Feature 1 - Deck Recommendations */}
            <div className="group bg-white p-10 md:p-12 transition-all duration-500 hover:shadow-2xl hover:-translate-y-2 border border-neutral-200">
              <div className="space-y-6">
                <div className="w-14 h-14 bg-black flex items-center justify-center transition-transform duration-500 group-hover:rotate-12">
                  <Trophy className="w-7 h-7 text-white" />
                </div>
                <h3 className="font-[family-name:var(--font-heading)] font-bold text-3xl md:text-4xl tracking-tight">
                  Deck Recommendations
                </h3>
                <p className="text-lg text-neutral-600 leading-relaxed">
                  Discover winning decks tailored to your playstyle. Get meta-aware suggestions backed by real tournament data.
                </p>
              </div>
            </div>

            {/* Feature 2 - Player Analysis */}
            <div className="group bg-white p-10 md:p-12 transition-all duration-500 hover:shadow-2xl hover:-translate-y-2 border border-neutral-200">
              <div className="space-y-6">
                <div className="w-14 h-14 bg-black flex items-center justify-center transition-transform duration-500 group-hover:rotate-12">
                  <MessageSquare className="w-7 h-7 text-white" />
                </div>
                <h3 className="font-[family-name:var(--font-heading)] font-bold text-3xl md:text-4xl tracking-tight">
                  Player Insights
                </h3>
                <p className="text-lg text-neutral-600 leading-relaxed">
                  Deep dive into player statistics, battle history, and performance trends. Understand strengths and weaknesses.
                </p>
              </div>
            </div>

            {/* Feature 3 - Clan Information */}
            <div className="group bg-white p-10 md:p-12 transition-all duration-500 hover:shadow-2xl hover:-translate-y-2 border border-neutral-200">
              <div className="space-y-6">
                <div className="w-14 h-14 bg-black flex items-center justify-center transition-transform duration-500 group-hover:rotate-12">
                  <Users className="w-7 h-7 text-white" />
                </div>
                <h3 className="font-[family-name:var(--font-heading)] font-bold text-3xl md:text-4xl tracking-tight">
                  Clan Intelligence
                </h3>
                <p className="text-lg text-neutral-600 leading-relaxed">
                  Analyze clan performance, member contributions, and war statistics. Find the perfect clan or optimize yours.
                </p>
              </div>
            </div>

            {/* Feature 4 - Game Knowledge */}
            <div className="group bg-white p-10 md:p-12 transition-all duration-500 hover:shadow-2xl hover:-translate-y-2 border border-neutral-200">
              <div className="space-y-6">
                <div className="w-14 h-14 bg-black flex items-center justify-center transition-transform duration-500 group-hover:rotate-12">
                  <BookOpen className="w-7 h-7 text-white" />
                </div>
                <h3 className="font-[family-name:var(--font-heading)] font-bold text-3xl md:text-4xl tracking-tight">
                  Game Mastery
                </h3>
                <p className="text-lg text-neutral-600 leading-relaxed">
                  Learn mechanics, strategies, and card interactions. Ask anything about the game and get expert answers.
                </p>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Final CTA Section */}
      <section className="relative py-32 md:py-40 px-6 md:px-12 bg-black text-white">
        <div className="max-w-5xl mx-auto text-center space-y-12">
          <h2 className="font-[family-name:var(--font-heading)] font-bold text-5xl md:text-6xl lg:text-7xl xl:text-8xl tracking-tight leading-[1.1]">
            Ready to Elevate
            <br />
            Your Game?
          </h2>
          <p className="text-xl md:text-2xl text-neutral-400 max-w-2xl mx-auto">
            Join the future of Clash Royale strategy
          </p>
          <div className="pt-8">
            <Link
              href="/chat"
              className="group inline-flex items-center gap-3 bg-white text-black px-10 py-5 text-lg md:text-xl font-medium transition-all duration-300 hover:bg-neutral-100 hover:gap-4 hover:shadow-2xl active:scale-95"
            >
              Start Your Journey
              <MessageSquare className="w-5 h-5 transition-transform group-hover:rotate-12" />
            </Link>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="bg-neutral-900 text-neutral-400 py-12 px-6 md:px-12">
        <div className="max-w-7xl mx-auto text-center">
          <p className="text-sm tracking-wide">
            © 2026 ClashGPT. The definitive Clash Royale AI assistant.
          </p>
        </div>
      </footer>
    </div>
  );
}
