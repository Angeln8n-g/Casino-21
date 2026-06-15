'use client';

import React, { useCallback, useEffect, useRef, useState } from 'react';
import { Howl } from 'howler';
import { useAudio } from '../hooks/useAudio';
import { Music, Pause, Play, SkipForward } from 'lucide-react';

// ─── Types ──────────────────────────────────────────────────────────────────────
type MusicStyle = 'classic' | 'modern';

interface PlaylistEntry {
  src: string;
  label: string;
}

// ─── Playlist Configuration ─────────────────────────────────────────────────────
const PLAYLISTS: Record<MusicStyle, PlaylistEntry[]> = {
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
  const { volume: masterVolume, muted } = useAudio();

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

  // ── Refs ─────────────────────────────────────────────────────────────────────
  const howlsRef = useRef<Map<string, Howl>>(new Map());
  const activeHowlKeyRef = useRef<string | null>(null);
  const trackIndexRef = useRef(0);
  const isTransitioningRef = useRef(false);
  const mountedRef = useRef(true);

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

  // ── Initialize Howl instances ───────────────────────────────────────────────
  useEffect(() => {
    mountedRef.current = true;
    const howls = new Map<string, Howl>();

    (Object.keys(PLAYLISTS) as MusicStyle[]).forEach((s) => {
      PLAYLISTS[s].forEach((entry, idx) => {
        const key = `${s}_${idx}`;
        const howl = new Howl({
          src: [entry.src],
          loop: false, // We handle looping via onend
          volume: 0,
          preload: true,
          html5: true, // Better for long music files
          onend: function () {
            if (!mountedRef.current) return;
            // Advance to the next track in the same style
            const playlist = PLAYLISTS[s];
            const nextIdx = (idx + 1) % playlist.length;
            const nextKey = `${s}_${nextIdx}`;

            // Only auto-advance if this howl is still the active one
            if (activeHowlKeyRef.current === key) {
              const nextHowl = howlsRef.current.get(nextKey);
              if (nextHowl) {
                trackIndexRef.current = nextIdx;
                activeHowlKeyRef.current = nextKey;
                nextHowl.volume(muted ? 0 : masterVolume * MUSIC_VOLUME_SCALE);
                nextHowl.play();
              }
            }
          },
        });
        howls.set(key, howl);
      });
    });

    howlsRef.current = howls;

    return () => {
      mountedRef.current = false;
      howls.forEach((howl) => {
        howl.stop();
        howl.unload();
      });
      howls.clear();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // ── Sync volume with master ─────────────────────────────────────────────────
  useEffect(() => {
    const activeKey = activeHowlKeyRef.current;
    if (!activeKey) return;
    const howl = howlsRef.current.get(activeKey);
    if (howl) {
      howl.volume(getTargetVolume());
    }
  }, [masterVolume, muted, getTargetVolume]);

  // ── Play / Pause ────────────────────────────────────────────────────────────
  const handlePlayPause = useCallback(() => {
    if (isPlaying) {
      // Pause: fade out current
      const activeKey = activeHowlKeyRef.current;
      if (activeKey) {
        const howl = howlsRef.current.get(activeKey);
        if (howl) {
          howl.fade(howl.volume(), 0, FADE_OUT_MS);
          setTimeout(() => {
            howl.pause();
          }, FADE_OUT_MS);
        }
      }
      setIsPlaying(false);
    } else {
      // Play: start/resume current track
      const key = getHowlKey(style, trackIndexRef.current);
      const howl = howlsRef.current.get(key);
      if (howl) {
        activeHowlKeyRef.current = key;
        howl.play();
        howl.fade(0, getTargetVolume(), FADE_IN_MS);
      }
      setIsPlaying(true);
    }
  }, [isPlaying, style, getHowlKey, getTargetVolume]);

  // ── Style Switch (with crossfade) ───────────────────────────────────────────
  const handleStyleChange = useCallback(
    (newStyle: MusicStyle) => {
      if (newStyle === style || isTransitioningRef.current) return;
      isTransitioningRef.current = true;

      setStyle(newStyle);

      if (!isPlaying) {
        // Not playing — just switch context, no audio work needed
        trackIndexRef.current = 0;
        isTransitioningRef.current = false;
        return;
      }

      // Fade out current track
      const oldKey = activeHowlKeyRef.current;
      const oldHowl = oldKey ? howlsRef.current.get(oldKey) : null;

      if (oldHowl) {
        oldHowl.fade(oldHowl.volume(), 0, FADE_OUT_MS);
        setTimeout(() => {
          oldHowl.stop();
        }, FADE_OUT_MS);
      }

      // After fade out, start new style from track 0
      setTimeout(() => {
        if (!mountedRef.current) return;
        trackIndexRef.current = 0;
        const newKey = getHowlKey(newStyle, 0);
        const newHowl = howlsRef.current.get(newKey);
        if (newHowl) {
          activeHowlKeyRef.current = newKey;
          newHowl.volume(0);
          newHowl.play();
          newHowl.fade(0, getTargetVolume(), FADE_IN_MS);
        }
        isTransitioningRef.current = false;
      }, FADE_OUT_MS + 100);
    },
    [style, isPlaying, getHowlKey, getTargetVolume]
  );

  // ── Skip to next track ──────────────────────────────────────────────────────
  const handleSkip = useCallback(() => {
    if (!isPlaying || isTransitioningRef.current) return;
    isTransitioningRef.current = true;

    const playlist = PLAYLISTS[style];
    const oldKey = activeHowlKeyRef.current;
    const oldHowl = oldKey ? howlsRef.current.get(oldKey) : null;

    if (oldHowl) {
      oldHowl.fade(oldHowl.volume(), 0, FADE_OUT_MS / 2);
      setTimeout(() => {
        oldHowl.stop();
      }, FADE_OUT_MS / 2);
    }

    setTimeout(() => {
      if (!mountedRef.current) return;
      const nextIdx = (trackIndexRef.current + 1) % playlist.length;
      trackIndexRef.current = nextIdx;
      const newKey = getHowlKey(style, nextIdx);
      const newHowl = howlsRef.current.get(newKey);
      if (newHowl) {
        activeHowlKeyRef.current = newKey;
        newHowl.volume(0);
        newHowl.play();
        newHowl.fade(0, getTargetVolume(), FADE_IN_MS / 2);
      }
      isTransitioningRef.current = false;
    }, FADE_OUT_MS / 2 + 50);
  }, [isPlaying, style, getHowlKey, getTargetVolume]);

  // ── Current track label ─────────────────────────────────────────────────────
  const currentTrackLabel =
    PLAYLISTS[style][trackIndexRef.current]?.label ?? PLAYLISTS[style][0].label;

  // ── Render ──────────────────────────────────────────────────────────────────
  return (
    <div className="relative overflow-hidden rounded-2xl border border-white/10 bg-black/30 backdrop-blur-xl shadow-[0_8px_32px_rgba(0,0,0,0.4)] p-4 animate-fade-in">
      {/* Ambient glow */}
      <div
        className={`absolute -top-20 -right-20 w-40 h-40 rounded-full blur-3xl pointer-events-none transition-colors duration-1000 ${
          style === 'classic'
            ? 'bg-amber-500/15'
            : 'bg-cyan-500/15'
        }`}
      />

      <div className="relative z-10 flex flex-col gap-3">
        {/* ── Header ────────────────────────────────────────── */}
        <div className="flex items-center justify-between gap-3">
          <div className="flex items-center gap-2.5">
            <div
              className={`w-9 h-9 rounded-xl flex items-center justify-center border transition-all duration-500 ${
                isPlaying
                  ? style === 'classic'
                    ? 'bg-amber-500/20 border-amber-500/40 shadow-[0_0_12px_rgba(245,158,11,0.3)]'
                    : 'bg-cyan-500/20 border-cyan-500/40 shadow-[0_0_12px_rgba(6,182,212,0.3)]'
                  : 'bg-white/5 border-white/10'
              }`}
            >
              <Music
                size={16}
                className={`transition-colors duration-500 ${
                  isPlaying
                    ? style === 'classic'
                      ? 'text-amber-400'
                      : 'text-cyan-400'
                    : 'text-gray-500'
                }`}
              />
            </div>
            <div>
              <p className="text-[10px] uppercase tracking-[0.24em] font-black text-gray-500">
                Música del Lobby
              </p>
              <p className="text-xs font-bold text-gray-300">
                {isPlaying ? currentTrackLabel : 'En pausa'}
              </p>
            </div>
          </div>

          {/* Play / Pause + Skip */}
          <div className="flex items-center gap-1.5">
            <button
              type="button"
              onClick={handlePlayPause}
              className={`w-9 h-9 rounded-xl flex items-center justify-center border transition-all duration-300 hover:scale-105 active:scale-95 ${
                isPlaying
                  ? 'bg-white/10 border-white/20 text-white hover:bg-white/15'
                  : style === 'classic'
                    ? 'bg-amber-500/15 border-amber-500/30 text-amber-400 hover:bg-amber-500/25'
                    : 'bg-cyan-500/15 border-cyan-500/30 text-cyan-400 hover:bg-cyan-500/25'
              }`}
              title={isPlaying ? 'Pausar música' : 'Reproducir música'}
              aria-label={isPlaying ? 'Pausar música' : 'Reproducir música'}
            >
              {isPlaying ? <Pause size={14} /> : <Play size={14} className="ml-0.5" />}
            </button>

            {isPlaying && (
              <button
                type="button"
                onClick={handleSkip}
                className="w-9 h-9 rounded-xl flex items-center justify-center border border-white/10 bg-white/5 text-gray-400 hover:text-white hover:bg-white/10 hover:border-white/20 transition-all duration-300 hover:scale-105 active:scale-95"
                title="Siguiente pista"
                aria-label="Siguiente pista"
              >
                <SkipForward size={14} />
              </button>
            )}
          </div>
        </div>

        {/* ── Sound Wave Animation ──────────────────────────── */}
        {isPlaying && (
          <div className="flex items-end justify-center gap-[3px] h-5 my-1">
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

        {/* ── Style Selector ────────────────────────────────── */}
        <div className="grid grid-cols-2 gap-2">
          <button
            type="button"
            onClick={() => handleStyleChange('classic')}
            className={`relative overflow-hidden rounded-xl py-2.5 px-3 border text-center transition-all duration-500 group ${
              style === 'classic'
                ? 'bg-amber-500/15 border-amber-500/40 shadow-[0_0_16px_rgba(245,158,11,0.15)] scale-[1.02]'
                : 'bg-white/[0.03] border-white/[0.08] hover:bg-white/[0.06] hover:border-amber-500/20'
            }`}
          >
            <div
              className={`absolute inset-0 bg-gradient-to-br from-amber-500/10 to-transparent opacity-0 transition-opacity duration-500 ${
                style === 'classic' ? 'opacity-100' : 'group-hover:opacity-50'
              }`}
            />
            <div className="relative z-10">
              <span className="text-lg block mb-0.5">🎻</span>
              <span
                className={`text-[11px] font-black uppercase tracking-[0.16em] transition-colors duration-300 ${
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
            className={`relative overflow-hidden rounded-xl py-2.5 px-3 border text-center transition-all duration-500 group ${
              style === 'modern'
                ? 'bg-cyan-500/15 border-cyan-500/40 shadow-[0_0_16px_rgba(6,182,212,0.15)] scale-[1.02]'
                : 'bg-white/[0.03] border-white/[0.08] hover:bg-white/[0.06] hover:border-cyan-500/20'
            }`}
          >
            <div
              className={`absolute inset-0 bg-gradient-to-br from-cyan-500/10 to-transparent opacity-0 transition-opacity duration-500 ${
                style === 'modern' ? 'opacity-100' : 'group-hover:opacity-50'
              }`}
            />
            <div className="relative z-10">
              <span className="text-lg block mb-0.5">🎧</span>
              <span
                className={`text-[11px] font-black uppercase tracking-[0.16em] transition-colors duration-300 ${
                  style === 'modern' ? 'text-cyan-400' : 'text-gray-500 group-hover:text-gray-400'
                }`}
              >
                Moderno
              </span>
            </div>
          </button>
        </div>
      </div>

      {/* ── Keyframe animation for sound bars ─────────────── */}
      <style>{`
        @keyframes lobbyMusicBar {
          0% { height: 4px; }
          100% { height: 20px; }
        }
      `}</style>
    </div>
  );
}
