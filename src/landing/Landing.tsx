import React, { useCallback } from 'react';
import { motion } from 'framer-motion';
import Navbar from './sections/Navbar';
import HeroChampionship from './sections/HeroChampionship';
import LegendLeaderboard from './sections/LegendLeaderboard';
import RecentWinners from './sections/RecentWinners';
import HowItWorks from './sections/HowItWorks';
import BrandCTA from './sections/BrandCTA';
import FAQSection from './sections/FAQSection';
import Footer from './sections/Footer';

// Auxiliares y Modales
import LiveToastNotification from './components/LiveToastNotification';
import StickyMobileBar from './components/StickyMobileBar';
import Top100Modal from './components/Top100Modal';
import WinnersWallModal from './components/WinnersWallModal';
import SponsorModal from './components/SponsorModal';

import { useChampionshipLanding } from './hooks/useChampionshipLanding';

const scrollRevealVariants = {
  hidden: { opacity: 0, y: 20 },
  visible: { 
    opacity: 1, 
    y: 0, 
    transition: { duration: 0.5, ease: [0.16, 1, 0.3, 1] } 
  }
} as const;

export default function Landing() {
  const {
    prizePoolUsd,
    globalViews,
    activeLiveUsers,
    leaderboard,
    winners,
    activeToast,
    calculateProjection,
    // Modales
    isTop100Open,
    setIsTop100Open,
    isWinnersWallOpen,
    setIsWinnersWallOpen,
    isSponsorModalOpen,
    setIsSponsorModalOpen,
  } = useChampionshipLanding();

  const handleOpenTop100 = useCallback(() => setIsTop100Open(true), [setIsTop100Open]);
  const handleCloseTop100 = useCallback(() => setIsTop100Open(false), [setIsTop100Open]);

  const handleOpenWinnersWall = useCallback(() => setIsWinnersWallOpen(true), [setIsWinnersWallOpen]);
  const handleCloseWinnersWall = useCallback(() => setIsWinnersWallOpen(false), [setIsWinnersWallOpen]);

  const handleOpenSponsorModal = useCallback(() => setIsSponsorModalOpen(true), [setIsSponsorModalOpen]);
  const handleCloseSponsorModal = useCallback(() => setIsSponsorModalOpen(false), [setIsSponsorModalOpen]);

  return (
    <div 
      className="h-full text-white overflow-x-hidden overflow-y-auto scroll-smooth relative"
      style={{
        background: 'radial-gradient(circle at 50% 20%, #0c162c 0%, #020617 75%, #000000 100%)'
      }}
    >
      <div className="crt-overlay pointer-events-none z-40" aria-hidden="true" />

      {/* Floating background ambient grid & optimized GPU orbs */}
      <div className="fixed inset-0 pointer-events-none z-0 overflow-hidden">
        <div className="absolute inset-0 bg-[linear-gradient(rgba(255,255,255,0.012)_1px,transparent_1px),linear-gradient(90deg,rgba(255,255,255,0.012)_1px,transparent_1px)] bg-[size:36px_36px]" />

        {/* Ambient GPU-Accelerated Orbs */}
        <div className="absolute top-[10%] left-[10%] w-[380px] h-[380px] bg-yellow-500/[0.04] rounded-full blur-3xl animate-pulse-slow will-change-transform transform-gpu" />
        <div className="absolute top-[35%] right-[10%] w-[350px] h-[350px] bg-emerald-500/[0.03] rounded-full blur-3xl animate-pulse-slow will-change-transform transform-gpu" />
        <div className="absolute top-[60%] left-[15%] w-[380px] h-[380px] bg-blue-500/[0.03] rounded-full blur-3xl animate-pulse-slow will-change-transform transform-gpu" />
        <div className="absolute top-[85%] right-[15%] w-[350px] h-[350px] bg-amber-500/[0.025] rounded-full blur-3xl animate-pulse-slow will-change-transform transform-gpu" />
      </div>

      {/* Header Navigation */}
      <Navbar />

      {/* Main Content */}
      <main className="pt-0 relative z-10 pb-16 sm:pb-0">
        
        {/* BLOQUE 1: HERO - EL POZO EN VIVO */}
        <HeroChampionship 
          prizePoolUsd={prizePoolUsd}
          globalViews={globalViews}
          activeLiveUsers={activeLiveUsers}
        />

        {/* BLOQUE 2: TABLERO DE LEYENDAS - TOP 10 */}
        <motion.div
          initial="hidden"
          whileInView="visible"
          viewport={{ once: true, margin: '-60px' }}
          variants={scrollRevealVariants}
        >
          <LegendLeaderboard 
            leaderboard={leaderboard}
            onOpenTop100={handleOpenTop100}
            calculateProjection={calculateProjection}
          />
        </motion.div>

        {/* BLOQUE 3: GANADORES DE HOY */}
        <motion.div
          initial="hidden"
          whileInView="visible"
          viewport={{ once: true, margin: '-60px' }}
          variants={scrollRevealVariants}
        >
          <RecentWinners 
            winners={winners}
            onOpenWinnersWall={handleOpenWinnersWall}
          />
        </motion.div>

        {/* BLOQUE 4: ASÍ FUNCIONA EN 15 SEG */}
        <motion.div
          initial="hidden"
          whileInView="visible"
          viewport={{ once: true, margin: '-60px' }}
          variants={scrollRevealVariants}
        >
          <HowItWorks />
        </motion.div>

        {/* BLOQUE 5: CTA FINAL PARA MARCAS */}
        <motion.div
          initial="hidden"
          whileInView="visible"
          viewport={{ once: true, margin: '-60px' }}
          variants={scrollRevealVariants}
        >
          <BrandCTA 
            onOpenSponsorModal={handleOpenSponsorModal}
          />
        </motion.div>

        {/* Preguntas Frecuentes FAQ */}
        <motion.div
          initial="hidden"
          whileInView="visible"
          viewport={{ once: true, margin: '-60px' }}
          variants={scrollRevealVariants}
        >
          <FAQSection />
        </motion.div>

      </main>

      {/* Footer */}
      <Footer />

      {/* Notificaciones Toast Flotantes (Cada 35s) */}
      <LiveToastNotification toast={activeToast} />

      {/* Sticky Quick-Bar en Móviles */}
      <StickyMobileBar prizePoolUsd={prizePoolUsd} />

      {/* Modales Interactivos Renderizados Condicionalmente */}
      {isTop100Open && (
        <Top100Modal 
          isOpen={isTop100Open}
          onClose={handleCloseTop100}
          leaderboard={leaderboard}
          prizePoolUsd={prizePoolUsd}
        />
      )}

      {isWinnersWallOpen && (
        <WinnersWallModal 
          isOpen={isWinnersWallOpen}
          onClose={handleCloseWinnersWall}
          winners={winners}
        />
      )}

      {isSponsorModalOpen && (
        <SponsorModal 
          isOpen={isSponsorModalOpen}
          onClose={handleCloseSponsorModal}
        />
      )}

    </div>
  );
}

