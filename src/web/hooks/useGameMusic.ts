import { useCallback, useEffect, useRef, useState } from 'react';
import { Howl } from 'howler';
import { useAudio } from './useAudio';
import { useMusic } from './useMusic';
import { GameState } from '../../domain/game-state';
import { supabase } from '../services/supabase';

const GAME_MUSIC_SCALE = 0.45; // Mantiene la música de partida por debajo de los efectos de cartas
const FADE_IN_MS = 1200;
const FADE_OUT_MS = 950;

export function useGameMusic(gameState: GameState | null) {
  const { musicVolume, musicMuted, musicEnabled } = useAudio();
  const { style } = useMusic();

  const [tracks, setTracks] = useState<string[]>(() => {
    const fileSuffix = style === 'classic' ? 'clasic' : 'moderna';
    return [
      `/audio/secuencia_${fileSuffix}_1.mp3`,
      `/audio/secuencia_${fileSuffix}_2.mp3`,
      `/audio/secuencia_${fileSuffix}_3.mp3`,
      `/audio/secuencia_${fileSuffix}_4.mp3`,
    ];
  });

  const howlsRef = useRef<Map<number, Howl>>(new Map());
  const soundIdsRef = useRef<Map<number, number>>(new Map());
  const activeTrackIndexRef = useRef<number | null>(null);
  const mountedRef = useRef(true);
  const scoringCountRef = useRef(0);
  const prevPhaseRef = useRef<string | null>(null);

  const isSilent = !musicEnabled || musicMuted;

  const getTargetVolume = useCallback(() => {
    if (!musicEnabled || musicMuted) return 0;
    return Math.min(1, Math.max(0, musicVolume * GAME_MUSIC_SCALE));
  }, [musicEnabled, musicMuted, musicVolume]);

  const targetVolRef = useRef<number>(getTargetVolume());
  targetVolRef.current = getTargetVolume();

  // Sincronizar pistas de partida al cambiar el estilo musical
  useEffect(() => {
    let active = true;
    const fileSuffix = style === 'classic' ? 'clasic' : 'moderna';
    const fallback = [
      `/audio/secuencia_${fileSuffix}_1.mp3`,
      `/audio/secuencia_${fileSuffix}_2.mp3`,
      `/audio/secuencia_${fileSuffix}_3.mp3`,
      `/audio/secuencia_${fileSuffix}_4.mp3`,
    ];

    // Limpiar instancias del estilo anterior para evitar solapamientos
    howlsRef.current.forEach((h) => {
      try {
        h.stop();
        h.unload();
      } catch {}
    });
    howlsRef.current.clear();
    soundIdsRef.current.clear();
    activeTrackIndexRef.current = null;
    setTracks(fallback);

    const fetchGameTracks = async () => {
      try {
        const { data, error } = await supabase
          .from('audio_tracks')
          .select('src')
          .eq('category', 'game')
          .eq('style', style)
          .order('track_order');

        if (error) throw error;

        if (active && data && data.length > 0) {
          howlsRef.current.forEach((h) => {
            try {
              h.stop();
              h.unload();
            } catch {}
          });
          howlsRef.current.clear();
          soundIdsRef.current.clear();
          activeTrackIndexRef.current = null;
          setTracks(data.map((t) => t.src));
        }
      } catch {
        // Fallback local ya activo
      }
    };

    fetchGameTracks();
    return () => {
      active = false;
    };
  }, [style]);

  const getOrCreateHowl = useCallback(
    (index: number) => {
      if (howlsRef.current.has(index)) {
        return howlsRef.current.get(index)!;
      }

      const src = tracks[index % tracks.length];
      const isExternalUrl = /^https?:\/\//i.test(src);

      const howl = new Howl({
        src: [src],
        loop: true,
        volume: 0,
        preload: true,
        html5: isExternalUrl,
      });

      howlsRef.current.set(index, howl);
      return howl;
    },
    [tracks]
  );

  // Sincronizar volumen y silencio de música en tiempo real (independiente de SFX)
  useEffect(() => {
    const targetVol = getTargetVolume();
    howlsRef.current.forEach((howl, idx) => {
      const sid = soundIdsRef.current.get(idx);
      if (idx === activeTrackIndexRef.current) {
        if (sid !== undefined) howl.volume(targetVol, sid);
        else howl.volume(targetVol);
      } else {
        howl.volume(0);
      }
      howl.mute(isSilent);
    });
  }, [getTargetVolume, isSilent]);

  // Transiciones suaves por fase de partida
  useEffect(() => {
    if (!gameState) return;

    mountedRef.current = true;
    const { phase } = gameState;
    const prevPhase = prevPhaseRef.current;
    prevPhaseRef.current = phase;

    // Avanzar pista únicamente al finalizar un mazo completo (transición a 'scoring')
    if (phase === 'scoring' && prevPhase !== null && prevPhase !== 'scoring') {
      scoringCountRef.current += 1;
    }

    if (tracks.length === 0) return;

    const trackIndex = scoringCountRef.current % tracks.length;
    const shouldPlay = phase === 'playing' && musicEnabled;
    const activeIndex = activeTrackIndexRef.current;

    if (shouldPlay) {
      if (activeIndex !== trackIndex) {
        if (activeIndex !== null) {
          const prevHowl = howlsRef.current.get(activeIndex);
          const prevSid = soundIdsRef.current.get(activeIndex);
          if (prevHowl && prevHowl.playing()) {
            prevHowl.fade(prevHowl.volume(), 0, FADE_OUT_MS, prevSid);
            window.setTimeout(() => {
              if (mountedRef.current && activeTrackIndexRef.current !== activeIndex) {
                try {
                  prevHowl.stop();
                } catch {}
              }
            }, FADE_OUT_MS + 30);
          }
        }

        activeTrackIndexRef.current = trackIndex;
        const targetHowl = getOrCreateHowl(trackIndex);
        targetHowl.mute(isSilent);
        targetHowl.volume(0);
        const existingSid = soundIdsRef.current.get(trackIndex);
        const sid =
          existingSid !== undefined && targetHowl.playing(existingSid)
            ? existingSid
            : targetHowl.play(existingSid);
        soundIdsRef.current.set(trackIndex, sid);
        targetHowl.fade(0, targetVolRef.current, FADE_IN_MS, sid);
      } else {
        const howl = getOrCreateHowl(trackIndex);
        const existingSid = soundIdsRef.current.get(trackIndex);
        const alreadyPlaying =
          existingSid !== undefined ? howl.playing(existingSid) : howl.playing();
        if (!alreadyPlaying) {
          howl.mute(isSilent);
          howl.volume(0);
          const sid = howl.play(existingSid);
          soundIdsRef.current.set(trackIndex, sid);
          howl.fade(0, targetVolRef.current, FADE_IN_MS, sid);
        }
      }
    } else {
      if (activeIndex !== null) {
        const howl = howlsRef.current.get(activeIndex);
        const sid = soundIdsRef.current.get(activeIndex);
        if (howl && howl.playing()) {
          howl.fade(howl.volume(), 0, FADE_OUT_MS, sid);
          window.setTimeout(() => {
            if (mountedRef.current && activeTrackIndexRef.current === null) {
              try {
                if (sid !== undefined) howl.pause(sid);
                else howl.pause();
              } catch {}
            }
          }, FADE_OUT_MS + 30);
        }
        activeTrackIndexRef.current = null;
      }
    }
  }, [gameState?.phase, gameState?.roundCount, tracks, musicEnabled, isSilent, getOrCreateHowl]);

  // Limpieza garantizada al salir de la pantalla de partida
  useEffect(() => {
    mountedRef.current = true;
    return () => {
      mountedRef.current = false;
      howlsRef.current.forEach((howl) => {
        try {
          howl.stop();
          howl.unload();
        } catch {}
      });
      howlsRef.current.clear();
      soundIdsRef.current.clear();
      activeTrackIndexRef.current = null;
    };
  }, []);
}
