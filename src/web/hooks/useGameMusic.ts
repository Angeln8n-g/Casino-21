import { useEffect, useRef, useState } from 'react';
import { Howl } from 'howler';
import { useAudio } from './useAudio';
import { GameState } from '../../domain/game-state';

const MUSIC_VOLUME_SCALE = 0.45; // Sits at 45% of master volume to keep sfx audible
const FADE_OUT_MS = 1000;
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
  const mountedRef = useRef(true);

  // Track the number of scoring phases seen to determine which track to play.
  // We advance the track only when scoring happens, NOT on every mid-round re-deal.
  const scoringCountRef = useRef(0);
  const prevPhaseRef = useRef<string | null>(null);

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
      volume: getTargetVolume(),
      preload: true,
      html5: true, // Use HTML5 audio to handle large files efficiently (streaming, low memory)
    });

    howlsRef.current.set(index, howl);
    return howl;
  };

  // Sync volume and mute state dynamically
  useEffect(() => {
    const targetVol = getTargetVolume();
    howlsRef.current.forEach((howl, idx) => {
      if (idx === activeTrackIndexRef.current) {
        howl.volume(targetVol);
      } else {
        howl.volume(0);
      }
      howl.mute(muted);
    });
  }, [masterVolume, muted]);

  // Handle music transitions based on phase changes only.
  // The track index advances only when we detect a scoring transition,
  // so mid-round re-deals (which increment roundCount) do NOT restart the music.
  useEffect(() => {
    if (!gameState) return;

    mountedRef.current = true;
    const { phase } = gameState;
    const prevPhase = prevPhaseRef.current;
    prevPhaseRef.current = phase;

    // Detect transition INTO scoring — this means a mazo just ended
    if (phase === 'scoring' && prevPhase !== null && prevPhase !== 'scoring') {
      scoringCountRef.current += 1;
    }

    const trackIndex = scoringCountRef.current % 4;
    const shouldPlay = phase === 'playing';
    const activeIndex = activeTrackIndexRef.current;

    if (shouldPlay) {
      if (activeIndex !== trackIndex) {
        // Fade out previous active track if one exists
        if (activeIndex !== null) {
          const prevHowl = howlsRef.current.get(activeIndex);
          if (prevHowl && prevHowl.playing()) {
            prevHowl.fade(prevHowl.volume(), 0, FADE_OUT_MS);
            setTimeout(() => {
              if (mountedRef.current && activeTrackIndexRef.current !== activeIndex) {
                prevHowl.stop();
              }
            }, FADE_OUT_MS);
          }
        }

        // Play the new track immediately at the target volume
        activeTrackIndexRef.current = trackIndex;
        const targetHowl = getOrCreateHowl(trackIndex);
        
        targetHowl.mute(muted);
        targetHowl.volume(getTargetVolume());
        targetHowl.play();
      } else {
        // Same track — ensure it's still playing (e.g. returning from scoring to playing)
        const howl = getOrCreateHowl(trackIndex);
        if (!howl.playing()) {
          howl.mute(muted);
          howl.volume(getTargetVolume());
          howl.play();
        }
      }
    } else {
      // In scoring, completed, or other inactive phases, fade out and stop
      if (activeIndex !== null) {
        const howl = howlsRef.current.get(activeIndex);
        if (howl && howl.playing()) {
          howl.fade(howl.volume(), 0, FADE_OUT_MS);
          setTimeout(() => {
            if (mountedRef.current && activeTrackIndexRef.current === null) {
              howl.stop();
            }
          }, FADE_OUT_MS);
        }
        activeTrackIndexRef.current = null;
      }
    }
  }, [gameState?.phase, gameState?.roundCount]);

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
