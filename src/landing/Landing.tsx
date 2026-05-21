import React from 'react';
import Navbar from './sections/Navbar';
import ScrollVideo from './components/ScrollVideo';
import CompetitiveHub from './sections/CompetitiveHub';
import ContentCarousel from './sections/ContentCarousel';
import Footer from './sections/Footer';
import SocialBar from './components/SocialBar';
import AdBanner from './components/AdBanner';

export default function Landing() {
  return (
    <div className="h-full bg-[#0a0f1e] text-white overflow-x-hidden overflow-y-auto">
      <div className="crt-overlay" aria-hidden="true" />

      <div className="fixed inset-0 pointer-events-none">
        <div className="absolute top-0 left-1/4 w-96 h-96 bg-yellow-500/5 rounded-full blur-3xl" />
        <div className="absolute bottom-1/3 right-1/4 w-80 h-80 bg-purple-500/5 rounded-full blur-3xl" />
      </div>

      <Navbar />
      <SocialBar />

      <main className="pt-0">
        <ScrollVideo />
        <AdBanner />
        <CompetitiveHub />
        <ContentCarousel />
      </main>

      <Footer />
    </div>
  );
}
