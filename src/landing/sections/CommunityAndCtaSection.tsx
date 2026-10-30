import React, { memo } from 'react';
import type { TestimonialEntry } from '../hooks/useLandingData';
import { Globe, Smartphone, Play, Star, MessageSquare, Youtube, Instagram, ShieldCheck } from 'lucide-react';

interface Props {
  testimonials: TestimonialEntry[];
}

function CommunityAndCtaSection({ testimonials }: Props) {
  return (
    <section className="py-24 px-4 sm:px-6 lg:px-8 relative bg-[#050811]">
      <div className="max-w-7xl mx-auto space-y-20">
        {/* Play Anywhere: Web & PWA */}
        <div>
          <div className="text-left max-w-3xl mb-12">
            <h2 className="text-3xl sm:text-5xl font-black font-['Russo_One'] text-white tracking-tight">
              Juega donde quieras
            </h2>
            <p className="mt-3 text-base sm:text-lg text-gray-300 font-['Chakra_Petch'] leading-relaxed">
              KASINO21 está optimizado para funcionar con latencia ultrabaja en cualquier dispositivo directamente desde tu navegador web o instalable como PWA.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6 max-w-4xl">
            {/* Web Browser */}
            <div className="p-7 rounded-3xl bg-[#081020] border border-white/10 hover:border-amber-400/40 transition-colors space-y-4 flex flex-col justify-between">
              <div className="space-y-3">
                <div className="w-12 h-12 rounded-2xl bg-amber-400/10 border border-amber-400/30 flex items-center justify-center text-amber-400">
                  <Globe size={24} />
                </div>
                <h3 className="text-xl font-black font-['Russo_One'] text-white">
                  Navegador Web Instantáneo
                </h3>
                <p className="text-xs sm:text-sm text-gray-300 font-['Chakra_Petch'] leading-relaxed">
                  Entra directo desde Chrome, Safari, Firefox o Edge en PC o laptop. Sin instalaciones, sin registros obligatorios para probar y con pantalla completa fluida.
                </p>
              </div>

              <div className="pt-4 border-t border-white/[0.06]">
                <a
                  href="/login"
                  className="w-full inline-flex items-center justify-center gap-2 py-3 rounded-xl bg-amber-400 hover:bg-amber-300 text-[#050811] font-['Russo_One'] text-xs font-black tracking-wide transition-all"
                >
                  <Play size={14} className="fill-current" /> JUGAR EN NAVEGADOR
                </a>
              </div>
            </div>

            {/* Progressive Web App */}
            <div className="p-7 rounded-3xl bg-[#081020] border border-emerald-500/30 hover:border-emerald-400/60 transition-colors space-y-4 flex flex-col justify-between shadow-lg">
              <div className="space-y-3">
                <div className="w-12 h-12 rounded-2xl bg-emerald-500/10 border border-emerald-500/30 flex items-center justify-center text-emerald-400">
                  <Smartphone size={24} />
                </div>
                <h3 className="text-xl font-black font-['Russo_One'] text-white">
                  Web App Progresiva (PWA)
                </h3>
                <p className="text-xs sm:text-sm text-gray-300 font-['Chakra_Petch'] leading-relaxed">
                  En iPhone, iPad o Android pulsa "Compartir → Agregar a pantalla de inicio" para disfrutar de una experiencia fluida a pantalla completa idéntica a una aplicación instalada.
                </p>
              </div>

              <div className="pt-4 border-t border-white/[0.06]">
                <a
                  href="/login"
                  className="w-full inline-flex items-center justify-center gap-2 py-3 rounded-xl bg-emerald-400 hover:bg-emerald-300 text-[#050811] font-['Russo_One'] text-xs font-black tracking-wide transition-all"
                >
                  <Play size={14} className="fill-current" /> ABRIR EN MÓVIL / PWA
                </a>
              </div>
            </div>
          </div>
        </div>

        {/* Testimonials & Community Voice */}
        <div className="pt-10 border-t border-white/[0.06]">
          <div className="text-left max-w-3xl mb-12">
            <h2 className="text-3xl sm:text-4xl font-black font-['Russo_One'] text-white tracking-tight">
              Lo que dice la comunidad
            </h2>
            <p className="mt-2 text-sm sm:text-base text-gray-300 font-['Chakra_Petch']">
              Opiniones de jugadores y duelistas activos en los circuitos competitivos de KASINO21.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
            {testimonials.slice(0, 4).map((item, idx) => (
              <div
                key={`${item.name}-${idx}`}
                className="p-6 rounded-3xl bg-[#081020] border border-white/10 flex flex-col justify-between space-y-4"
              >
                <div className="space-y-3">
                  <div className="flex items-center justify-between">
                    <span className="px-2.5 py-0.5 rounded-full text-[10px] font-['Chakra_Petch'] font-bold uppercase bg-amber-400/10 text-amber-300 border border-amber-400/30">
                      {item.rank} · {item.elo} ELO
                    </span>
                    <div className="flex items-center text-amber-400">
                      {[...Array(item.rating)].map((_, i) => (
                        <Star key={i} size={13} className="fill-current" />
                      ))}
                    </div>
                  </div>

                  <p className="text-xs sm:text-sm text-gray-300 font-['Chakra_Petch'] italic leading-relaxed">
                    «{item.text}»
                  </p>
                </div>

                <div className="pt-3 border-t border-white/[0.06] font-['Chakra_Petch'] text-xs font-bold text-white">
                  {item.name}
                </div>
              </div>
            ))}
          </div>

          {/* Social Channels Strip */}
          <div className="mt-10 p-5 rounded-2xl bg-[#081020] border border-white/10 flex flex-wrap items-center justify-between gap-4 font-['Chakra_Petch']">
            <div className="flex items-center gap-3 text-xs sm:text-sm text-gray-300 font-bold">
              <MessageSquare size={18} className="text-amber-400" />
              <span>Únete a la conversación global y sigue los torneos en directo:</span>
            </div>

            <div className="flex items-center gap-4 text-xs font-bold">
              <a
                href="https://www.youtube.com/@kasino21-game"
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center gap-1.5 text-gray-300 hover:text-rose-400 transition-colors"
              >
                <Youtube size={16} /> YouTube @kasino21-game
              </a>
              <a
                href="https://www.instagram.com/kasino21.game"
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center gap-1.5 text-gray-300 hover:text-pink-400 transition-colors"
              >
                <Instagram size={16} /> Instagram @kasino21.game
              </a>
            </div>
          </div>
        </div>

        {/* Final Conversion Arena Banner */}
        <div className="rounded-3xl bg-gradient-to-r from-[#0c1830] via-[#091122] to-[#060b16] border border-amber-400/30 p-8 sm:p-14 text-center space-y-6 shadow-2xl relative overflow-hidden">
          <div className="max-w-2xl mx-auto space-y-4 relative z-10">
            <h2 className="text-3xl sm:text-5xl font-black font-['Russo_One'] text-white tracking-tight">
              ¿Listo para tu primer virado?
            </h2>

            <p className="text-sm sm:text-base text-gray-300 font-['Chakra_Petch'] leading-relaxed">
              Crea tu cuenta en segundos con tu correo electrónico. Sin costos ocultos, sin dinero real y con partidas disponibles las 24 horas del día.
            </p>

            <div className="pt-4 flex flex-wrap items-center justify-center gap-4">
              <a
                href="/login"
                className="inline-flex items-center justify-center gap-2.5 px-9 py-4 rounded-xl bg-gradient-to-r from-amber-400 to-yellow-500 hover:from-amber-300 hover:to-yellow-400 text-[#050811] font-['Russo_One'] font-black text-base tracking-wide shadow-[0_4px_30px_rgba(251,191,36,0.4)] transition-all transform hover:scale-105 active:scale-95"
              >
                <Play size={18} className="fill-current" /> JUGAR GRATIS AHORA
              </a>

              <a
                href="/como-jugar"
                className="inline-flex items-center justify-center gap-2 px-6 py-4 rounded-xl bg-white/[0.06] hover:bg-white/[0.1] border border-white/10 text-white font-['Chakra_Petch'] font-bold text-sm transition-all"
              >
                Repasar Reglas Oficiales
              </a>
            </div>

            <div className="pt-4 text-xs font-['Chakra_Petch'] text-gray-400 flex items-center justify-center gap-1.5">
              <ShieldCheck size={14} className="text-emerald-400" /> Juego 100% gratuito · Moneda virtual sin valor monetario
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}

export default memo(CommunityAndCtaSection);
