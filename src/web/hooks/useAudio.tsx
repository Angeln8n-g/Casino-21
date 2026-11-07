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
import { safeStorage } from '../utils/safeStorage';
import cardDealSrc from '../../Public/card_deal.mp3';
import cardPlaySrc from '../../Public/card_play.mp3';
import chipsClinkSrc from '../../Public/clips_click.mp3';
import errorSrc from '../../Public/error_play.mp3';
import matchFoundSrc from '../../Public/Steel_Over_Stone.mp3';
import uiNotifySrc from '../../Public/ui_notify.mp3';
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
  | 'notification'
  | 'turnChange'
  | 'emoteIn'
  | 'emoteOut';

interface PlaySfxOptions {
  playbackRate?: number;
  volumeMultiplier?: number;
}

export interface AudioContextValue {
  // Efectos de sonido (SFX) — mantiene alias muted/volume por retrocompatibilidad
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

  // Música (independiente de los efectos de sonido)
  musicEnabled: boolean;
  musicMuted: boolean;
  musicVolume: number;
  setMusicEnabled: (value: boolean) => void;
  toggleMusicEnabled: () => void;
  setMusicMuted: (value: boolean) => void;
  toggleMusicMuted: () => void;
  setMusicVolume: (value: number) => void;

  // Reproducción SFX
  playSfx: (cue: AudioCue, options?: PlaySfxOptions) => void;
  playUrl: (url: string, options?: PlaySfxOptions) => void;
  startLoop: (id: string, cue: AudioCue, options?: PlaySfxOptions) => void;
  startUrlLoop: (id: string, url: string, options?: PlaySfxOptions) => void;
  stopLoop: (id: string) => void;
}

const AUDIO_SETTINGS_KEY = 'casino21_audio_settings';

interface StoredAudioSettings {
  sfxMuted?: boolean;
  sfxVolume?: number;
  musicEnabled?: boolean;
  musicMuted?: boolean;
  musicVolume?: number;
  // Legacy keys
  muted?: boolean;
  volume?: number;
}

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
  // Reservado exclusivamente para duelos y desafíos (GameInvitationModal / Match Found)
  matchFound: { src: matchFoundSrc, baseVolume: 0.5, cooldownMs: 500 },
  alert: { src: matchFoundSrc, baseVolume: 0.35, cooldownMs: 400 },
  // Notificaciones generales de UI (campana, eventos, avisos breves — nunca usa Steel_Over_Stone)
  notification: { src: uiNotifySrc, baseVolume: 0.45, cooldownMs: 250 },
  virado: { src: viradoSrc, baseVolume: 0.85, cooldownMs: 800 },
  viradoOut: { src: viradoOutSrc, baseVolume: 0.75, cooldownMs: 800 },
  victory: { src: victorySrc, baseVolume: 0.85, cooldownMs: 1200 },
  defeat: { src: errorSrc, baseVolume: 0.6, cooldownMs: 1000 },
  error: { src: errorSrc, baseVolume: 0.45, cooldownMs: 180 },
  turnChange: { src: turnChangeSrc, baseVolume: 0.6, cooldownMs: 500 },
  emoteIn: { src: emoteInSrc, baseVolume: 0.8, cooldownMs: 300 },
  emoteOut: { src: emoteOutSrc, baseVolume: 0.7, cooldownMs: 300 },
};

const AudioContext = createContext<AudioContextValue | undefined>(undefined);

const clamp = (value: number, min: number, max: number) => Math.min(max, Math.max(min, value));

function loadInitialSettings(): Required<Omit<StoredAudioSettings, 'muted' | 'volume'>> {
  try {
    const raw = safeStorage.getItem(AUDIO_SETTINGS_KEY);
    if (raw) {
      const parsed: StoredAudioSettings = JSON.parse(raw);
      return {
        sfxMuted: typeof parsed.sfxMuted === 'boolean' ? parsed.sfxMuted : (parsed.muted ?? false),
        sfxVolume: clamp(
          typeof parsed.sfxVolume === 'number' ? parsed.sfxVolume : (parsed.volume ?? 0.75),
          0,
          1
        ),
        musicEnabled: typeof parsed.musicEnabled === 'boolean' ? parsed.musicEnabled : true,
        musicMuted: typeof parsed.musicMuted === 'boolean' ? parsed.musicMuted : false,
        musicVolume: clamp(typeof parsed.musicVolume === 'number' ? parsed.musicVolume : 0.7, 0, 1),
      };
    }
  } catch {}
  return {
    sfxMuted: false,
    sfxVolume: 0.75,
    musicEnabled: true,
    musicMuted: false,
    musicVolume: 0.7,
  };
}

export function AudioProvider({ children }: { children: React.ReactNode }) {
  const initial = useMemo(() => loadInitialSettings(), []);

  const [sfxMuted, setSfxMutedState] = useState<boolean>(initial.sfxMuted);
  const [sfxVolume, setSfxVolumeState] = useState<number>(initial.sfxVolume);
  const [musicEnabled, setMusicEnabledState] = useState<boolean>(initial.musicEnabled);
  const [musicMuted, setMusicMutedState] = useState<boolean>(initial.musicMuted);
  const [musicVolume, setMusicVolumeState] = useState<number>(initial.musicVolume);

  const templatesRef = useRef<Map<AudioCue, Howl>>(new Map());
  const loopPlayersRef = useRef<Map<string, Howl>>(new Map());
  const lastPlayAtRef = useRef<Map<AudioCue, number>>(new Map());
  const unlockedRef = useRef(false);

  useEffect(() => {
    try {
      safeStorage.setItem(
        AUDIO_SETTINGS_KEY,
        JSON.stringify({
          sfxMuted,
          sfxVolume,
          musicEnabled,
          musicMuted,
          musicVolume,
          // Retrocompatibilidad
          muted: sfxMuted,
          volume: sfxVolume,
        })
      );
    } catch {}
  }, [sfxMuted, sfxVolume, musicEnabled, musicMuted, musicVolume]);

  const initAudio = useCallback(() => {
    if (unlockedRef.current) return;
    unlockedRef.current = true;

    try {
      if (Howler.ctx && Howler.ctx.state === 'suspended') {
        Howler.ctx.resume();
      }
    } catch {}

    if (templatesRef.current.size === 0) {
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
    }
  }, []);

  useEffect(() => {
    const handleFirstGesture = () => {
      initAudio();
    };

    window.addEventListener('pointerdown', handleFirstGesture, { capture: true, once: true });
    window.addEventListener('keydown', handleFirstGesture, { capture: true, once: true });
    window.addEventListener('touchstart', handleFirstGesture, { capture: true, once: true });

    return () => {
      window.removeEventListener('pointerdown', handleFirstGesture, { capture: true });
      window.removeEventListener('keydown', handleFirstGesture, { capture: true });
      window.removeEventListener('touchstart', handleFirstGesture, { capture: true });

      loopPlayersRef.current.forEach((howl) => {
        howl.stop();
        howl.unload();
      });
      loopPlayersRef.current.clear();
      templatesRef.current.forEach((howl) => {
        howl.stop();
        howl.unload();
      });
      templatesRef.current.clear();
    };
  }, [initAudio]);

  useEffect(() => {
    loopPlayersRef.current.forEach((howl) => {
      const baseVol = (howl as any)._baseVolume ?? 1.0;
      const volMultiplier = (howl as any)._volumeMultiplier ?? 1.0;
      howl.volume(clamp(sfxVolume * baseVol * volMultiplier, 0, 1));
      howl.mute(sfxMuted);
    });
  }, [sfxMuted, sfxVolume]);

  const setSfxVolume = useCallback((value: number) => {
    setSfxVolumeState(clamp(value, 0, 1));
  }, []);

  const setSfxMuted = useCallback((value: boolean) => {
    setSfxMutedState(value);
  }, []);

  const toggleSfxMuted = useCallback(() => {
    setSfxMutedState((current) => !current);
  }, []);

  const setMusicVolume = useCallback((value: number) => {
    setMusicVolumeState(clamp(value, 0, 1));
  }, []);

  const setMusicEnabled = useCallback((value: boolean) => {
    setMusicEnabledState(value);
  }, []);

  const toggleMusicEnabled = useCallback(() => {
    setMusicEnabledState((current) => !current);
  }, []);

  const setMusicMuted = useCallback((value: boolean) => {
    setMusicMutedState(value);
  }, []);

  const toggleMusicMuted = useCallback(() => {
    setMusicMutedState((current) => !current);
  }, []);

  const playSfx = useCallback(
    (cue: AudioCue, options?: PlaySfxOptions) => {
      if (sfxMuted) {
        return;
      }

      const config = AUDIO_CATALOG[cue];
      if (!config) return;
      const now = Date.now();
      const lastPlay = lastPlayAtRef.current.get(cue) ?? 0;

      if (config.cooldownMs && now - lastPlay < config.cooldownMs) {
        return;
      }

      lastPlayAtRef.current.set(cue, now);

      if (!unlockedRef.current) {
        initAudio();
      }

      let howl = templatesRef.current.get(cue);
      if (!howl) {
        initAudio();
        howl = templatesRef.current.get(cue);
      }

      if (howl) {
        try {
          if (Howler.ctx && Howler.ctx.state === 'suspended') {
            Howler.ctx.resume();
          }
        } catch {}

        const targetVol = clamp(sfxVolume * config.baseVolume * (options?.volumeMultiplier ?? 1), 0, 1);
        const playRate = clamp(options?.playbackRate ?? 1, 0.6, 1.8);

        howl.volume(targetVol);
        howl.rate(playRate);
        howl.mute(sfxMuted);
        howl.play();
      }
    },
    [initAudio, sfxMuted, sfxVolume]
  );

  const playUrl = useCallback(
    (url: string, options?: PlaySfxOptions) => {
      if (sfxMuted || !url) {
        return;
      }

      const howl = new Howl({
        src: [url],
        volume: clamp(sfxVolume * (options?.volumeMultiplier ?? 1), 0, 1),
        rate: clamp(options?.playbackRate ?? 1, 0.6, 1.8),
        mute: sfxMuted,
        html5: false,
        onend: () => {
          howl.unload();
        },
      });
      howl.play();
    },
    [sfxMuted, sfxVolume]
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

      if (!unlockedRef.current) {
        initAudio();
      }
      try {
        if (Howler.ctx && Howler.ctx.state === 'suspended') {
          Howler.ctx.resume();
        }
      } catch {}

      const config = AUDIO_CATALOG[cue];
      if (!config) return;
      const howl = new Howl({
        src: [config.src],
        loop: true,
        volume: clamp(sfxVolume * config.baseVolume * (options?.volumeMultiplier ?? 1), 0, 1),
        rate: clamp(options?.playbackRate ?? 1, 0.6, 1.8),
        mute: sfxMuted,
        html5: false,
      });

      (howl as any)._baseVolume = config.baseVolume;
      (howl as any)._volumeMultiplier = options?.volumeMultiplier ?? 1;

      loopPlayersRef.current.set(id, howl);
      howl.play();
    },
    [initAudio, sfxMuted, stopLoop, sfxVolume]
  );

  const startUrlLoop = useCallback(
    (id: string, url: string, options?: PlaySfxOptions) => {
      stopLoop(id);
      if (!url) return;

      const howl = new Howl({
        src: [url],
        loop: true,
        volume: clamp(sfxVolume * (options?.volumeMultiplier ?? 1), 0, 1),
        rate: clamp(options?.playbackRate ?? 1, 0.6, 1.8),
        mute: sfxMuted,
        html5: true,
      });

      (howl as any)._baseVolume = 1.0;
      (howl as any)._volumeMultiplier = options?.volumeMultiplier ?? 1;

      loopPlayersRef.current.set(id, howl);
      howl.play();
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
    throw new Error('useAudio must be used within an AudioProvider');
  }

  return context;
}
