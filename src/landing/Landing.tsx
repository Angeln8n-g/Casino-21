import React from 'react';
import { motion } from 'framer-motion';
import Navbar from './sections/Navbar';
import ScrollVideo from './components/ScrollVideo';
import HowToPlay from './sections/HowToPlay';
import TournamentsSection from './sections/TournamentsSection';
import LeaderboardSection from './sections/LeaderboardSection';
import BlogSection from './sections/BlogSection';
import FAQSection from './sections/FAQSection';
import ContactSection from './sections/ContactSection';
import Footer from './sections/Footer';
import { useLandingData } from './hooks/useLandingData';

const scrollRevealVariants = {
  hidden: { opacity: 0, y: 40 },
  visible: { 
    opacity: 1, 
    y: 0, 
    transition: { duration: 0.8, ease: 'easeOut' } 
  }
} as const;

export default function Landing() {
  const { leaderboard, events, loading } = useLandingData();

  return (
    <div 
      className="h-full text-white overflow-x-hidden overflow-y-auto scroll-smooth relative"
      style={{
        background: 'radial-gradient(circle at 50% 30%, #0d1a30 0%, #020617 75%, #000000 100%)'
      }}
    >
      <div className="crt-overlay pointer-events-none z-40" aria-hidden="true" />

      {/* Floating background ambient grid & orbs */}
      <div className="fixed inset-0 pointer-events-none z-0">
        {/* Grid lines running continuously */}
        <div className="absolute inset-0 bg-[linear-gradient(rgba(255,255,255,0.012)_1px,transparent_1px),linear-gradient(90deg,rgba(255,255,255,0.012)_1px,transparent_1px)] bg-[size:36px_36px]" />

        {/* Ambient Pulsing Orbs */}
        <div className="absolute top-[10%] left-[10%] w-[500px] h-[500px] bg-yellow-500/[0.03] rounded-full blur-[130px] animate-pulse-slow" />
        <div className="absolute top-[35%] right-[10%] w-[450px] h-[450px] bg-cyan-500/[0.03] rounded-full blur-[130px] animate-pulse-slow" />
        <div className="absolute top-[60%] left-[15%] w-[500px] h-[500px] bg-purple-500/[0.025] rounded-full blur-[130px] animate-pulse-slow" />
        <div className="absolute top-[85%] right-[15%] w-[450px] h-[450px] bg-yellow-500/[0.02] rounded-full blur-[130px] animate-pulse-slow" />
      </div>

      <Navbar />

      <main className="pt-0 relative z-10">
        {/* Section 1: Hero Video (Minimalist Hero) */}
        <ScrollVideo />

        {/* Section 2: Cómo Jugar */}
        <motion.div
          initial="hidden"
          whileInView="visible"
          viewport={{ once: true, margin: '-150px' }}
          variants={scrollRevealVariants}
        >
          <HowToPlay />
        </motion.div>

        {/* Section 3: Torneos Activos */}
        <motion.div
          initial="hidden"
          whileInView="visible"
          viewport={{ once: true, margin: '-150px' }}
          variants={scrollRevealVariants}
        >
          <TournamentsSection 
            events={events}
            loading={loading}
          />
        </motion.div>

        {/* Section 4: Rankings */}
        <motion.div
          initial="hidden"
          whileInView="visible"
          viewport={{ once: true, margin: '-150px' }}
          variants={scrollRevealVariants}
        >
          <LeaderboardSection 
            leaderboard={leaderboard}
            loading={loading}
          />
        </motion.div>

        {/* Section 5: Blog */}
        <motion.div
          initial="hidden"
          whileInView="visible"
          viewport={{ once: true, margin: '-150px' }}
          variants={scrollRevealVariants}
        >
          <BlogSection />
        </motion.div>

        {/* Section 6: FAQ */}
        <motion.div
          initial="hidden"
          whileInView="visible"
          viewport={{ once: true, margin: '-150px' }}
          variants={scrollRevealVariants}
        >
          <FAQSection />
        </motion.div>

        {/* Section 7: Contacto */}
        <motion.div
          initial="hidden"
          whileInView="visible"
          viewport={{ once: true, margin: '-150px' }}
          variants={scrollRevealVariants}
        >
          <ContactSection />
        </motion.div>
      </main>

      <Footer />
    </div>
  );
}
