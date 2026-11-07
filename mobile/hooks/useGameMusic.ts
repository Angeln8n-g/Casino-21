import { useEffect, useRef } from 'react';
import { AppState, AppStateStatus } from 'react-native';
import { Audio } from 'expo-av';
import { useAudio } from './useAudio';
import { useMusicSettings, resolveTrackSource } from './useMusicSettings';
import { GameState } from 'domain/game-state';

const MUSIC_VOLUME_SCALE = 0.45; // Mantiene la música de partida por debajo de los SFX de cartas
const FADE_IN_MS = 1100;

const sleep = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

export function useGameMusic(gameState: GameState | null) {
  const { musicVolume, musicMuted, musicEnabled } = useAudio();
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
  const fadeTokenRef = useRef<number>(0);
  const appActiveRef = useRef<boolean>(true);

  const isSilent = !musicEnabled || musicMuted;
  const volumeStateRef = useRef({ musicVolume, isSilent, musicEnabled });
  volumeStateRef.current = { musicVolume, isSilent, musicEnabled };

  const phase = gameState?.phase ?? null;

  // Pausar/reanudar limpiamente cuando la app móvil pasa a segundo plano
  useEffect(() => {
    const sub = AppState.addEventListener('change', (nextState: AppStateStatus) => {
      const active = nextState === 'active';
      appActiveRef.current = active;
      const sound = currentSoundRef.current;
      if (!sound) return;
      if (!active) {
        sound.pauseAsync().catch(() => {});
      } else if (phase === 'playing' && !isGameMusicPaused && volumeStateRef.current.musicEnabled) {
        sound.playAsync().catch(() => {});
      }
    });
    return () => {
      sub.remove();
    };
  }, [phase, isGameMusicPaused]);

  // Avanzar pista únicamente al finalizar un mazo completo (transición hacia 'scoring')
  useEffect(() => {
    if (!phase) return;
    const prevPhase = prevPhaseRef.current;
    prevPhaseRef.current = phase;

    if (phase === 'scoring' && prevPhase !== null && prevPhase !== 'scoring') {
      advanceGameTrackOnScoring();
    }
  }, [phase, advanceGameTrackOnScoring]);

  // Sincronizar pista activa por fase, estilo, selección manual o pausa de música con Fade In
  useEffect(() => {
    if (!phase) return;

    const currentPlaylist = playlists.game[style] || [];
    if (currentPlaylist.length === 0) return;

    const safeIndex =
      ((gameTrackIndex % currentPlaylist.length) + currentPlaylist.length) %
      currentPlaylist.length;
    const track = currentPlaylist[safeIndex];
    const desiredKey = `${style}:${track.id}:${safeIndex}`;
    const shouldPlay = phase === 'playing' && !isGameMusicPaused && musicEnabled;

    if (!shouldPlay) {
      requestIdRef.current += 1;
      fadeTokenRef.current += 1;
      if (currentSoundRef.current) {
        const snd = currentSoundRef.current;
        snd
          .setStatusAsync({ volume: 0 })
          .then(() => snd.pauseAsync())
          .catch(() => {});
      }
      return;
    }

    if (currentSoundRef.current && activeSoundKeyRef.current === desiredKey) {
      const { musicVolume: curVol, isSilent: curSilent } = volumeStateRef.current;
      const targetVol = curSilent ? 0 : Math.max(0, Math.min(1, curVol * MUSIC_VOLUME_SCALE));
      currentSoundRef.current
        .setStatusAsync({
          volume: targetVol,
          isMuted: curSilent,
          shouldPlay: appActiveRef.current,
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
      const { isSilent: curSilent } = volumeStateRef.current;

      const initialStatus = {
        shouldPlay: appActiveRef.current,
        isLooping: true,
        volume: 0,
        isMuted: curSilent,
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

      // Fade In progresivo para la pista de partida
      const token = ++fadeTokenRef.current;
      const steps = 10;
      const stepDelay = Math.round(FADE_IN_MS / steps);
      for (let i = 1; i <= steps; i++) {
        await sleep(stepDelay);
        if (!mountedRef.current || fadeTokenRef.current !== token) break;
        const { musicVolume: vNow, isSilent: sNow } = volumeStateRef.current;
        const target = sNow ? 0 : Math.max(0, Math.min(1, vNow * MUSIC_VOLUME_SCALE));
        const ramped = target * (i / steps);
        try {
          await loadedSound.setStatusAsync({ volume: ramped, isMuted: sNow });
        } catch {
          break;
        }
      }
    };

    loadTrack();
  }, [phase, style, playlists.game, gameTrackIndex, isGameMusicPaused, musicEnabled]);

  // Sincronizar volumen de música y silencio en tiempo real (independiente de efectos de sonido)
  useEffect(() => {
    const sound = currentSoundRef.current;
    if (!sound) return;
    fadeTokenRef.current += 1;
    const targetVol = isSilent ? 0 : Math.max(0, Math.min(1, musicVolume * MUSIC_VOLUME_SCALE));
    const shouldBePlaying = phase === 'playing' && !isGameMusicPaused && musicEnabled && appActiveRef.current;
    sound
      .setStatusAsync({
        volume: targetVol,
        isMuted: isSilent,
        shouldPlay: shouldBePlaying,
      })
      .catch(() => {});
  }, [musicVolume, isSilent, musicEnabled, phase, isGameMusicPaused]);

  // Limpiar recursos al desmontar la pantalla de partida
  useEffect(() => {
    mountedRef.current = true;
    resetGameMusicSession();
    return () => {
      mountedRef.current = false;
      requestIdRef.current += 1;
      fadeTokenRef.current += 1;
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
