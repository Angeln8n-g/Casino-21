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
    <nav className="fixed top-0 left-0 right-0 z-50 bg-black/40 backdrop-blur-md border-b border-white/5">
      <div className="max-w-6xl mx-auto px-6 py-3 flex items-center justify-between">
        {/* Logo */}
        <a href="/" className="flex items-center gap-3">
          <img src={brand21Icon} alt="Kasino21" className="w-8 h-8 rounded-lg object-contain" />
          <span className="text-2xl font-black text-transparent bg-clip-text bg-gradient-to-r from-yellow-400 to-yellow-600">
            KASINO21
          </span>
        </a>

        {/* Desktop links */}
        <div className="hidden md:flex items-center gap-6">
          {NAV_LINKS.map((link) => (
            <a
              key={link.href}
              href={link.href}
              className="text-gray-300 hover:text-casino-gold transition-colors text-sm font-semibold"
            >
              {link.label}
            </a>
          ))}
          <a
            href="/login"
            className="bg-gradient-to-r from-yellow-500 to-yellow-400 text-black font-black px-6 py-2 rounded-xl hover:scale-105 transition-transform text-sm"
          >
            JUGAR AHORA
          </a>
        </div>

        {/* Mobile hamburger */}
        <button
          className="md:hidden text-white p-2"
          onClick={() => setMenuOpen(!menuOpen)}
          aria-label="Men煤"
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
        <div className="md:hidden bg-black/90 backdrop-blur-lg border-t border-white/5 px-6 py-4 space-y-3">
          {NAV_LINKS.map((link) => (
            <a
              key={link.href}
              href={link.href}
              className="block text-gray-300 hover:text-casino-gold transition-colors text-base font-semibold py-2"
              onClick={() => setMenuOpen(false)}
            >
              {link.label}
            </a>
          ))}
          <a
            href="/login"
            className="block bg-gradient-to-r from-yellow-500 to-yellow-400 text-black font-black text-center px-6 py-3 rounded-xl hover:scale-105 transition-transform text-sm"
            onClick={() => setMenuOpen(false)}
          >
            JUGAR AHORA
          </a>
        </div>
      )}
    </nav>
  );
}
