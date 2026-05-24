import { useState, useEffect, useCallback } from 'react';
import { ChevronLeft, ChevronRight, Users, Clock, Trophy, Sparkles } from 'lucide-react';
import type { EventItem } from '../hooks/useLandingData';

const ACCENTS = [
  { text: 'text-yellow-300', border: 'border-yellow-500/30', btn: 'bg-yellow-500/10 hover:bg-yellow-500/20 text-yellow-300', dot: 'bg-yellow-300', glow: 'from-yellow-400 to-yellow-600', bg: 'from-yellow-600/20 to-amber-900/20' },
  { text: 'text-violet-300', border: 'border-violet-500/30', btn: 'bg-violet-500/10 hover:bg-violet-500/20 text-violet-300', dot: 'bg-violet-300', glow: 'from-violet-400 to-purple-600', bg: 'from-violet-600/20 to-purple-900/20' },
  { text: 'text-cyan-300', border: 'border-cyan-500/30', btn: 'bg-cyan-500/10 hover:bg-cyan-500/20 text-cyan-300', dot: 'bg-cyan-300', glow: 'from-cyan-400 to-blue-600', bg: 'from-cyan-600/20 to-blue-900/20' },
  { text: 'text-rose-300', border: 'border-rose-500/30', btn: 'bg-rose-500/10 hover:bg-rose-500/20 text-rose-300', dot: 'bg-rose-300', glow: 'from-rose-400 to-red-600', bg: 'from-rose-600/20 to-red-900/20' },
];

const STATUS_LABELS: Record<string, string> = {
  upcoming: 'Próximo',
  live: 'En vivo',
  completed: 'Finalizado',
};

const TYPE_LABELS: Record<string, string> = {
  torneo: 'Torneo',
  liga: 'Liga',
  especial: 'Especial',
};

function CountdownTimer({ targetDate }: { targetDate: string }) {
  const [time, setTime] = useState({ d: 0, h: 0, m: 0, s: 0 });

  useEffect(() => {
    const update = () => {
      const diff = Math.max(0, new Date(targetDate).getTime() - Date.now());
      setTime({
        d: Math.floor(diff / 86400000),
        h: Math.floor((diff % 86400000) / 3600000),
        m: Math.floor((diff % 3600000) / 60000),
        s: Math.floor((diff % 60000) / 1000),
      });
    };
    update();
    const t = setInterval(update, 1000);
    return () => clearInterval(t);
  }, [targetDate]);

  return (
    <div className="flex gap-2 font-['Chakra_Petch']">
      {[{ v: time.d, l: 'Días' }, { v: time.h, l: 'Horas' }, { v: time.m, l: 'Min' }, { v: time.s, l: 'Seg' }].map((seg) => (
        <div key={seg.l} className="text-center">
          <div className="text-lg sm:text-xl font-black text-white">{String(seg.v).padStart(2, '0')}</div>
          <div className="text-[8px] uppercase tracking-wider text-gray-500">{seg.l}</div>
        </div>
      ))}
    </div>
  );
}

export default function TournamentCarousel({ events }: { events: EventItem[] }) {
  const [current, setCurrent] = useState(0);
  const [isPaused, setIsPaused] = useState(false);

  const items = events.slice(0, 6);
  const total = items.length;

  const next = useCallback(() => setCurrent((c) => (c + 1) % total), [total]);
  const prev = useCallback(() => setCurrent((c) => (c - 1 + total) % total), [total]);

  useEffect(() => {
    if (isPaused || total <= 1) return;
    const t = setInterval(next, 5000);
    return () => clearInterval(t);
  }, [isPaused, next, total]);

  if (total === 0) {
    return (
      <div className="border-cyber-strong bg-white/[0.02] rounded-2xl p-8 text-center">
        <p className="text-gray-500 text-sm font-['Chakra_Petch']">No hay eventos disponibles</p>
        <p className="text-gray-600 text-xs mt-1 font-['Chakra_Petch']">Vuelve pronto</p>
      </div>
    );
  }

  const e = items[current];
  const accent = ACCENTS[current % ACCENTS.length];
  const displayStatus = STATUS_LABELS[e.status] || e.status;
  const displayType = TYPE_LABELS[e.type] || e.type;

  return (
    <div
      className="relative overflow-hidden rounded-2xl border-cyber-strong bg-white/[0.02] group"
      onMouseEnter={() => setIsPaused(true)}
      onMouseLeave={() => setIsPaused(false)}
    >
      {/* Background gradient */}
      <div className={`absolute inset-0 bg-gradient-to-br ${accent.bg} transition-all duration-700`} />

      {/* Banner image or video fallback */}
      {e.image_url ? (
        <img
          src={e.image_url}
          alt={e.title}
          className="absolute inset-0 w-full h-full object-cover opacity-20"
          loading="lazy"
        />
      ) : (
        <video
          autoPlay
          muted
          loop
          playsInline
          className="absolute inset-0 w-full h-full object-cover opacity-15"
        >
          <source src="https://kasino21.com/storage/v1/object/public/Data/mp_.mp4" type="video/mp4" />
        </video>
      )}

      {/* Grid overlay */}
      <div className="absolute inset-0 bg-[linear-gradient(rgba(255,255,255,0.02)_1px,transparent_1px),linear-gradient(90deg,rgba(255,255,255,0.02)_1px,transparent_1px)] bg-[size:24px_24px]" />

      {/* Decorative rings */}
      <div className="absolute -top-20 -right-20 w-64 h-64 rounded-full border border-white/[0.03]" />
      <div className="absolute -bottom-20 -left-20 w-48 h-48 rounded-full border border-white/[0.03]" />

      <div className="relative p-6 sm:p-8">
        {/* Status + Type badges */}
        <div className="flex items-center gap-2 mb-3">
          <div className={`w-1.5 h-1.5 rounded-full ${accent.dot} animate-pulse`} />
          <span className={`text-[10px] uppercase tracking-[0.2em] font-bold font-['Chakra_Petch'] ${accent.text}`}>
            {displayStatus}
          </span>
          <span className="text-[10px] uppercase tracking-[0.2em] text-gray-500 border border-white/[0.06] px-2 py-0.5 rounded font-['Chakra_Petch']">
            {displayType}
          </span>
          {e.status === 'live' && <Sparkles size={12} className={accent.text} />}
        </div>

        <div className="flex flex-col sm:flex-row sm:items-end sm:justify-between gap-4 mb-6">
          <div>
            <h3 className="text-xl sm:text-2xl font-black font-['Russo_One'] text-white mb-1">
              {e.title}
            </h3>
            <p className="text-xs sm:text-sm text-gray-400 font-['Chakra_Petch'] line-clamp-2">
              {e.description}
            </p>
          </div>
          <div className={`text-3xl sm:text-4xl font-black font-['Russo_One'] bg-gradient-to-r ${accent.glow} bg-clip-text text-transparent`}>
            ${e.prize_pool}
          </div>
        </div>

        {/* Info row */}
        <div className="flex flex-wrap items-center gap-x-6 gap-y-2 mb-6 text-xs text-gray-400 font-['Chakra_Petch']">
          <div className="flex items-center gap-1.5">
            <Trophy size={14} className={accent.text} />
            <span className="text-white font-semibold">${e.prize_pool}</span>
            <span className="text-gray-500">en premios</span>
          </div>
          <div className="flex items-center gap-1.5">
            <Users size={14} className={accent.text} />
            <span className="text-white font-semibold">{e.participants_count}</span>
            <span className="text-gray-500">/ {e.max_participants} jugadores</span>
          </div>
          <div className="flex items-center gap-1.5">
            <Clock size={14} className={accent.text} />
            <CountdownTimer targetDate={e.start_date} />
          </div>
        </div>

        {/* CTA + Dots */}
        <div className="flex items-center justify-between gap-4">
          <a
            href="/login"
            className={`border-cyber text-xs px-5 py-2.5 rounded-xl font-bold transition-all duration-300 font-['Chakra_Petch'] uppercase tracking-wider cursor-pointer ${accent.btn}`}
          >
            {e.status === 'live' ? 'Jugar Ahora' : e.status === 'upcoming' ? 'Inscribirme' : 'Ver Detalles'}
          </a>

          {total > 1 && (
            <div className="flex items-center gap-3">
              <button
                onClick={prev}
                className="p-1.5 rounded-lg border border-white/[0.06] text-gray-500 hover:text-white hover:border-white/20 transition-all"
                aria-label="Anterior"
              >
                <ChevronLeft size={16} />
              </button>
              <div className="flex gap-1.5">
                {items.map((_, i) => (
                  <button
                    key={i}
                    onClick={() => setCurrent(i)}
                    className={`w-2 h-2 rounded-full transition-all duration-300 ${
                      i === current ? `${accent.dot} w-5` : 'bg-white/[0.12] hover:bg-white/[0.25]'
                    }`}
                    aria-label={`Slide ${i + 1}`}
                  />
                ))}
              </div>
              <button
                onClick={next}
                className="p-1.5 rounded-lg border border-white/[0.06] text-gray-500 hover:text-white hover:border-white/20 transition-all"
                aria-label="Siguiente"
              >
                <ChevronRight size={16} />
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
