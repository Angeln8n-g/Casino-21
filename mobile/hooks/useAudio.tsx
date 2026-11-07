import React, {
  createContext,
  useContext,
  useState,
  useEffect,
  useCallback,
  useMemo,
  ReactNode,
  useRef,
} from 'react';
import { Platform } from 'react-native';
import { Audio } from 'expo-av';
import AsyncStorage from '@react-native-async-storage/async-storage';

export type AudioCue =
  | 'cardDeal'
  | 'cardPlay'
  | 'chipsClink'
  | 'matchFound'
  | 'virado'
  | 'viradoOut'
  | 'victory'
  | 'defeat'
  | 'error'
  | 'alert'
  | 'notification'
  | 'turnChange'
  | 'emoteIn'
  | 'emoteOut';

interface PlaySfxOptions {
  playbackRate?: number;
  volumeMultiplier?: number;
}

export interface AudioContextValue {
  // Efectos de sonido (SFX) — mantiene alias muted/volume para retrocompatibilidad
  muted: boolean;
  volume: number;
  sfxMuted: boolean;
  sfxVolume: number;
  setMuted: (value: boolean) => void;
  toggleMuted: () => void;
  setVolume: (value: number) => void;
  setSfxMuted: (value: boolean) => void;
  toggleSfxMuted: () => void;
  setSfxVolume: (value: number) => void;

  // Música (independiente de efectos de sonido)
  musicEnabled: boolean;
  musicMuted: boolean;
  musicVolume: number;
  setMusicEnabled: (value: boolean) => void;
  toggleMusicEnabled: () => void;
  setMusicMuted: (value: boolean) => void;
  toggleMusicMuted: () => void;
  setMusicVolume: (value: number) => void;

  settingsHydrated: boolean;

  playSfx: (cue: AudioCue, options?: PlaySfxOptions) => void;
  playUrl: (url: string, options?: PlaySfxOptions) => void;
  startLoop: (id: string, cue: AudioCue, options?: PlaySfxOptions) => void;
  startUrlLoop: (id: string, url: string, options?: PlaySfxOptions) => void;
  stopLoop: (id: string) => void;
}

const AudioContext = createContext<AudioContextValue | undefined>(undefined);

const AUDIO_SETTINGS_KEY = 'casino21_audio_settings';

interface CueConfig {
  source: any;
  baseVolume: number;
  cooldownMs: number;
  poolSize: number;
}

// Catálogo sincronizado con mobile/assets/audio/sfx/
const AUDIO_CATALOG: Record<AudioCue, CueConfig> = {
  cardDeal: {
    source: require('../assets/audio/sfx/card_deal.mp3'),
    baseVolume: 0.7,
    cooldownMs: 150,
    poolSize: 2,
  },
  cardPlay: {
    source: require('../assets/audio/sfx/card_play.mp3'),
    baseVolume: 0.55,
    cooldownMs: 60,
    poolSize: 3,
  },
  chipsClink: {
    source: require('../assets/audio/sfx/clips_click.mp3'),
    baseVolume: 0.75,
    cooldownMs: 110,
    poolSize: 2,
  },
  // Reservado estrictamente para duelos y desafíos (GameInvitationModal / Matchmaking)
  matchFound: {
    source: require('../assets/audio/sfx/steel_over_stone.mp3'),
    baseVolume: 0.5,
    cooldownMs: 500,
    poolSize: 1,
  },
  alert: {
    source: require('../assets/audio/sfx/steel_over_stone.mp3'),
    baseVolume: 0.35,
    cooldownMs: 400,
    poolSize: 1,
  },
  // Notificación breve y moderna para avisos generales (nunca reproduce steel_over_stone)
  notification: {
    source: require('../assets/audio/sfx/ui_notify.mp3'),
    baseVolume: 0.48,
    cooldownMs: 250,
    poolSize: 1,
  },
  virado: {
    source: require('../assets/audio/sfx/virado.mp3'),
    baseVolume: 0.85,
    cooldownMs: 800,
    poolSize: 1,
  },
  viradoOut: {
    source: require('../assets/audio/sfx/stomach_thumps.mp3'),
    baseVolume: 0.75,
    cooldownMs: 800,
    poolSize: 1,
  },
  victory: {
    source: require('../assets/audio/sfx/victory.mp3'),
    baseVolume: 0.85,
    cooldownMs: 1200,
    poolSize: 1,
  },
  defeat: {
    source: require('../assets/audio/sfx/error_play.mp3'),
    baseVolume: 0.6,
    cooldownMs: 1000,
    poolSize: 1,
  },
  error: {
    source: require('../assets/audio/sfx/error_play.mp3'),
    baseVolume: 0.45,
    cooldownMs: 180,
    poolSize: 2,
  },
  turnChange: {
    source: require('../assets/audio/sfx/sfx_impact22.mp3'),
    baseVolume: 0.6,
    cooldownMs: 450,
    poolSize: 1,
  },
  emoteIn: {
    source: require('../assets/audio/sfx/rake_swing_whoosh_close.mp3'),
    baseVolume: 0.8,
    cooldownMs: 300,
    poolSize: 1,
  },
  emoteOut: {
    source: require('../assets/audio/sfx/sniffle.mp3'),
    baseVolume: 0.7,
    cooldownMs: 300,
    poolSize: 1,
  },
};

const clamp = (value: number, min: number, max: number) =>
  Math.min(max, Math.max(min, value));

async function readAudioStorage(): Promise<string | null> {
  if (Platform.OS === 'web' && typeof window !== 'undefined' && window.localStorage) {
    return window.localStorage.getItem(AUDIO_SETTINGS_KEY);
  }
  return AsyncStorage.getItem(AUDIO_SETTINGS_KEY);
}

async function writeAudioStorage(value: string): Promise<void> {
  if (Platform.OS === 'web' && typeof window !== 'undefined' && window.localStorage) {
    window.localStorage.setItem(AUDIO_SETTINGS_KEY, value);
    return;
  }
  await AsyncStorage.setItem(AUDIO_SETTINGS_KEY, value);
}

interface LoopEntry {
  sound: Audio.Sound;
  baseVolume: number;
  volumeMultiplier: number;
}

export function AudioProvider({ children }: { children: ReactNode }) {
  const [sfxMuted, setSfxMutedState] = useState(false);
  const [sfxVolume, setSfxVolumeState] = useState(0.75);
  const [musicEnabled, setMusicEnabledState] = useState(true);
  const [musicMuted, setMusicMutedState] = useState(false);
  const [musicVolume, setMusicVolumeState] = useState(0.7);
  const [settingsHydrated, setSettingsHydrated] = useState(false);

  const stateRef = useRef({
    sfxMuted: false,
    sfxVolume: 0.75,
    musicEnabled: true,
    musicMuted: false,
    musicVolume: 0.7,
  });

  const loopsRef = useRef<Map<string, LoopEntry>>(new Map());
  const soundPoolsRef = useRef<Map<AudioCue, Audio.Sound[]>>(new Map());
  const poolIndexRef = useRef<Map<AudioCue, number>>(new Map());
  const lastPlayTimesRef = useRef<Map<AudioCue, number>>(new Map());

  const persistAll = useCallback((next: typeof stateRef.current) => {
    stateRef.current = next;
    writeAudioStorage(
      JSON.stringify({
        sfxMuted: next.sfxMuted,
        sfxVolume: next.sfxVolume,
        musicEnabled: next.musicEnabled,
        musicMuted: next.musicMuted,
        musicVolume: next.musicVolume,
        muted: next.sfxMuted,
        volume: next.sfxVolume,
      })
    ).catch(() => {});
  }, []);

  useEffect(() => {
    let isMounted = true;

    Audio.setAudioModeAsync({
      playsInSilentModeIOS: true,
      staysActiveInBackground: false,
      shouldDuckAndroid: true,
      playThroughEarpieceAndroid: false,
    }).catch(() => {});

    readAudioStorage()
      .then((res) => {
        if (!isMounted) return;
        if (res) {
          try {
            const parsed = JSON.parse(res);
            const loadedSfxMuted =
              typeof parsed.sfxMuted === 'boolean'
                ? parsed.sfxMuted
                : typeof parsed.muted === 'boolean'
                  ? parsed.muted
                  : false;
            const loadedSfxVol = clamp(
              typeof parsed.sfxVolume === 'number'
                ? parsed.sfxVolume
                : typeof parsed.volume === 'number'
                  ? parsed.volume
                  : 0.75,
              0,
              1
            );
            const loadedMusicEnabled =
              typeof parsed.musicEnabled === 'boolean' ? parsed.musicEnabled : true;
            const loadedMusicMuted =
              typeof parsed.musicMuted === 'boolean' ? parsed.musicMuted : false;
            const loadedMusicVol = clamp(
              typeof parsed.musicVolume === 'number' ? parsed.musicVolume : 0.7,
              0,
              1
            );

            stateRef.current = {
              sfxMuted: loadedSfxMuted,
              sfxVolume: loadedSfxVol,
              musicEnabled: loadedMusicEnabled,
              musicMuted: loadedMusicMuted,
              musicVolume: loadedMusicVol,
            };

            setSfxMutedState(loadedSfxMuted);
            setSfxVolumeState(loadedSfxVol);
            setMusicEnabledState(loadedMusicEnabled);
            setMusicMutedState(loadedMusicMuted);
            setMusicVolumeState(loadedMusicVol);
          } catch {}
        }
      })
      .finally(() => {
        if (isMounted) setSettingsHydrated(true);
      });

    const preloadAll = async () => {
      const cues = Object.keys(AUDIO_CATALOG) as AudioCue[];
      for (const cue of cues) {
        if (!isMounted) break;
        const config = AUDIO_CATALOG[cue];
        if (!config) continue;
        try {
          const { sound } = await Audio.Sound.createAsync(
            config.source,
            {
              shouldPlay: false,
              volume: config.baseVolume,
            },
            null,
            false
          );
          if (isMounted) {
            soundPoolsRef.current.set(cue, [sound]);
            poolIndexRef.current.set(cue, 0);
          } else {
            sound.unloadAsync().catch(() => {});
          }
        } catch (err) {
          console.warn(`[useAudio] Error preloading cue ${cue}:`, err);
        }
      }
    };

    preloadAll();

    return () => {
      isMounted = false;
      loopsRef.current.forEach((entry) => {
        entry.sound
          .stopAsync()
          .then(() => entry.sound.unloadAsync())
          .catch(() => {});
      });
      loopsRef.current.clear();

      soundPoolsRef.current.forEach((pool) => {
        pool.forEach((s) => s.unloadAsync().catch(() => {}));
      });
      soundPoolsRef.current.clear();
    };
  }, []);

  // Sincronizar volumen y silencio de SFX en loops activos (p. ej. modal de desafío)
  useEffect(() => {
    loopsRef.current.forEach((entry) => {
      const targetVol = sfxMuted
        ? 0
        : clamp(sfxVolume * entry.baseVolume * entry.volumeMultiplier, 0, 1);
      entry.sound
        .setStatusAsync({
          volume: targetVol,
          isMuted: sfxMuted,
        })
        .catch(() => {});
    });
  }, [sfxMuted, sfxVolume]);

  const setSfxMuted = useCallback(
    (value: boolean) => {
      setSfxMutedState(value);
      persistAll({ ...stateRef.current, sfxMuted: value });
    },
    [persistAll]
  );

  const toggleSfxMuted = useCallback(() => {
    const next = !stateRef.current.sfxMuted;
    setSfxMutedState(next);
    persistAll({ ...stateRef.current, sfxMuted: next });
  }, [persistAll]);

  const setSfxVolume = useCallback(
    (value: number) => {
      const clamped = clamp(value, 0, 1);
      setSfxVolumeState(clamped);
      persistAll({ ...stateRef.current, sfxVolume: clamped });
    },
    [persistAll]
  );

  const setMusicEnabled = useCallback(
    (value: boolean) => {
      setMusicEnabledState(value);
      persistAll({ ...stateRef.current, musicEnabled: value });
    },
    [persistAll]
  );

  const toggleMusicEnabled = useCallback(() => {
    const next = !stateRef.current.musicEnabled;
    setMusicEnabledState(next);
    persistAll({ ...stateRef.current, musicEnabled: next });
  }, [persistAll]);

  const setMusicMuted = useCallback(
    (value: boolean) => {
      setMusicMutedState(value);
      persistAll({ ...stateRef.current, musicMuted: value });
    },
    [persistAll]
  );

  const toggleMusicMuted = useCallback(() => {
    const next = !stateRef.current.musicMuted;
    setMusicMutedState(next);
    persistAll({ ...stateRef.current, musicMuted: next });
  }, [persistAll]);

  const setMusicVolume = useCallback(
    (value: number) => {
      const clamped = clamp(value, 0, 1);
      setMusicVolumeState(clamped);
      persistAll({ ...stateRef.current, musicVolume: clamped });
    },
    [persistAll]
  );

  const playSfx = useCallback(
    async (cue: AudioCue, options?: PlaySfxOptions) => {
      if (sfxMuted) return;

      const config = AUDIO_CATALOG[cue];
      if (!config) return;

      const now = Date.now();
      const lastPlay = lastPlayTimesRef.current.get(cue) || 0;
      if (config.cooldownMs && now - lastPlay < config.cooldownMs) return;
      lastPlayTimesRef.current.set(cue, now);

      const targetVol = clamp(
        sfxVolume * config.baseVolume * (options?.volumeMultiplier ?? 1),
        0,
        1
      );

      const pool = soundPoolsRef.current.get(cue);
      if (pool && pool.length > 0) {
        const idx = (poolIndexRef.current.get(cue) || 0) % pool.length;
        poolIndexRef.current.set(cue, idx + 1);
        const sound = pool[idx];

        try {
          await sound.replayAsync({
            positionMillis: 0,
            volume: targetVol,
            shouldPlay: true,
          });
          return;
        } catch {
          try {
            await sound.setPositionAsync(0);
            await sound.setVolumeAsync(targetVol);
            await sound.playAsync();
            return;
          } catch {}
        }
      }

      try {
        const { sound } = await Audio.Sound.createAsync(
          config.source,
          {
            shouldPlay: true,
            volume: targetVol,
          },
          (status) => {
            if (status.isLoaded && status.didJustFinish) {
              sound.unloadAsync().catch(() => {});
            }
          },
          false
        );
      } catch (err) {
        console.warn(`[useAudio] Error reproduciendo fallback SFX ${cue}:`, err);
      }
    },
    [sfxMuted, sfxVolume]
  );

  const playUrl = useCallback(
    async (url: string, options?: PlaySfxOptions) => {
      if (sfxMuted || !url) return;
      try {
        const vol = clamp(sfxVolume * (options?.volumeMultiplier ?? 1), 0, 1);
        const rate = clamp(options?.playbackRate ?? 1.0, 0.6, 1.8);
        const { sound } = await Audio.Sound.createAsync(
          { uri: url },
          { shouldPlay: true, volume: vol, rate, shouldCorrectPitch: true },
          (status) => {
            if (status.isLoaded && status.didJustFinish) {
              sound.unloadAsync().catch(() => {});
            }
          }
        );
      } catch {}
    },
    [sfxMuted, sfxVolume]
  );

  const stopLoop = useCallback(async (id: string) => {
    const existing = loopsRef.current.get(id);
    if (!existing) return;
    loopsRef.current.delete(id);
    try {
      await existing.sound.stopAsync();
      await existing.sound.unloadAsync();
    } catch {}
  }, []);

  const startLoop = useCallback(
    async (id: string, cue: AudioCue, options?: PlaySfxOptions) => {
      await stopLoop(id);
      const config = AUDIO_CATALOG[cue];
      if (!config) return;

      try {
        const volMult = options?.volumeMultiplier ?? 1;
        const targetVol = sfxMuted
          ? 0
          : clamp(sfxVolume * config.baseVolume * volMult, 0, 1);
        const rate = clamp(options?.playbackRate ?? 1.0, 0.6, 1.8);

        const { sound } = await Audio.Sound.createAsync(
          config.source,
          {
            shouldPlay: true,
            isLooping: true,
            volume: targetVol,
            isMuted: sfxMuted,
            rate,
            shouldCorrectPitch: true,
          },
          null,
          false
        );
        loopsRef.current.set(id, {
          sound,
          baseVolume: config.baseVolume,
          volumeMultiplier: volMult,
        });
      } catch {}
    },
    [sfxMuted, stopLoop, sfxVolume]
  );

  const startUrlLoop = useCallback(
    async (id: string, url: string, options?: PlaySfxOptions) => {
      await stopLoop(id);
      if (!url) return;

      try {
        const volMult = options?.volumeMultiplier ?? 1;
        const targetVol = sfxMuted ? 0 : clamp(sfxVolume * volMult, 0, 1);
        const rate = clamp(options?.playbackRate ?? 1.0, 0.6, 1.8);

        const { sound } = await Audio.Sound.createAsync(
          { uri: url },
          {
            shouldPlay: true,
            isLooping: true,
            volume: targetVol,
            isMuted: sfxMuted,
            rate,
            shouldCorrectPitch: true,
          }
        );
        loopsRef.current.set(id, {
          sound,
          baseVolume: 1.0,
          volumeMultiplier: volMult,
        });
      } catch {}
    },
    [sfxMuted, stopLoop, sfxVolume]
  );

  const value = useMemo<AudioContextValue>(
    () => ({
      muted: sfxMuted,
      volume: sfxVolume,
      sfxMuted,
      sfxVolume,
      setMuted: setSfxMuted,
      toggleMuted: toggleSfxMuted,
      setVolume: setSfxVolume,
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
      settingsHydrated,
      playSfx,
      playUrl,
      startLoop,
      startUrlLoop,
      stopLoop,
    }),
    [
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
      settingsHydrated,
      playSfx,
      playUrl,
      startLoop,
      startUrlLoop,
      stopLoop,
    ]
  );

  return <AudioContext.Provider value={value}>{children}</AudioContext.Provider>;
}

export function useAudio() {
  const context = useContext(AudioContext);
  if (!context) {
    throw new Error('useAudio debe ser usado dentro de un AudioProvider');
  }
  return context;
}
