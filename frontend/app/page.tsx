import {
  Crown,
  Swords,
  Sparkles,
  MessageCircle,
  TrendingUp,
  Zap,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import Link from "next/link";

export default function Home() {
  return (
    <div className="min-h-screen bg-white">
      {/* Hero Section */}
      <section className="relative overflow-hidden border-b-4 border-(--clash-blue) bg-white px-6 py-20 md:py-32">
        <div className="container mx-auto max-w-6xl">
          <div className="text-center">
            {/* Crown icon */}
            <div className="mb-8 flex justify-center animate-fade-in">
              <div className="inline-flex items-center justify-center rounded-lg border-4 border-(--clash-blue) bg-white p-4">
                <Crown
                  className="h-12 w-12 text-(--clash-blue)"
                  strokeWidth={2.5}
                />
              </div>
            </div>

            {/* Main heading */}
            <h1 className="mb-6 font-(family-name:--font-heading) text-5xl font-black text-(--clash-blue-dark) md:text-7xl lg:text-8xl animate-fade-in-up [animation-delay:100ms]">
              ClashGPT
            </h1>

            {/* Subheading */}
            <p className="mx-auto mb-8 max-w-2xl text-xl font-medium text-(--clash-blue-dark) md:text-2xl animate-fade-in-up [animation-delay:200ms]">
              Your AI-powered Clash Royale companion. Ask questions, explore the
              meta, and dominate the arena.
            </p>

            {/* CTA Button */}
            <div className="flex flex-col items-center gap-4 sm:flex-row sm:justify-center animate-fade-in-up [animation-delay:300ms]">
              <Link href="/chat">
                <Button
                  size="lg"
                  className="h-14 border-4 border-(--clash-blue-dark) bg-(--clash-red) px-8 text-lg font-bold text-white transition-all hover:bg-[#E62E5C] hover:shadow-xl hover:-translate-y-1"
                >
                  <MessageCircle className="mr-2 h-5 w-5" />
                  Start Chatting
                </Button>
              </Link>
              <Button
                size="lg"
                variant="outline"
                className="h-14 border-4 border-(--clash-blue) bg-white px-8 text-lg font-bold text-(--clash-blue) transition-all hover:bg-(--clash-blue) hover:text-white hover:shadow-xl hover:-translate-y-1"
              >
                <Sparkles className="mr-2 h-5 w-5" />
                See Examples
              </Button>
            </div>
          </div>
        </div>
      </section>

      {/* Features Section */}
      <section className="border-b-4 border-(--clash-blue) bg-[#F5F7FA] px-6 py-20">
        <div className="container mx-auto max-w-6xl">
          {/* Section title */}
          <div className="mb-16 text-center">
            <h2 className="mb-4 font-(family-name:--font-heading) text-4xl font-black text-(--clash-blue-dark) md:text-5xl">
              Battle-Ready Features
            </h2>
            <p className="mx-auto max-w-2xl text-lg text-(--clash-blue-dark)">
              Everything you need to level up your Clash Royale game
            </p>
          </div>

          {/* Feature cards */}
          <div className="grid gap-8 md:grid-cols-3">
            {/* Feature 1 */}
            <div className="group royal-card royal-card-hover p-8 animate-fade-in-up [animation-delay:400ms]">
              <div className="mb-6 inline-flex items-center justify-center rounded-lg border-4 border-(--clash-blue) bg-white p-4">
                <MessageCircle
                  className="h-8 w-8 text-(--clash-blue)"
                  strokeWidth={2.5}
                />
              </div>
              <h3 className="mb-4 font-(family-name:--font-heading) text-2xl font-bold text-(--clash-blue-dark)">
                Ask Anything
              </h3>
              <p className="text-(--clash-blue-dark)">
                Chat naturally about cards, strategies, and game mechanics. Get
                instant answers powered by AI.
              </p>
            </div>

            {/* Feature 2 */}
            <div className="group royal-card royal-card-hover p-8 animate-fade-in-up [animation-delay:500ms]">
              <div className="mb-6 inline-flex items-center justify-center rounded-lg border-4 border-(--clash-blue) bg-white p-4">
                <TrendingUp
                  className="h-8 w-8 text-(--clash-blue)"
                  strokeWidth={2.5}
                />
              </div>
              <h3 className="mb-4 font-(family-name:--font-heading) text-2xl font-bold text-(--clash-blue-dark)">
                Meta Analysis
              </h3>
              <p className="text-(--clash-blue-dark)">
                Stay ahead with real-time meta insights. Discover what&apos;s
                working in the current season.
              </p>
            </div>

            {/* Feature 3 */}
            <div className="group royal-card royal-card-hover p-8 animate-fade-in-up [animation-delay:600ms]">
              <div className="mb-6 inline-flex items-center justify-center rounded-lg border-4 border-(--clash-blue) bg-white p-4">
                <Swords
                  className="h-8 w-8 text-(--clash-blue)"
                  strokeWidth={2.5}
                />
              </div>
              <h3 className="mb-4 font-(family-name:--font-heading) text-2xl font-bold text-(--clash-blue-dark)">
                Deck Recommendations
              </h3>
              <p className="text-(--clash-blue-dark)">
                Get personalized deck suggestions based on your playstyle and
                trophy range.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* Chat Preview Section */}
      <section className="border-b-4 border-(--clash-blue) bg-white px-6 py-20">
        <div className="container mx-auto max-w-5xl">
          <div className="mb-16 text-center">
            <h2 className="mb-4 font-(family-name:--font-heading) text-4xl font-black text-(--clash-blue-dark) md:text-5xl">
              Just Start Chatting
            </h2>
            <p className="mx-auto max-w-2xl text-lg text-(--clash-blue-dark)">
              No complicated menus. No premium subscriptions. Just ask your
              questions.
            </p>
          </div>

          {/* Example chat bubbles */}
          <div className="space-y-6">
            {/* User message */}
            <div className="flex justify-end animate-fade-in-up [animation-delay:700ms]">
              <div className="max-w-md rounded-lg border-4 border-(--clash-blue) bg-white p-4 shadow-md">
                <p className="font-medium text-(--clash-blue-dark)">
                  What&apos;s a good counter to Hog Rider?
                </p>
              </div>
            </div>

            {/* AI response */}
            <div className="flex justify-start animate-fade-in-up [animation-delay:800ms]">
              <div className="max-w-md rounded-lg border-4 border-(--clash-red) bg-white p-4 shadow-md">
                <div className="mb-2 flex items-center gap-2">
                  <Zap className="h-4 w-4 text-(--clash-red)" />
                  <span className="text-sm font-bold text-(--clash-red)">
                    ClashGPT
                  </span>
                </div>
                <p className="text-(--clash-blue-dark)">
                  Great question! Buildings like Cannon and Tesla are excellent
                  counters. For troops, Mini P.E.K.K.A. or a swarm like skeleton
                  army work well. Want me to show you some meta decks using
                  these counters?
                </p>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Final CTA Section */}
      <section className="bg-(--clash-blue) px-6 py-20">
        <div className="container mx-auto max-w-4xl text-center">
          <div className="mb-8 flex justify-center">
            <div className="inline-flex items-center justify-center rounded-lg border-4 border-white bg-(--clash-blue) p-4">
              <Crown className="h-12 w-12 text-white" strokeWidth={2.5} />
            </div>
          </div>

          <h2 className="mb-6 font-(family-name:--font-heading) text-4xl font-black text-white md:text-5xl">
            Ready to Dominate?
          </h2>

          <p className="mb-10 text-xl text-white">
            Join thousands of players using ClashGPT to improve their game
          </p>

          <Link href="/chat">
            <Button
              size="lg"
              className="h-16 border-4 border-white bg-(--clash-red) px-10 text-xl font-bold text-white transition-all hover:bg-white hover:text-(--clash-red) hover:shadow-2xl hover:scale-105"
            >
              <Sparkles className="mr-2 h-6 w-6" />
              Start Your First Battle
            </Button>
          </Link>
        </div>
      </section>

      {/* Footer */}
      <footer className="border-t-4 border-(--clash-blue) bg-white px-6 py-8">
        <div className="container mx-auto max-w-6xl text-center">
          <p className="text-sm text-(--clash-blue-dark)">
            ClashGPT is a fan-made tool and is not affiliated with Supercell.
          </p>
        </div>
      </footer>
    </div>
  );
}
