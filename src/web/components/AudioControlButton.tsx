import React, { useEffect, useRef, useState } from 'react';
import { Volume2, VolumeX, SlidersHorizontal, Music, Sparkles, Play, SkipForward } from 'lucide-react';
import { useAudio } from '../hooks/useAudio';
import { useMusic } from '../hooks/useMusic';

interface AudioControlButtonProps {
  compact?: boolean;
  className?: string;
}

export function AudioControlButton({
  compact = false,
  className = '',
}: AudioControlButtonProps) {
  const {
    sfxMuted,
    sfxVolume,
    setSfxMuted,
    toggleSfxMuted,
    setSfxVolume,
    musicEnabled,
    musicMuted,
    musicVolume,
    setMusicEnabled,
    toggleMusicEnabled,
    setMusicMuted,
    toggleMusicMuted,
    setMusicVolume,
    playSfx,
  } = useAudio();

  const {
    style,
    setStyle,
    currentTrackLabel,
    isPlaying,
    isInMatch,
    needsUserInteraction,
    skipTrack,
    activateMusic,
  } = useMusic();

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

  const musicPercent = Math.round((!musicEnabled || musicMuted ? 0 : musicVolume) * 100);
  const sfxPercent = Math.round((sfxMuted ? 0 : sfxVolume) * 100);
  const isAllSilent = (!musicEnabled || musicMuted || musicVolume === 0) && (sfxMuted || sfxVolume === 0);

  return (
    <div ref={containerRef} className={`relative ${className}`}>
      <div className="flex items-center gap-1.5 sm:gap-2">
        <button
          type="button"
          onClick={() => {
            if (needsUserInteraction) {
              activateMusic();
              return;
            }
            setIsOpen((current) => !current);
          }}
          className={`flex items-center justify-center border transition-all active:scale-95 ${
            needsUserInteraction
              ? 'border-cyan-400/50 bg-cyan-500/15 text-cyan-200 hover:bg-cyan-500/25 shadow-[0_0_16px_rgba(6,182,212,0.25)]'
              : 'border-white/10 bg-black/50 backdrop-blur-md text-gray-200 hover:border-amber-400/40 hover:text-white hover:bg-white/10'
          } ${
            compact
              ? 'w-8 h-8 rounded-xl'
              : 'h-10 px-3 rounded-2xl'
          }`}
          title="Configuración de Música y Efectos"
          aria-label="Configuración de Música y Efectos"
        >
          {isAllSilent ? (
            <VolumeX size={compact ? 15 : 17} className="text-red-400" />
          ) : (
            <Volume2 size={compact ? 15 : 17} className={isPlaying ? 'text-cyan-400' : 'text-amber-400'} />
          )}
          {!compact && (
            <span className="hidden md:inline ml-2 text-[10px] font-black uppercase tracking-[0.2em]">
              {needsUserInteraction ? 'Activar Audio' : 'Audio'}
            </span>
          )}
          {!compact && (
            <SlidersHorizontal size={13} className="hidden md:inline ml-2 text-slate-400" />
          )}
        </button>
      </div>

      {isOpen && (
        <div className="absolute right-0 top-[calc(100%+0.65rem)] z-[130] w-72 sm:w-80 rounded-2xl border border-white/15 bg-slate-950/95 backdrop-blur-2xl shadow-[0_20px_50px_rgba(0,0,0,0.75)] p-4 text-left space-y-4">
          {/* Aviso de Autoplay del navegador si aplica */}
          {needsUserInteraction && (
            <button
              type="button"
              onClick={activateMusic}
              className="w-full flex items-center justify-center gap-2 py-2.5 px-3 rounded-xl bg-cyan-500/20 hover:bg-cyan-500/30 border border-cyan-400/40 text-cyan-200 text-xs font-black uppercase tracking-wider transition-all"
            >
              <Play size={13} className="fill-current" />
              <span>Iniciar Música KASINO21</span>
            </button>
          )}

          {/* ─── SECCIÓN 1: MÚSICA (INDEPENDIENTE) ─── */}
          <div className="rounded-xl bg-white/[0.03] border border-white/[0.07] p-3 space-y-2.5">
            <div className="flex items-center justify-between gap-2">
              <div className="flex items-center gap-2 min-w-0">
                <button
                  type="button"
                  onClick={toggleMusicMuted}
                  disabled={!musicEnabled}
                  className={`w-7 h-7 rounded-lg flex items-center justify-center border transition-all ${
                    !musicEnabled || musicMuted
                      ? 'bg-red-500/15 border-red-500/30 text-red-400'
                      : 'bg-cyan-500/15 border-cyan-500/30 text-cyan-300 hover:bg-cyan-500/25'
                  }`}
                  title={musicMuted ? 'Quitar silencio de música' : 'Silenciar música'}
                  aria-label={musicMuted ? 'Quitar silencio de música' : 'Silenciar música'}
                >
                  {!musicEnabled || musicMuted ? <VolumeX size={14} /> : <Music size={14} />}
                </button>
                <div className="min-w-0">
                  <p className="text-[10px] uppercase tracking-[0.2em] font-black text-slate-400">
                    Música
                  </p>
                  <p className="text-xs font-bold text-white truncate">
                    {!musicEnabled
                      ? 'Desactivada'
                      : musicMuted
                        ? 'Silenciada'
                        : `${musicPercent}%`}
                  </p>
                </div>
              </div>

              <button
                type="button"
                onClick={toggleMusicEnabled}
                className={`px-2.5 py-1 rounded-full text-[10px] uppercase tracking-[0.16em] font-black border transition-all ${
                  musicEnabled
                    ? 'bg-emerald-500/15 text-emerald-300 border-emerald-500/35'
                    : 'bg-slate-800 text-slate-400 border-white/10'
                }`}
              >
                {musicEnabled ? 'Activa' : 'Off'}
              </button>
            </div>

            <input
              id="music-volume-slider"
              type="range"
              min={0}
              max={100}
              value={musicPercent}
              onChange={(event) => {
                const nextValue = Number(event.target.value) / 100;
                setMusicVolume(nextValue);
                if (nextValue === 0) {
                  setMusicMuted(true);
                } else {
                  if (!musicEnabled) setMusicEnabled(true);
                  if (musicMuted) setMusicMuted(false);
                }
              }}
              className="w-full accent-cyan-400 cursor-pointer h-1.5 bg-white/10 rounded-lg"
              aria-label="Volumen de música"
            />

            {!isInMatch && musicEnabled && (
              <div className="flex items-center justify-between gap-2 pt-1 border-t border-white/5">
                <span className="text-[10px] text-slate-400 truncate flex-1" title={currentTrackLabel}>
                  🎵 {currentTrackLabel}
                </span>
                <div className="flex items-center gap-1">
                  <button
                    type="button"
                    onClick={() => setStyle(style === 'modern' ? 'classic' : 'modern')}
                    className="px-2 py-0.5 rounded-md text-[9px] font-black uppercase tracking-wider bg-white/5 hover:bg-white/10 border border-white/10 text-slate-300"
                    title="Cambiar estilo musical"
                  >
                    {style === 'modern' ? 'Moderno' : 'Clásico'}
                  </button>
                  <button
                    type="button"
                    onClick={skipTrack}
                    className="w-6 h-6 rounded-md flex items-center justify-center bg-white/5 hover:bg-white/10 border border-white/10 text-slate-300 hover:text-white"
                    title="Siguiente pista"
                    aria-label="Siguiente pista"
                  >
                    <SkipForward size={11} />
                  </button>
                </div>
              </div>
            )}
          </div>

          {/* ─── SECCIÓN 2: EFECTOS DE SONIDO (INDEPENDIENTE) ─── */}
          <div className="rounded-xl bg-white/[0.03] border border-white/[0.07] p-3 space-y-2.5">
            <div className="flex items-center justify-between gap-2">
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={toggleSfxMuted}
                  className={`w-7 h-7 rounded-lg flex items-center justify-center border transition-all ${
                    sfxMuted || sfxPercent === 0
                      ? 'bg-red-500/15 border-red-500/30 text-red-400'
                      : 'bg-amber-500/15 border-amber-500/30 text-amber-300 hover:bg-amber-500/25'
                  }`}
                  title={sfxMuted ? 'Activar efectos de sonido' : 'Silenciar efectos de sonido'}
                  aria-label={sfxMuted ? 'Activar efectos de sonido' : 'Silenciar efectos de sonido'}
                >
                  {sfxMuted || sfxPercent === 0 ? <VolumeX size={14} /> : <Sparkles size={14} />}
                </button>
                <div>
                  <p className="text-[10px] uppercase tracking-[0.2em] font-black text-slate-400">
                    Efectos (SFX)
                  </p>
                  <p className="text-xs font-bold text-white">
                    {sfxMuted ? 'Silenciados' : `${sfxPercent}%`}
                  </p>
                </div>
              </div>

              <button
                type="button"
                onClick={() => {
                  toggleSfxMuted();
                  if (sfxMuted) {
                    window.setTimeout(() => playSfx('cardPlay', { volumeMultiplier: 0.6 }), 40);
                  }
                }}
                className={`px-2.5 py-1 rounded-full text-[10px] uppercase tracking-[0.16em] font-black border transition-all ${
                  !sfxMuted
                    ? 'bg-amber-500/15 text-amber-300 border-amber-500/35'
                    : 'bg-red-500/15 text-red-300 border-red-500/30'
                }`}
              >
                {sfxMuted ? 'SFX Off' : 'SFX On'}
              </button>
            </div>

            <input
              id="sfx-volume-slider"
              type="range"
              min={0}
              max={100}
              value={sfxPercent}
              onChange={(event) => {
                const nextValue = Number(event.target.value) / 100;
                setSfxVolume(nextValue);
                if (nextValue === 0) {
                  setSfxMuted(true);
                } else if (sfxMuted) {
                  setSfxMuted(false);
                }
              }}
              onMouseUp={() => {
                if (!sfxMuted) playSfx('cardPlay', { volumeMultiplier: 0.5 });
              }}
              onTouchEnd={() => {
                if (!sfxMuted) playSfx('cardPlay', { volumeMultiplier: 0.5 });
              }}
              className="w-full accent-amber-400 cursor-pointer h-1.5 bg-white/10 rounded-lg"
              aria-label="Volumen de efectos de sonido"
            />
          </div>
        </div>
      )}
    </div>
  );
}
