import React, { createContext, useContext, useState, useEffect, useCallback, ReactNode } from 'react';
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

export function AudioProvider({ children }: { children: ReactNode }) {
  const [muted, setMutedState] = useState(false);
  const [volume, setVolumeState] = useState(0.8);

  useEffect(() => {
    AsyncStorage.getItem(AUDIO_SETTINGS_KEY).then(res => {
      if (res) {
        try {
          const parsed = JSON.parse(res);
          if (typeof parsed.muted === 'boolean') setMutedState(parsed.muted);
          if (typeof parsed.volume === 'number') setVolumeState(parsed.volume);
        } catch (e) {}
      }
    });
  }, []);

  const saveSettings = (newMuted: boolean, newVolume: number) => {
    AsyncStorage.setItem(AUDIO_SETTINGS_KEY, JSON.stringify({ muted: newMuted, volume: newVolume }));
  };

  const setMuted = (value: boolean) => {
    setMutedState(value);
    saveSettings(value, volume);
  };

  const toggleMuted = () => {
    setMutedState(prev => {
      saveSettings(!prev, volume);
      return !prev;
    });
  };

  const setVolume = (value: number) => {
    setVolumeState(value);
    saveSettings(muted, value);
  };

  const playSfx = useCallback(async (cue: AudioCue, options?: PlaySfxOptions) => {
    if (muted) return;
    try {
      // SFX reproductor
    } catch (e) {
      console.warn("Audio error on mobile:", e);
    }
  }, [muted, volume]);

  const playUrl = useCallback(async (url: string, options?: PlaySfxOptions) => {
    if (muted || !url) return;
    try {
      const { sound } = await Audio.Sound.createAsync({ uri: url }, { volume: (options?.volumeMultiplier ?? 1) * volume });
      await sound.playAsync();
    } catch (e) {}
  }, [muted, volume]);

  const startLoop = useCallback(() => {}, []);
  const startUrlLoop = useCallback(() => {}, []);
  const stopLoop = useCallback(() => {}, []);

  return (
    <AudioContext.Provider value={{ muted, volume, setMuted, toggleMuted, setVolume, playSfx, playUrl, startLoop, startUrlLoop, stopLoop }}>
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
