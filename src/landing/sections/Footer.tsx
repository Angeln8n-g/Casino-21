import React from 'react';
import brand21Icon from '../../Public/brand21Icon-164.webp';
import { Twitter, MessageSquare, Youtube, Instagram } from 'lucide-react';

const CONTENT_LINKS = [
  { href: '#como-jugar', label: 'Cómo Jugar' },
  { href: '#torneos', label: 'Torneos' },
  { href: '#rankings', label: 'Rankings' },
  { href: '#blog', label: 'Blog' },
  { href: '#faq', label: 'FAQ' },
  { href: '#contacto', label: 'Contacto' },
];

const LEGAL_LINKS = [
  { href: '/terms', label: 'Términos de Servicio' },
  { href: '/privacy', label: 'Política de Privacidad' },
  { href: '/cookies', label: 'Política de Cookies' },
];

const SOCIAL_LINKS = [
  { href: '', label: 'Twitter', icon: Twitter, color: 'hover:text-cyan-400 hover:shadow-[0_0_10px_rgba(6,182,212,0.5)]' },
  { href: '', label: 'Discord', icon: MessageSquare, color: 'hover:text-indigo-400 hover:shadow-[0_0_10px_rgba(129,140,248,0.5)]' },
  { href: 'https://www.youtube.com/channel/UCZR4qWuPq97Wx1gUufy2B_g', label: 'YouTube', icon: Youtube, color: 'hover:text-red-400 hover:shadow-[0_0_10px_rgba(248,113,113,0.5)]' },
  { href: 'https://www.instagram.com/kasino21.game/', label: 'Instagram', icon: Instagram, color: 'hover:text-pink-400 hover:shadow-[0_0_10px_rgba(244,114,182,0.5)]' },
];

export default function Footer() {
  return (
    <>
      {/* Compact CTA Section */}
      <section className="py-16 px-6 text-center relative overflow-hidden bg-black/20">
        <div className="absolute inset-0 pointer-events-none">
          <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[400px] h-[400px] bg-yellow-500/[0.02] rounded-full blur-3xl" />
        </div>
        <div className="max-w-xl mx-auto relative z-10">
          <h2 className="text-3xl md:text-4xl font-black font-['Russo_One'] mb-3">
            ¿Listo para{' '}
            <span className="text-transparent bg-clip-text bg-gradient-to-r from-yellow-400 to-yellow-600 neon-gold">jugar</span>?
          </h2>
          <p className="text-gray-500 text-sm mb-6 font-['Chakra_Petch']">
            Crea tu cuenta gratis y empieza a competir en la arena hoy mismo.
          </p>
          <a
            href="/login"
            className="inline-block bg-gradient-to-r from-yellow-500 to-yellow-400 text-black font-black text-sm px-10 py-4 rounded-xl hover:scale-105 transition-transform duration-300 font-['Russo_One'] tracking-wider shadow-[0_0_25px_rgba(251,191,36,0.2)]"
          >
            EMPEZAR AHORA — GRATIS
          </a>
        </div>
      </section>

      <footer className="border-t border-white/[0.06] py-12 px-6 bg-black/40">
        <div className="max-w-6xl mx-auto flex flex-col items-center">
          
          {/* Main Links Row */}
          <div className="flex flex-wrap justify-center gap-x-8 gap-y-3 mb-8">
            {CONTENT_LINKS.map((link) => (
              <a
                key={link.label}
                href={link.href}
                className="text-gray-400 hover:text-yellow-400 transition-colors duration-300 text-xs font-['Chakra_Petch'] font-bold uppercase tracking-wider"
              >
                {link.label}
              </a>
            ))}
          </div>

          {/* Social Icons Row */}
          <div className="flex items-center gap-5 mb-8">
            {SOCIAL_LINKS.map((social) => {
              const Icon = social.icon;
              return (
                <a
                  key={social.label}
                  href={social.href}
                  target="_blank"
                  rel="noopener noreferrer"
                  className={`w-10 h-10 rounded-xl bg-white/[0.02] border border-white/[0.06] flex items-center justify-center text-gray-400 transition-all duration-300 ${social.color}`}
                  aria-label={social.label}
                >
                  <Icon size={18} />
                </a>
              );
            })}
          </div>

          {/* Divider */}
          <div className="w-16 h-px bg-gradient-to-r from-transparent via-white/[0.1] to-transparent mb-8" />

          {/* Bottom info & Copyright */}
          <div className="flex flex-col md:flex-row items-center justify-between w-full max-w-4xl text-center md:text-left gap-4">
            
            {/* Logo */}
            <div className="flex items-center gap-2">
              <img src={brand21Icon} alt="Kasino21" className="w-5 h-5 rounded object-contain opacity-40" />
              <span className="font-black font-['Russo_One'] text-white/30 text-sm tracking-wider">KASINO21</span>
            </div>

            {/* Copyright */}
            <span className="text-gray-600 text-[10px] font-['Chakra_Petch'] uppercase tracking-wider">
              Juego de cartas competitivo online · {new Date().getFullYear()}
            </span>

            {/* Legal Links */}
            <div className="flex gap-4">
              {LEGAL_LINKS.map((link) => (
                <a
                  key={link.label}
                  href={link.href}
                  className="text-gray-500 hover:text-gray-400 transition-colors duration-300 text-[10px] font-['Chakra_Petch'] uppercase tracking-wider font-semibold"
                >
                  {link.label}
                </a>
              ))}
            </div>

          </div>

        </div>
      </footer>
    </>
  );
}
