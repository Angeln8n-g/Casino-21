import React, { useState, useEffect } from 'react';
import { Zap, Calendar } from 'lucide-react';
import { calculateDynamicPot, parseLegacyCoinPool, TournamentFormat } from '../../../domain/tournament';

interface TournamentHeroProps {
  title: string;
  status: 'draft' | 'upcoming' | 'live' | 'completed';
  tournamentFormat?: TournamentFormat;
  startDate: string;
  endDate: string;
  prizePool: string;
  currentPrizeCoins?: number;
  guaranteedPrizeCoins?: number;
  entryPoolPercent?: number;
  entryFee: number;
  participantsCount: number;
  maxParticipants: number;
  imageUrl?: string;
  sponsorName?: string | null;
}

export function TournamentHero({
  title,
  status,
  tournamentFormat = 'scheduled',
  startDate,
  endDate,
  prizePool,
  currentPrizeCoins = 0,
  guaranteedPrizeCoins = 0,
  entryPoolPercent = 90,
  entryFee,
  participantsCount,
  maxParticipants,
  imageUrl,
  sponsorName,
}: TournamentHeroProps) {
  const [timeLeft, setTimeLeft] = useState('');

  useEffect(() => {
    if (tournamentFormat === 'sit_and_go' && status === 'upcoming') {
      setTimeLeft('Al completar cupos');
      return;
    }

    const updateCountdown = () => {
      const now = Date.now();
      const targetDate = status === 'live' ? endDate : startDate;
      const diffMs = new Date(targetDate).getTime() - now;

      if (diffMs <= 0 || status === 'completed') {
        setTimeLeft(status === 'live' ? 'En rondas finales' : 'Iniciando llaves...');
        return;
      }

      const totalSeconds = Math.floor(diffMs / 1000);
      const days = Math.floor(totalSeconds / 86400);
      const hours = Math.floor((totalSeconds % 86400) / 3600);
      const minutes = Math.floor((totalSeconds % 3600) / 60);
      const seconds = totalSeconds % 60;

      const parts = [];
      if (days > 0) parts.push(`${days}d`);
      parts.push(
        `${String(hours).padStart(2, '0')}:${String(minutes).padStart(2, '0')}:${String(seconds).padStart(2, '0')}`
      );
      setTimeLeft(parts.join(' '));
    };

    updateCountdown();
    const interval = setInterval(updateCountdown, 1000);
    return () => clearInterval(interval);
  }, [status, startDate, endDate, tournamentFormat]);

  const getStatusBadge = () => {
    switch (status) {
      case 'live':
        return (
          <span className="flex items-center gap-1.5 px-3 py-1 text-[10px] font-black uppercase tracking-wider rounded-full border border-red-500/50 bg-red-500/15 text-red-300">
            <span className="w-1.5 h-1.5 rounded-full bg-red-400 animate-ping" />
            EN VIVO
          </span>
        );
      case 'upcoming':
        return (
          <span className="flex items-center gap-1.5 px-3 py-1 text-[10px] font-black uppercase tracking-wider rounded-full border border-cyan-500/50 bg-cyan-500/15 text-cyan-300">
            <span className="w-1.5 h-1.5 rounded-full bg-cyan-400" />
            INSCRIPCIONES ABIERTAS
          </span>
        );
      default:
        return (
          <span className="flex items-center gap-1.5 px-3 py-1 text-[10px] font-black uppercase tracking-wider rounded-full border border-white/20 bg-white/10 text-slate-200">
            <span className="w-1.5 h-1.5 rounded-full bg-slate-300" />
            FINALIZADO
          </span>
        );
    }
  };

  const progressPercentage = Math.min((participantsCount / Math.max(1, maxParticipants)) * 100, 100);
  const resolvedPot =
    currentPrizeCoins > 0
      ? currentPrizeCoins
      : calculateDynamicPot(guaranteedPrizeCoins, entryFee, participantsCount, entryPoolPercent) ||
        parseLegacyCoinPool(prizePool);

  return (
    <div className="relative w-full overflow-hidden rounded-3xl border border-casino-gold/30 bg-gradient-to-br from-slate-950 via-slate-900 to-black p-6 md:p-8 shadow-gold-lg animate-fade-in">
      {imageUrl && (
        <div
          className="absolute inset-0 z-0 bg-cover bg-center opacity-15 mix-blend-overlay scale-105 pointer-events-none"
          style={{ backgroundImage: `url(${imageUrl})` }}
        />
      )}

      <div className="relative z-10 flex flex-col gap-5">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-center gap-2 flex-wrap">
            {tournamentFormat === 'sit_and_go' ? (
              <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[10px] font-black uppercase tracking-widest bg-casino-gold/15 text-casino-gold border border-casino-gold/30">
                <Zap className="w-3 h-3" />
                Sit &amp; Go Rápido
              </span>
            ) : (
              <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[10px] font-black uppercase tracking-widest bg-cyan-500/15 text-cyan-300 border border-cyan-400/30">
                <Calendar className="w-3 h-3" />
                Torneo Programado
              </span>
            )}
            {sponsorName && (
              <span className="px-2.5 py-1 rounded-full text-[10px] font-bold bg-white/10 text-white border border-white/15">
                Patrocina: {sponsorName}
              </span>
            )}
          </div>
          {getStatusBadge()}
        </div>

        <div>
          <h1 className="text-3xl md:text-5xl font-black font-display tracking-tight text-white mb-2 leading-tight">
            {title}
          </h1>
          {status !== 'completed' && (
            <p className="text-xs md:text-sm text-slate-300 font-medium">
              {status === 'live'
                ? 'Estado:'
                : tournamentFormat === 'sit_and_go'
                ? 'Inicio automático:'
                : 'Inicia en:'}{' '}
              <span className="font-mono text-casino-gold font-bold text-sm bg-black/50 px-2.5 py-0.5 rounded-lg border border-white/10 ml-1">
                {status === 'live' ? 'Partidas de llave en juego' : timeLeft}
              </span>
            </p>
          )}
        </div>

        {/* Stats Grid */}
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-4 mt-1">
          <div className="rounded-2xl bg-black/45 p-3.5 border border-casino-gold/25 flex flex-col justify-center">
            <span className="text-[10px] text-slate-300 font-bold uppercase tracking-wider mb-0.5">
              Pozo Acumulado
            </span>
            <div className="flex items-center gap-1.5">
              <span className="text-base">🪙</span>
              <span className="text-sm font-black text-casino-gold font-mono">
                {resolvedPot > 0 ? resolvedPot.toLocaleString('es-ES') : prizePool}
              </span>
            </div>
          </div>

          <div className="rounded-2xl bg-black/45 p-3.5 border border-white/10 flex flex-col justify-center">
            <span className="text-[10px] text-slate-300 font-bold uppercase tracking-wider mb-0.5">
              Entrada
            </span>
            <div className="flex items-center gap-1.5">
              <span className="text-sm">🪙</span>
              <span className="text-sm font-black text-white font-mono">
                {entryFee > 0 ? `${entryFee.toLocaleString('es-ES')}` : 'Gratis'}
              </span>
            </div>
          </div>

          <div className="rounded-2xl bg-black/45 p-3.5 border border-white/10 flex flex-col justify-center col-span-2">
            <div className="flex justify-between items-center mb-1.5">
              <span className="text-[10px] text-slate-300 font-bold uppercase tracking-wider">
                Cupos Confirmados
              </span>
              <span className="text-xs font-mono font-bold text-white">
                {participantsCount}/{maxParticipants}
              </span>
            </div>
            <div className="w-full h-2 bg-black/60 rounded-full overflow-hidden border border-white/10">
              <div
                className="h-full rounded-full bg-gradient-to-r from-casino-gold to-yellow-400 transition-all duration-700 ease-out"
                style={{ width: `${progressPercentage}%` }}
              />
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
