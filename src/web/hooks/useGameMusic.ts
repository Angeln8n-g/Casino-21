import { useEffect, useRef, useState } from 'react';
import { Howl } from 'howler';
import { useAudio } from './useAudio';
import { GameState } from '../../domain/game-state';

const MUSIC_VOLUME_SCALE = 0.45; // Sits at 45% of master volume to keep sfx audible
const FADE_OUT_MS = 1000;
const FADE_IN_MS = 1500;
const LOBBY_MUSIC_SETTINGS_KEY = 'casino21_lobby_music';

export function useGameMusic(gameState: GameState | null) {
  const { volume: masterVolume, muted } = useAudio();

  // Retrieve selected music style preference from lobby config
  const [style] = useState<'classic' | 'modern'>(() => {
    try {
      const stored = localStorage.getItem(LOBBY_MUSIC_SETTINGS_KEY);
      if (stored) {
        const parsed = JSON.parse(stored);
        if (parsed.style === 'classic' || parsed.style === 'modern') return parsed.style;
      }
    } catch { /* ignore */ }
    return 'classic';
  });

  const howlsRef = useRef<Map<number, Howl>>(new Map());
  const activeTrackIndexRef = useRef<number | null>(null);
  const isTransitioningRef = useRef(false);
  const mountedRef = useRef(true);

  const getTargetVolume = () => {
    return muted ? 0 : masterVolume * MUSIC_VOLUME_SCALE;
  };

  // Helper to retrieve or lazy-load the Howl instance for a specific track index
  const getOrCreateHowl = (index: number) => {
    if (howlsRef.current.has(index)) {
      return howlsRef.current.get(index)!;
    }

    const fileSuffix = style === 'classic' ? 'clasic' : 'moderna';
    const trackNum = index + 1;
    const src = `/audio/secuencia_${fileSuffix}_${trackNum}.mp3`;

    console.log(`[useGameMusic] Initializing Howl instance for: ${src}`);

    const howl = new Howl({
      src: [src],
      loop: true, // Loops during each mazo
      volume: 0,
      preload: true,
      html5: false, // Forces Web Audio API for stutter-free audio mixing
    });

    howlsRef.current.set(index, howl);
    return howl;
  };

  // Sync volume and mute state dynamically
  useEffect(() => {
    const targetVol = getTargetVolume();
    howlsRef.current.forEach((howl, idx) => {
      if (idx === activeTrackIndexRef.current) {
        if (!isTransitioningRef.current) {
          howl.volume(targetVol);
        }
      } else {
        howl.volume(0);
      }
      howl.mute(muted);
    });
  }, [masterVolume, muted]);

  // Handle music transitions when roundCount or phase changes
  useEffect(() => {
    if (!gameState) return;

    mountedRef.current = true;
    const { roundCount, phase } = gameState;
    const trackIndex = roundCount % 4; // Safely cycle round sequence 1-4
    const shouldPlay = phase === 'playing';

    const activeIndex = activeTrackIndexRef.current;

    if (shouldPlay) {
      if (activeIndex !== trackIndex) {
        // Fade out previous active track if one exists
        if (activeIndex !== null) {
          const prevHowl = howlsRef.current.get(activeIndex);
          if (prevHowl && prevHowl.playing()) {
            isTransitioningRef.current = true;
            prevHowl.fade(prevHowl.volume(), 0, FADE_OUT_MS);
            setTimeout(() => {
              if (mountedRef.current && activeTrackIndexRef.current !== activeIndex) {
                prevHowl.stop();
                isTransitioningRef.current = false;
              }
            }, FADE_OUT_MS);
          }
        }

        // Play and fade in the new track
        activeTrackIndexRef.current = trackIndex;
        const targetHowl = getOrCreateHowl(trackIndex);
        
        targetHowl.mute(muted);
        targetHowl.volume(0);
        targetHowl.play();

        isTransitioningRef.current = true;
        targetHowl.fade(0, getTargetVolume(), FADE_IN_MS);
        
        setTimeout(() => {
          if (mountedRef.current) {
            isTransitioningRef.current = false;
          }
        }, FADE_IN_MS);
      } else {
        // Ensure the current track is playing (e.g. if returning to 'playing' phase)
        const howl = getOrCreateHowl(trackIndex);
        if (!howl.playing()) {
          howl.mute(muted);
          howl.volume(0);
          howl.play();

          isTransitioningRef.current = true;
          howl.fade(0, getTargetVolume(), FADE_IN_MS);
          
          setTimeout(() => {
            if (mountedRef.current) {
              isTransitioningRef.current = false;
            }
          }, FADE_IN_MS);
        }
      }
    } else {
      // In scoring, completed, or other inactive phases, fade out and stop
      if (activeIndex !== null) {
        const howl = howlsRef.current.get(activeIndex);
        if (howl && howl.playing()) {
          isTransitioningRef.current = true;
          howl.fade(howl.volume(), 0, FADE_OUT_MS);
          setTimeout(() => {
            if (mountedRef.current && activeTrackIndexRef.current === null) {
              howl.stop();
              isTransitioningRef.current = false;
            }
          }, FADE_OUT_MS);
        }
        activeTrackIndexRef.current = null;
      }
    }
  }, [gameState?.roundCount, gameState?.phase]);

  // Clean up all resources when component unmounts
  useEffect(() => {
    return () => {
      mountedRef.current = false;
      howlsRef.current.forEach((howl) => {
        howl.stop();
        howl.unload();
      });
      howlsRef.current.clear();
      activeTrackIndexRef.current = null;
    };
  }, []);
}
