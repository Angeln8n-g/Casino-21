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
import { Platform } from 'react-native';
import { Audio, AVPlaybackStatus } from 'expo-av';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { usePathname } from 'expo-router';
import { supabase } from '../services/supabase';
import { useAudio } from './useAudio';

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
const LOBBY_VOLUME_SCALE = 0.4; // Idéntico a src/web/components/LobbyMusicSelector.tsx

const BUNDLED_LOBBY_CLASSIC = [
  require('../assets/audio/music/lobby_clasic_1.mp3'),
  require('../assets/audio/music/lobby_clasic_2.mp3'),
];

const BUNDLED_LOBBY_MODERN = [
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
  '/audio/lobby_clasic_1.mp3': BUNDLED_LOBBY_CLASSIC[0],
  '/audio/lobby_clasic_2.mp3': BUNDLED_LOBBY_CLASSIC[1],
  '/audio/lobby_moderno_1.mp3': BUNDLED_LOBBY_MODERN[0],
  '/audio/lobby_moderno_2.mp3': BUNDLED_LOBBY_MODERN[1],
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
      {
        id: 'fallback-lobby-modern-1',
        label: 'Moderno 1',
        localSource: BUNDLED_LOBBY_MODERN[0],
        category: 'lobby',
        style: 'modern',
        trackOrder: 1,
      },
      {
        id: 'fallback-lobby-modern-2',
        label: 'Moderno 2',
        localSource: BUNDLED_LOBBY_MODERN[1],
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

async function readStoredMusicSettings(): Promise< string | null> {
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

const MusicSettingsContext = createContext<MusicSettingsContextValue | undefined>(undefined);

export function MusicSettingsProvider({ children }: { children: ReactNode }) {
  const pathname = usePathname();
  const isInGame = pathname === '/game';
  const { volume, muted } = useAudio();

  const [style, setStyleState] = useState<MusicStyle>('classic');
  const [playlists, setPlaylists] = useState<PlaylistsMap>(FALLBACK_PLAYLISTS);
  const [isLoadingTracks, setIsLoadingTracks] = useState<boolean>(true);

  const [isLobbyPlaying, setIsLobbyPlaying] = useState<boolean>(false);
  const [lobbyTrackIndex, setLobbyTrackIndex] = useState<number>(0);

  const [isGameMusicPaused, setIsGameMusicPaused] = useState<boolean>(false);
  const [gameTrackIndex, setGameTrackIndex] = useState<number>(0);
  const [previewGameTrackIndex, setPreviewGameTrackIndex] = useState<number | null>(null);

  const [showSettingsModal, setShowSettingsModal] = useState<boolean>(false);

  const activeSoundRef = useRef<Audio.Sound | null>(null);
  const activeSoundKeyRef = useRef<string | null>(null);
  const requestIdRef = useRef<number>(0);
  const mountedRef = useRef<boolean>(true);
  const volumeStateRef = useRef({ volume, muted });
  volumeStateRef.current = { volume, muted };

  // 1. Cargar preferencia persistida (misma clave que Web: 'casino21_lobby_music')
  useEffect(() => {
    let active = true;
    readStoredMusicSettings()
      .then((stored) => {
        if (!active || !stored) return;
        const parsed = JSON.parse(stored);
        if (parsed.style === 'classic' || parsed.style === 'modern') {
          setStyleState(parsed.style);
        }
      })
      .catch(() => {});
    return () => {
      active = false;
    };
  }, []);

  // 2. Consultar pistas reales desde Supabase ('audio_tracks') igual que LobbyMusicSelector y useGameMusic en Web
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
            lobby: { classic: [], modern: [] },
            game: { classic: [], modern: [] },
          };

          data.forEach((row: any) => {
            const cat = row.category as MusicCategory;
            const st = row.style as MusicStyle;
            if ((cat === 'lobby' || cat === 'game') && (st === 'classic' || st === 'modern')) {
              const idx = next[cat][st].length;
              next[cat][st].push({
                id: String(row.id),
                label: String(row.name || `Pista ${idx + 1}`),
                src: String(row.src || ''),
                localSource: getFallbackAssetForTrack(cat, st, idx),
                category: cat,
                style: st,
                trackOrder: typeof row.track_order === 'number' ? row.track_order : idx + 1,
              });
            }
          });

          if (next.lobby.classic.length === 0) next.lobby.classic = FALLBACK_PLAYLISTS.lobby.classic;
          if (next.lobby.modern.length === 0) next.lobby.modern = FALLBACK_PLAYLISTS.lobby.modern;
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

  const persistStyle = useCallback((nextStyle: MusicStyle) => {
    writeStoredMusicSettings(JSON.stringify({ style: nextStyle })).catch(() => {});
  }, []);

  const unloadActiveLobbySound = useCallback(async () => {
    const prev = activeSoundRef.current;
    activeSoundRef.current = null;
    activeSoundKeyRef.current = null;
    if (prev) {
      try {
        await prev.stopAsync();
      } catch {}
      try {
        await prev.unloadAsync();
      } catch {}
    }
  }, []);

  // Al entrar a /game limpiamos cualquier preview de partida que estuviera abierto en el lobby
  useEffect(() => {
    if (isInGame && previewGameTrackIndex !== null) {
      setPreviewGameTrackIndex(null);
    }
  }, [isInGame, previewGameTrackIndex]);

  // 3. Motor unificado de reproducción para Lobby (y vista previa de pistas de Partida fuera de /game)
  useEffect(() => {
    const isPreviewingGame = !isInGame && previewGameTrackIndex !== null;
    const shouldPlayOutsideGame = !isInGame && (isPreviewingGame || isLobbyPlaying);

    if (!shouldPlayOutsideGame) {
      requestIdRef.current += 1;
      unloadActiveLobbySound();
      return;
    }

    const activeCategory: MusicCategory = isPreviewingGame ? 'game' : 'lobby';
    const currentPlaylist = playlists[activeCategory][style] || [];
    if (currentPlaylist.length === 0) {
      requestIdRef.current += 1;
      unloadActiveLobbySound();
      return;
    }

    const rawIndex = isPreviewingGame ? (previewGameTrackIndex ?? 0) : lobbyTrackIndex;
    const safeIndex = ((rawIndex % currentPlaylist.length) + currentPlaylist.length) % currentPlaylist.length;
    const track = currentPlaylist[safeIndex];
    const desiredKey = `${activeCategory}:${style}:${track.id}:${safeIndex}`;

    // Si ya está cargada exactamente esa pista, solo asegurar que esté reproduciendo
    if (activeSoundRef.current && activeSoundKeyRef.current === desiredKey) {
      const { volume: curVol, muted: curMuted } = volumeStateRef.current;
      const targetVol = curMuted ? 0 : Math.max(0, Math.min(1, curVol * LOBBY_VOLUME_SCALE));
      activeSoundRef.current
        .setStatusAsync({
          shouldPlay: true,
          volume: targetVol,
          isMuted: curMuted,
        })
        .catch(() => {});
      return;
    }

    const reqId = ++requestIdRef.current;

    const loadAndPlay = async () => {
      await unloadActiveLobbySound();
      if (!mountedRef.current || requestIdRef.current !== reqId) return;

      const { primary, fallbackLocal } = resolveTrackSource(track, safeIndex);
      const { volume: curVol, muted: curMuted } = volumeStateRef.current;
      const targetVol = curMuted ? 0 : Math.max(0, Math.min(1, curVol * LOBBY_VOLUME_SCALE));

      const onStatusUpdate = (status: AVPlaybackStatus) => {
        if (!mountedRef.current || requestIdRef.current !== reqId) return;
        if (status.isLoaded && status.didJustFinish && !status.isLooping) {
          // Auto-avanzar a la siguiente pista de Lobby igual que en Web
          setLobbyTrackIndex((prev) => (prev + 1) % Math.max(1, currentPlaylist.length));
        }
      };

      const initialStatus = {
        shouldPlay: true,
        isLooping: isPreviewingGame,
        volume: targetVol,
        isMuted: curMuted,
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
        // Respaldo local automático si falla la descarga remota
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
    };

    loadAndPlay();
  }, [
    isInGame,
    isLobbyPlaying,
    lobbyTrackIndex,
    previewGameTrackIndex,
    playlists,
    style,
    unloadActiveLobbySound,
  ]);

  // 4. Sincronizar volumen maestro y silencio en tiempo real sin reiniciar la pista
  useEffect(() => {
    const sound = activeSoundRef.current;
    if (!sound) return;
    const targetVol = muted ? 0 : Math.max(0, Math.min(1, volume * LOBBY_VOLUME_SCALE));
    sound
      .setStatusAsync({
        volume: targetVol,
        isMuted: muted,
      })
      .catch(() => {});
  }, [volume, muted]);

  // Limpieza al desmontar el árbol raíz
  useEffect(() => {
    mountedRef.current = true;
    return () => {
      mountedRef.current = false;
      requestIdRef.current += 1;
      unloadActiveLobbySound();
    };
  }, [unloadActiveLobbySound]);

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
      persistStyle(nextStyle);
    },
    [persistStyle, previewGameTrackIndex, style]
  );

  const toggleLobbyPlayPause = useCallback(() => {
    setPreviewGameTrackIndex(null);
    setIsLobbyPlaying((prev) => !prev);
  }, []);

  const selectLobbyTrack = useCallback((index: number) => {
    setPreviewGameTrackIndex(null);
    setLobbyTrackIndex(Math.max(0, index));
    setIsLobbyPlaying(true);
  }, []);

  const skipLobbyTrack = useCallback(() => {
    setPreviewGameTrackIndex(null);
    const len = Math.max(1, playlists.lobby[style]?.length || 1);
    setLobbyTrackIndex((prev) => (prev + 1) % len);
    setIsLobbyPlaying(true);
  }, [playlists.lobby, style]);

  const toggleGameMusicPause = useCallback(() => {
    setIsGameMusicPaused((prev) => !prev);
  }, []);

  const selectGameTrack = useCallback(
    (index: number, options?: { previewInLobby?: boolean }) => {
      const safeIdx = Math.max(0, index);
      setGameTrackIndex(safeIdx);
      setIsGameMusicPaused(false);
      if (!isInGame && options?.previewInLobby) {
        setPreviewGameTrackIndex(safeIdx);
      }
    },
    [isInGame]
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
      isLobbyPlaying,
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
