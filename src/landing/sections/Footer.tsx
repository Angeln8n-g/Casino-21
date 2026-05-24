import React from 'react';
import brand21Icon from '../../Public/brand21Icon-164.webp';

const CONTENT_LINKS = [
  { href: '/blog', label: 'Blog' },
  { href: '/faq', label: 'FAQ' },
  { href: '/about', label: 'Sobre Nosotros' },
  { href: '/contact', label: 'Contacto' },
];

const LEGAL_LINKS = [
  { href: '/terms', label: 'Términos de Servicio' },
  { href: '/privacy', label: 'Política de Privacidad' },
  { href: '/cookies', label: 'Política de Cookies' },
  { href: '/como-jugar', label: 'Cómo Jugar' },
];

export default function Footer() {
  return (
    <>
      {/* CTA Section */}
      <section className="py-24 px-6 text-center relative overflow-hidden">
        <div className="absolute inset-0 pointer-events-none">
          <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[600px] bg-yellow-500/[0.03] rounded-full blur-3xl" />
        </div>
        <div className="max-w-2xl mx-auto relative z-10">
          <h2 className="text-4xl md:text-5xl font-black font-['Russo_One'] mb-4">
            ¿Listo para{' '}
            <span className="text-transparent bg-clip-text bg-gradient-to-r from-yellow-400 to-yellow-600 neon-gold">jugar</span>?
          </h2>
          <p className="text-gray-500 text-lg mb-10 font-['Chakra_Petch']">
            Crea tu cuenta gratis y empieza a subir en el ranking hoy mismo.
          </p>
          <a
            href="/login"
            className="inline-block bg-gradient-to-r from-yellow-500 to-yellow-400 text-black font-black text-xl px-14 py-5 rounded-2xl hover:scale-105 transition-transform duration-300 font-['Russo_One'] tracking-wider shadow-[0_0_40px_rgba(251,191,36,0.25)]"
          >
            EMPEZAR AHORA — ES GRATIS
          </a>
        </div>
      </section>

      <footer className="border-t border-white/[0.06] py-10 px-6">
        <div className="max-w-6xl mx-auto">
          {/* Content Links */}
          <div className="flex flex-wrap justify-center gap-x-8 gap-y-2 mb-6">
            {CONTENT_LINKS.map((link) => (
              <a
                key={link.href}
                href={link.href}
                className="text-gray-500 hover:text-yellow-400 transition-colors duration-300 text-sm font-['Chakra_Petch'] font-semibold"
              >
                {link.label}
              </a>
            ))}
          </div>

          {/* Legal Links */}
          <div className="flex flex-wrap justify-center gap-x-6 gap-y-2 mb-6">
            {LEGAL_LINKS.map((link) => (
              <a
                key={link.href}
                href={link.href}
                className="text-gray-600 hover:text-gray-400 transition-colors duration-300 text-xs font-['Chakra_Petch']"
              >
                {link.label}
              </a>
            ))}
          </div>

          {/* Divider */}
          <div className="w-px h-8 bg-gradient-to-b from-transparent via-white/[0.06] to-transparent mx-auto mb-6" />

          {/* Copyright */}
          <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
            <div className="flex items-center gap-2">
              <img src={brand21Icon} alt="Kasino21" className="w-5 h-5 rounded object-contain opacity-40" />
              <span className="font-black font-['Russo_One'] text-white/30">KASINO21</span>
            </div>
            <span className="text-gray-600 text-xs font-['Chakra_Petch']">
              Juego de cartas competitivo online · {new Date().getFullYear()}
            </span>
          </div>
        </div>
      </footer>
    </>
  );
}
