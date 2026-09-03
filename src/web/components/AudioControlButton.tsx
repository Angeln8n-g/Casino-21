import React, { useEffect, useRef, useState } from 'react';
import { Volume2, VolumeX, SlidersHorizontal } from 'lucide-react';
import { useAudio } from '../hooks/useAudio';

interface AudioControlButtonProps {
  compact?: boolean;
  className?: string;
}

export function AudioControlButton({
  compact = false,
  className = '',
}: AudioControlButtonProps) {
  const { muted, volume, setMuted, toggleMuted, setVolume } = useAudio();
  const [isOpen, setIsOpen] = useState(false);
  const containerRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    const handlePointerDown = (event: MouseEvent) => {
      if (!containerRef.current?.contains(event.target as Node)) {
        setIsOpen(false);
      }
    };

    document.addEventListener('mousedown', handlePointerDown);
    return () => document.removeEventListener('mousedown', handlePointerDown);
  }, []);

  const currentPercent = Math.round(volume * 100);

  return (
    <div ref={containerRef} className={`relative ${className}`}>
      <div className="flex items-center gap-1.5 sm:gap-2">
        <button
          type="button"
          onClick={toggleMuted}
          className={`flex items-center justify-center border border-white/10 bg-white/5 text-gray-200 transition-all hover:border-amber-400/40 hover:text-white hover:bg-white/10 active:scale-95 ${
            compact ? 'w-7 h-7 sm:w-8 sm:h-8 rounded-lg' : 'w-10 h-10 md:w-auto md:px-3 md:py-2 rounded-2xl bg-black/40'
          }`}
          title={muted ? 'Activar audio' : 'Silenciar audio'}
          aria-label={muted ? 'Activar audio' : 'Silenciar audio'}
        >
          {muted || volume === 0 ? <VolumeX size={compact ? 15 : 18} /> : <Volume2 size={compact ? 15 : 18} />}
          {!compact && (
            <span className="hidden md:inline ml-2 text-[10px] font-black uppercase tracking-[0.24em]">
              {muted ? 'Off' : `Vol ${currentPercent}`}
            </span>
          )}
        </button>

        <button
          type="button"
          onClick={() => setIsOpen((current) => !current)}
          className={`items-center justify-center border border-white/10 bg-white/5 text-gray-400 hover:text-white hover:border-amber-400/30 transition-all active:scale-95 ${
            compact ? 'hidden md:flex w-7 h-7 sm:w-8 sm:h-8 rounded-lg' : 'flex w-10 h-10 md:w-auto md:px-3 md:py-2 rounded-2xl bg-black/40 text-[10px] font-black uppercase tracking-[0.24em]'
          }`}
          title="Ajustar volumen"
          aria-label="Ajustar volumen"
        >
          {compact ? (
            <SlidersHorizontal size={14} />
          ) : (
            <>
              <span className="hidden md:inline">Mezcla</span>
              <span className="inline md:hidden">
                <SlidersHorizontal size={16} />
              </span>
            </>
          )}
        </button>
      </div>

      {isOpen && (
        <div className="absolute right-0 top-[calc(100%+0.75rem)] z-[120] w-64 rounded-2xl border border-white/10 bg-slate-950/95 backdrop-blur-xl shadow-2xl p-4">
          <div className="flex items-center justify-between gap-3 mb-3">
            <div>
              <p className="text-[10px] uppercase tracking-[0.24em] font-black text-gray-500">Audio maestro</p>
              <p className="text-sm font-bold text-white">{muted ? 'Silenciado' : `${currentPercent}%`}</p>
            </div>
            <button
              type="button"
              onClick={toggleMuted}
              className={`px-3 py-1.5 rounded-full text-[10px] uppercase tracking-[0.2em] font-black border transition-all ${
                muted
                  ? 'bg-red-500/15 text-red-300 border-red-500/30'
                  : 'bg-emerald-500/15 text-emerald-300 border-emerald-500/30'
              }`}
            >
              {muted ? 'Audio Off' : 'Audio On'}
            </button>
          </div>

          <input
            type="range"
            min={0}
            max={100}
            value={currentPercent}
            onChange={(event) => {
              const nextValue = Number(event.target.value) / 100;
              setVolume(nextValue);
              if (nextValue === 0) {
                setMuted(true);
              } else if (muted) {
                setMuted(false);
              }
            }}
            className="w-full accent-yellow-400 cursor-pointer"
            aria-label="Volumen maestro"
          />

          <div className="mt-3 flex items-center justify-between text-[10px] font-bold uppercase tracking-[0.2em] text-gray-500">
            <span>Suave</span>
            <span>Intenso</span>
          </div>
        </div>
      )}
    </div>
  );
}
