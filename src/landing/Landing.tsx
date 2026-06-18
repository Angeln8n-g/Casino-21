import React from 'react';
import { motion } from 'framer-motion';
import Navbar from './sections/Navbar';
import ScrollVideo from './components/ScrollVideo';
import MiniGameDemo from './components/MiniGameDemo';
import HowToPlay from './sections/HowToPlay';
import Features from './sections/Features';
import ThemesPreview from './components/ThemesPreview';
import CompetitiveHub from './sections/CompetitiveHub';
import ContentCarousel from './sections/ContentCarousel';
import SocialProof from './sections/SocialProof';
import Footer from './sections/Footer';
import SocialBar from './components/SocialBar';
import AdBanner from './components/AdBanner';
import { useLandingAds } from './hooks/useLandingAds';

const scrollRevealVariants = {
  hidden: { opacity: 0, y: 40 },
  visible: { 
    opacity: 1, 
    y: 0, 
    transition: { duration: 0.8, ease: 'easeOut' } 
  }
};

export default function Landing() {
  useLandingAds(false);

  return (
    <div className="h-full bg-[#020617] text-white overflow-x-hidden overflow-y-auto scroll-smooth">
      <div className="crt-overlay pointer-events-none" aria-hidden="true" />

      {/* Floating background ambient orbs */}
      <div className="fixed inset-0 pointer-events-none z-0">
        <div className="absolute top-0 left-1/4 w-96 h-96 bg-yellow-500/[0.02] rounded-full blur-3xl" />
        <div className="absolute bottom-1/3 right-1/4 w-80 h-80 bg-purple-500/[0.02] rounded-full blur-3xl" />
      </div>

      <Navbar />
      <SocialBar />

      <main className="pt-0 relative z-10">
        {/* Section 1: Hero Video */}
        <ScrollVideo />

        {/* Section 2: Interactive Demo */}
        <motion.div
          initial="hidden"
          whileInView="visible"
          viewport={{ once: true, margin: '-150px' }}
          variants={scrollRevealVariants}
        >
          <MiniGameDemo />
        </motion.div>

        {/* Section 3: How To Play */}
        <motion.div
          initial="hidden"
          whileInView="visible"
          viewport={{ once: true, margin: '-150px' }}
          variants={scrollRevealVariants}
        >
          <HowToPlay />
        </motion.div>

        {/* Section 4: Features */}
        <motion.div
          initial="hidden"
          whileInView="visible"
          viewport={{ once: true, margin: '-150px' }}
          variants={scrollRevealVariants}
        >
          <Features />
        </motion.div>

        {/* Section 5: Themes Customization */}
        <motion.div
          initial="hidden"
          whileInView="visible"
          viewport={{ once: true, margin: '-150px' }}
          variants={scrollRevealVariants}
        >
          <ThemesPreview />
        </motion.div>

        {/* Ad Banner (Promociones) */}
        <div className="py-6 bg-black/10">
          <AdBanner />
        </div>

        {/* Section 6: Rankings & Tournaments */}
        <motion.div
          initial="hidden"
          whileInView="visible"
          viewport={{ once: true, margin: '-150px' }}
          variants={scrollRevealVariants}
        >
          <CompetitiveHub />
        </motion.div>

        {/* Section 7: Content Carousel */}
        <motion.div
          initial="hidden"
          whileInView="visible"
          viewport={{ once: true, margin: '-150px' }}
          variants={scrollRevealVariants}
        >
          <ContentCarousel />
        </motion.div>

        {/* Section 8: Social Proof (Testimonials) */}
        <motion.div
          initial="hidden"
          whileInView="visible"
          viewport={{ once: true, margin: '-150px' }}
          variants={scrollRevealVariants}
        >
          <SocialProof />
        </motion.div>
      </main>

      <Footer />
    </div>
  );
}
