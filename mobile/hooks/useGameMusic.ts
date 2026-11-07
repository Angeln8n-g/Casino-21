import { useEffect, useRef } from 'react';
import { Audio } from 'expo-av';
import { useAudio } from './useAudio';
import { useMusicSettings, resolveTrackSource } from './useMusicSettings';
import { GameState } from 'domain/game-state';

const MUSIC_VOLUME_SCALE = 0.45; // 45% del volumen maestro (idéntico a src/web/hooks/useGameMusic.ts)

export function useGameMusic(gameState: GameState | null) {
  const { volume, muted } = useAudio();
  const {
    style,
    playlists,
    gameTrackIndex,
    isGameMusicPaused,
    advanceGameTrackOnScoring,
    resetGameMusicSession,
  } = useMusicSettings();

  const currentSoundRef = useRef<Audio.Sound | null>(null);
  const activeSoundKeyRef = useRef<string | null>(null);
  const prevPhaseRef = useRef<string | null>(null);
  const mountedRef = useRef<boolean>(true);
  const requestIdRef = useRef<number>(0);
  const volumeStateRef = useRef({ volume, muted });
  volumeStateRef.current = { volume, muted };

  const phase = gameState?.phase ?? null;

  // Avanzar pista ÚNICAMENTE cuando termina un mazo completo (transición hacia 'scoring'),
  // nunca en repartos intermedios de 4 cartas (igual que src/web/hooks/useGameMusic.ts).
  useEffect(() => {
    if (!phase) return;
    const prevPhase = prevPhaseRef.current;
    prevPhaseRef.current = phase;

    if (phase === 'scoring' && prevPhase !== null && prevPhase !== 'scoring') {
      advanceGameTrackOnScoring();
    }
  }, [phase, advanceGameTrackOnScoring]);

  // Sincronizar pista activa por fase, estilo, selección manual o pausa de música
  useEffect(() => {
    if (!phase) return;

    const currentPlaylist = playlists.game[style] || [];
    if (currentPlaylist.length === 0) return;

    const safeIndex =
      ((gameTrackIndex % currentPlaylist.length) + currentPlaylist.length) %
      currentPlaylist.length;
    const track = currentPlaylist[safeIndex];
    const desiredKey = `${style}:${track.id}:${safeIndex}`;
    const shouldPlay = phase === 'playing' && !isGameMusicPaused;

    if (!shouldPlay) {
      // Pausar música en fases de conteo (scoring), partida terminada (completed) o pausa manual
      requestIdRef.current += 1;
      if (currentSoundRef.current) {
        currentSoundRef.current.pauseAsync().catch(() => {});
      }
      return;
    }

    // Si ya tenemos la misma pista cargada del mismo estilo, solo reanudar / ajustar volumen
    if (currentSoundRef.current && activeSoundKeyRef.current === desiredKey) {
      const { volume: curVol, muted: curMuted } = volumeStateRef.current;
      const targetVol = curMuted
        ? 0
        : Math.max(0, Math.min(1, curVol * MUSIC_VOLUME_SCALE));
      currentSoundRef.current
        .setStatusAsync({
          volume: targetVol,
          isMuted: curMuted,
          shouldPlay: true,
        })
        .catch(() => {});
      return;
    }

    const reqId = ++requestIdRef.current;

    const loadTrack = async () => {
      if (currentSoundRef.current) {
        const oldSound = currentSoundRef.current;
        currentSoundRef.current = null;
        activeSoundKeyRef.current = null;
        await oldSound.stopAsync().catch(() => {});
        await oldSound.unloadAsync().catch(() => {});
      }

      if (!mountedRef.current || requestIdRef.current !== reqId) return;

      const { primary, fallbackLocal } = resolveTrackSource(track, safeIndex);
      const { volume: curVol, muted: curMuted } = volumeStateRef.current;
      const targetVol = curMuted
        ? 0
        : Math.max(0, Math.min(1, curVol * MUSIC_VOLUME_SCALE));

      const initialStatus = {
        shouldPlay: true,
        isLooping: true,
        volume: targetVol,
        isMuted: curMuted,
      };

      let loadedSound: Audio.Sound | null = null;
      try {
        const isBundledNumber = typeof primary === 'number';
        const { sound } = await Audio.Sound.createAsync(
          primary,
          initialStatus,
          null,
          isBundledNumber ? false : undefined
        );
        loadedSound = sound;
      } catch (err) {
        try {
          const { sound } = await Audio.Sound.createAsync(
            fallbackLocal,
            initialStatus,
            null,
            false
          );
          loadedSound = sound;
        } catch (fallbackErr) {
          console.warn('[useGameMusic] Error cargando pista musical:', err, fallbackErr);
        }
      }

      if (!loadedSound) return;

      if (!mountedRef.current || requestIdRef.current !== reqId) {
        loadedSound
          .stopAsync()
          .then(() => loadedSound?.unloadAsync())
          .catch(() => {});
        return;
      }

      currentSoundRef.current = loadedSound;
      activeSoundKeyRef.current = desiredKey;
    };

    loadTrack();
  }, [phase, style, playlists.game, gameTrackIndex, isGameMusicPaused]);

  // Sincronizar volumen y estado de silencio en caliente sin reiniciar la pista
  useEffect(() => {
    const sound = currentSoundRef.current;
    if (!sound) return;
    const targetVol = muted ? 0 : Math.max(0, Math.min(1, volume * MUSIC_VOLUME_SCALE));
    const shouldBePlaying = phase === 'playing' && !isGameMusicPaused;
    sound
      .setStatusAsync({
        volume: targetVol,
        isMuted: muted,
        shouldPlay: shouldBePlaying,
      })
      .catch(() => {});
  }, [volume, muted, phase, isGameMusicPaused]);

  // Limpiar recursos al desmontar la pantalla de partida
  useEffect(() => {
    mountedRef.current = true;
    resetGameMusicSession();
    return () => {
      mountedRef.current = false;
      requestIdRef.current += 1;
      if (currentSoundRef.current) {
        const sound = currentSoundRef.current;
        currentSoundRef.current = null;
        activeSoundKeyRef.current = null;
        sound
          .stopAsync()
          .then(() => sound.unloadAsync())
          .catch(() => {});
      }
    };
  }, [resetGameMusicSession]);
}
