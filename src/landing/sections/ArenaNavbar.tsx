import React, { useState, useEffect, memo } from 'react';
import { Menu, X, Play, Download, Sparkles, BookOpen } from 'lucide-react';
import { useFocusTrap } from '../../web/hooks/useFocusTrap';

interface Props {
  scrollContainerRef?: React.RefObject<HTMLDivElement | null>;
  onlineCount?: number;
}

function ArenaNavbar({ scrollContainerRef, onlineCount = 28 }: Props) {
  const [isScrolled, setIsScrolled] = useState(false);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  const mobileNavTrapRef = useFocusTrap({
    isOpen: mobileMenuOpen,
    onClose: () => setMobileMenuOpen(false),
  });

  useEffect(() => {
    const target = scrollContainerRef?.current || window;
    const handleScroll = () => {
      const scrollY =
        target === window
          ? window.scrollY
          : (scrollContainerRef?.current?.scrollTop ?? 0);
      setIsScrolled(scrollY > 20);
    };

    target.addEventListener('scroll', handleScroll, { passive: true });
    return () => target.removeEventListener('scroll', handleScroll);
  }, [scrollContainerRef]);

  const navLinks = [
    { label: 'Mecánicas', href: '#mecanicas' },
    { label: 'Modos', href: '#modos' },
    { label: 'Ranking ELO', href: '#ranking' },
    { label: 'Personajes', href: '#personajes' },
    { label: 'Torneos 2.0', href: '#torneos' },
    { label: 'Reglas', href: '/como-jugar' },
  ];

  return (
    <header
      className={`fixed top-0 left-0 right-0 z-50 transition-all duration-300 ${
        isScrolled
          ? 'bg-[#050811]/90 backdrop-blur-md border-b border-white/[0.08] shadow-[0_4px_24px_rgba(0,0,0,0.7)] py-3'
          : 'bg-transparent py-4'
      }`}
    >
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 flex items-center justify-between">
        {/* Brand Logo & Live Status */}
        <div className="flex items-center gap-3 sm:gap-4">
          <a
            href="/"
            className="flex items-center gap-2.5 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-amber-400 rounded-lg p-1"
          >
            <img
              src="/brand21Icon.webp"
              alt="Logo de Kasino21"
              className="w-8 h-8 sm:w-9 sm:h-9 object-contain drop-shadow-[0_0_12px_rgba(251,191,36,0.35)]"
              onError={(e) => {
                // Fallback to png if webp fails
                e.currentTarget.src = '/brand21Icon.png';
              }}
            />
            <span className="font-['Russo_One'] text-xl sm:text-2xl text-white tracking-wider">
              KASINO<span className="text-amber-400">21</span>
            </span>
          </a>

          {/* Live Arena Status Pill */}
          <div className="hidden lg:flex items-center gap-2 px-2.5 py-1 rounded-full bg-emerald-500/10 border border-emerald-500/30 text-emerald-400 text-xs font-['Chakra_Petch'] font-semibold">
            <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" aria-hidden="true" />
            <span>{onlineCount} Jugando Ahora</span>
          </div>
        </div>

        {/* Desktop Navigation Links */}
        <nav aria-label="Navegación principal" className="hidden md:flex items-center gap-6 lg:gap-8">
          {navLinks.map((link) => (
            <a
              key={link.label}
              href={link.href}
              className="text-sm font-['Chakra_Petch'] font-bold text-gray-300 hover:text-amber-400 transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-amber-400 rounded px-1.5 py-0.5"
            >
              {link.label}
            </a>
          ))}
        </nav>

        {/* Action CTAs */}
        <div className="flex items-center gap-2 sm:gap-3">
          <a
            href="/casino21-mobile.apk"
            download
            className="hidden sm:inline-flex items-center gap-1.5 px-3 py-2 rounded-xl bg-white/[0.05] hover:bg-white/[0.1] border border-white/10 text-gray-200 hover:text-white text-xs font-['Chakra_Petch'] font-bold transition-all focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-amber-400"
            title="Descargar versión nativa para Android"
          >
            <Download size={14} aria-hidden="true" />
            <span>APK Android</span>
          </a>

          <a
            href="/login"
            className="inline-flex items-center gap-2 bg-gradient-to-r from-amber-400 to-yellow-500 hover:from-amber-300 hover:to-yellow-400 text-[#050811] px-4 sm:px-5 py-2 sm:py-2.5 rounded-xl font-['Russo_One'] text-xs sm:text-sm font-black tracking-wide shadow-[0_2px_15px_rgba(251,191,36,0.3)] hover:shadow-[0_4px_22px_rgba(251,191,36,0.45)] transition-all transform hover:scale-[1.02] active:scale-[0.98] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-amber-300"
          >
            <Play size={14} className="fill-current" aria-hidden="true" />
            <span>JUGAR GRATIS</span>
          </a>

          {/* Mobile Menu Toggle Button */}
          <button
            type="button"
            onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
            aria-expanded={mobileMenuOpen}
            aria-label="Abrir menú de navegación"
            className="md:hidden p-2 rounded-xl bg-white/[0.05] border border-white/10 text-gray-300 hover:text-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-amber-400"
          >
            {mobileMenuOpen ? <X size={20} /> : <Menu size={20} />}
          </button>
        </div>
      </div>

      {/* Mobile Drawer */}
      {mobileMenuOpen && (
        <div
          ref={mobileNavTrapRef}
          role="dialog"
          aria-modal="true"
          aria-label="Menú móvil"
          className="md:hidden fixed inset-x-0 top-[60px] bg-[#060a13]/98 border-b border-amber-500/20 backdrop-blur-2xl p-6 shadow-2xl space-y-4"
        >
          <div className="flex items-center gap-2 pb-3 border-b border-white/[0.06] text-xs font-['Chakra_Petch'] text-emerald-400">
            <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
            <span>{onlineCount} duelistas conectados en vivo</span>
          </div>

          <div className="flex flex-col space-y-3 font-['Chakra_Petch'] text-base font-bold">
            {navLinks.map((link) => (
              <a
                key={link.label}
                href={link.href}
                onClick={() => setMobileMenuOpen(false)}
                className="text-gray-200 hover:text-amber-400 py-1 transition-colors"
              >
                {link.label}
              </a>
            ))}
          </div>

          <div className="pt-4 border-t border-white/[0.06] flex flex-col gap-2.5">
            <a
              href="/casino21-mobile.apk"
              download
              onClick={() => setMobileMenuOpen(false)}
              className="flex items-center justify-center gap-2 py-3 rounded-xl bg-white/[0.06] border border-white/10 text-gray-200 font-['Chakra_Petch'] font-bold text-sm"
            >
              <Download size={16} /> Descargar APK Android Oficial
            </a>
            <a
              href="/login"
              onClick={() => setMobileMenuOpen(false)}
              className="flex items-center justify-center gap-2 py-3.5 rounded-xl bg-gradient-to-r from-amber-400 to-yellow-500 text-[#050811] font-['Russo_One'] font-black text-sm tracking-wide"
            >
              <Play size={16} className="fill-current" /> ENTRAR A LA ARENA
            </a>
          </div>
        </div>
      )}
    </header>
  );
}

export default memo(ArenaNavbar);
