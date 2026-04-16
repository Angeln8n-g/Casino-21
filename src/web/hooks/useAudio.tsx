import React, {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
} from 'react';
import cardDealSrc from '../../Public/card_deal.mp3';
import cardPlaySrc from '../../Public/card_play.mp3';
import chipsClinkSrc from '../../Public/clips_click.mp3';
import errorSrc from '../../Public/error_play.mp3';
import matchFoundSrc from '../../Public/Steel_Over_Stone.mp3';
import victorySrc from '../../Public/victory.mp3';
import viradoSrc from '../../Public/virado.mp3';

export type AudioCue =
  | 'cardDeal'
  | 'cardPlay'
  | 'chipsClink'
  | 'matchFound'
  | 'virado'
  | 'victory'
  | 'defeat'
  | 'error'
  | 'alert';

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
  victory: { src: victorySrc, baseVolume: 0.85, cooldownMs: 1200 },
  defeat: { src: errorSrc, baseVolume: 0.6, cooldownMs: 1000 },
  error: { src: errorSrc, baseVolume: 0.45, cooldownMs: 180 },
  alert: { src: matchFoundSrc, baseVolume: 0.35, cooldownMs: 400 },
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

  const templatesRef = useRef<Map<AudioCue, HTMLAudioElement>>(new Map());
  const loopPlayersRef = useRef<Map<string, HTMLAudioElement>>(new Map());
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
    const templates = new Map<AudioCue, HTMLAudioElement>();

    (Object.keys(AUDIO_CATALOG) as AudioCue[]).forEach((cue) => {
      const audio = new Audio(AUDIO_CATALOG[cue].src);
      audio.preload = 'auto';
      audio.load();
      templates.set(cue, audio);
    });

    templatesRef.current = templates;

    return () => {
      loopPlayersRef.current.forEach((audio) => {
        audio.pause();
        audio.src = '';
      });
      loopPlayersRef.current.clear();
      templates.forEach((audio) => {
        audio.src = '';
      });
    };
  }, []);

  useEffect(() => {
    loopPlayersRef.current.forEach((audio) => {
      const cue = (audio.dataset.cue as AudioCue | undefined) ?? 'alert';
      const config = AUDIO_CATALOG[cue];
      audio.muted = muted;
      audio.volume = clamp(volume * config.baseVolume, 0, 1);
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

      const template = templatesRef.current.get(cue);
      const audio = (template?.cloneNode(true) as HTMLAudioElement | undefined) ?? new Audio(config.src);

      audio.volume = clamp(volume * config.baseVolume * (options?.volumeMultiplier ?? 1), 0, 1);
      audio.playbackRate = clamp(options?.playbackRate ?? 1, 0.6, 1.8);
      audio.muted = muted;

      audio.play().catch(() => {});

      const cleanup = () => {
        audio.pause();
        audio.src = '';
        audio.removeEventListener('ended', cleanup);
      };

      audio.addEventListener('ended', cleanup);
    },
    [muted, volume]
  );

  const playUrl = useCallback(
    (url: string, options?: PlaySfxOptions) => {
      if (muted || !url) {
        return;
      }

      const audio = new Audio(url);
      audio.volume = clamp(volume * (options?.volumeMultiplier ?? 1), 0, 1);
      audio.playbackRate = clamp(options?.playbackRate ?? 1, 0.6, 1.8);
      audio.muted = muted;

      audio.play().catch(() => {});

      const cleanup = () => {
        audio.pause();
        audio.src = '';
        audio.removeEventListener('ended', cleanup);
      };

      audio.addEventListener('ended', cleanup);
    },
    [muted, volume]
  );

  const stopLoop = useCallback((id: string) => {
    const current = loopPlayersRef.current.get(id);
    if (!current) {
      return;
    }

    current.pause();
    current.currentTime = 0;
    current.src = '';
    loopPlayersRef.current.delete(id);
  }, []);

  const startLoop = useCallback(
    (id: string, cue: AudioCue, options?: PlaySfxOptions) => {
      stopLoop(id);

      const config = AUDIO_CATALOG[cue];
      const audio = new Audio(config.src);
      audio.loop = true;
      audio.dataset.cue = cue;
      audio.volume = clamp(volume * config.baseVolume * (options?.volumeMultiplier ?? 1), 0, 1);
      audio.playbackRate = clamp(options?.playbackRate ?? 1, 0.6, 1.8);
      audio.muted = muted;

      loopPlayersRef.current.set(id, audio);
      audio.play().catch(() => {});
    },
    [muted, stopLoop, volume]
  );

  const startUrlLoop = useCallback(
    (id: string, url: string, options?: PlaySfxOptions) => {
      stopLoop(id);
      if (!url) return;

      const audio = new Audio(url);
      audio.loop = true;
      audio.volume = clamp(volume * (options?.volumeMultiplier ?? 1), 0, 1);
      audio.playbackRate = clamp(options?.playbackRate ?? 1, 0.6, 1.8);
      audio.muted = muted;

      loopPlayersRef.current.set(id, audio);
      audio.play().catch(() => {});
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
