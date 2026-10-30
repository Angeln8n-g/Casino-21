import React, { memo } from 'react';
import { Youtube, Instagram, ShieldCheck, Building2 } from 'lucide-react';
import brand21Icon from '../../Public/brand21Icon-164.webp';

interface Props {
  onOpenSponsorModal?: () => void;
}

const CONTENT_LINKS = [
  { href: '#mecanicas', label: 'Mecánicas' },
  { href: '#modos', label: 'Modos de Juego' },
  { href: '#ranking', label: 'Ranking ELO' },
  { href: '#personajes', label: 'Personajes' },
  { href: '#torneos', label: 'Torneos 2.0' },
  { href: '/como-jugar', label: 'Reglamento' },
  { href: '/blog', label: 'Blog' },
  { href: '/faq', label: 'FAQ' },
  { href: '/contact', label: 'Contacto' },
];

const LEGAL_LINKS = [
  { href: '/about', label: 'Sobre Nosotros' },
  { href: '/terms', label: 'Términos' },
  { href: '/privacy', label: 'Privacidad' },
  { href: '/cookies', label: 'Cookies' },
];

function Footer({ onOpenSponsorModal }: Props) {
  return (
    <footer className="border-t border-white/[0.08] py-14 px-4 sm:px-6 lg:px-8 bg-[#04060d] text-gray-300">
      <div className="max-w-7xl mx-auto flex flex-col items-center space-y-10">
        {/* Brand & Mission Statement */}
        <div className="flex flex-col items-center text-center space-y-2">
          <a href="/" className="flex items-center gap-2.5">
            <img
              src={brand21Icon}
              alt="Kasino21 Logo"
              className="w-8 h-8 object-contain"
              width={32}
              height={32}
            />
            <span className="font-['Russo_One'] text-2xl text-white tracking-wider">
              KASINO<span className="text-amber-400">21</span>
            </span>
          </a>
          <p className="text-xs sm:text-sm text-gray-400 font-['Chakra_Petch'] max-w-md">
            Videojuego competitivo de cartas multijugador online. Estrategia táctica de 21 sin apuestas con dinero real.
          </p>
        </div>

        {/* Main Nav Links Row */}
        <nav aria-label="Enlaces de navegación del pie" className="flex flex-wrap justify-center gap-x-6 gap-y-2.5 max-w-3xl">
          {CONTENT_LINKS.map((link) => (
            <a
              key={link.label}
              href={link.href}
              className="text-xs font-['Chakra_Petch'] font-bold text-gray-300 hover:text-amber-400 transition-colors uppercase tracking-wider py-1"
            >
              {link.label}
            </a>
          ))}
          {onOpenSponsorModal && (
            <button
              type="button"
              onClick={onOpenSponsorModal}
              className="text-xs font-['Chakra_Petch'] font-bold text-gray-400 hover:text-amber-400 transition-colors uppercase tracking-wider py-1 inline-flex items-center gap-1 cursor-pointer"
            >
              <Building2 size={12} />
              <span>Patrocinio</span>
            </button>
          )}
        </nav>

        {/* Social Networks Row */}
        <div className="flex items-center gap-4">
          <a
            href="https://www.youtube.com/@kasino21-game"
            target="_blank"
            rel="noopener noreferrer"
            aria-label="Canal oficial de YouTube de Kasino21 (@kasino21-game)"
            className="w-10 h-10 rounded-xl bg-white/[0.04] border border-white/10 flex items-center justify-center text-gray-300 hover:text-rose-400 hover:border-rose-400/40 transition-all"
          >
            <Youtube size={18} />
          </a>
          <a
            href="https://www.instagram.com/kasino21.game"
            target="_blank"
            rel="noopener noreferrer"
            aria-label="Perfil oficial de Instagram de Kasino21 (kasino21.game)"
            className="w-10 h-10 rounded-xl bg-white/[0.04] border border-white/10 flex items-center justify-center text-gray-300 hover:text-pink-400 hover:border-pink-400/40 transition-all"
          >
            <Instagram size={18} />
          </a>
        </div>

        {/* Divider */}
        <div className="w-full max-w-4xl h-px bg-white/[0.06]" />

        {/* Bottom Bar: Copyright & Legal */}
        <div className="flex flex-col sm:flex-row items-center justify-between w-full max-w-5xl text-center sm:text-left gap-4 text-xs font-['Chakra_Petch'] text-gray-400">
          <div className="flex items-center gap-2">
            <ShieldCheck size={14} className="text-emerald-400 flex-shrink-0" />
            <span>KASINO21 © {new Date().getFullYear()} · Todos los derechos reservados.</span>
          </div>

          <div className="flex flex-wrap items-center justify-center gap-4 text-gray-400">
            {LEGAL_LINKS.map((link) => (
              <a
                key={link.label}
                href={link.href}
                className="hover:text-white transition-colors"
              >
                {link.label}
              </a>
            ))}
          </div>
        </div>
      </div>
    </footer>
  );
}

export default memo(Footer);
