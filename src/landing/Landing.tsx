import React, { useRef, useState, useCallback } from 'react';
import ArenaNavbar from './sections/ArenaNavbar';
import ArenaHero from './sections/ArenaHero';
import TacticalMechanicsViewer from './sections/TacticalMechanicsViewer';
import GameModesArena from './sections/GameModesArena';
import EloRankingSection from './sections/EloRankingSection';
import CharactersShowcaseSection from './sections/CharactersShowcaseSection';
import TournamentsAndQuestsSection from './sections/TournamentsAndQuestsSection';
import CommunityAndCtaSection from './sections/CommunityAndCtaSection';
import BlogSection from './sections/BlogSection';
import FAQSection from './sections/FAQSection';
import Footer from './sections/Footer';

import MobilePlayDock from './components/MobilePlayDock';
import SponsorModal from './components/SponsorModal';
import { useLandingData } from './hooks/useLandingData';

export default function Landing() {
  const scrollContainerRef = useRef<HTMLDivElement>(null);
  const [isSponsorModalOpen, setIsSponsorModalOpen] = useState(false);

  const { leaderboard, events, stats, testimonials, loading } = useLandingData();

  const handleOpenSponsorModal = useCallback(() => setIsSponsorModalOpen(true), []);
  const handleCloseSponsorModal = useCallback(() => setIsSponsorModalOpen(false), []);

  const handleScrollToMechanics = useCallback(() => {
    const el = document.getElementById('mecanicas');
    if (el) {
      el.scrollIntoView({ behavior: 'smooth' });
    }
  }, []);

  return (
    <div
      ref={scrollContainerRef}
      className="h-full text-white overflow-x-hidden overflow-y-auto scroll-smooth relative bg-[#030611]"
      style={{
        background: 'radial-gradient(circle at 50% 15%, #081224 0%, #030611 65%, #010308 100%)',
      }}
    >
      {/* Background subtle tactical grid */}
      <div className="fixed inset-0 pointer-events-none z-0 overflow-hidden" aria-hidden="true">
        <div className="absolute inset-0 bg-[linear-gradient(rgba(255,255,255,0.012)_1px,transparent_1px),linear-gradient(90deg,rgba(255,255,255,0.012)_1px,transparent_1px)] bg-[size:36px_36px]" />
      </div>

      {/* Header Navigation */}
      <ArenaNavbar
        scrollContainerRef={scrollContainerRef}
        onlineCount={stats.onlineNow}
      />

      {/* Main Experience */}
      <main className="relative z-10 pb-20 sm:pb-0">
        {/* 1. Hero: Duelo Competitivo a 21 */}
        <ArenaHero onExploreMechanics={handleScrollToMechanics} />

        {/* 2. Demostración Guiada por Pestañas de las 5 Mecánicas */}
        <TacticalMechanicsViewer />

        {/* 3. Modalidades Competitivas */}
        <GameModesArena />

        {/* 4. Sistema ELO y Clasificación en Tiempo Real */}
        <EloRankingSection leaderboard={leaderboard} loading={loading} />

        {/* 5. Personajes de KASINO21 y Probador de Temas */}
        <CharactersShowcaseSection />

        {/* 6. Torneos 2.0, Misiones y Progresión */}
        <TournamentsAndQuestsSection
          events={events}
          onOpenSponsorModal={handleOpenSponsorModal}
        />

        {/* 7. Comunidad, Multiplataforma y CTA Final */}
        <CommunityAndCtaSection testimonials={testimonials} />

        {/* 8. Guías y Estrategia */}
        <BlogSection />

        {/* 9. Preguntas Frecuentes */}
        <FAQSection />

        {/* 10. Footer */}
        <Footer onOpenSponsorModal={handleOpenSponsorModal} />
      </main>

      {/* Mobile Play Dock fixed at bottom */}
      <MobilePlayDock onlineCount={stats.onlineNow} />

      {/* Modales */}
      {isSponsorModalOpen && (
        <SponsorModal
          isOpen={isSponsorModalOpen}
          onClose={handleCloseSponsorModal}
        />
      )}
    </div>
  );
}
