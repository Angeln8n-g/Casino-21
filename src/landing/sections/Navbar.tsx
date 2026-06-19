import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import brand21Icon from '../../Public/brand21Icon-164.webp';

const NAV_LINKS = [
  { href: '#hero', label: 'JUGAR YA' },
  { href: '#demo', label: 'LOBBY' },
  { href: '#temas', label: 'CARTAS' },
  { href: '#competitivo', label: 'RANKINGS' },
  { href: '#temas', label: 'TIENDA' },
  { href: '#footer', label: 'SOPORTE' },
];

export default function Navbar() {
  const [menuOpen, setMenuOpen] = useState(false);
  const [hoveredLink, setHoveredLink] = useState<string | null>(null);

  return (
    <motion.nav
      initial={{ y: -50, opacity: 0 }}
      animate={{ y: 0, opacity: 1 }}
      transition={{ duration: 0.6, ease: 'easeOut' }}
      className="fixed top-4 left-4 right-4 z-50 max-w-6xl mx-auto bg-black/45 backdrop-blur-2xl border border-yellow-500/10 rounded-2xl shadow-[0_12px_40px_rgba(0,0,0,0.6)]"
    >
      <div className="px-5 py-3.5 flex items-center justify-between">
        {/* Logo */}
        <a href="/" className="flex items-center gap-3 group relative">
          <div className="relative">
            <img src={brand21Icon} alt="Kasino21" className="w-8 h-8 rounded-lg object-contain relative z-10" />
            <div className="absolute inset-0 bg-yellow-500/30 blur-md rounded-lg opacity-0 group-hover:opacity-100 transition-opacity duration-300" />
          </div>
          <span className="text-xl font-black font-['Russo_One'] tracking-wider drop-shadow-[0_0_8px_rgba(251,191,36,0.3)]">
            <span className="text-yellow-400">KASINO</span>
            <span className="text-cyan-400">21</span>
          </span>
        </a>

        {/* Desktop links */}
        <div className="hidden md:flex items-center gap-6">
          <div className="flex items-center gap-1 bg-white/[0.02] border border-white/[0.04] px-1.5 py-1 rounded-xl">
            {NAV_LINKS.map((link) => (
              <a
                key={link.href}
                href={link.href}
                className="relative text-gray-400 hover:text-white transition-colors duration-300 text-xs font-semibold font-['Chakra_Petch'] px-3 py-1.5 rounded-lg"
                onMouseEnter={() => setHoveredLink(link.href)}
                onMouseLeave={() => setHoveredLink(null)}
              >
                <span className="relative z-10">{link.label}</span>
                {hoveredLink === link.href && (
                  <motion.span
                    layoutId="navbar-hover"
                    className="absolute inset-0 bg-white/[0.05] border border-white/[0.04] rounded-lg z-0"
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    exit={{ opacity: 0 }}
                    transition={{ type: 'spring', stiffness: 350, damping: 30 }}
                  />
                )}
              </a>
            ))}
          </div>

          <a
            href="/login"
            className="relative overflow-hidden group border border-cyan-500/50 hover:border-cyan-400 bg-cyan-950/20 text-cyan-400 hover:text-white font-black px-6 py-2.5 rounded-xl hover:scale-105 transition-all duration-300 text-xs font-['Russo_One'] tracking-widest shadow-[0_0_15px_rgba(6,182,212,0.15)] hover:shadow-[0_0_25px_rgba(6,182,212,0.35)]"
          >
            {/* Shimmer sweep */}
            <span className="absolute inset-0 w-[50%] h-full bg-gradient-to-r from-transparent via-white/20 to-transparent -skew-x-12 translate-x-[-120%] group-hover:animate-[shimmer_1.5s_infinite_linear]" style={{ backgroundSize: '200% 100%' }} />
            LOGIN / REGISTRO
          </a>
        </div>

        {/* Mobile hamburger */}
        <button
          className="md:hidden text-white p-2 focus:outline-none hover:text-yellow-400 transition-colors"
          onClick={() => setMenuOpen(!menuOpen)}
          aria-label="Menú"
        >
          <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            {menuOpen ? (
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M6 18L18 6M6 6l12 12" />
            ) : (
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M4 6h16M4 12h16M4 18h16" />
            )}
          </svg>
        </button>
      </div>

      {/* Mobile menu */}
      <AnimatePresence>
        {menuOpen && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.3, ease: 'easeInOut' }}
            className="md:hidden border-t border-white/[0.06] px-5 py-4 space-y-3 bg-black/95 backdrop-blur-2xl rounded-b-2xl overflow-hidden"
          >
            {NAV_LINKS.map((link) => (
              <a
                key={link.href}
                href={link.href}
                className="block text-gray-400 hover:text-yellow-400 transition-colors duration-300 text-sm font-semibold font-['Chakra_Petch'] py-2 border-b border-white/[0.02]"
                onClick={() => setMenuOpen(false)}
              >
                {link.label}
              </a>
            ))}
            <a
              href="/login"
              className="block border border-cyan-500/50 bg-cyan-950/20 text-cyan-400 font-black text-center px-6 py-3 rounded-xl hover:scale-[1.02] active:scale-[0.98] transition-all duration-300 text-sm font-['Russo_One'] tracking-wider shadow-[0_4px_15px_rgba(6,182,212,0.15)]"
              onClick={() => setMenuOpen(false)}
            >
              LOGIN / REGISTRO
            </a>
          </motion.div>
        )}
      </AnimatePresence>
    </motion.nav>
  );
}
