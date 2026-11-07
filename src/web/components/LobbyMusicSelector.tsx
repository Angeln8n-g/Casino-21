'use client';

import React, { useState } from 'react';
import { useAudio } from '../hooks/useAudio';
import { useMusic, MusicStyle } from '../hooks/useMusic';
import {
  Music,
  Pause,
  Play,
  SkipForward,
  ChevronDown,
  ChevronUp,
  Volume2,
  VolumeX,
  Sparkles,
  Check,
} from 'lucide-react';

export function LobbyMusicSelector() {
  const {
    musicEnabled,
    musicMuted,
    musicVolume,
    setMusicEnabled,
    setMusicMuted,
    toggleMusicMuted,
    setMusicVolume,
    sfxMuted,
    sfxVolume,
    setSfxMuted,
    toggleSfxMuted,
    setSfxVolume,
    playSfx,
  } = useAudio();

  const {
    style,
    playlists,
    trackIndex,
    currentTrackLabel,
    isPlaying,
    needsUserInteraction,
    setStyle,
    selectTrack,
    skipTrack,
    togglePlayPause,
    activateMusic,
  } = useMusic();

  const [isExpanded, setIsExpanded] = useState(false);

  const currentTracks = playlists[style] || [];
  const displayMusicVol = !musicEnabled || musicMuted ? 0 : musicVolume;
  const displaySfxVol = sfxMuted ? 0 : sfxVolume;

  const handleStyleChange = (newStyle: MusicStyle) => {
    if (newStyle === style) return;
    playSfx('cardPlay', { volumeMultiplier: 0.5 });
    setStyle(newStyle);
  };

  return (
    <div className="relative w-full select-none">
      {/* ─── Cápsula Compacta Principal ─── */}
      <div className="w-full flex items-center gap-2">
        <button
          type="button"
          onClick={() => setIsExpanded((prev) => !prev)}
          className="flex-1 flex items-center justify-between gap-3 px-4 py-3 rounded-2xl border border-white/10 bg-black/45 backdrop-blur-xl hover:bg-black/55 hover:border-white/20 active:scale-[0.99] transition-all duration-300 shadow-[0_4px_24px_rgba(0,0,0,0.3)] group min-w-0"
        >
          <div className="flex items-center gap-3 min-w-0">
            <div
              className={`w-8 h-8 rounded-lg flex items-center justify-center border transition-all duration-500 shrink-0 ${
                isPlaying
                  ? style === 'classic'
                    ? 'bg-amber-500/20 border-amber-500/40 shadow-[0_0_10px_rgba(245,158,11,0.3)]'
                    : 'bg-cyan-500/20 border-cyan-500/40 shadow-[0_0_10px_rgba(6,182,212,0.3)]'
                  : 'bg-white/5 border-white/10'
              }`}
            >
              <Music
                size={14}
                className={`transition-colors duration-500 ${
                  isPlaying
                    ? style === 'classic'
                      ? 'text-amber-400'
                      : 'text-cyan-400'
                    : 'text-gray-400 group-hover:text-gray-300'
                }`}
              />
            </div>
            <div className="text-left min-w-0">
              <p className="text-[9px] uppercase tracking-[0.2em] font-black text-gray-500 leading-tight">
                Identidad Sonora KASINO21
              </p>
              <p className="text-xs font-bold text-gray-200 truncate leading-normal">
                {needsUserInteraction
                  ? 'Toca para iniciar música'
                  : !musicEnabled
                    ? 'Música desactivada'
                    : musicMuted
                      ? 'Música silenciada'
                      : currentTrackLabel}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2 text-gray-400 group-hover:text-gray-300 shrink-0">
            {isPlaying && (
              <div className="flex items-end gap-[2px] h-3 px-1">
                {[...Array(4)].map((_, i) => (
                  <div
                    key={i}
                    className={`w-[2px] rounded-full transition-colors duration-500 ${
                      style === 'classic' ? 'bg-amber-400/80' : 'bg-cyan-400/80'
                    }`}
                    style={{
                      animation: `lobbyMusicBarMini 1.0s ease-in-out ${i * 0.15}s infinite alternate`,
                      height: '2px',
                    }}
                  />
                ))}
              </div>
            )}
            {isExpanded ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
          </div>
        </button>

        {/* Botón directo de Play/Activar en la barra compacta */}
        <button
          type="button"
          onClick={needsUserInteraction ? activateMusic : togglePlayPause}
          className={`h-12 w-12 shrink-0 rounded-2xl border flex items-center justify-center transition-all active:scale-95 ${
            needsUserInteraction
              ? 'bg-cyan-500/20 border-cyan-400/50 text-cyan-300 animate-pulse shadow-[0_0_18px_rgba(6,182,212,0.3)]'
              : isPlaying
                ? 'bg-black/45 border-white/15 text-white hover:bg-white/10'
                : 'bg-black/45 border-white/10 text-gray-400 hover:text-white hover:border-white/20'
          }`}
          title={
            needsUserInteraction
              ? 'Activar música'
              : isPlaying
                ? 'Pausar música'
                : 'Activar música'
          }
          aria-label={isPlaying ? 'Pausar música' : 'Activar música'}
        >
          {isPlaying ? <Pause size={15} /> : <Play size={15} className="ml-0.5" />}
        </button>
      </div>

      {/* ─── Panel Expandible de Configuración Completa ─── */}
      {isExpanded && (
        <div className="absolute z-50 left-0 right-0 mt-2 overflow-hidden rounded-2xl border border-white/15 bg-slate-950/95 backdrop-blur-2xl shadow-[0_16px_48px_rgba(0,0,0,0.75)] p-4 animate-slide-down">
          <div
            className={`absolute -top-20 -right-20 w-40 h-40 rounded-full blur-3xl pointer-events-none transition-colors duration-1000 ${
              style === 'classic' ? 'bg-amber-500/10' : 'bg-cyan-500/10'
            }`}
          />

          <div className="relative z-10 flex flex-col gap-3.5">
            {needsUserInteraction && (
              <button
                type="button"
                onClick={activateMusic}
                className="w-full py-2.5 px-3 rounded-xl bg-cyan-500/20 hover:bg-cyan-500/30 border border-cyan-400/40 text-cyan-200 text-xs font-black uppercase tracking-wider flex items-center justify-center gap-2 transition-all"
              >
                <Play size={13} className="fill-current" />
                <span>Activar música ahora</span>
              </button>
            )}

            {/* Controles de Reproducción & Siguiente Pista */}
            <div className="flex items-center justify-between gap-3">
              <div className="min-w-0">
                <p className="text-[10px] uppercase tracking-[0.2em] font-black text-gray-400">
                  Estilo:{' '}
                  <span className={style === 'classic' ? 'text-amber-400' : 'text-cyan-400'}>
                    {style === 'classic' ? 'Clásico' : 'Competitivo'}
                  </span>
                </p>
                <p className="text-xs font-bold text-white truncate max-w-[200px]">
                  {musicEnabled ? currentTrackLabel : 'Música desactivada'}
                </p>
              </div>

              <div className="flex items-center gap-1.5 shrink-0">
                <button
                  type="button"
                  onClick={togglePlayPause}
                  className={`px-2.5 h-8 rounded-lg flex items-center gap-1.5 border text-[10px] font-black uppercase tracking-wider transition-all duration-300 active:scale-95 ${
                    musicEnabled && !musicMuted
                      ? 'bg-emerald-500/15 border-emerald-500/35 text-emerald-300 hover:bg-emerald-500/25'
                      : 'bg-white/5 border-white/15 text-gray-300 hover:bg-white/10'
                  }`}
                >
                  {musicEnabled && !musicMuted ? <Pause size={11} /> : <Play size={11} />}
                  <span>{musicEnabled && !musicMuted ? 'On' : 'Off'}</span>
                </button>

                <button
                  type="button"
                  onClick={skipTrack}
                  className="w-8 h-8 rounded-lg flex items-center justify-center border border-white/10 bg-white/5 text-gray-300 hover:text-white hover:bg-white/10 hover:border-white/20 transition-all duration-300 active:scale-95"
                  title="Siguiente pista"
                  aria-label="Siguiente pista"
                >
                  <SkipForward size={12} />
                </button>
              </div>
            </div>

            {/* Onda Sonora Animada */}
            {isPlaying && (
              <div className="flex items-end justify-center gap-[3px] h-5 my-0.5">
                {[...Array(16)].map((_, i) => (
                  <div
                    key={i}
                    className={`w-[3px] rounded-full transition-colors duration-500 ${
                      style === 'classic'
                        ? 'bg-gradient-to-t from-amber-500/60 to-amber-400/90'
                        : 'bg-gradient-to-t from-cyan-500/60 to-cyan-400/90'
                    }`}
                    style={{
                      animation: `lobbyMusicBar 1.2s ease-in-out ${i * 0.08}s infinite alternate`,
                      height: '4px',
                    }}
                  />
                ))}
              </div>
            )}

            {/* Selector de Estilo */}
            <div className="grid grid-cols-2 gap-2">
              <button
                type="button"
                onClick={() => handleStyleChange('modern')}
                className={`relative overflow-hidden rounded-xl py-2 px-3 border text-center transition-all duration-300 group ${
                  style === 'modern'
                    ? 'bg-cyan-500/15 border-cyan-500/40 shadow-[0_0_12px_rgba(6,182,212,0.12)]'
                    : 'bg-white/[0.03] border-white/[0.08] hover:bg-white/[0.06] hover:border-cyan-500/20'
                }`}
              >
                <div className="relative z-10">
                  <span className="text-base block mb-0.5">⚡</span>
                  <span
                    className={`text-[10px] font-black uppercase tracking-[0.12em] ${
                      style === 'modern' ? 'text-cyan-400' : 'text-gray-400'
                    }`}
                  >
                    Competitivo
                  </span>
                </div>
              </button>

              <button
                type="button"
                onClick={() => handleStyleChange('classic')}
                className={`relative overflow-hidden rounded-xl py-2 px-3 border text-center transition-all duration-300 group ${
                  style === 'classic'
                    ? 'bg-amber-500/15 border-amber-500/40 shadow-[0_0_12px_rgba(245,158,11,0.12)]'
                    : 'bg-white/[0.03] border-white/[0.08] hover:bg-white/[0.06] hover:border-amber-500/20'
                }`}
              >
                <div className="relative z-10">
                  <span className="text-base block mb-0.5">🎻</span>
                  <span
                    className={`text-[10px] font-black uppercase tracking-[0.12em] ${
                      style === 'classic' ? 'text-amber-400' : 'text-gray-400'
                    }`}
                  >
                    Clásico
                  </span>
                </div>
              </button>
            </div>

            {/* Selector de Pista */}
            {currentTracks.length > 0 && (
              <div className="space-y-1 max-h-32 overflow-y-auto pr-1 custom-scrollbar">
                {currentTracks.map((track, idx) => {
                  const selected = idx === trackIndex;
                  return (
                    <button
                      key={track.id}
                      type="button"
                      onClick={() => selectTrack(idx)}
                      className={`w-full flex items-center justify-between px-2.5 py-1.5 rounded-lg border text-left transition-all ${
                        selected
                          ? style === 'classic'
                            ? 'bg-amber-500/15 border-amber-500/35 text-white'
                            : 'bg-cyan-500/15 border-cyan-500/35 text-white'
                          : 'bg-white/[0.02] border-white/[0.06] text-gray-400 hover:text-white hover:bg-white/[0.05]'
                      }`}
                    >
                      <span className="text-[11px] font-bold truncate pr-2">
                        {idx + 1}. {track.label}
                      </span>
                      {selected ? (
                        <Check
                          size={12}
                          className={style === 'classic' ? 'text-amber-400 shrink-0' : 'text-cyan-400 shrink-0'}
                        />
                      ) : (
                        <Play size={10} className="text-gray-500 shrink-0" />
                      )}
                    </button>
                  );
                })}
              </div>
            )}

            {/* Control Independiente 1: Volumen de Música */}
            <div className="pt-2 border-t border-white/10 space-y-2.5">
              <div className="space-y-1">
                <div className="flex items-center justify-between text-[10px] font-black uppercase tracking-wider text-gray-400">
                  <span>Volumen Música</span>
                  <span>{Math.round(displayMusicVol * 100)}%</span>
                </div>
                <div className="flex items-center gap-2.5">
                  <button
                    type="button"
                    onClick={toggleMusicMuted}
                    className={`w-7 h-7 rounded-lg flex items-center justify-center border transition-all shrink-0 ${
                      !musicEnabled || musicMuted
                        ? 'bg-red-500/10 border-red-500/30 text-red-400'
                        : style === 'classic'
                          ? 'bg-amber-500/10 border-amber-500/20 text-amber-400 hover:bg-amber-500/20'
                          : 'bg-cyan-500/10 border-cyan-500/20 text-cyan-400 hover:bg-cyan-500/20'
                    }`}
                    title={musicMuted ? 'Quitar silencio de música' : 'Silenciar música'}
                  >
                    {!musicEnabled || musicMuted ? <VolumeX size={13} /> : <Volume2 size={13} />}
                  </button>

                  <input
                    type="range"
                    min="0"
                    max="1"
                    step="0.01"
                    aria-label="Volumen de música"
                    value={displayMusicVol}
                    onChange={(e) => {
                      const v = Number(e.target.value);
                      setMusicVolume(v);
                      if (v === 0) {
                        setMusicMuted(true);
                      } else {
                        if (!musicEnabled) setMusicEnabled(true);
                        if (musicMuted) setMusicMuted(false);
                      }
                    }}
                    className={`w-full h-1.5 bg-white/10 rounded-lg appearance-none cursor-pointer ${
                      style === 'classic' ? 'accent-amber-500' : 'accent-cyan-500'
                    }`}
                  />
                </div>
              </div>

              {/* Control Independiente 2: Volumen de Efectos de Sonido (SFX) */}
              <div className="space-y-1">
                <div className="flex items-center justify-between text-[10px] font-black uppercase tracking-wider text-gray-400">
                  <span>Efectos de Sonido (SFX)</span>
                  <span>{Math.round(displaySfxVol * 100)}%</span>
                </div>
                <div className="flex items-center gap-2.5">
                  <button
                    type="button"
                    onClick={toggleSfxMuted}
                    className={`w-7 h-7 rounded-lg flex items-center justify-center border transition-all shrink-0 ${
                      sfxMuted
                        ? 'bg-red-500/10 border-red-500/30 text-red-400'
                        : 'bg-amber-500/10 border-amber-500/20 text-amber-400 hover:bg-amber-500/20'
                    }`}
                    title={sfxMuted ? 'Activar efectos de sonido' : 'Silenciar efectos de sonido'}
                  >
                    {sfxMuted ? <VolumeX size={13} /> : <Sparkles size={13} />}
                  </button>

                  <input
                    type="range"
                    min="0"
                    max="1"
                    step="0.01"
                    aria-label="Volumen de efectos de sonido"
                    value={displaySfxVol}
                    onChange={(e) => {
                      const v = Number(e.target.value);
                      setSfxVolume(v);
                      if (v === 0) {
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
                    className="w-full h-1.5 bg-white/10 rounded-lg appearance-none cursor-pointer accent-amber-400"
                  />
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ── Keyframe animations ── */}
      <style>{`
        @keyframes lobbyMusicBar {
          0% { height: 4px; }
          100% { height: 20px; }
        }
        @keyframes lobbyMusicBarMini {
          0% { height: 2px; }
          100% { height: 12px; }
        }
        .animate-slide-down {
          animation: slideDownPanel 0.25s cubic-bezier(0.16, 1, 0.3, 1) forwards;
        }
        @keyframes slideDownPanel {
          from {
            opacity: 0;
            transform: translateY(-8px) scale(0.98);
          }
          to {
            opacity: 1;
            transform: translateY(0) scale(1);
          }
        }
      `}</style>
    </div>
  );
}
