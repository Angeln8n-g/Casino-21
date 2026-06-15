import React, {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
} from 'react';
import { Howl } from 'howler';
import cardDealSrc from '../../Public/card_deal.mp3';
import cardPlaySrc from '../../Public/card_play.mp3';
import chipsClinkSrc from '../../Public/clips_click.mp3';
import errorSrc from '../../Public/error_play.mp3';
import matchFoundSrc from '../../Public/Steel_Over_Stone.mp3';
import victorySrc from '../../Public/victory.mp3';
import viradoSrc from '../../Public/virado.mp3';
import turnChangeSrc from '../../Public/sfx-impact22.mp3';
import emoteInSrc from '../../Public/Rake Swing Whoosh Close.mp3';
import emoteOutSrc from '../../Public/Sniffle.mp3';
import viradoOutSrc from '../../Public/Stomach Thumps.mp3';

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

const AUDIO_SETTINGS_KEY = 'casino21_audio_settings';

const AUDIO_CATALOG: Record<
  AudioCue,
  {
    src: string;
    baseVolume: number;
    cooldownMs?: number;
  }
> = {
  cardDeal: { src: cardDealSrc, baseVolume: 0.7, cooldownMs: 180 },
  cardPlay: { src: cardPlaySrc, baseVolume: 0.55, cooldownMs: 70 },
  chipsClink: { src: chipsClinkSrc, baseVolume: 0.75, cooldownMs: 120 },
  matchFound: { src: matchFoundSrc, baseVolume: 0.5, cooldownMs: 500 },
  virado: { src: viradoSrc, baseVolume: 0.85, cooldownMs: 800 },
  viradoOut: { src: viradoOutSrc, baseVolume: 0.75, cooldownMs: 800 },
  victory: { src: victorySrc, baseVolume: 0.85, cooldownMs: 1200 },
  defeat: { src: errorSrc, baseVolume: 0.6, cooldownMs: 1000 },
  error: { src: errorSrc, baseVolume: 0.45, cooldownMs: 180 },
  alert: { src: matchFoundSrc, baseVolume: 0.35, cooldownMs: 400 },
  turnChange: { src: turnChangeSrc, baseVolume: 0.6, cooldownMs: 500 },
  emoteIn: { src: emoteInSrc, baseVolume: 0.8, cooldownMs: 300 },
  emoteOut: { src: emoteOutSrc, baseVolume: 0.7, cooldownMs: 300 },
};

const AudioContext = createContext<AudioContextValue | undefined>(undefined);

const clamp = (value: number, min: number, max: number) => Math.min(max, Math.max(min, value));

export function AudioProvider({ children }: { children: React.ReactNode }) {
  const [muted, setMuted] = useState<boolean>(() => {
    try {
      const stored = localStorage.getItem(AUDIO_SETTINGS_KEY);
      return stored ? JSON.parse(stored).muted ?? false : false;
    } catch {
      return false;
    }
  });
  const [volume, setVolumeState] = useState<number>(() => {
    try {
      const stored = localStorage.getItem(AUDIO_SETTINGS_KEY);
      return stored ? clamp(JSON.parse(stored).volume ?? 0.7, 0, 1) : 0.7;
    } catch {
      return 0.7;
    }
  });

  const templatesRef = useRef<Map<AudioCue, Howl>>(new Map());
  const loopPlayersRef = useRef<Map<string, Howl>>(new Map());
  const lastPlayAtRef = useRef<Map<AudioCue, number>>(new Map());

  useEffect(() => {
    try {
      localStorage.setItem(
        AUDIO_SETTINGS_KEY,
        JSON.stringify({
          muted,
          volume,
        })
      );
    } catch {}
  }, [muted, volume]);

  useEffect(() => {
    const templates = new Map<AudioCue, Howl>();

    (Object.keys(AUDIO_CATALOG) as AudioCue[]).forEach((cue) => {
      const howl = new Howl({
        src: [AUDIO_CATALOG[cue].src],
        preload: true,
        html5: false, // Forces Web Audio API for stutter-free audio mixing
      });
      templates.set(cue, howl);
    });

    templatesRef.current = templates;

    return () => {
      loopPlayersRef.current.forEach((howl) => {
        howl.stop();
        howl.unload();
      });
      loopPlayersRef.current.clear();
      templates.forEach((howl) => {
        howl.stop();
        howl.unload();
      });
    };
  }, []);

  useEffect(() => {
    loopPlayersRef.current.forEach((howl) => {
      const baseVol = (howl as any)._baseVolume ?? 1.0;
      const volMultiplier = (howl as any)._volumeMultiplier ?? 1.0;
      howl.volume(clamp(volume * baseVol * volMultiplier, 0, 1));
      howl.mute(muted);
    });
  }, [muted, volume]);

  const setVolume = useCallback((value: number) => {
    setVolumeState(clamp(value, 0, 1));
  }, []);

  const playSfx = useCallback(
    (cue: AudioCue, options?: PlaySfxOptions) => {
      if (muted) {
        return;
      }

      const config = AUDIO_CATALOG[cue];
      const now = Date.now();
      const lastPlay = lastPlayAtRef.current.get(cue) ?? 0;

      if (config.cooldownMs && now - lastPlay < config.cooldownMs) {
        return;
      }

      lastPlayAtRef.current.set(cue, now);

      const howl = templatesRef.current.get(cue);
      if (howl) {
        const targetVol = clamp(volume * config.baseVolume * (options?.volumeMultiplier ?? 1), 0, 1);
        const playRate = clamp(options?.playbackRate ?? 1, 0.6, 1.8);
        
        howl.volume(targetVol);
        howl.rate(playRate);
        howl.mute(muted);
        howl.play();
      }
    },
    [muted, volume]
  );

  const playUrl = useCallback(
    (url: string, options?: PlaySfxOptions) => {
      if (muted || !url) {
        return;
      }

      const howl = new Howl({
        src: [url],
        volume: clamp(volume * (options?.volumeMultiplier ?? 1), 0, 1),
        rate: clamp(options?.playbackRate ?? 1, 0.6, 1.8),
        mute: muted,
        html5: false,
        onend: () => {
          howl.unload();
        }
      });
      howl.play();
    },
    [muted, volume]
  );

  const stopLoop = useCallback((id: string) => {
    const howl = loopPlayersRef.current.get(id);
    if (!howl) {
      return;
    }

    howl.stop();
    howl.unload();
    loopPlayersRef.current.delete(id);
  }, []);

  const startLoop = useCallback(
    (id: string, cue: AudioCue, options?: PlaySfxOptions) => {
      stopLoop(id);

      const config = AUDIO_CATALOG[cue];
      const howl = new Howl({
        src: [config.src],
        loop: true,
        volume: clamp(volume * config.baseVolume * (options?.volumeMultiplier ?? 1), 0, 1),
        rate: clamp(options?.playbackRate ?? 1, 0.6, 1.8),
        mute: muted,
        html5: false,
      });

      // Save custom fields for volume syncing
      (howl as any)._baseVolume = config.baseVolume;
      (howl as any)._volumeMultiplier = options?.volumeMultiplier ?? 1;

      loopPlayersRef.current.set(id, howl);
      howl.play();
    },
    [muted, stopLoop, volume]
  );

  const startUrlLoop = useCallback(
    (id: string, url: string, options?: PlaySfxOptions) => {
      stopLoop(id);
      if (!url) return;

      const howl = new Howl({
        src: [url],
        loop: true,
        volume: clamp(volume * (options?.volumeMultiplier ?? 1), 0, 1),
        rate: clamp(options?.playbackRate ?? 1, 0.6, 1.8),
        mute: muted,
        html5: false,
      });

      (howl as any)._baseVolume = 1.0;
      (howl as any)._volumeMultiplier = options?.volumeMultiplier ?? 1;

      loopPlayersRef.current.set(id, howl);
      howl.play();
    },
    [muted, stopLoop, volume]
  );

  const toggleMuted = useCallback(() => {
    setMuted((current) => !current);
  }, []);

  const value = useMemo<AudioContextValue>(
    () => ({
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
    }),
    [muted, playSfx, playUrl, setVolume, startLoop, startUrlLoop, stopLoop, toggleMuted, volume]
  );

  return <AudioContext.Provider value={value}>{children}</AudioContext.Provider>;
}

export function useAudio() {
  const context = useContext(AudioContext);

  if (!context) {
    throw new Error('useAudio must be used within an AudioProvider');
  }

  return context;
}
