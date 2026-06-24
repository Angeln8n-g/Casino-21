import React from 'react';
import { Trophy } from 'lucide-react';
import TournamentCarousel from './TournamentCarousel';
import type { EventItem } from '../hooks/useLandingData';

interface Props {
  events: EventItem[];
  loading: boolean;
}

export default function TournamentsSection({ events, loading }: Props) {
  return (
    <section id="torneos" className="py-20 px-6 relative overflow-hidden bg-transparent">
      {/* Background decorations */}
      <div className="absolute inset-0 pointer-events-none">
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-96 h-96 bg-yellow-500/[0.015] rounded-full blur-3xl" />
      </div>

      <div className="max-w-4xl mx-auto relative z-10">
        {/* Section Header */}
        <div className="text-center mb-12">
          <div className="text-[10px] uppercase tracking-[0.25em] text-yellow-400 font-bold mb-2 font-['Chakra_Petch'] flex items-center justify-center gap-1.5">
            <Trophy size={10} /> Competencia Activa
          </div>
          <h2 className="text-3xl sm:text-4xl font-black font-['Russo_One'] text-white">
            Próximos <span className="text-transparent bg-clip-text bg-gradient-to-r from-yellow-400 to-yellow-600 neon-gold">Torneos</span> y Eventos
          </h2>
          <p className="text-gray-400 text-sm mt-3 font-['Chakra_Petch'] max-w-md mx-auto">
            Participa en eventos exclusivos, escala en las tablas y reclama recompensas legendarias.
          </p>
        </div>

        {/* Carousel Wrapper */}
        <div className="max-w-3xl mx-auto shadow-[0_12px_40px_rgba(0,0,0,0.5)]">
          {loading ? (
            <div className="h-[280px] bg-white/[0.02] border border-white/[0.06] rounded-2xl animate-pulse flex items-center justify-center">
              <span className="text-gray-500 font-['Chakra_Petch'] text-sm">Cargando eventos...</span>
            </div>
          ) : (
            <TournamentCarousel events={events} />
          )}
        </div>
      </div>
    </section>
  );
}
