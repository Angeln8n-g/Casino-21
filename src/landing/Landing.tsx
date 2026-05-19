import React from 'react';
import Navbar from './sections/Navbar';
import Hero from './sections/Hero';
import StatsBar from './sections/StatsBar';
import Features from './sections/Features';
import SocialProof from './sections/SocialProof';
import Leaderboard from './sections/Leaderboard';
import Tournaments from './sections/Tournaments';
import Footer from './sections/Footer';
import { useLandingData } from './hooks/useLandingData';

export default function Landing() {
  const { leaderboard, tournaments, stats, loading } = useLandingData();

  return (
    <div className="min-h-screen bg-[#0a0f1e] text-white overflow-x-hidden overflow-y-auto">
      {/* Ambient background */}
      <div className="fixed inset-0 pointer-events-none">
        <div className="absolute top-0 left-1/4 w-96 h-96 bg-yellow-500/5 rounded-full blur-3xl" />
        <div className="absolute bottom-1/3 right-1/4 w-80 h-80 bg-blue-500/5 rounded-full blur-3xl" />
      </div>

      <Navbar />

      <main className="pt-16">
        <Hero />
        <StatsBar stats={stats} loading={loading} />
        <Features />
        <SocialProof />
        <div className="max-w-6xl mx-auto px-6 py-20 grid grid-cols-1 lg:grid-cols-2 gap-12">
          <Leaderboard entries={leaderboard} loading={loading} />
          <Tournaments tournaments={tournaments} loading={loading} />
        </div>
      </main>

      <Footer />
    </div>
  );
}
