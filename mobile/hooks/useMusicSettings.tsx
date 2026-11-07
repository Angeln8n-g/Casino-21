import React, {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
  ReactNode,
} from 'react';
import { AppState, AppStateStatus, Platform } from 'react-native';
import { Audio, AVPlaybackStatus } from 'expo-av';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { usePathname } from 'expo-router';
import { supabase } from '../services/supabase';
import { useAudio } from './useAudio';
import { useAuth } from './useAuth';

export type MusicStyle = 'classic' | 'modern';
export type MusicCategory = 'lobby' | 'game';

export interface MusicTrackItem {
  id: string;
  label: string;
  src?: string;
  localSource?: number;
  category: MusicCategory;
  style: MusicStyle;
  trackOrder: number;
}

export type PlaylistsMap = Record<MusicCategory, Record<MusicStyle, MusicTrackItem[]>>;

interface MusicSettingsContextValue {
  style: MusicStyle;
  playlists: PlaylistsMap;
  isLoadingTracks: boolean;
  isInGame: boolean;
  // Lobby playback
  isLobbyPlaying: boolean;
  lobbyTrackIndex: number;
  toggleLobbyPlayPause: () => void;
  selectLobbyTrack: (index: number) => void;
  skipLobbyTrack: () => void;
  // Game playback & preview
  isGameMusicPaused: boolean;
  gameTrackIndex: number;
  previewGameTrackIndex: number | null;
  toggleGameMusicPause: () => void;
  selectGameTrack: (index: number, options?: { previewInLobby?: boolean }) => void;
  skipGameTrack: (options?: { previewInLobby?: boolean }) => void;
  stopGamePreview: () => void;
  advanceGameTrackOnScoring: () => void;
  resetGameMusicSession: () => void;
  // Shared style switcher
  setMusicStyle: (nextStyle: MusicStyle) => void;
  // Global settings modal state
  showSettingsModal: boolean;
  openSettingsModal: () => void;
  closeSettingsModal: () => void;
}

const LOBBY_MUSIC_SETTINGS_KEY = 'casino21_lobby_music';
const CURRENT_SCHEMA_VERSION = 2;
const LOBBY_VOLUME_SCALE = 0.52;
const FADE_IN_MS = 1500;
const FADE_OUT_MS = 800;

const BUNDLED_KASINO21_THEME = require('../assets/audio/music/kasino21_theme.mp3');

const BUNDLED_LOBBY_CLASSIC = [
  require('../assets/audio/music/lobby_clasic_1.mp3'),
  require('../assets/audio/music/lobby_clasic_2.mp3'),
];

const BUNDLED_LOBBY_MODERN = [
  BUNDLED_KASINO21_THEME,
  require('../assets/audio/music/lobby_moderno_1.mp3'),
  require('../assets/audio/music/lobby_moderno_2.mp3'),
];

const BUNDLED_GAME_CLASSIC = [
  require('../assets/audio/music/secuencia_clasic_1.mp3'),
  require('../assets/audio/music/secuencia_clasic_2.mp3'),
  require('../assets/audio/music/secuencia_clasic_3.mp3'),
  require('../assets/audio/music/secuencia_clasic_4.mp3'),
];

const BUNDLED_GAME_MODERN = [
  require('../assets/audio/music/secuencia_moderna_1.mp3'),
  require('../assets/audio/music/secuencia_moderna_2.mp3'),
  require('../assets/audio/music/secuencia_moderna_3.mp3'),
  require('../assets/audio/music/secuencia_moderna_4.mp3'),
];

const LOCAL_AUDIO_PATH_MAP: Record<string, number> = {
  '/audio/kasino21_theme.mp3': BUNDLED_KASINO21_THEME,
  '/audio/lobby_clasic_1.mp3': BUNDLED_LOBBY_CLASSIC[0],
  '/audio/lobby_clasic_2.mp3': BUNDLED_LOBBY_CLASSIC[1],
  '/audio/lobby_moderno_1.mp3': BUNDLED_LOBBY_MODERN[1],
  '/audio/lobby_moderno_2.mp3': BUNDLED_LOBBY_MODERN[2],
  '/audio/secuencia_clasic_1.mp3': BUNDLED_GAME_CLASSIC[0],
  '/audio/secuencia_clasic_2.mp3': BUNDLED_GAME_CLASSIC[1],
  '/audio/secuencia_clasic_3.mp3': BUNDLED_GAME_CLASSIC[2],
  '/audio/secuencia_clasic_4.mp3': BUNDLED_GAME_CLASSIC[3],
  '/audio/secuencia_1.mp3': BUNDLED_GAME_CLASSIC[0],
  '/audio/secuencia_2.mp3': BUNDLED_GAME_CLASSIC[1],
  '/audio/secuencia_3.mp3': BUNDLED_GAME_CLASSIC[2],
  '/audio/secuencia_4.mp3': BUNDLED_GAME_CLASSIC[3],
  '/audio/secuencia_moderna_1.mp3': BUNDLED_GAME_MODERN[0],
  '/audio/secuencia_moderna_2.mp3': BUNDLED_GAME_MODERN[1],
  '/audio/secuencia_moderna_3.mp3': BUNDLED_GAME_MODERN[2],
  '/audio/secuencia_moderna_4.mp3': BUNDLED_GAME_MODERN[3],
};

const SIGNATURE_LOBBY_TRACK: MusicTrackItem = {
  id: 'kasino21-arena-protocol',
  label: 'KASINO21 — Arena Protocol',
  src: '/audio/kasino21_theme.mp3',
  localSource: BUNDLED_KASINO21_THEME,
  category: 'lobby',
  style: 'modern',
  trackOrder: 0,
};

const FALLBACK_PLAYLISTS: PlaylistsMap = {
  lobby: {
    classic: [
      {
        id: 'fallback-lobby-classic-1',
        label: 'Clásico 1',
        localSource: BUNDLED_LOBBY_CLASSIC[0],
        category: 'lobby',
        style: 'classic',
        trackOrder: 1,
      },
      {
        id: 'fallback-lobby-classic-2',
        label: 'Clásico 2',
        localSource: BUNDLED_LOBBY_CLASSIC[1],
        category: 'lobby',
        style: 'classic',
        trackOrder: 2,
      },
    ],
    modern: [
      SIGNATURE_LOBBY_TRACK,
      {
        id: 'fallback-lobby-modern-1',
        label: 'Pulso Competitivo 1',
        localSource: BUNDLED_LOBBY_MODERN[1],
        category: 'lobby',
        style: 'modern',
        trackOrder: 1,
      },
      {
        id: 'fallback-lobby-modern-2',
        label: 'Pulso Competitivo 2',
        localSource: BUNDLED_LOBBY_MODERN[2],
        category: 'lobby',
        style: 'modern',
        trackOrder: 2,
      },
    ],
  },
  game: {
    classic: BUNDLED_GAME_CLASSIC.map((asset, idx) => ({
      id: `fallback-game-classic-${idx + 1}`,
      label: `Secuencia Clásica ${idx + 1}`,
      localSource: asset,
      category: 'game',
      style: 'classic',
      trackOrder: idx + 1,
    })),
    modern: BUNDLED_GAME_MODERN.map((asset, idx) => ({
      id: `fallback-game-modern-${idx + 1}`,
      label: `Secuencia Moderna ${idx + 1}`,
      localSource: asset,
      category: 'game',
      style: 'modern',
      trackOrder: idx + 1,
    })),
  },
};

export function getFallbackAssetForTrack(
  category: MusicCategory,
  style: MusicStyle,
  index: number
): number {
  const pool =
    category === 'lobby'
      ? style === 'modern'
        ? BUNDLED_LOBBY_MODERN
        : BUNDLED_LOBBY_CLASSIC
      : style === 'modern'
        ? BUNDLED_GAME_MODERN
        : BUNDLED_GAME_CLASSIC;
  return pool[Math.abs(index) % pool.length];
}

export function resolveTrackSource(
  track: MusicTrackItem,
  fallbackIndex: number
): { primary: { uri: string } | number; fallbackLocal: number } {
  const fallbackLocal =
    track.localSource ?? getFallbackAssetForTrack(track.category, track.style, fallbackIndex);

  if (!track.src) {
    return { primary: fallbackLocal, fallbackLocal };
  }

  const trimmed = track.src.trim();
  const normalizedLower = trimmed.toLowerCase();
  if (LOCAL_AUDIO_PATH_MAP[normalizedLower]) {
    return { primary: LOCAL_AUDIO_PATH_MAP[normalizedLower], fallbackLocal };
  }

  if (trimmed.startsWith('http://') || trimmed.startsWith('https://')) {
    return { primary: { uri: trimmed }, fallbackLocal };
  }

  if (trimmed.startsWith('/storage/v1/object/public/')) {
    const supaUrl = (
      process.env.EXPO_PUBLIC_SUPABASE_URL ||
      process.env.VITE_SUPABASE_URL ||
      'https://kasino21.com'
    ).replace(/\/$/, '');
    return { primary: { uri: `${supaUrl}${trimmed}` }, fallbackLocal };
  }

  if (trimmed.startsWith('/')) {
    const baseUrl = (
      process.env.EXPO_PUBLIC_SOCKET_URL ||
      process.env.VITE_SOCKET_URL ||
      'https://kasino21.com'
    ).replace(/\/$/, '');
    return { primary: { uri: `${baseUrl}${trimmed}` }, fallbackLocal };
  }

  return { primary: fallbackLocal, fallbackLocal };
}

async function readStoredMusicSettings(): Promise<string | null> {
  if (Platform.OS === 'web' && typeof window !== 'undefined' && window.localStorage) {
    return window.localStorage.getItem(LOBBY_MUSIC_SETTINGS_KEY);
  }
  return AsyncStorage.getItem(LOBBY_MUSIC_SETTINGS_KEY);
}

async function writeStoredMusicSettings(value: string): Promise<void> {
  if (Platform.OS === 'web' && typeof window !== 'undefined' && window.localStorage) {
    window.localStorage.setItem(LOBBY_MUSIC_SETTINGS_KEY, value);
    return;
  }
  await AsyncStorage.setItem(LOBBY_MUSIC_SETTINGS_KEY, value);
}

const sleep = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

const MusicSettingsContext = createContext<MusicSettingsContextValue | undefined>(undefined);

export function MusicSettingsProvider({ children }: { children: ReactNode }) {
  const pathname = usePathname();
  const isInGame = pathname === '/game';
  const isOnAuthScreen = pathname === '/auth';
  const { user, loading: authLoading } = useAuth();
  const {
    musicEnabled,
    musicMuted,
    musicVolume,
    setMusicEnabled,
    setMusicMuted,
    settingsHydrated,
  } = useAudio();

  const [style, setStyleState] = useState<MusicStyle>('modern');
  const [playlists, setPlaylists] = useState<PlaylistsMap>(FALLBACK_PLAYLISTS);
  const [isLoadingTracks, setIsLoadingTracks] = useState<boolean>(true);
  const [prefsHydrated, setPrefsHydrated] = useState<boolean>(false);

  const [isLobbyPlaying, setIsLobbyPlaying] = useState<boolean>(true);
  const [lobbyTrackIndex, setLobbyTrackIndex] = useState<number>(0);

  const [isGameMusicPaused, setIsGameMusicPaused] = useState<boolean>(false);
  const [gameTrackIndex, setGameTrackIndex] = useState<number>(0);
  const [previewGameTrackIndex, setPreviewGameTrackIndex] = useState<number | null>(null);

  const [showSettingsModal, setShowSettingsModal] = useState<boolean>(false);
  const [appIsActive, setAppIsActive] = useState<boolean>(
    AppState.currentState ? AppState.currentState === 'active' : true
  );

  const activeSoundRef = useRef<Audio.Sound | null>(null);
  const activeSoundKeyRef = useRef<string | null>(null);
  const currentAppliedVolRef = useRef<number>(0);
  const requestIdRef = useRef<number>(0);
  const fadeTokenRef = useRef<number>(0);
  const mountedRef = useRef<boolean>(true);

  const getEffectiveLobbyVolume = useCallback(() => {
    if (!musicEnabled || musicMuted) return 0;
    return Math.max(0, Math.min(1, musicVolume * LOBBY_VOLUME_SCALE));
  }, [musicEnabled, musicMuted, musicVolume]);

  const effectiveVolRef = useRef<number>(getEffectiveLobbyVolume());
  effectiveVolRef.current = getEffectiveLobbyVolume();

  const musicStateRef = useRef({ musicEnabled, musicMuted });
  musicStateRef.current = { musicEnabled, musicMuted };

  // Seguimiento de primer/segundo plano en dispositivos móviles
  useEffect(() => {
    const sub = AppState.addEventListener('change', (nextState: AppStateStatus) => {
      setAppIsActive(nextState === 'active');
    });
    return () => {
      sub.remove();
    };
  }, []);

  // 1. Cargar preferencia persistida (con migración automática a v2 -> KASINO21 Arena Protocol)
  useEffect(() => {
    let active = true;
    readStoredMusicSettings()
      .then((stored) => {
        if (!active) return;
        if (stored) {
          const parsed = JSON.parse(stored);
          if (parsed.schemaVersion === CURRENT_SCHEMA_VERSION) {
            if (parsed.style === 'classic' || parsed.style === 'modern') {
              setStyleState(parsed.style);
            }
            if (typeof parsed.lobbyTrackIndex === 'number' && parsed.lobbyTrackIndex >= 0) {
              setLobbyTrackIndex(parsed.lobbyTrackIndex);
            }
          } else {
            // Inicializar nueva identidad sonora KASINO21 por defecto
            writeStoredMusicSettings(
              JSON.stringify({
                schemaVersion: CURRENT_SCHEMA_VERSION,
                style: 'modern',
                lobbyTrackIndex: 0,
              })
            ).catch(() => {});
          }
        } else {
          writeStoredMusicSettings(
            JSON.stringify({
              schemaVersion: CURRENT_SCHEMA_VERSION,
              style: 'modern',
              lobbyTrackIndex: 0,
            })
          ).catch(() => {});
        }
      })
      .catch(() => {})
      .finally(() => {
        if (active) setPrefsHydrated(true);
      });
    return () => {
      active = false;
    };
  }, []);

  // Sincronizar isLobbyPlaying cuando el usuario activa/desactiva la música globalmente
  useEffect(() => {
    setIsLobbyPlaying(musicEnabled);
  }, [musicEnabled]);

  // 2. Consultar pistas reales desde Supabase manteniendo siempre KASINO21 — Arena Protocol como pista #1 en Moderno
  useEffect(() => {
    let active = true;

    const fetchAllAudioTracks = async () => {
      setIsLoadingTracks(true);
      try {
        const { data, error } = await supabase
          .from('audio_tracks')
          .select('*')
          .order('category')
          .order('style')
          .order('track_order');

        if (error) throw error;

        if (active && data && data.length > 0) {
          console.log('Audio tracks from API:', data.length);
          const next: PlaylistsMap = {
            lobby: { classic: [], modern: [SIGNATURE_LOBBY_TRACK] },
            game: { classic: [], modern: [] },
          };

          data.forEach((row: any) => {
            const cat = row.category as MusicCategory;
            const st = row.style as MusicStyle;
            const rawSrc = String(row.src || '');
            if (cat === 'lobby' && rawSrc.toLowerCase().includes('kasino21_theme')) {
              return;
            }
            if ((cat === 'lobby' || cat === 'game') && (st === 'classic' || st === 'modern')) {
              const idx = next[cat][st].length;
              next[cat][st].push({
                id: String(row.id),
                label: String(row.name || `Pista ${idx + 1}`),
                src: rawSrc,
                localSource: getFallbackAssetForTrack(cat, st, idx),
                category: cat,
                style: st,
                trackOrder: typeof row.track_order === 'number' ? row.track_order : idx + 1,
              });
            }
          });

          if (next.lobby.classic.length === 0) next.lobby.classic = FALLBACK_PLAYLISTS.lobby.classic;
          if (next.lobby.modern.length <= 1) next.lobby.modern = FALLBACK_PLAYLISTS.lobby.modern;
          if (next.game.classic.length === 0) next.game.classic = FALLBACK_PLAYLISTS.game.classic;
          if (next.game.modern.length === 0) next.game.modern = FALLBACK_PLAYLISTS.game.modern;

          setPlaylists(next);
        }
      } catch (err) {
        console.warn('[useMusicSettings] Error cargando audio_tracks desde Supabase:', err);
      } finally {
        if (active) setIsLoadingTracks(false);
      }
    };

    fetchAllAudioTracks();

    return () => {
      active = false;
    };
  }, []);

  const persistMusicPrefs = useCallback((nextStyle: MusicStyle, nextTrackIdx: number) => {
    writeStoredMusicSettings(
      JSON.stringify({
        schemaVersion: CURRENT_SCHEMA_VERSION,
        style: nextStyle,
        lobbyTrackIndex: nextTrackIdx,
      })
    ).catch(() => {});
  }, []);

  const rampSoundVolume = useCallback(
    async (
      sound: Audio.Sound,
      fromVol: number,
      toVol: number,
      durationMs: number,
      token: number
    ) => {
      const steps = 12;
      const stepDelay = Math.max(25, Math.round(durationMs / steps));
      for (let i = 1; i <= steps; i++) {
        await sleep(stepDelay);
        if (!mountedRef.current || fadeTokenRef.current !== token) return false;
        const progress = i / steps;
        const v = Math.max(0, Math.min(1, fromVol + (toVol - fromVol) * progress));
        currentAppliedVolRef.current = v;
        try {
          await sound.setStatusAsync({
            volume: v,
            isMuted: musicStateRef.current.musicMuted || !musicStateRef.current.musicEnabled,
          });
        } catch {
          return false;
        }
      }
      return true;
    },
    []
  );

  const fadeOutAndUnloadLobbySound = useCallback(
    async (durationMs: number = FADE_OUT_MS) => {
      const prev = activeSoundRef.current;
      activeSoundRef.current = null;
      activeSoundKeyRef.current = null;
      if (!prev) return;

      const startVol = currentAppliedVolRef.current;
      currentAppliedVolRef.current = 0;

      if (durationMs > 0 && startVol > 0.01) {
        const steps = 8;
        const stepDelay = Math.max(25, Math.round(durationMs / steps));
        for (let i = 1; i <= steps; i++) {
          const v = Math.max(0, startVol * (1 - i / steps));
          try {
            await prev.setStatusAsync({ volume: v });
          } catch {
            break;
          }
          await sleep(stepDelay);
        }
      }

      try {
        await prev.stopAsync();
      } catch {}
      try {
        await prev.unloadAsync();
      } catch {}
    },
    []
  );

  // Al entrar a /game limpiamos cualquier preview de partida que estuviera abierto en el lobby
  useEffect(() => {
    if (isInGame && previewGameTrackIndex !== null) {
      setPreviewGameTrackIndex(null);
    }
  }, [isInGame, previewGameTrackIndex]);

  // 3. Motor unificado de reproducción para la interfaz principal con Fade In, Bucle y Fade Out al entrar a partida
  const isReadyInMainMenu =
    settingsHydrated && prefsHydrated && !authLoading && Boolean(user) && !isOnAuthScreen;

  useEffect(() => {
    const isPreviewingGame = !isInGame && previewGameTrackIndex !== null;
    const shouldPlayOutsideGame =
      isReadyInMainMenu &&
      appIsActive &&
      !isInGame &&
      (isPreviewingGame || (musicEnabled && isLobbyPlaying));

    if (!shouldPlayOutsideGame) {
      requestIdRef.current += 1;
      fadeTokenRef.current += 1;
      fadeOutAndUnloadLobbySound(isInGame || !musicEnabled ? FADE_OUT_MS : 350);
      return;
    }

    const activeCategory: MusicCategory = isPreviewingGame ? 'game' : 'lobby';
    const currentPlaylist = playlists[activeCategory][style] || [];
    if (currentPlaylist.length === 0) {
      requestIdRef.current += 1;
      fadeOutAndUnloadLobbySound(300);
      return;
    }

    const rawIndex = isPreviewingGame ? (previewGameTrackIndex ?? 0) : lobbyTrackIndex;
    const safeIndex =
      ((rawIndex % currentPlaylist.length) + currentPlaylist.length) % currentPlaylist.length;
    const track = currentPlaylist[safeIndex];
    const desiredKey = `${activeCategory}:${style}:${track.id}:${safeIndex}`;

    // Si ya está cargada exactamente esa pista, asegurar reproducción y recuperar volumen con Fade In si estaba en 0
    if (activeSoundRef.current && activeSoundKeyRef.current === desiredKey) {
      const sound = activeSoundRef.current;
      const targetVol = effectiveVolRef.current;
      const token = ++fadeTokenRef.current;
      sound
        .setStatusAsync({
          shouldPlay: true,
          isLooping: true,
          isMuted: musicStateRef.current.musicMuted,
        })
        .then(() => {
          if (currentAppliedVolRef.current < targetVol * 0.5 && targetVol > 0) {
            rampSoundVolume(sound, currentAppliedVolRef.current, targetVol, FADE_IN_MS, token);
          } else {
            currentAppliedVolRef.current = targetVol;
            sound.setStatusAsync({ volume: targetVol }).catch(() => {});
          }
        })
        .catch(() => {});
      return;
    }

    const reqId = ++requestIdRef.current;

    const loadAndFadeIn = async () => {
      await fadeOutAndUnloadLobbySound(activeSoundRef.current ? 550 : 0);
      if (!mountedRef.current || requestIdRef.current !== reqId) return;

      const { primary, fallbackLocal } = resolveTrackSource(track, safeIndex);
      const isMutedNow = musicStateRef.current.musicMuted || !musicStateRef.current.musicEnabled;

      const onStatusUpdate = (status: AVPlaybackStatus) => {
        if (!mountedRef.current || requestIdRef.current !== reqId) return;
        if (status.isLoaded && status.didJustFinish && !status.isLooping) {
          setLobbyTrackIndex((prev) => (prev + 1) % Math.max(1, currentPlaylist.length));
        }
      };

      // Arrancar en volumen 0 con isLooping: true para realizar un Fade In limpio y bucle continuo en el menú principal
      const initialStatus = {
        shouldPlay: true,
        isLooping: true,
        volume: 0,
        isMuted: isMutedNow,
      };

      let loadedSound: Audio.Sound | null = null;
      try {
        const isBundledNumber = typeof primary === 'number';
        const { sound } = await Audio.Sound.createAsync(
          primary,
          initialStatus,
          onStatusUpdate,
          isBundledNumber ? false : undefined
        );
        loadedSound = sound;
      } catch (err) {
        try {
          const { sound } = await Audio.Sound.createAsync(
            fallbackLocal,
            initialStatus,
            onStatusUpdate,
            false
          );
          loadedSound = sound;
        } catch (fallbackErr) {
          console.warn('[useMusicSettings] Error cargando pista de audio:', err, fallbackErr);
        }
      }

      if (!loadedSound) return;

      if (!mountedRef.current || requestIdRef.current !== reqId) {
        loadedSound
          .stopAsync()
          .then(() => loadedSound?.unloadAsync())
          .catch(() => {});
        return;
      }

      activeSoundRef.current = loadedSound;
      activeSoundKeyRef.current = desiredKey;
      currentAppliedVolRef.current = 0;

      const targetVol = effectiveVolRef.current;
      if (targetVol > 0) {
        const token = ++fadeTokenRef.current;
        await rampSoundVolume(loadedSound, 0, targetVol, FADE_IN_MS, token);
      }
    };

    loadAndFadeIn();
  }, [
    isReadyInMainMenu,
    appIsActive,
    isInGame,
    musicEnabled,
    isLobbyPlaying,
    lobbyTrackIndex,
    previewGameTrackIndex,
    playlists,
    style,
    fadeOutAndUnloadLobbySound,
    rampSoundVolume,
  ]);

  // 4. Sincronizar volumen de música y silencio en tiempo real cuando el jugador mueve el slider
  useEffect(() => {
    const sound = activeSoundRef.current;
    if (!sound) return;
    fadeTokenRef.current += 1; // Cancelar rampa en curso para respuesta inmediata al control del usuario
    const targetVol = getEffectiveLobbyVolume();
    currentAppliedVolRef.current = targetVol;
    sound
      .setStatusAsync({
        volume: targetVol,
        isMuted: musicMuted || !musicEnabled,
      })
      .catch(() => {});
  }, [musicVolume, musicMuted, musicEnabled, getEffectiveLobbyVolume]);

  // Limpieza al desmontar el árbol raíz
  useEffect(() => {
    mountedRef.current = true;
    return () => {
      mountedRef.current = false;
      requestIdRef.current += 1;
      fadeTokenRef.current += 1;
      fadeOutAndUnloadLobbySound(0);
    };
  }, [fadeOutAndUnloadLobbySound]);

  // ── Acciones ────────────────────────────────────────────────────────────────
  const setMusicStyle = useCallback(
    (nextStyle: MusicStyle) => {
      if (nextStyle === style) return;
      setStyleState(nextStyle);
      setLobbyTrackIndex(0);
      setGameTrackIndex(0);
      if (previewGameTrackIndex !== null) {
        setPreviewGameTrackIndex(0);
      }
      persistMusicPrefs(nextStyle, 0);
    },
    [persistMusicPrefs, previewGameTrackIndex, style]
  );

  const toggleLobbyPlayPause = useCallback(() => {
    setPreviewGameTrackIndex(null);
    if (musicEnabled && isLobbyPlaying && !musicMuted) {
      setIsLobbyPlaying(false);
      setMusicEnabled(false);
    } else {
      setIsLobbyPlaying(true);
      setMusicEnabled(true);
      if (musicMuted) setMusicMuted(false);
    }
  }, [isLobbyPlaying, musicEnabled, musicMuted, setMusicEnabled, setMusicMuted]);

  const selectLobbyTrack = useCallback(
    (index: number) => {
      const safe = Math.max(0, index);
      setPreviewGameTrackIndex(null);
      setLobbyTrackIndex(safe);
      setIsLobbyPlaying(true);
      if (!musicEnabled) setMusicEnabled(true);
      if (musicMuted) setMusicMuted(false);
      persistMusicPrefs(style, safe);
    },
    [musicEnabled, musicMuted, persistMusicPrefs, setMusicEnabled, setMusicMuted, style]
  );

  const skipLobbyTrack = useCallback(() => {
    setPreviewGameTrackIndex(null);
    const len = Math.max(1, playlists.lobby[style]?.length || 1);
    setLobbyTrackIndex((prev) => {
      const next = (prev + 1) % len;
      persistMusicPrefs(style, next);
      return next;
    });
    setIsLobbyPlaying(true);
    if (!musicEnabled) setMusicEnabled(true);
  }, [musicEnabled, persistMusicPrefs, playlists.lobby, setMusicEnabled, style]);

  const toggleGameMusicPause = useCallback(() => {
    setIsGameMusicPaused((prev) => !prev);
  }, []);

  const selectGameTrack = useCallback(
    (index: number, options?: { previewInLobby?: boolean }) => {
      const safeIdx = Math.max(0, index);
      setGameTrackIndex(safeIdx);
      setIsGameMusicPaused(false);
      if (!musicEnabled) setMusicEnabled(true);
      if (musicMuted) setMusicMuted(false);
      if (!isInGame && options?.previewInLobby) {
        setPreviewGameTrackIndex(safeIdx);
      }
    },
    [isInGame, musicEnabled, musicMuted, setMusicEnabled, setMusicMuted]
  );

  const skipGameTrack = useCallback(
    (options?: { previewInLobby?: boolean }) => {
      const len = Math.max(1, playlists.game[style]?.length || 1);
      setGameTrackIndex((prev) => {
        const nextIdx = (prev + 1) % len;
        if (!isInGame && options?.previewInLobby) {
          setPreviewGameTrackIndex(nextIdx);
        }
        return nextIdx;
      });
      setIsGameMusicPaused(false);
    },
    [isInGame, playlists.game, style]
  );

  const stopGamePreview = useCallback(() => {
    setPreviewGameTrackIndex(null);
  }, []);

  const advanceGameTrackOnScoring = useCallback(() => {
    const len = Math.max(1, playlists.game[style]?.length || 1);
    setGameTrackIndex((prev) => (prev + 1) % len);
  }, [playlists.game, style]);

  const resetGameMusicSession = useCallback(() => {
    setIsGameMusicPaused(false);
  }, []);

  const openSettingsModal = useCallback(() => {
    setShowSettingsModal(true);
  }, []);

  const closeSettingsModal = useCallback(() => {
    setPreviewGameTrackIndex(null);
    setShowSettingsModal(false);
  }, []);

  const value = useMemo<MusicSettingsContextValue>(
    () => ({
      style,
      playlists,
      isLoadingTracks,
      isInGame,
      isLobbyPlaying: musicEnabled && isLobbyPlaying,
      lobbyTrackIndex,
      toggleLobbyPlayPause,
      selectLobbyTrack,
      skipLobbyTrack,
      isGameMusicPaused,
      gameTrackIndex,
      previewGameTrackIndex,
      toggleGameMusicPause,
      selectGameTrack,
      skipGameTrack,
      stopGamePreview,
      advanceGameTrackOnScoring,
      resetGameMusicSession,
      setMusicStyle,
      showSettingsModal,
      openSettingsModal,
      closeSettingsModal,
    }),
    [
      advanceGameTrackOnScoring,
      closeSettingsModal,
      gameTrackIndex,
      isGameMusicPaused,
      isInGame,
      isLoadingTracks,
      isLobbyPlaying,
      lobbyTrackIndex,
      musicEnabled,
      openSettingsModal,
      playlists,
      previewGameTrackIndex,
      resetGameMusicSession,
      selectGameTrack,
      selectLobbyTrack,
      setMusicStyle,
      showSettingsModal,
      skipGameTrack,
      skipLobbyTrack,
      stopGamePreview,
      style,
      toggleGameMusicPause,
      toggleLobbyPlayPause,
    ]
  );

  return (
    <MusicSettingsContext.Provider value={value}>
      {children}
    </MusicSettingsContext.Provider>
  );
}

export function useMusicSettings() {
  const context = useContext(MusicSettingsContext);
  if (!context) {
    throw new Error('useMusicSettings debe ser usado dentro de un MusicSettingsProvider');
  }
  return context;
}
