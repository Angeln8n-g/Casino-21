import React, { createContext, useContext, useState, useEffect, useCallback, ReactNode, useRef } from 'react';
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

const AUDIO_SOURCES: Record<AudioCue, any> = {
  cardDeal: require('../../src/Public/card_deal.mp3'),
  cardPlay: require('../../src/Public/card_play.mp3'),
  chipsClink: require('../../src/Public/clips_click.mp3'),
  matchFound: require('../../src/Public/Steel_Over_Stone.mp3'),
  virado: require('../../src/Public/virado.mp3'),
  viradoOut: require('../../src/Public/Stomach Thumps.mp3'),
  victory: require('../../src/Public/victory.mp3'),
  defeat: require('../../src/Public/error_play.mp3'),
  error: require('../../src/Public/error_play.mp3'),
  alert: require('../../src/Public/Steel_Over_Stone.mp3'),
  turnChange: require('../../src/Public/sfx-impact22.mp3'),
  emoteIn: require('../../src/Public/Rake Swing Whoosh Close.mp3'),
  emoteOut: require('../../src/Public/Sniffle.mp3'),
};

const COOLDOWNS: Partial<Record<AudioCue, number>> = {
  cardDeal: 100,
  cardPlay: 50,
  chipsClink: 80,
  turnChange: 200,
};

export function AudioProvider({ children }: { children: ReactNode }) {
  const [muted, setMutedState] = useState(false);
  const [volume, setVolumeState] = useState(0.8);
  const loopsRef = useRef<Map<string, Audio.Sound>>(new Map());
  const preloadedSoundsRef = useRef<Map<AudioCue, Audio.Sound>>(new Map());
  const lastPlayTimesRef = useRef<Map<AudioCue, number>>(new Map());

  // Inicialización de modo de audio y precarga de SFX para latencia cero
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
          if (typeof parsed.volume === 'number') setVolumeState(parsed.volume);
        } catch {}
      }
    });

    // Precargar sonidos críticos para dispararlos al instante sin I/O de disco
    const criticalCues: AudioCue[] = [
      'cardPlay',
      'cardDeal',
      'chipsClink',
      'turnChange',
      'virado',
      'error',
      'alert',
      'matchFound',
      'victory',
    ];

    const preloadAll = async () => {
      for (const cue of criticalCues) {
        try {
          const source = AUDIO_SOURCES[cue];
          if (!source) continue;
          const { sound } = await Audio.Sound.createAsync(source, {
            shouldPlay: false,
            volume: 0.8,
          });
          if (isMounted) {
            preloadedSoundsRef.current.set(cue, sound);
          } else {
            sound.unloadAsync().catch(() => {});
          }
        } catch {}
      }
    };

    preloadAll();

    return () => {
      isMounted = false;
      loopsRef.current.forEach((sound) => {
        sound.stopAsync().then(() => sound.unloadAsync()).catch(() => {});
      });
      loopsRef.current.clear();

      preloadedSoundsRef.current.forEach((sound) => {
        sound.unloadAsync().catch(() => {});
      });
      preloadedSoundsRef.current.clear();
    };
  }, []);

  const saveSettings = (newMuted: boolean, newVolume: number) => {
    AsyncStorage.setItem(AUDIO_SETTINGS_KEY, JSON.stringify({ muted: newMuted, volume: newVolume })).catch(() => {});
  };

  const setMuted = (value: boolean) => {
    setMutedState(value);
    saveSettings(value, volume);
  };

  const toggleMuted = () => {
    setMutedState((prev) => {
      const next = !prev;
      saveSettings(next, volume);
      return next;
    });
  };

  const setVolume = (value: number) => {
    const clamped = Math.max(0, Math.min(1, value));
    setVolumeState(clamped);
    saveSettings(muted, clamped);
  };

  const playSfx = useCallback(
    async (cue: AudioCue, options?: PlaySfxOptions) => {
      if (muted) return;
      const now = Date.now();
      const lastPlay = lastPlayTimesRef.current.get(cue) || 0;
      const cooldown = COOLDOWNS[cue] || 0;
      if (now - lastPlay < cooldown) return;
      lastPlayTimesRef.current.set(cue, now);

      const vol = Math.max(0, Math.min(1, volume * (options?.volumeMultiplier ?? 1)));
      const rate = options?.playbackRate ?? 1.0;

      // 1. Si está precargado, reproducir instantáneamente (0ms de latencia)
      const preloaded = preloadedSoundsRef.current.get(cue);
      if (preloaded) {
        try {
          await preloaded.stopAsync().catch(() => {});
          await preloaded.setPositionAsync(0);
          await preloaded.setVolumeAsync(vol);
          if (rate !== 1.0) await preloaded.setRateAsync(rate, true);
          await preloaded.playAsync();
          return;
        } catch {}
      }

      // 2. Fallback dinámico si no estuviera precargado
      try {
        const source = AUDIO_SOURCES[cue];
        if (!source) return;

        const { sound } = await Audio.Sound.createAsync(
          source,
          {
            shouldPlay: true,
            volume: vol,
            rate: rate,
            shouldCorrectPitch: true,
          },
          (status) => {
            if (status.isLoaded && status.didJustFinish) {
              sound.unloadAsync().catch(() => {});
            }
          }
        );
      } catch (e) {}
    },
    [muted, volume]
  );

  const playUrl = useCallback(
    async (url: string, options?: PlaySfxOptions) => {
      if (muted || !url) return;
      try {
        const vol = Math.max(0, Math.min(1, volume * (options?.volumeMultiplier ?? 1)));
        const { sound } = await Audio.Sound.createAsync(
          { uri: url },
          { shouldPlay: true, volume: vol },
          (status) => {
            if (status.isLoaded && status.didJustFinish) {
              sound.unloadAsync().catch(() => {});
            }
          }
        );
      } catch (e) {}
    },
    [muted, volume]
  );

  const startLoop = useCallback(
    async (id: string, cue: AudioCue, options?: PlaySfxOptions) => {
      if (muted) return;
      try {
        const existing = loopsRef.current.get(id);
        if (existing) await existing.stopAsync().then(() => existing.unloadAsync()).catch(() => {});

        const source = AUDIO_SOURCES[cue];
        if (!source) return;

        const vol = Math.max(0, Math.min(1, volume * (options?.volumeMultiplier ?? 1)));
        const { sound } = await Audio.Sound.createAsync(source, {
          shouldPlay: true,
          isLooping: true,
          volume: vol,
        });
        loopsRef.current.set(id, sound);
      } catch (e) {}
    },
    [muted, volume]
  );

  const startUrlLoop = useCallback(
    async (id: string, url: string, options?: PlaySfxOptions) => {
      if (muted || !url) return;
      try {
        const existing = loopsRef.current.get(id);
        if (existing) await existing.stopAsync().then(() => existing.unloadAsync()).catch(() => {});

        const vol = Math.max(0, Math.min(1, volume * (options?.volumeMultiplier ?? 1)));
        const { sound } = await Audio.Sound.createAsync(
          { uri: url },
          { shouldPlay: true, isLooping: true, volume: vol }
        );
        loopsRef.current.set(id, sound);
      } catch (e) {}
    },
    [muted, volume]
  );

  const stopLoop = useCallback(async (id: string) => {
    try {
      const sound = loopsRef.current.get(id);
      if (sound) {
        await sound.stopAsync();
        await sound.unloadAsync();
        loopsRef.current.delete(id);
      }
    } catch (e) {}
  }, []);

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
