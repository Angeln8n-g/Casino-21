import React, { useState, useEffect } from 'react';

interface TournamentHeroProps {
  title: string;
  status: 'draft' | 'upcoming' | 'live' | 'completed';
  startDate: string;
  endDate: string;
  prizePool: string;
  entryFee: number;
  participantsCount: number;
  maxParticipants: number;
  imageUrl?: string;
}

export function TournamentHero({
  title,
  status,
  startDate,
  endDate,
  prizePool,
  entryFee,
  participantsCount,
  maxParticipants,
  imageUrl,
}: TournamentHeroProps) {
  const [timeLeft, setTimeLeft] = useState('');

  useEffect(() => {
    const updateCountdown = () => {
      const now = Date.now();
      const targetDate = status === 'live' ? endDate : startDate;
      const diffMs = new Date(targetDate).getTime() - now;

      if (diffMs <= 0 || status === 'completed') {
        setTimeLeft(status === 'live' ? 'Finalizado' : 'Comenzando...');
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
  }, [status, startDate, endDate]);

  const getStatusBadge = () => {
    switch (status) {
      case 'live':
        return (
          <span className="flex items-center gap-1.5 px-3 py-1 text-[10px] font-black uppercase tracking-wider rounded-full border border-red-500/50 bg-red-500/10 text-red-400 shadow-[0_0_10px_rgba(239,68,68,0.3)] animate-pulse">
            <span className="w-1.5 h-1.5 rounded-full bg-red-500" />
            EN VIVO
          </span>
        );
      case 'upcoming':
        return (
          <span className="flex items-center gap-1.5 px-3 py-1 text-[10px] font-black uppercase tracking-wider rounded-full border border-cyan-500/50 bg-cyan-500/10 text-cyan-400 shadow-[0_0_10px_rgba(6,182,212,0.3)]">
            <span className="w-1.5 h-1.5 rounded-full bg-cyan-400" />
            PRÓXIMAMENTE
          </span>
        );
      default:
        return (
          <span className="flex items-center gap-1.5 px-3 py-1 text-[10px] font-black uppercase tracking-wider rounded-full border border-gray-500/50 bg-gray-500/10 text-gray-400">
            <span className="w-1.5 h-1.5 rounded-full bg-gray-500" />
            FINALIZADO
          </span>
        );
    }
  };

  const progressPercentage = Math.min((participantsCount / maxParticipants) * 100, 100);

  return (
    <div className="relative w-full overflow-hidden rounded-3xl border border-casino-gold/30 bg-gradient-to-br from-slate-950 via-slate-900 to-black p-6 md:p-8 shadow-gold-lg animate-fade-in">
      {/* Background Graphic Elements */}
      <div 
        className="absolute inset-0 z-0 bg-cover bg-center opacity-10 mix-blend-overlay scale-105 pointer-events-none"
        style={{ backgroundImage: `url(${imageUrl || 'https://images.unsplash.com/photo-1511512578047-dfb367046420?auto=format&fit=crop&q=80&w=1600'})` }}
      />
      <div className="absolute -top-12 -right-12 w-48 h-48 bg-casino-gold/5 rounded-full blur-3xl pointer-events-none" />
      <div className="absolute -bottom-16 -left-16 w-64 h-64 bg-purple-500/5 rounded-full blur-3xl pointer-events-none" />

      {/* Decorative Cards/Chips Art in bottom right (aesthetic touch) */}
      <div className="absolute right-6 bottom-4 opacity-15 hidden sm:block pointer-events-none select-none">
        <svg width="120" height="120" viewBox="0 0 100 100" fill="none" xmlns="http://www.w3.org/2000/svg" className="transform rotate-12">
          {/* Card 1 */}
          <rect x="10" y="20" width="40" height="60" rx="4" fill="url(#goldGradient)" stroke="#fbbf24" strokeWidth="0.5" transform="rotate(-15 10 20)"/>
          {/* Card 2 */}
          <rect x="40" y="15" width="40" height="60" rx="4" fill="url(#darkGradient)" stroke="#fbbf24" strokeWidth="0.5" transform="rotate(5 40 15)"/>
          {/* Chip */}
          <circle cx="75" cy="70" r="16" fill="#1e293b" stroke="#fbbf24" strokeWidth="2" strokeDasharray="4 2"/>
          <circle cx="75" cy="70" r="10" fill="#fbbf24"/>
          
          <defs>
            <linearGradient id="goldGradient" x1="10" y1="20" x2="50" y2="80" gradientUnits="userSpaceOnUse">
              <stop offset="0%" stopColor="#d97706" />
              <stop offset="50%" stopColor="#fbbf24" />
              <stop offset="100%" stopColor="#d97706" />
            </linearGradient>
            <linearGradient id="darkGradient" x1="40" y1="15" x2="80" y2="75" gradientUnits="userSpaceOnUse">
              <stop offset="0%" stopColor="#1e293b" />
              <stop offset="100%" stopColor="#0f172a" />
            </linearGradient>
          </defs>
        </svg>
      </div>

      {/* Main Content */}
      <div className="relative z-10 flex flex-col gap-6">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-center gap-2">
            <span className="text-xl">🏆</span>
            <span className="text-xs font-black uppercase tracking-widest text-casino-gold-light">Evento de Torneo</span>
          </div>
          {getStatusBadge()}
        </div>

        <div>
          <h1 className="text-3xl md:text-5xl font-black font-display tracking-tight text-transparent bg-clip-text bg-gradient-to-r from-white via-casino-gold-light to-casino-gold drop-shadow-sm mb-2 leading-none">
            {title}
          </h1>
          {status !== 'completed' && (
            <p className="text-xs md:text-sm text-gray-400 font-medium">
              {status === 'live' ? 'Termina en:' : 'Inicia en:'}{' '}
              <span className="font-mono text-casino-gold font-bold text-sm bg-black/30 px-2 py-0.5 rounded border border-white/5 ml-1.5 shadow-[0_0_10px_rgba(251,191,36,0.1)]">
                {timeLeft}
              </span>
            </p>
          )}
        </div>

        {/* Stats Grid */}
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-4 mt-2">
          {/* Prize */}
          <div className="glass-panel p-3 border-casino-gold/20 flex flex-col justify-center">
            <span className="text-[9px] text-gray-400 font-bold uppercase tracking-wider mb-0.5">Premio Principal</span>
            <div className="flex items-center gap-1.5">
              <span className="text-base">🪙</span>
              <span className="text-sm font-black text-casino-gold font-mono">{prizePool}</span>
            </div>
          </div>

          {/* Entry Fee */}
          <div className="glass-panel p-3 border-white/5 flex flex-col justify-center">
            <span className="text-[9px] text-gray-400 font-bold uppercase tracking-wider mb-0.5">Costo de Entrada</span>
            <div className="flex items-center gap-1.5">
              <span className="text-sm">🪙</span>
              <span className="text-sm font-black text-white font-mono">
                {entryFee > 0 ? `${entryFee} monedas` : 'Gratis'}
              </span>
            </div>
          </div>

          {/* Player Count */}
          <div className="glass-panel p-3 border-white/5 flex flex-col justify-center col-span-2 sm:col-span-2">
            <div className="flex justify-between items-center mb-1">
              <span className="text-[9px] text-gray-400 font-bold uppercase tracking-wider">Jugadores</span>
              <span className="text-xs font-mono font-bold text-white">
                {participantsCount}/{maxParticipants}
              </span>
            </div>
            <div className="w-full h-2 bg-black/40 rounded-full overflow-hidden border border-white/5">
              <div
                className="h-full rounded-full bg-gradient-to-r from-casino-gold to-yellow-400 transition-all duration-1000 ease-out"
                style={{ width: `${progressPercentage}%` }}
              />
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
