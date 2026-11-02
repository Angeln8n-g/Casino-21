import { useEffect, useRef } from 'react';
import { Audio } from 'expo-av';
import { useAudio } from './useAudio';
import { GameState } from 'domain/game-state';

const MUSIC_VOLUME_SCALE = 0.35; // 35% del volumen maestro para no tapar los efectos

const GAME_TRACKS = [
  require('../../public/audio/secuencia_clasic_1.mp3'),
  require('../../public/audio/secuencia_clasic_2.mp3'),
  require('../../public/audio/secuencia_clasic_3.mp3'),
  require('../../public/audio/secuencia_clasic_4.mp3'),
];

export function useGameMusic(gameState: GameState | null) {
  const { volume, muted } = useAudio();
  const currentSoundRef = useRef<Audio.Sound | null>(null);
  const activeTrackIndexRef = useRef<number>(0);
  const isPlayingRef = useRef<boolean>(false);

  // Determinar pista según la ronda
  const round = gameState?.roundCount || 1;
  const targetTrackIndex = (round - 1) % GAME_TRACKS.length;

  useEffect(() => {
    let isCancelled = false;

    const playTrack = async (index: number) => {
      try {
        if (currentSoundRef.current) {
          const old = currentSoundRef.current;
          currentSoundRef.current = null;
          await old.stopAsync().catch(() => {});
          await old.unloadAsync().catch(() => {});
        }

        if (isCancelled || !gameState || gameState.phase === 'completed') return;

        const targetVol = muted ? 0 : Math.max(0, Math.min(1, volume * MUSIC_VOLUME_SCALE));
        const source = GAME_TRACKS[index];

        const { sound } = await Audio.Sound.createAsync(
          source,
          {
            shouldPlay: !muted,
            isLooping: true,
            volume: targetVol,
          }
        );

        if (isCancelled) {
          await sound.unloadAsync().catch(() => {});
          return;
        }

        currentSoundRef.current = sound;
        activeTrackIndexRef.current = index;
        isPlayingRef.current = true;
      } catch (err) {
        console.warn('Error reproduciendo música de fondo en mobile:', err);
      }
    };

    if (targetTrackIndex !== activeTrackIndexRef.current || !isPlayingRef.current) {
      playTrack(targetTrackIndex);
    }

    return () => {
      isCancelled = true;
    };
  }, [targetTrackIndex, gameState?.phase]);

  // Sincronizar volumen y silencio en caliente
  useEffect(() => {
    const syncVolume = async () => {
      if (!currentSoundRef.current) return;
      try {
        const targetVol = muted ? 0 : Math.max(0, Math.min(1, volume * MUSIC_VOLUME_SCALE));
        await currentSoundRef.current.setVolumeAsync(targetVol);
        if (muted) {
          await currentSoundRef.current.pauseAsync().catch(() => {});
        } else {
          await currentSoundRef.current.playAsync().catch(() => {});
        }
      } catch {}
    };
    syncVolume();
  }, [volume, muted]);

  // Limpiar audio al salir de la pantalla de juego
  useEffect(() => {
    return () => {
      if (currentSoundRef.current) {
        currentSoundRef.current.stopAsync().then(() => currentSoundRef.current?.unloadAsync()).catch(() => {});
        currentSoundRef.current = null;
        isPlayingRef.current = false;
      }
    };
  }, []);
}
