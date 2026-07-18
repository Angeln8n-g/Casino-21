import React from 'react';
import { TournamentMatch } from '../TournamentBracket';

interface EventData {
  id: string;
  title: string;
  description: string;
  rules: string;
  type: string;
  status: 'draft' | 'upcoming' | 'live' | 'completed';
  start_date: string;
  end_date: string;
  entry_fee: number;
  prize_pool: string;
  min_elo: number;
  participants_count: number;
  max_participants: number;
}

interface TournamentStatsProps {
  event?: EventData;
  matches: TournamentMatch[];
}

export function TournamentStats({ event, matches }: TournamentStatsProps) {
  if (!event) return null;

  const totalMatches = matches.length;
  const completedMatches = matches.filter(m => m.status === 'completed').length;
  const liveMatches = matches.filter(m => m.status === 'live').length;
  const pendingMatches = matches.filter(m => m.status === 'pending').length;

  const progressPercent = totalMatches > 0 ? Math.round((completedMatches / totalMatches) * 100) : 0;

  const formatDate = (dateStr: string) => {
    return new Date(dateStr).toLocaleDateString('es-ES', {
      day: 'numeric',
      month: 'short',
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 gap-6 animate-fade-in">
      {/* Rules and Description */}
      <div className="space-y-4">
        <div className="glass-panel p-5 border-white/5 bg-slate-900/40">
          <h4 className="text-xs font-black text-casino-gold uppercase tracking-widest mb-3">Descripción</h4>
          <p className="text-sm text-gray-300 font-medium leading-relaxed">
            {event.description || 'No hay descripción disponible para este torneo.'}
          </p>
        </div>

        <div className="glass-panel p-5 border-white/5 bg-slate-900/40">
          <h4 className="text-xs font-black text-casino-gold uppercase tracking-widest mb-3">Reglas Oficiales</h4>
          <p className="text-xs text-gray-400 font-medium leading-relaxed whitespace-pre-wrap">
            {event.rules || 'Formato de eliminación directa estándar de la Asociación de Kasino21.'}
          </p>
        </div>
      </div>

      {/* Stats and Info Grid */}
      <div className="space-y-4">
        {/* Event Stats Card */}
        <div className="glass-panel p-5 border-white/5 bg-slate-900/40">
          <h4 className="text-xs font-black text-casino-gold uppercase tracking-widest mb-4">
            Estadísticas de la Llave
          </h4>

          <div className="grid grid-cols-2 gap-4">
            <div className="bg-black/20 p-3 rounded-xl border border-white/5">
              <span className="text-[9px] text-gray-500 font-mono block uppercase">Total Partidos</span>
              <span className="text-lg font-black font-mono text-white">{totalMatches}</span>
            </div>
            <div className="bg-black/20 p-3 rounded-xl border border-white/5">
              <span className="text-[9px] text-gray-500 font-mono block uppercase">Completados</span>
              <span className="text-lg font-black font-mono text-casino-emerald">{completedMatches}</span>
            </div>
            <div className="bg-black/20 p-3 rounded-xl border border-white/5">
              <span className="text-[9px] text-gray-500 font-mono block uppercase">En Curso</span>
              <span className="text-lg font-black font-mono text-red-400 animate-pulse">{liveMatches}</span>
            </div>
            <div className="bg-black/20 p-3 rounded-xl border border-white/5">
              <span className="text-[9px] text-gray-500 font-mono block uppercase">Pendientes</span>
              <span className="text-lg font-black font-mono text-cyan-400">{pendingMatches}</span>
            </div>
          </div>

          <div className="mt-4 pt-4 border-t border-white/[0.04]">
            <div className="flex justify-between items-center text-xs font-bold text-gray-400 mb-1">
              <span>Progreso de la Llave</span>
              <span className="font-mono text-white">{progressPercent}%</span>
            </div>
            <div className="w-full h-1.5 bg-black/40 rounded-full overflow-hidden">
              <div
                className="h-full rounded-full bg-casino-emerald transition-all duration-700 ease-out"
                style={{ width: `${progressPercent}%` }}
              />
            </div>
          </div>
        </div>

        {/* Detailed Info Card */}
        <div className="glass-panel p-5 border-white/5 bg-slate-900/40">
          <h4 className="text-xs font-black text-casino-gold uppercase tracking-widest mb-4">Información Adicional</h4>
          
          <div className="space-y-3 text-xs">
            <div className="flex justify-between py-2 border-b border-white/[0.04]">
              <span className="text-gray-500 font-medium">Requisito ELO Mínimo</span>
              <span className="font-bold text-white font-mono">{event.min_elo || 'Sin requisito'}</span>
            </div>
            <div className="flex justify-between py-2 border-b border-white/[0.04]">
              <span className="text-gray-500 font-medium">Fecha de Inicio</span>
              <span className="font-bold text-white font-mono">{formatDate(event.start_date)}</span>
            </div>
            <div className="flex justify-between py-2 border-b border-white/[0.04]">
              <span className="text-gray-500 font-medium">Fecha de Cierre</span>
              <span className="font-bold text-white font-mono">{formatDate(event.end_date)}</span>
            </div>
            <div className="flex justify-between py-2">
              <span className="text-gray-500 font-medium">Tipo de Evento</span>
              <span className="font-bold text-casino-gold uppercase tracking-wider">{event.type}</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
