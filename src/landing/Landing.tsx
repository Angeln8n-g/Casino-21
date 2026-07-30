import React from 'react';
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
  hidden: { opacity: 0, y: 35 },
  visible: { 
    opacity: 1, 
    y: 0, 
    transition: { duration: 0.7, ease: 'easeOut' } 
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
    timeRemaining,
    calculateProjection,
    // Modales
    isTop100Open,
    setIsTop100Open,
    isWinnersWallOpen,
    setIsWinnersWallOpen,
    isSponsorModalOpen,
    setIsSponsorModalOpen,
  } = useChampionshipLanding();

  return (
    <div 
      className="h-full text-white overflow-x-hidden overflow-y-auto scroll-smooth relative"
      style={{
        background: 'radial-gradient(circle at 50% 20%, #0c162c 0%, #020617 75%, #000000 100%)'
      }}
    >
      <div className="crt-overlay pointer-events-none z-40" aria-hidden="true" />

      {/* Floating background ambient grid & orbs */}
      <div className="fixed inset-0 pointer-events-none z-0">
        <div className="absolute inset-0 bg-[linear-gradient(rgba(255,255,255,0.012)_1px,transparent_1px),linear-gradient(90deg,rgba(255,255,255,0.012)_1px,transparent_1px)] bg-[size:36px_36px]" />

        {/* Ambient Pulsing Orbs */}
        <div className="absolute top-[10%] left-[10%] w-[500px] h-[500px] bg-yellow-500/[0.045] rounded-full blur-[140px] animate-pulse-slow" />
        <div className="absolute top-[35%] right-[10%] w-[450px] h-[450px] bg-emerald-500/[0.035] rounded-full blur-[140px] animate-pulse-slow" />
        <div className="absolute top-[60%] left-[15%] w-[500px] h-[500px] bg-blue-500/[0.035] rounded-full blur-[140px] animate-pulse-slow" />
        <div className="absolute top-[85%] right-[15%] w-[450px] h-[450px] bg-amber-500/[0.03] rounded-full blur-[140px] animate-pulse-slow" />
      </div>

      {/* Header Navigation */}
      <Navbar />

      {/* Main Content - Estructura de 5 Bloques Requerida */}
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
          viewport={{ once: true, margin: '-100px' }}
          variants={scrollRevealVariants}
        >
          <LegendLeaderboard 
            leaderboard={leaderboard}
            timeRemaining={timeRemaining}
            onOpenTop100={() => setIsTop100Open(true)}
            calculateProjection={calculateProjection}
          />
        </motion.div>

        {/* BLOQUE 3: GANADORES DE HOY */}
        <motion.div
          initial="hidden"
          whileInView="visible"
          viewport={{ once: true, margin: '-100px' }}
          variants={scrollRevealVariants}
        >
          <RecentWinners 
            winners={winners}
            onOpenWinnersWall={() => setIsWinnersWallOpen(true)}
          />
        </motion.div>

        {/* BLOQUE 4: ASÍ FUNCIONA EN 15 SEG */}
        <motion.div
          initial="hidden"
          whileInView="visible"
          viewport={{ once: true, margin: '-100px' }}
          variants={scrollRevealVariants}
        >
          <HowItWorks />
        </motion.div>

        {/* BLOQUE 5: CTA FINAL PARA MARCAS */}
        <motion.div
          initial="hidden"
          whileInView="visible"
          viewport={{ once: true, margin: '-100px' }}
          variants={scrollRevealVariants}
        >
          <BrandCTA 
            onOpenSponsorModal={() => setIsSponsorModalOpen(true)}
          />
        </motion.div>

        {/* Preguntas Frecuentes FAQ */}
        <motion.div
          initial="hidden"
          whileInView="visible"
          viewport={{ once: true, margin: '-100px' }}
          variants={scrollRevealVariants}
        >
          <FAQSection />
        </motion.div>

      </main>

      {/* Footer */}
      <Footer />

      {/* Notificaciones Toast Flotantes (Cada 30s) */}
      <LiveToastNotification toast={activeToast} />

      {/* Sticky Quick-Bar en Móviles */}
      <StickyMobileBar prizePoolUsd={prizePoolUsd} />

      {/* Modales Interactivos */}
      <Top100Modal 
        isOpen={isTop100Open}
        onClose={() => setIsTop100Open(false)}
        leaderboard={leaderboard}
        prizePoolUsd={prizePoolUsd}
      />

      <WinnersWallModal 
        isOpen={isWinnersWallOpen}
        onClose={() => setIsWinnersWallOpen(false)}
        winners={winners}
      />

      <SponsorModal 
        isOpen={isSponsorModalOpen}
        onClose={() => setIsSponsorModalOpen(false)}
      />

    </div>
  );
}
