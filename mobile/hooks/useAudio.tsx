import React, {
  createContext,
  useContext,
  useState,
  useEffect,
  useCallback,
  ReactNode,
  useRef,
} from 'react';
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
  | 'turnChange'
  | 'emoteIn'
  | 'emoteOut';

interface PlaySfxOptions {
  playbackRate?: number;
  volumeMultiplier?: number;
}

interface AudioContextValue {
  muted: boolean;
  volume: number;
  setMuted: (value: boolean) => void;
  toggleMuted: () => void;
  setVolume: (value: number) => void;
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

// Catálogo sincronizado con src/web/hooks/useAudio.tsx (mismos baseVolume y cooldownMs)
const AUDIO_CATALOG: Record<AudioCue, CueConfig> = {
  cardDeal: {
    source: require('../../src/Public/card_deal.mp3'),
    baseVolume: 0.7,
    cooldownMs: 150,
    poolSize: 2,
  },
  cardPlay: {
    source: require('../../src/Public/card_play.mp3'),
    baseVolume: 0.55,
    cooldownMs: 60,
    poolSize: 3,
  },
  chipsClink: {
    source: require('../../src/Public/clips_click.mp3'),
    baseVolume: 0.75,
    cooldownMs: 110,
    poolSize: 2,
  },
  matchFound: {
    source: require('../../src/Public/Steel_Over_Stone.mp3'),
    baseVolume: 0.5,
    cooldownMs: 500,
    poolSize: 1,
  },
  virado: {
    source: require('../../src/Public/virado.mp3'),
    baseVolume: 0.85,
    cooldownMs: 800,
    poolSize: 1,
  },
  viradoOut: {
    source: require('../../src/Public/Stomach Thumps.mp3'),
    baseVolume: 0.75,
    cooldownMs: 800,
    poolSize: 1,
  },
  victory: {
    source: require('../../src/Public/victory.mp3'),
    baseVolume: 0.85,
    cooldownMs: 1200,
    poolSize: 1,
  },
  defeat: {
    source: require('../../src/Public/error_play.mp3'),
    baseVolume: 0.6,
    cooldownMs: 1000,
    poolSize: 1,
  },
  error: {
    source: require('../../src/Public/error_play.mp3'),
    baseVolume: 0.45,
    cooldownMs: 180,
    poolSize: 2,
  },
  alert: {
    source: require('../../src/Public/Steel_Over_Stone.mp3'),
    baseVolume: 0.35,
    cooldownMs: 400,
    poolSize: 1,
  },
  turnChange: {
    source: require('../../src/Public/sfx-impact22.mp3'),
    baseVolume: 0.6,
    cooldownMs: 450,
    poolSize: 1,
  },
  emoteIn: {
    source: require('../../src/Public/Rake Swing Whoosh Close.mp3'),
    baseVolume: 0.8,
    cooldownMs: 300,
    poolSize: 1,
  },
  emoteOut: {
    source: require('../../src/Public/Sniffle.mp3'),
    baseVolume: 0.7,
    cooldownMs: 300,
    poolSize: 1,
  },
};

const clamp = (value: number, min: number, max: number) =>
  Math.min(max, Math.max(min, value));

interface LoopEntry {
  sound: Audio.Sound;
  baseVolume: number;
  volumeMultiplier: number;
}

export function AudioProvider({ children }: { children: ReactNode }) {
  const [muted, setMutedState] = useState(false);
  const [volume, setVolumeState] = useState(0.75);
  const loopsRef = useRef<Map<string, LoopEntry>>(new Map());
  const soundPoolsRef = useRef<Map<AudioCue, Audio.Sound[]>>(new Map());
  const poolIndexRef = useRef<Map<AudioCue, number>>(new Map());
  const lastPlayTimesRef = useRef<Map<AudioCue, number>>(new Map());

  // Inicialización de modo de audio y precarga paralela de todos los SFX
  useEffect(() => {
    let isMounted = true;

    Audio.setAudioModeAsync({
      playsInSilentModeIOS: true,
      staysActiveInBackground: false,
      shouldDuckAndroid: true,
    }).catch(() => {});

    AsyncStorage.getItem(AUDIO_SETTINGS_KEY).then((res) => {
      if (res && isMounted) {
        try {
          const parsed = JSON.parse(res);
          if (typeof parsed.muted === 'boolean') setMutedState(parsed.muted);
          if (typeof parsed.volume === 'number') {
            setVolumeState(clamp(parsed.volume, 0, 1));
          }
        } catch {}
      }
    });

    const preloadAll = async () => {
      const cues = Object.keys(AUDIO_CATALOG) as AudioCue[];
      await Promise.all(
        cues.map(async (cue) => {
          const config = AUDIO_CATALOG[cue];
          const instances: Audio.Sound[] = [];
          for (let i = 0; i < config.poolSize; i++) {
            try {
              const { sound } = await Audio.Sound.createAsync(config.source, {
                shouldPlay: false,
                volume: config.baseVolume,
              });
              if (isMounted) {
                instances.push(sound);
              } else {
                sound.unloadAsync().catch(() => {});
              }
            } catch {}
          }
          if (isMounted && instances.length > 0) {
            soundPoolsRef.current.set(cue, instances);
            poolIndexRef.current.set(cue, 0);
          }
        })
      );
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

  // Sincronizar volumen y mute en todos los loops activos (idéntico a Web)
  useEffect(() => {
    loopsRef.current.forEach((entry) => {
      const targetVol = muted
        ? 0
        : clamp(volume * entry.baseVolume * entry.volumeMultiplier, 0, 1);
      entry.sound
        .setStatusAsync({
          volume: targetVol,
          isMuted: muted,
        })
        .catch(() => {});
    });
  }, [muted, volume]);

  const saveSettings = (newMuted: boolean, newVolume: number) => {
    AsyncStorage.setItem(
      AUDIO_SETTINGS_KEY,
      JSON.stringify({ muted: newMuted, volume: newVolume })
    ).catch(() => {});
  };

  const setMuted = useCallback(
    (value: boolean) => {
      setMutedState(value);
      saveSettings(value, volume);
    },
    [volume]
  );

  const toggleMuted = useCallback(() => {
    setMutedState((prev) => {
      const next = !prev;
      saveSettings(next, volume);
      return next;
    });
  }, [volume]);

  const setVolume = useCallback(
    (value: number) => {
      const clamped = clamp(value, 0, 1);
      setVolumeState(clamped);
      saveSettings(muted, clamped);
    },
    [muted]
  );

  const playSfx = useCallback(
    async (cue: AudioCue, options?: PlaySfxOptions) => {
      if (muted) return;

      const config = AUDIO_CATALOG[cue];
      if (!config) return;

      const now = Date.now();
      const lastPlay = lastPlayTimesRef.current.get(cue) || 0;
      if (config.cooldownMs && now - lastPlay < config.cooldownMs) return;
      lastPlayTimesRef.current.set(cue, now);

      const targetVol = clamp(
        volume * config.baseVolume * (options?.volumeMultiplier ?? 1),
        0,
        1
      );
      const playRate = clamp(options?.playbackRate ?? 1.0, 0.6, 1.8);

      // 1. Reproducción instantánea sin filtro DSP de pitch-stretching (0ms buffer lag)
      const pool = soundPoolsRef.current.get(cue);
      if (pool && pool.length > 0) {
        const idx = (poolIndexRef.current.get(cue) || 0) % pool.length;
        poolIndexRef.current.set(cue, idx + 1);
        const sound = pool[idx];

        try {
          await sound.replayAsync({
            positionMillis: 0,
            volume: targetVol,
            rate: playRate,
            shouldCorrectPitch: false,
            isMuted: false,
            shouldPlay: true,
          });
          return;
        } catch {
          // Si la instancia falló, continuar al fallback
        }
      }

      // 2. Fallback dinámico si aún no terminó de precargar al arranque
      try {
        const { sound } = await Audio.Sound.createAsync(
          config.source,
          {
            shouldPlay: true,
            volume: targetVol,
            rate: playRate,
            shouldCorrectPitch: false,
          },
          (status) => {
            if (status.isLoaded && status.didJustFinish) {
              sound.unloadAsync().catch(() => {});
            }
          }
        );
      } catch {}
    },
    [muted, volume]
  );

  const playUrl = useCallback(
    async (url: string, options?: PlaySfxOptions) => {
      if (muted || !url) return;
      try {
        const vol = clamp(volume * (options?.volumeMultiplier ?? 1), 0, 1);
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
    [muted, volume]
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
        const targetVol = muted
          ? 0
          : clamp(volume * config.baseVolume * volMult, 0, 1);
        const rate = clamp(options?.playbackRate ?? 1.0, 0.6, 1.8);

        const { sound } = await Audio.Sound.createAsync(config.source, {
          shouldPlay: true,
          isLooping: true,
          volume: targetVol,
          isMuted: muted,
          rate,
          shouldCorrectPitch: true,
        });
        loopsRef.current.set(id, {
          sound,
          baseVolume: config.baseVolume,
          volumeMultiplier: volMult,
        });
      } catch {}
    },
    [muted, stopLoop, volume]
  );

  const startUrlLoop = useCallback(
    async (id: string, url: string, options?: PlaySfxOptions) => {
      await stopLoop(id);
      if (!url) return;

      try {
        const volMult = options?.volumeMultiplier ?? 1;
        const targetVol = muted ? 0 : clamp(volume * volMult, 0, 1);
        const rate = clamp(options?.playbackRate ?? 1.0, 0.6, 1.8);

        const { sound } = await Audio.Sound.createAsync(
          { uri: url },
          {
            shouldPlay: true,
            isLooping: true,
            volume: targetVol,
            isMuted: muted,
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
    [muted, stopLoop, volume]
  );

  return (
    <AudioContext.Provider
      value={{
        muted,
        volume,
        setMuted,
        toggleMuted,
        setVolume,
        playSfx,
        playUrl,
        startLoop,
        startUrlLoop,
        stopLoop,
      }}
    >
      {children}
    </AudioContext.Provider>
  );
}

export function useAudio() {
  const context = useContext(AudioContext);
  if (!context) {
    throw new Error('useAudio debe ser usado dentro de un AudioProvider');
  }
  return context;
}
