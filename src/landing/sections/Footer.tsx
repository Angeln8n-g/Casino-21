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
      <section className="py-24 px-6 text-center">
        <div className="max-w-2xl mx-auto">
          <h2 className="text-4xl md:text-5xl font-black mb-4">
            ¿Listo para jugar?
          </h2>
          <p className="text-gray-400 text-lg mb-10">
            Crea tu cuenta gratis y empieza a subir en el ranking hoy mismo.
          </p>
          <a
            href="/login"
            className="inline-block bg-gradient-to-r from-yellow-500 to-yellow-400 text-black font-black text-xl px-14 py-5 rounded-2xl hover:scale-105 transition-transform shadow-[0_0_40px_rgba(234,179,8,0.25)]"
          >
            EMPEZAR AHORA — ES GRATIS
          </a>
        </div>
      </section>

      <footer className="border-t border-white/5 py-10 px-6">
        <div className="max-w-6xl mx-auto">
          {/* Content Links */}
          <div className="flex flex-wrap justify-center gap-x-6 gap-y-2 mb-6 text-sm">
            {CONTENT_LINKS.map((link) => (
              <a
                key={link.href}
                href={link.href}
                className="text-gray-400 hover:text-casino-gold transition-colors"
              >
                {link.label}
              </a>
            ))}
          </div>

          {/* Legal Links */}
          <div className="flex flex-wrap justify-center gap-x-6 gap-y-2 mb-6 text-xs text-gray-600">
            {LEGAL_LINKS.map((link) => (
              <a
                key={link.href}
                href={link.href}
                className="hover:text-gray-400 transition-colors"
              >
                {link.label}
              </a>
            ))}
          </div>

          {/* Copyright */}
          <div className="flex flex-col sm:flex-row items-center justify-center gap-4 text-gray-600 text-xs">
            <div className="flex items-center gap-2">
              <img src={brand21Icon} alt="Kasino21" className="w-5 h-5 rounded object-contain opacity-50" />
              <span className="font-black text-white/40">KASINO21</span>
            </div>
            <span>Juego de cartas competitivo online · {new Date().getFullYear()}</span>
          </div>
        </div>
      </footer>
    </>
  );
}
