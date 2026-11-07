import React, {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
} from 'react';
import { Howl, Howler } from 'howler';
import { useAudio } from './useAudio';
import { useAuth } from './useAuth';
import { useGame } from './useGame';
import { supabase } from '../services/supabase';
import { safeStorage } from '../utils/safeStorage';

export type MusicStyle = 'classic' | 'modern';

export interface LobbyTrackEntry {
  id: string;
  src: string;
  label: string;
}

export interface MusicContextValue {
  style: MusicStyle;
  playlists: Record<MusicStyle, LobbyTrackEntry[]>;
  trackIndex: number;
  currentTrackLabel: string;
  isPlaying: boolean;
  isInMatch: boolean;
  needsUserInteraction: boolean;
  setStyle: (nextStyle: MusicStyle) => void;
  selectTrack: (index: number) => void;
  skipTrack: () => void;
  togglePlayPause: () => void;
  activateMusic: () => void;
}

export const KASINO21_SIGNATURE_TRACK: LobbyTrackEntry = {
  id: 'kasino21-arena-protocol',
  src: '/audio/kasino21_theme.mp3',
  label: 'KASINO21 — Arena Protocol',
};

const FALLBACK_PLAYLISTS: Record<MusicStyle, LobbyTrackEntry[]> = {
  modern: [
    KASINO21_SIGNATURE_TRACK,
    { id: 'lobby-modern-1', src: '/audio/lobby_moderno_1.mp3', label: 'Pulso Competitivo 1' },
    { id: 'lobby-modern-2', src: '/audio/lobby_moderno_2.mp3', label: 'Pulso Competitivo 2' },
  ],
  classic: [
    { id: 'lobby-classic-1', src: '/audio/lobby_clasic_1.mp3', label: 'Clásico 1' },
    { id: 'lobby-classic-2', src: '/audio/lobby_clasic_2.mp3', label: 'Clásico 2' },
  ],
};

const LOBBY_MUSIC_SETTINGS_KEY = 'casino21_lobby_music';
const CURRENT_SCHEMA_VERSION = 2;

const LOBBY_MUSIC_SCALE = 0.52;
const FADE_IN_INITIAL_MS = 1800;
const FADE_IN_RETURN_MS = 1500;
const FADE_OUT_MATCH_MS = 1000;
const FADE_TOGGLE_MS = 550;
const CROSSFADE_MS = 850;

const clamp = (v: number, min: number, max: number) => Math.min(max, Math.max(min, v));

interface StoredLobbyMusicPrefs {
  schemaVersion?: number;
  style?: MusicStyle;
  trackIndex?: number;
}

function loadInitialMusicPrefs(): { style: MusicStyle; trackIndex: number } {
  try {
    const raw = safeStorage.getItem(LOBBY_MUSIC_SETTINGS_KEY);
    if (raw) {
      const parsed: StoredLobbyMusicPrefs = JSON.parse(raw);
      // Migrar automáticamente perfiles antiguos (v1 sin schemaVersion) al tema oficial KASINO21 (modern pista 0)
      if (parsed.schemaVersion === CURRENT_SCHEMA_VERSION) {
        const st: MusicStyle = parsed.style === 'classic' ? 'classic' : 'modern';
        const idx = typeof parsed.trackIndex === 'number' && parsed.trackIndex >= 0 ? parsed.trackIndex : 0;
        return { style: st, trackIndex: idx };
      }
    }
  } catch {}
  return { style: 'modern', trackIndex: 0 };
}

const MusicContext = createContext<MusicContextValue | undefined>(undefined);

export function MusicProvider({ children }: { children: React.ReactNode }) {
  const { user, loading: authLoading } = useAuth();
  const { gameState } = useGame();
  const {
    musicEnabled,
    musicMuted,
    musicVolume,
    setMusicEnabled,
    setMusicMuted,
  } = useAudio();

  const initialPrefs = useMemo(() => loadInitialMusicPrefs(), []);
  const [style, setStyleState] = useState<MusicStyle>(initialPrefs.style);
  const [trackIndex, setTrackIndex] = useState<number>(initialPrefs.trackIndex);
  const [playlists, setPlaylists] = useState<Record<MusicStyle, LobbyTrackEntry[]>>(FALLBACK_PLAYLISTS);
  const [needsUserInteraction, setNeedsUserInteraction] = useState<boolean>(false);
  const [isHowlPlaying, setIsHowlPlaying] = useState<boolean>(false);

  const activeHowlRef = useRef<Howl | null>(null);
  const activeSoundIdRef = useRef<number | null>(null);
  const activeKeyRef = useRef<string | null>(null);
  const opTokenRef = useRef<number>(0);
  const fadeCleanupTimerRef = useRef<number | null>(null);
  const mountedRef = useRef<boolean>(true);
  const isFadingRef = useRef<boolean>(false);

  // ¿El jugador está en la interfaz principal (menú/lobby/sala de espera) o dentro de una partida activa?
  const pathname = typeof window !== 'undefined' ? window.location.pathname : '/';
  const isInMainInterface = !authLoading && Boolean(user) && pathname !== '/login';
  const isInMatch = Boolean(gameState && (gameState.phase as string) !== 'setup');
  const shouldPlayLobby = isInMainInterface && !isInMatch && musicEnabled;

  const getEffectiveVolume = useCallback(() => {
    if (!musicEnabled || musicMuted) return 0;
    return clamp(musicVolume * LOBBY_MUSIC_SCALE, 0, 1);
  }, [musicEnabled, musicMuted, musicVolume]);

  const effectiveVolRef = useRef<number>(getEffectiveVolume());
  effectiveVolRef.current = getEffectiveVolume();

  const shouldPlayLobbyRef = useRef<boolean>(shouldPlayLobby);
  shouldPlayLobbyRef.current = shouldPlayLobby;

  // Persistir preferencias de estilo y pista
  useEffect(() => {
    try {
      safeStorage.setItem(
        LOBBY_MUSIC_SETTINGS_KEY,
        JSON.stringify({
          schemaVersion: CURRENT_SCHEMA_VERSION,
          style,
          trackIndex,
        })
      );
    } catch {}
  }, [style, trackIndex]);

  // Cargar pistas adicionales de Supabase manteniendo siempre KASINO21 — Arena Protocol como pista #1 en Moderno
  useEffect(() => {
    let active = true;
    const fetchLobbyTracks = async () => {
      try {
        const { data, error } = await supabase
          .from('audio_tracks')
          .select('*')
          .eq('category', 'lobby')
          .order('style')
          .order('track_order');

        if (error) throw error;
        if (!active || !data || data.length === 0) return;

        const remoteClassic: LobbyTrackEntry[] = [];
        const remoteModern: LobbyTrackEntry[] = [];

        data.forEach((row: any, idx: number) => {
          const st = row.style as MusicStyle;
          const src = String(row.src || '').trim();
          if (!src) return;
          if (src.toLowerCase().includes('kasino21_theme')) return;
          const entry: LobbyTrackEntry = {
            id: String(row.id || `remote-${st}-${idx}`),
            src,
            label: String(row.name || `Pista ${idx + 1}`),
          };
          if (st === 'classic') remoteClassic.push(entry);
          if (st === 'modern') remoteModern.push(entry);
        });

        setPlaylists({
          classic: remoteClassic.length > 0 ? remoteClassic : FALLBACK_PLAYLISTS.classic,
          modern:
            remoteModern.length > 0
              ? [KASINO21_SIGNATURE_TRACK, ...remoteModern]
              : FALLBACK_PLAYLISTS.modern,
        });
      } catch (err) {
        console.warn('[useMusic] Usando pistas locales de respaldo:', err);
      }
    };

    fetchLobbyTracks();
    return () => {
      active = false;
    };
  }, []);

  const clearPendingFadeTimer = useCallback(() => {
    if (fadeCleanupTimerRef.current !== null) {
      window.clearTimeout(fadeCleanupTimerRef.current);
      fadeCleanupTimerRef.current = null;
    }
  }, []);

  const destroyHowl = useCallback((howl: Howl | null) => {
    if (!howl) return;
    try {
      howl.stop();
      howl.unload();
    } catch {}
  }, []);

  // Crea o reutiliza la única instancia Howl de lobby e inicia con Fade In respetando políticas de autoplay
  const startOrCrossfadeLobbyTrack = useCallback(
    (targetStyle: MusicStyle, rawIndex: number, fadeDurationMs: number) => {
      if (!mountedRef.current) return;

      const list = playlists[targetStyle] || FALLBACK_PLAYLISTS[targetStyle];
      if (!list || list.length === 0) return;

      const safeIdx = ((rawIndex % list.length) + list.length) % list.length;
      const entry = list[safeIdx];
      const desiredKey = `${targetStyle}:${entry.id}:${entry.src}`;

      clearPendingFadeTimer();
      const token = ++opTokenRef.current;

      // Caso A: La misma pista ya está cargada (por ejemplo, regresando de una partida al menú principal)
      if (activeHowlRef.current && activeKeyRef.current === desiredKey) {
        const howl = activeHowlRef.current;
        const targetVol = effectiveVolRef.current;

        try {
          if (Howler.ctx && Howler.ctx.state === 'suspended') {
            Howler.ctx.resume().catch(() => {});
          }
        } catch {}

        const sid = activeSoundIdRef.current;
        const alreadyPlaying = sid !== null ? howl.playing(sid) : howl.playing();

        if (!alreadyPlaying) {
          howl.mute(false);
          howl.volume(0);
          const newSid = sid !== null ? howl.play(sid) : howl.play();
          activeSoundIdRef.current = newSid;
        }

        const currentVol = clamp(howl.volume(), 0, 1);
        isFadingRef.current = true;
        howl.fade(currentVol, targetVol, fadeDurationMs, activeSoundIdRef.current ?? undefined);
        fadeCleanupTimerRef.current = window.setTimeout(() => {
          if (opTokenRef.current === token) {
            isFadingRef.current = false;
          }
        }, fadeDurationMs + 40);

        // Verificar si el navegador bloqueó el inicio automático
        window.setTimeout(() => {
          if (!mountedRef.current || opTokenRef.current !== token) return;
          const ctxSuspended = Boolean(Howler.ctx && Howler.ctx.state === 'suspended');
          const playingNow =
            activeSoundIdRef.current !== null
              ? howl.playing(activeSoundIdRef.current)
              : howl.playing();

          if (ctxSuspended || !playingNow) {
            setIsHowlPlaying(false);
            setNeedsUserInteraction(true);
          } else {
            setIsHowlPlaying(true);
            setNeedsUserInteraction(false);
          }
        }, 160);

        return;
      }

      // Caso B: Pista nueva o cambio de estilo — hacer crossfade limpio desde la pista anterior
      const prevHowl = activeHowlRef.current;
      const prevSid = activeSoundIdRef.current;
      activeHowlRef.current = null;
      activeSoundIdRef.current = null;
      activeKeyRef.current = desiredKey;

      if (prevHowl) {
        try {
          const prevVol = clamp(prevHowl.volume(), 0, 1);
          if (prevHowl.playing() && prevVol > 0.005) {
            prevHowl.fade(prevVol, 0, CROSSFADE_MS, prevSid ?? undefined);
            window.setTimeout(() => destroyHowl(prevHowl), CROSSFADE_MS + 60);
          } else {
            destroyHowl(prevHowl);
          }
        } catch {
          destroyHowl(prevHowl);
        }
      }

      const isExternalUrl = /^https?:\/\//i.test(entry.src);
      const howl = new Howl({
        src: [entry.src],
        loop: true,
        volume: 0,
        preload: true,
        // Web Audio API (html5: false) para pistas locales garantiza bucle sin cortes (0ms gap)
        // y control de volumen/fade real en iOS Safari y Android Chrome.
        html5: isExternalUrl,
        onplay: (soundId) => {
          if (!mountedRef.current || activeHowlRef.current !== howl) return;
          activeSoundIdRef.current = soundId;
          const ctxSuspended = Boolean(Howler.ctx && Howler.ctx.state === 'suspended');
          if (ctxSuspended) {
            setIsHowlPlaying(false);
            setNeedsUserInteraction(true);
            return;
          }
          setIsHowlPlaying(true);
          setNeedsUserInteraction(false);
        },
        onplayerror: () => {
          if (!mountedRef.current || activeHowlRef.current !== howl) return;
          setIsHowlPlaying(false);
          setNeedsUserInteraction(true);
        },
        onloaderror: () => {
          console.warn('[useMusic] No se pudo cargar la pista:', entry.src);
        },
      });

      activeHowlRef.current = howl;

      try {
        if (Howler.ctx && Howler.ctx.state === 'suspended') {
          Howler.ctx.resume().catch(() => {});
        }
      } catch {}

      const sid = howl.play();
      activeSoundIdRef.current = sid;

      const targetVol = effectiveVolRef.current;
      isFadingRef.current = true;
      howl.fade(0, targetVol, fadeDurationMs, sid);
      fadeCleanupTimerRef.current = window.setTimeout(() => {
        if (opTokenRef.current === token) {
          isFadingRef.current = false;
        }
      }, fadeDurationMs + 40);

      // Comprobación posterior para navegadores que suspenden AudioContext silenciosamente sin lanzar onplayerror
      window.setTimeout(() => {
        if (!mountedRef.current || opTokenRef.current !== token || activeHowlRef.current !== howl) {
          return;
        }
        const ctxSuspended = Boolean(Howler.ctx && Howler.ctx.state === 'suspended');
        const playingNow = howl.playing(sid);
        if (ctxSuspended || !playingNow) {
          setIsHowlPlaying(false);
          setNeedsUserInteraction(true);
        } else {
          setIsHowlPlaying(true);
          setNeedsUserInteraction(false);
        }
      }, 180);
    },
    [clearPendingFadeTimer, destroyHowl, playlists]
  );

  // Pausa con Fade Out suave (al entrar a partida o al desactivar la música)
  const fadeOutAndPauseLobby = useCallback(
    (durationMs: number) => {
      clearPendingFadeTimer();
      const token = ++opTokenRef.current;
      const howl = activeHowlRef.current;
      const sid = activeSoundIdRef.current;
      if (!howl) {
        setIsHowlPlaying(false);
        return;
      }

      const currentVol = clamp(howl.volume(), 0, 1);
      if (!howl.playing() || currentVol <= 0.005 || durationMs <= 0) {
        try {
          if (sid !== null) howl.pause(sid);
          else howl.pause();
          howl.volume(0);
        } catch {}
        setIsHowlPlaying(false);
        isFadingRef.current = false;
        return;
      }

      isFadingRef.current = true;
      howl.fade(currentVol, 0, durationMs, sid ?? undefined);
      fadeCleanupTimerRef.current = window.setTimeout(() => {
        if (!mountedRef.current || opTokenRef.current !== token) return;
        try {
          if (activeHowlRef.current === howl) {
            if (sid !== null) howl.pause(sid);
            else howl.pause();
            howl.volume(0);
          }
        } catch {}
        isFadingRef.current = false;
        setIsHowlPlaying(false);
      }, durationMs + 30);
    },
    [clearPendingFadeTimer]
  );

  // Orquestador principal de ciclo de vida: Inicio, Entrada a Partida y Regreso al Menú Principal
  const prevInMatchRef = useRef<boolean>(isInMatch);
  const hasStartedOnceRef = useRef<boolean>(false);

  useEffect(() => {
    const wasInMatch = prevInMatchRef.current;
    prevInMatchRef.current = isInMatch;

    if (shouldPlayLobby) {
      const fadeMs = !hasStartedOnceRef.current
        ? FADE_IN_INITIAL_MS
        : wasInMatch
          ? FADE_IN_RETURN_MS
          : FADE_TOGGLE_MS;
      hasStartedOnceRef.current = true;
      startOrCrossfadeLobbyTrack(style, trackIndex, fadeMs);
    } else {
      const fadeOutMs = isInMatch ? FADE_OUT_MATCH_MS : FADE_TOGGLE_MS;
      fadeOutAndPauseLobby(fadeOutMs);
      if (!musicEnabled) {
        setNeedsUserInteraction(false);
      }
    }
  }, [
    shouldPlayLobby,
    isInMatch,
    musicEnabled,
    style,
    trackIndex,
    startOrCrossfadeLobbyTrack,
    fadeOutAndPauseLobby,
  ]);

  // Desbloqueo automático tras la primera interacción del usuario cuando el navegador bloquea el autoplay
  useEffect(() => {
    if (!needsUserInteraction || !shouldPlayLobby) return;

    const unlockAndFadeIn = () => {
      if (!mountedRef.current || !shouldPlayLobbyRef.current) return;
      try {
        if (Howler.ctx && Howler.ctx.state === 'suspended') {
          Howler.ctx.resume().catch(() => {});
        }
      } catch {}

      const howl = activeHowlRef.current;
      if (howl) {
        clearPendingFadeTimer();
        const token = ++opTokenRef.current;
        const sid = activeSoundIdRef.current;
        howl.mute(false);
        howl.volume(0);
        if (sid !== null) {
          if (!howl.playing(sid)) {
            activeSoundIdRef.current = howl.play(sid);
          }
        } else if (!howl.playing()) {
          activeSoundIdRef.current = howl.play();
        }
        const targetVol = effectiveVolRef.current;
        isFadingRef.current = true;
        howl.fade(0, targetVol, FADE_IN_INITIAL_MS, activeSoundIdRef.current ?? undefined);
        fadeCleanupTimerRef.current = window.setTimeout(() => {
          if (opTokenRef.current === token) {
            isFadingRef.current = false;
          }
        }, FADE_IN_INITIAL_MS + 40);
        setIsHowlPlaying(true);
        setNeedsUserInteraction(false);
      } else {
        startOrCrossfadeLobbyTrack(style, trackIndex, FADE_IN_INITIAL_MS);
      }
    };

    window.addEventListener('pointerdown', unlockAndFadeIn, { capture: true, once: true });
    window.addEventListener('keydown', unlockAndFadeIn, { capture: true, once: true });
    window.addEventListener('touchstart', unlockAndFadeIn, { capture: true, once: true });

    return () => {
      window.removeEventListener('pointerdown', unlockAndFadeIn, { capture: true });
      window.removeEventListener('keydown', unlockAndFadeIn, { capture: true });
      window.removeEventListener('touchstart', unlockAndFadeIn, { capture: true });
    };
  }, [
    needsUserInteraction,
    shouldPlayLobby,
    style,
    trackIndex,
    clearPendingFadeTimer,
    startOrCrossfadeLobbyTrack,
  ]);

  // Sincronización inmediata de volumen y silencio de música cuando el jugador mueve el control deslizante
  useEffect(() => {
    const howl = activeHowlRef.current;
    if (!howl || !shouldPlayLobby) return;
    const targetVol = getEffectiveVolume();
    // Si estaba haciendo fade inicial pero el usuario silencia o ajusta manualmente el volumen, aplicamos de inmediato
    if (isFadingRef.current) {
      isFadingRef.current = false;
      clearPendingFadeTimer();
    }
    const sid = activeSoundIdRef.current;
    if (sid !== null) {
      howl.volume(targetVol, sid);
    } else {
      howl.volume(targetVol);
    }
  }, [musicVolume, musicMuted, musicEnabled, shouldPlayLobby, getEffectiveVolume, clearPendingFadeTimer]);

  // Limpieza total al desmontar la aplicación
  useEffect(() => {
    mountedRef.current = true;
    return () => {
      mountedRef.current = false;
      opTokenRef.current += 1;
      clearPendingFadeTimer();
      destroyHowl(activeHowlRef.current);
      activeHowlRef.current = null;
      activeSoundIdRef.current = null;
      activeKeyRef.current = null;
    };
  }, [clearPendingFadeTimer, destroyHowl]);

  // Acciones públicas para la interfaz
  const setStyle = useCallback(
    (nextStyle: MusicStyle) => {
      if (nextStyle === style) return;
      setStyleState(nextStyle);
      setTrackIndex(0);
    },
    [style]
  );

  const selectTrack = useCallback(
    (index: number) => {
      setTrackIndex(Math.max(0, index));
      if (!musicEnabled) {
        setMusicEnabled(true);
      }
      if (musicMuted) {
        setMusicMuted(false);
      }
    },
    [musicEnabled, musicMuted, setMusicEnabled, setMusicMuted]
  );

  const skipTrack = useCallback(() => {
    const list = playlists[style] || FALLBACK_PLAYLISTS[style];
    const nextIdx = (trackIndex + 1) % Math.max(1, list.length);
    setTrackIndex(nextIdx);
    if (!musicEnabled) {
      setMusicEnabled(true);
    }
  }, [playlists, style, trackIndex, musicEnabled, setMusicEnabled]);

  const activateMusic = useCallback(() => {
    try {
      if (Howler.ctx && Howler.ctx.state === 'suspended') {
        Howler.ctx.resume().catch(() => {});
      }
    } catch {}
    setMusicEnabled(true);
    setMusicMuted(false);
    setNeedsUserInteraction(false);
    // Si ya estaba en menú principal, forzamos arranque suave inmediato
    if (isInMainInterface && !isInMatch) {
      window.setTimeout(() => {
        startOrCrossfadeLobbyTrack(style, trackIndex, FADE_IN_INITIAL_MS);
      }, 20);
    }
  }, [
    isInMainInterface,
    isInMatch,
    setMusicEnabled,
    setMusicMuted,
    startOrCrossfadeLobbyTrack,
    style,
    trackIndex,
  ]);

  const togglePlayPause = useCallback(() => {
    if (needsUserInteraction) {
      activateMusic();
      return;
    }
    if (musicEnabled && !musicMuted) {
      setMusicEnabled(false);
    } else {
      activateMusic();
    }
  }, [activateMusic, musicEnabled, musicMuted, needsUserInteraction, setMusicEnabled]);

  const activeList = playlists[style] || FALLBACK_PLAYLISTS[style];
  const safeCurrentIdx =
    activeList.length > 0 ? ((trackIndex % activeList.length) + activeList.length) % activeList.length : 0;
  const currentTrackLabel = activeList[safeCurrentIdx]?.label || KASINO21_SIGNATURE_TRACK.label;
  const isPlaying = shouldPlayLobby && isHowlPlaying && !musicMuted && !needsUserInteraction;

  const value = useMemo<MusicContextValue>(
    () => ({
      style,
      playlists,
      trackIndex: safeCurrentIdx,
      currentTrackLabel,
      isPlaying,
      isInMatch,
      needsUserInteraction: needsUserInteraction && shouldPlayLobby && !musicMuted,
      setStyle,
      selectTrack,
      skipTrack,
      togglePlayPause,
      activateMusic,
    }),
    [
      activateMusic,
      currentTrackLabel,
      isInMatch,
      isPlaying,
      musicMuted,
      needsUserInteraction,
      playlists,
      safeCurrentIdx,
      selectTrack,
      setStyle,
      shouldPlayLobby,
      skipTrack,
      style,
      togglePlayPause,
    ]
  );

  return <MusicContext.Provider value={value}>{children}</MusicContext.Provider>;
}

export function useMusic() {
  const ctx = useContext(MusicContext);
  if (!ctx) {
    throw new Error('useMusic must be used within a MusicProvider');
  }
  return ctx;
}
