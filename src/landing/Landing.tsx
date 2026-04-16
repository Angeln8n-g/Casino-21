import React from 'react';
import Hero from './sections/Hero';
import StatsBar from './sections/StatsBar';
import HowToPlay from './sections/HowToPlay';
import Features from './sections/Features';
import Leaderboard from './sections/Leaderboard';
import Tournaments from './sections/Tournaments';
import Footer from './sections/Footer';
import { useLandingData } from './hooks/useLandingData';
import brand21Icon from '../Public/Icon (2).png';

export default function Landing() {
  const { leaderboard, tournaments, stats, loading } = useLandingData();

  return (
    <div className="min-h-screen bg-[#0a0f1e] text-white overflow-x-hidden overflow-y-auto">
      {/* Ambient background */}
      <div className="fixed inset-0 pointer-events-none">
        <div className="absolute top-0 left-1/4 w-96 h-96 bg-yellow-500/5 rounded-full blur-3xl" />
        <div className="absolute bottom-1/3 right-1/4 w-80 h-80 bg-blue-500/5 rounded-full blur-3xl" />
      </div>

      <nav className="fixed top-0 left-0 right-0 z-50 bg-black/40 backdrop-blur-md border-b border-white/5">
        <div className="max-w-6xl mx-auto px-6 py-3 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <img src={brand21Icon} alt="Kasino21" className="w-8 h-8 rounded-lg object-contain" />
            <span className="text-2xl font-black text-transparent bg-clip-text bg-gradient-to-r from-yellow-400 to-yellow-600">
              KASINO21
            </span>
          </div>
          <a
            href="/index.html"
            className="bg-gradient-to-r from-yellow-500 to-yellow-400 text-black font-black px-6 py-2 rounded-xl hover:scale-105 transition-transform text-sm"
          >
            JUGAR AHORA
          </a>
        </div>
      </nav>

      <main className="pt-16">
        <Hero />
        <StatsBar stats={stats} loading={loading} />
        <HowToPlay />
        <Features />
        <div className="max-w-6xl mx-auto px-6 py-20 grid grid-cols-1 lg:grid-cols-2 gap-12">
          <Leaderboard entries={leaderboard} loading={loading} />
          <Tournaments tournaments={tournaments} loading={loading} />
        </div>
      </main>

      <Footer />
    </div>
  );
}
