import { useEffect, useRef, useState } from 'react';
import { Audio } from 'expo-av';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useAudio } from './useAudio';
import { GameState } from 'domain/game-state';

const MUSIC_VOLUME_SCALE = 0.45; // 45% del volumen maestro (idéntico a src/web/hooks/useGameMusic.ts)
const LOBBY_MUSIC_SETTINGS_KEY = 'casino21_lobby_music';

const CLASSIC_TRACKS = [
  require('../assets/audio/music/secuencia_clasic_1.mp3'),
  require('../assets/audio/music/secuencia_clasic_2.mp3'),
  require('../assets/audio/music/secuencia_clasic_3.mp3'),
  require('../assets/audio/music/secuencia_clasic_4.mp3'),
];

const MODERN_TRACKS = [
  require('../assets/audio/music/secuencia_moderna_1.mp3'),
  require('../assets/audio/music/secuencia_moderna_2.mp3'),
  require('../assets/audio/music/secuencia_moderna_3.mp3'),
  require('../assets/audio/music/secuencia_moderna_4.mp3'),
];

export function useGameMusic(gameState: GameState | null) {
  const { volume, muted } = useAudio();
  const [style, setStyle] = useState<'classic' | 'modern'>('classic');

  const currentSoundRef = useRef<Audio.Sound | null>(null);
  const activeTrackIndexRef = useRef<number | null>(null);
  const activeStyleRef = useRef<'classic' | 'modern'>('classic');
  const scoringCountRef = useRef<number>(0);
  const prevPhaseRef = useRef<string | null>(null);
  const mountedRef = useRef<boolean>(true);
  const loadingRef = useRef<boolean>(false);

  // Cargar preferencia de estilo musical guardada en el lobby
  useEffect(() => {
    let active = true;
    AsyncStorage.getItem(LOBBY_MUSIC_SETTINGS_KEY)
      .then((stored) => {
        if (!active || !stored) return;
        const parsed = JSON.parse(stored);
        if (parsed.style === 'classic' || parsed.style === 'modern') {
          setStyle(parsed.style);
        }
      })
      .catch(() => {});
    return () => {
      active = false;
    };
  }, []);

  const phase = gameState?.phase ?? null;

  // Avanzar pista ÚNICAMENTE cuando termina un mazo completo (transición hacia 'scoring'),
  // nunca en repartos intermedios de 4 cartas (igual que src/web/hooks/useGameMusic.ts).
  useEffect(() => {
    if (!phase) return;

    const prevPhase = prevPhaseRef.current;
    prevPhaseRef.current = phase;

    if (phase === 'scoring' && prevPhase !== null && prevPhase !== 'scoring') {
      scoringCountRef.current += 1;
    }

    const tracks = style === 'modern' ? MODERN_TRACKS : CLASSIC_TRACKS;
    const trackIndex = scoringCountRef.current % tracks.length;
    const shouldPlay = phase === 'playing';
    const targetVol = muted ? 0 : Math.max(0, Math.min(1, volume * MUSIC_VOLUME_SCALE));

    let cancelled = false;

    const syncTrack = async () => {
      if (!shouldPlay) {
        // Pausar música en fases de conteo (scoring) o partida terminada (completed)
        if (currentSoundRef.current) {
          try {
            await currentSoundRef.current.pauseAsync();
          } catch {}
        }
        return;
      }

      // Si ya tenemos la misma pista cargada del mismo estilo, solo reanudar / ajustar volumen
      if (
        currentSoundRef.current &&
        activeTrackIndexRef.current === trackIndex &&
        activeStyleRef.current === style
      ) {
        try {
          await currentSoundRef.current.setStatusAsync({
            volume: targetVol,
            isMuted: muted,
            shouldPlay: !muted,
          });
        } catch {}
        return;
      }

      if (loadingRef.current) return;
      loadingRef.current = true;

      try {
        if (currentSoundRef.current) {
          const oldSound = currentSoundRef.current;
          currentSoundRef.current = null;
          activeTrackIndexRef.current = null;
          await oldSound.stopAsync().catch(() => {});
          await oldSound.unloadAsync().catch(() => {});
        }

        if (cancelled || !mountedRef.current) return;

        const { sound } = await Audio.Sound.createAsync(
          tracks[trackIndex],
          {
            shouldPlay: !muted,
            isLooping: true,
            volume: targetVol,
            isMuted: muted,
          },
          null,
          false // Crucial: downloadFirst = false
        );

        if (cancelled || !mountedRef.current) {
          await sound.unloadAsync().catch(() => {});
          return;
        }

        currentSoundRef.current = sound;
        activeTrackIndexRef.current = trackIndex;
        activeStyleRef.current = style;
      } catch (err) {
        console.warn('[useGameMusic] Error cargando pista musical:', err);
      } finally {
        loadingRef.current = false;
      }
    };

    syncTrack();

    return () => {
      cancelled = true;
    };
  }, [phase, style]);

  // Sincronizar volumen y estado de silencio en caliente sin reiniciar la pista
  useEffect(() => {
    const syncVolumeAndMute = async () => {
      const sound = currentSoundRef.current;
      if (!sound) return;
      try {
        const targetVol = muted ? 0 : Math.max(0, Math.min(1, volume * MUSIC_VOLUME_SCALE));
        const shouldBePlaying = phase === 'playing' && !muted;
        await sound.setStatusAsync({
          volume: targetVol,
          isMuted: muted,
          shouldPlay: shouldBePlaying,
        });
      } catch {}
    };
    syncVolumeAndMute();
  }, [volume, muted, phase]);

  // Limpiar recursos al desmontar la pantalla de partida
  useEffect(() => {
    mountedRef.current = true;
    return () => {
      mountedRef.current = false;
      if (currentSoundRef.current) {
        const sound = currentSoundRef.current;
        currentSoundRef.current = null;
        activeTrackIndexRef.current = null;
        sound
          .stopAsync()
          .then(() => sound.unloadAsync())
          .catch(() => {});
      }
    };
  }, []);
}
