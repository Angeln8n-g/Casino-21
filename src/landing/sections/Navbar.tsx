import React, { useState } from 'react';
import brand21Icon from '../../Public/brand21Icon-164.webp';

const NAV_LINKS = [
  { href: '/blog', label: 'Blog' },
  { href: '/faq', label: 'FAQ' },
  { href: '/como-jugar', label: 'Cómo Jugar' },
  { href: '/about', label: 'Sobre Nosotros' },
  { href: '/contact', label: 'Contacto' },
];

export default function Navbar() {
  const [menuOpen, setMenuOpen] = useState(false);

  return (
    <nav className="fixed top-4 left-4 right-4 z-50 max-w-6xl mx-auto bg-black/50 backdrop-blur-xl border border-white/[0.08] rounded-2xl shadow-[0_8px_32px_rgba(0,0,0,0.4)]">
      <div className="px-5 py-3 flex items-center justify-between">
        {/* Logo */}
        <a href="/" className="flex items-center gap-3 group">
          <div className="relative">
            <img src={brand21Icon} alt="Kasino21" className="w-8 h-8 rounded-lg object-contain relative z-10" />
            <div className="absolute inset-0 bg-yellow-500/20 blur-md rounded-lg opacity-0 group-hover:opacity-100 transition-opacity duration-300" />
          </div>
          <span className="text-xl font-black font-['Russo_One'] text-transparent bg-clip-text bg-gradient-to-r from-yellow-400 to-yellow-600">
            KASINO21
          </span>
        </a>

        {/* Desktop links */}
        <div className="hidden md:flex items-center gap-5">
          {NAV_LINKS.map((link) => (
            <a
              key={link.href}
              href={link.href}
              className="text-gray-400 hover:text-yellow-400 transition-colors duration-300 text-sm font-semibold font-['Chakra_Petch']"
            >
              {link.label}
            </a>
          ))}
          <a
            href="/login"
            className="bg-gradient-to-r from-yellow-500 to-yellow-400 text-black font-black px-6 py-2.5 rounded-xl hover:scale-105 transition-transform duration-300 text-sm font-['Russo_One'] tracking-wider shadow-[0_0_20px_rgba(251,191,36,0.2)]"
          >
            JUGAR AHORA
          </a>
        </div>

        {/* Mobile hamburger */}
        <button
          className="md:hidden text-white p-2"
          onClick={() => setMenuOpen(!menuOpen)}
          aria-label="Menú"
        >
          <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            {menuOpen ? (
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            ) : (
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
            )}
          </svg>
        </button>
      </div>

      {/* Mobile menu */}
      {menuOpen && (
        <div className="md:hidden border-t border-white/[0.06] px-5 py-4 space-y-3 bg-black/90 backdrop-blur-xl rounded-b-2xl">
          {NAV_LINKS.map((link) => (
            <a
              key={link.href}
              href={link.href}
              className="block text-gray-400 hover:text-yellow-400 transition-colors duration-300 text-base font-semibold font-['Chakra_Petch'] py-2"
              onClick={() => setMenuOpen(false)}
            >
              {link.label}
            </a>
          ))}
          <a
            href="/login"
            className="block bg-gradient-to-r from-yellow-500 to-yellow-400 text-black font-black text-center px-6 py-3 rounded-xl hover:scale-105 transition-transform duration-300 text-sm font-['Russo_One'] tracking-wider"
            onClick={() => setMenuOpen(false)}
          >
            JUGAR AHORA
          </a>
        </div>
      )}
    </nav>
  );
}
