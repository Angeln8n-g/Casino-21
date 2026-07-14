'use client';

import React, { useCallback, useEffect, useRef, useState } from 'react';
import { Howl } from 'howler';
import { useAudio } from '../hooks/useAudio';
import { Music, Pause, Play, SkipForward, ChevronDown, ChevronUp, Volume2, VolumeX } from 'lucide-react';
import { supabase } from '../services/supabase';

// ─── Types ──────────────────────────────────────────────────────────────────────
type MusicStyle = 'classic' | 'modern';

interface PlaylistEntry {
  src: string;
  label: string;
}

// ─── Playlist Configuration ─────────────────────────────────────────────────────
const FALLBACK_PLAYLISTS: Record<MusicStyle, PlaylistEntry[]> = {
  classic: [
    { src: '/audio/lobby_clasic_1.mp3', label: 'Clásico 1' },
    { src: '/audio/lobby_clasic_2.mp3', label: 'Clásico 2' },
  ],
  modern: [
    { src: '/audio/lobby_moderno_1.mp3', label: 'Moderno 1' },
    { src: '/audio/lobby_moderno_2.mp3', label: 'Moderno 2' },
  ],
};

const MUSIC_VOLUME_SCALE = 0.4; // Music sits at 40% of master volume
const FADE_OUT_MS = 800;
const FADE_IN_MS = 1200;
const LOBBY_MUSIC_SETTINGS_KEY = 'casino21_lobby_music';

// ─── Component ──────────────────────────────────────────────────────────────────
export function LobbyMusicSelector() {
  const { volume: masterVolume, muted, setVolume, toggleMuted } = useAudio();
  const [playlists, setPlaylists] = useState<Record<MusicStyle, PlaylistEntry[]>>(FALLBACK_PLAYLISTS);

  useEffect(() => {
    const fetchLobbyTracks = async () => {
      try {
        const { data, error } = await supabase
          .from('audio_tracks')
          .select('*')
          .eq('category', 'lobby')
          .order('style')
          .order('track_order');
        
        if (error) throw error;
        
        if (data && data.length > 0) {
          const newPlaylists: Record<MusicStyle, PlaylistEntry[]> = {
            classic: [],
            modern: []
          };
          data.forEach(track => {
            const style = track.style as MusicStyle;
            if (style === 'classic' || style === 'modern') {
              newPlaylists[style].push({
                src: track.src,
                label: track.name
              });
            }
          });
          // Fallbacks for empty categories
          if (newPlaylists.classic.length === 0) newPlaylists.classic = FALLBACK_PLAYLISTS.classic;
          if (newPlaylists.modern.length === 0) newPlaylists.modern = FALLBACK_PLAYLISTS.modern;
          
          setPlaylists(newPlaylists);
        }
      } catch (err) {
        console.error('Error fetching lobby tracks:', err);
      }
    };
    fetchLobbyTracks();
  }, []);

  // ── Persisted state ─────────────────────────────────────────────────────────
  const [style, setStyle] = useState<MusicStyle>(() => {
    try {
      const stored = localStorage.getItem(LOBBY_MUSIC_SETTINGS_KEY);
      if (stored) {
        const parsed = JSON.parse(stored);
        if (parsed.style === 'classic' || parsed.style === 'modern') return parsed.style;
      }
    } catch { /* ignore */ }
    return 'classic';
  });

  const [isPlaying, setIsPlaying] = useState(false);
  const [isExpanded, setIsExpanded] = useState(false);

  // ── Refs ─────────────────────────────────────────────────────────────────────
  const activeHowlRef = useRef<Howl | null>(null);
  const activeHowlKeyRef = useRef<string | null>(null);
  const trackIndexRef = useRef(0);
  const isTransitioningRef = useRef(false);
  const mountedRef = useRef(true);
  const isPlayingRef = useRef(false);

  // ── Helpers ─────────────────────────────────────────────────────────────────
  const getHowlKey = useCallback(
    (s: MusicStyle, idx: number) => `${s}_${idx}`,
    []
  );

  const getTargetVolume = useCallback(
    () => (muted ? 0 : masterVolume * MUSIC_VOLUME_SCALE),
    [masterVolume, muted]
  );

  // ── Persist style preference ────────────────────────────────────────────────
  useEffect(() => {
    try {
      localStorage.setItem(LOBBY_MUSIC_SETTINGS_KEY, JSON.stringify({ style }));
    } catch { /* ignore */ }
  }, [style]);

  // ── Play/Transition track function ──────────────────────────────────────────
  const playTrack = useCallback((newStyle: MusicStyle, newIdx: number, fadeTransition: boolean) => {
    if (!mountedRef.current) return;

    const playlist = playlists[newStyle];
    const entry = playlist?.[newIdx];
    if (!entry) {
      if (activeHowlRef.current) {
        activeHowlRef.current.stop();
        activeHowlRef.current.unload();
        activeHowlRef.current = null;
      }
      activeHowlKeyRef.current = null;
      return;
    }

    isTransitioningRef.current = true;

    const oldHowl = activeHowlRef.current;
    
    // Create new Howl instance
    const key = `${newStyle}_${newIdx}`;
    activeHowlKeyRef.current = key;
    trackIndexRef.current = newIdx;

    const howl = new Howl({
      src: [entry.src],
      loop: false,
      volume: 0,
      preload: true,
      html5: true,
      onend: function () {
        if (!mountedRef.current) return;
        // Only auto-advance if this howl is still the active one
        if (activeHowlRef.current === howl) {
          const nextIdx = (newIdx + 1) % playlist.length;
          playTrack(newStyle, nextIdx, false); // Auto-advance normally doesn't need crossfade
        }
      }
    });

    activeHowlRef.current = howl;

    const targetVol = getTargetVolume();

    if (oldHowl) {
      if (fadeTransition) {
        // Crossfade: Fade out the old one
        oldHowl.fade(oldHowl.volume(), 0, FADE_OUT_MS);
        
        // Fade in the new one
        howl.volume(0);
        howl.play();
        howl.fade(0, targetVol, FADE_IN_MS);

        setTimeout(() => {
          if (oldHowl) {
            oldHowl.stop();
            oldHowl.unload();
          }
          isTransitioningRef.current = false;
        }, FADE_OUT_MS + 50);
      } else {
        // Instant switch: Stop and unload the old one immediately
        oldHowl.stop();
        oldHowl.unload();
        
        howl.volume(targetVol);
        howl.play();
        isTransitioningRef.current = false;
      }
    } else {
      // No old track: just play new
      howl.volume(targetVol);
      howl.play();
      isTransitioningRef.current = false;
    }
  }, [playlists, getTargetVolume]);

  // ── Sync volume with master ─────────────────────────────────────────────────
  useEffect(() => {
    if (activeHowlRef.current) {
      activeHowlRef.current.volume(getTargetVolume());
    }
  }, [masterVolume, muted, getTargetVolume]);

  // ── Handle playlists updates or initial load ────────────────────────────────
  useEffect(() => {
    mountedRef.current = true;
    
    // If playlists update while playing, restart playback from first track of current style
    if (isPlayingRef.current) {
      playTrack(style, 0, false);
    }

    return () => {
      mountedRef.current = false;
      if (activeHowlRef.current) {
        activeHowlRef.current.stop();
        activeHowlRef.current.unload();
        activeHowlRef.current = null;
      }
    };
  }, [playlists]);

  // ── Play / Pause ────────────────────────────────────────────────────────────
  const handlePlayPause = useCallback(() => {
    if (isPlaying) {
      // Pause
      isPlayingRef.current = false;
      setIsPlaying(false);
      const howl = activeHowlRef.current;
      if (howl) {
        howl.fade(howl.volume(), 0, FADE_OUT_MS);
        setTimeout(() => {
          if (!mountedRef.current) return;
          // Only pause if we didn't resume in the meantime
          if (!isPlayingRef.current && activeHowlRef.current === howl) {
            howl.pause();
          }
        }, FADE_OUT_MS);
      }
    } else {
      // Play
      isPlayingRef.current = true;
      setIsPlaying(true);
      const howl = activeHowlRef.current;
      if (howl) {
        howl.volume(0);
        howl.play();
        howl.fade(0, getTargetVolume(), FADE_IN_MS);
      } else {
        playTrack(style, trackIndexRef.current, false);
      }
    }
  }, [isPlaying, style, getTargetVolume, playTrack]);

  // ── Style Switch (with crossfade) ───────────────────────────────────────────
  const handleStyleChange = useCallback(
    (newStyle: MusicStyle) => {
      if (newStyle === style || isTransitioningRef.current) return;
      isTransitioningRef.current = true;

      setStyle(newStyle);

      if (!isPlayingRef.current) {
        // Not playing — just switch context, unload old howl if any, no audio work needed
        if (activeHowlRef.current) {
          activeHowlRef.current.stop();
          activeHowlRef.current.unload();
          activeHowlRef.current = null;
        }
        trackIndexRef.current = 0;
        activeHowlKeyRef.current = `${newStyle}_0`;
        isTransitioningRef.current = false;
        return;
      }

      // If playing, crossfade to track 0 of the new style
      playTrack(newStyle, 0, true);
    },
    [style, playTrack]
  );

  // ── Skip to next track ──────────────────────────────────────────────────────
  const handleSkip = useCallback(() => {
    if (!isPlayingRef.current || isTransitioningRef.current) return;
    
    const playlist = playlists[style];
    const nextIdx = (trackIndexRef.current + 1) % playlist.length;
    playTrack(style, nextIdx, true);
  }, [style, playlists, playTrack]);

  // ── Current track label ─────────────────────────────────────────────────────
  const currentTrackLabel =
    playlists[style][trackIndexRef.current]?.label ?? playlists[style][0]?.label ?? 'Pista';

  // ── Render ──────────────────────────────────────────────────────────────────
  return (
    <div className="relative w-full select-none">
      {/* ─── Compact Capsule Trigger ─── */}
      <button
        type="button"
        onClick={() => setIsExpanded(!isExpanded)}
        className="w-full flex items-center justify-between gap-3 px-4 py-3 rounded-2xl border border-white/10 bg-black/40 backdrop-blur-xl hover:bg-black/50 hover:border-white/20 active:scale-[0.99] transition-all duration-300 shadow-[0_4px_24px_rgba(0,0,0,0.3)] group"
      >
        <div className="flex items-center gap-3 min-w-0">
          <div
            className={`w-8 h-8 rounded-lg flex items-center justify-center border transition-all duration-500 ${
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
              Ajustes de Música
            </p>
            <p className="text-xs font-bold text-gray-300 truncate leading-normal">
              {isPlaying ? currentTrackLabel : 'Música en pausa'}
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2 text-gray-400 group-hover:text-gray-300">
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

      {/* ─── Expandable Configurations Panel ─── */}
      {isExpanded && (
        <div className="absolute z-50 left-0 right-0 mt-2 overflow-hidden rounded-2xl border border-white/10 bg-black/75 backdrop-blur-2xl shadow-[0_12px_40px_rgba(0,0,0,0.6)] p-4 animate-slide-down">
          {/* Ambient glow */}
          <div
            className={`absolute -top-20 -right-20 w-40 h-40 rounded-full blur-3xl pointer-events-none transition-colors duration-1000 ${
              style === 'classic' ? 'bg-amber-500/10' : 'bg-cyan-500/10'
            }`}
          />

          <div className="relative z-10 flex flex-col gap-4">
            {/* Playback Controls & Info */}
            <div className="flex items-center justify-between gap-3">
              <div>
                <p className="text-[10px] uppercase tracking-[0.2em] font-black text-gray-400">
                  Estilo: <span className={style === 'classic' ? 'text-amber-400' : 'text-cyan-400'}>{style === 'classic' ? 'Clásico' : 'Moderno'}</span>
                </p>
                <p className="text-xs font-bold text-white truncate max-w-[180px]">
                  {isPlaying ? currentTrackLabel : 'Sin reproducir'}
                </p>
              </div>

              <div className="flex items-center gap-1.5">
                <button
                  type="button"
                  onClick={handlePlayPause}
                  className={`w-8 h-8 rounded-lg flex items-center justify-center border transition-all duration-300 hover:scale-105 active:scale-95 ${
                    isPlaying
                      ? 'bg-white/10 border-white/20 text-white hover:bg-white/15'
                      : style === 'classic'
                        ? 'bg-amber-500/15 border-amber-500/30 text-amber-400 hover:bg-amber-500/25'
                        : 'bg-cyan-500/15 border-cyan-500/30 text-cyan-400 hover:bg-cyan-500/25'
                  }`}
                  title={isPlaying ? 'Pausar música' : 'Reproducir música'}
                >
                  {isPlaying ? <Pause size={12} /> : <Play size={12} className="ml-0.5" />}
                </button>

                {isPlaying && (
                  <button
                    type="button"
                    onClick={handleSkip}
                    className="w-8 h-8 rounded-lg flex items-center justify-center border border-white/10 bg-white/5 text-gray-400 hover:text-white hover:bg-white/10 hover:border-white/20 transition-all duration-300 hover:scale-105 active:scale-95"
                    title="Siguiente pista"
                  >
                    <SkipForward size={12} />
                  </button>
                )}
              </div>
            </div>

            {/* Sound Wave Animation (Expanded) */}
            {isPlaying && (
              <div className="flex items-end justify-center gap-[3px] h-6 my-0.5">
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

            {/* Style Selector Grid */}
            <div className="grid grid-cols-2 gap-2">
              <button
                type="button"
                onClick={() => handleStyleChange('classic')}
                className={`relative overflow-hidden rounded-xl py-2 px-3 border text-center transition-all duration-500 group ${
                  style === 'classic'
                    ? 'bg-amber-500/15 border-amber-500/40 shadow-[0_0_12px_rgba(245,158,11,0.1)] scale-[1.01]'
                    : 'bg-white/[0.03] border-white/[0.08] hover:bg-white/[0.06] hover:border-amber-500/20'
                }`}
              >
                <div
                  className={`absolute inset-0 bg-gradient-to-br from-amber-500/10 to-transparent opacity-0 transition-opacity duration-500 ${
                    style === 'classic' ? 'opacity-100' : 'group-hover:opacity-50'
                  }`}
                />
                <div className="relative z-10">
                  <span className="text-base block mb-0.5">🎻</span>
                  <span
                    className={`text-[10px] font-black uppercase tracking-[0.12em] transition-colors duration-300 ${
                      style === 'classic' ? 'text-amber-400' : 'text-gray-500 group-hover:text-gray-400'
                    }`}
                  >
                    Clásico
                  </span>
                </div>
              </button>

              <button
                type="button"
                onClick={() => handleStyleChange('modern')}
                className={`relative overflow-hidden rounded-xl py-2 px-3 border text-center transition-all duration-500 group ${
                  style === 'modern'
                    ? 'bg-cyan-500/15 border-cyan-500/40 shadow-[0_0_12px_rgba(6,182,212,0.1)] scale-[1.01]'
                    : 'bg-white/[0.03] border-white/[0.08] hover:bg-white/[0.06] hover:border-cyan-500/20'
                }`}
              >
                <div
                  className={`absolute inset-0 bg-gradient-to-br from-cyan-500/10 to-transparent opacity-0 transition-opacity duration-500 ${
                    style === 'modern' ? 'opacity-100' : 'group-hover:opacity-50'
                  }`}
                />
                <div className="relative z-10">
                  <span className="text-base block mb-0.5">🎧</span>
                  <span
                    className={`text-[10px] font-black uppercase tracking-[0.12em] transition-colors duration-300 ${
                      style === 'modern' ? 'text-cyan-400' : 'text-gray-500 group-hover:text-gray-400'
                    }`}
                  >
                    Moderno
                  </span>
                </div>
              </button>
            </div>

            {/* Volume & Mute Controller */}
            <div className="flex items-center gap-3 pt-2 border-t border-white/5">
              <button
                type="button"
                onClick={toggleMuted}
                className={`w-7 h-7 rounded-lg flex items-center justify-center border transition-all duration-300 ${
                  muted
                    ? 'bg-red-500/10 border-red-500/30 text-red-400'
                    : style === 'classic'
                      ? 'bg-amber-500/10 border-amber-500/20 text-amber-400 hover:bg-amber-500/20'
                      : 'bg-cyan-500/10 border-cyan-500/20 text-cyan-400 hover:bg-cyan-500/20'
                }`}
                title={muted ? 'Activar sonido' : 'Silenciar sonido'}
              >
                {muted ? <VolumeX size={13} /> : <Volume2 size={13} />}
              </button>

              <div className="flex-1 flex items-center gap-2">
                <input
                  type="range"
                  min="0"
                  max="1"
                  step="0.01"
                  value={muted ? 0 : masterVolume}
                  onChange={(e) => {
                    setVolume(Number(e.target.value));
                  }}
                  className={`w-full h-1 bg-white/10 rounded-lg appearance-none cursor-pointer focus:outline-none transition-all duration-300 ${
                    style === 'classic' ? 'accent-amber-500' : 'accent-cyan-500'
                  }`}
                  style={{
                    background: `linear-gradient(to right, ${
                      style === 'classic' ? '#f59e0b' : '#06b6d4'
                    } 0%, ${
                      style === 'classic' ? '#f59e0b' : '#06b6d4'
                    } ${(muted ? 0 : masterVolume) * 100}%, rgba(255,255,255,0.1) ${(muted ? 0 : masterVolume) * 100}%, rgba(255,255,255,0.1) 100%)`
                  }}
                />
                <span className="text-[10px] font-mono font-bold text-gray-400 w-8 text-right select-none">
                  {Math.round((muted ? 0 : masterVolume) * 100)}%
                </span>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ── Keyframe animations ── */}
      <style>{`
        @keyframes lobbyMusicBar {
          0% { height: 4px; }
          100% { height: 24px; }
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
