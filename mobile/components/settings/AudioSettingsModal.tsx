import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  View,
  Text,
  Pressable,
  ScrollView,
  StyleSheet,
  ActivityIndicator,
  useWindowDimensions,
  LayoutChangeEvent,
} from 'react-native';
import { Gesture, GestureDetector } from 'react-native-gesture-handler';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withRepeat,
  withSequence,
  withTiming,
  withDelay,
  Easing,
  cancelAnimation,
  runOnJS,
} from 'react-native-reanimated';
import {
  Settings,
  Volume2,
  VolumeX,
  Music,
  Sparkles,
  Play,
  Pause,
  SkipForward,
  Check,
  X,
} from 'lucide-react-native';
import { useAudio } from '../../hooks/useAudio';
import {
  useMusicSettings,
  MusicCategory,
  MusicStyle,
} from '../../hooks/useMusicSettings';
import { triggerHaptic } from '../../utils/haptics';

interface EqualizerBarProps {
  index: number;
  active: boolean;
  color: string;
}

function EqualizerBar({ index, active, color }: EqualizerBarProps) {
  const scaleY = useSharedValue(0.22);

  useEffect(() => {
    if (active) {
      const duration = 360 + (index % 4) * 90;
      scaleY.value = withDelay(
        index * 55,
        withRepeat(
          withSequence(
            withTiming(1, { duration, easing: Easing.inOut(Easing.quad) }),
            withTiming(0.22, { duration, easing: Easing.inOut(Easing.quad) })
          ),
          -1,
          true
        )
      );
    } else {
      cancelAnimation(scaleY);
      scaleY.value = withTiming(0.22, { duration: 180 });
    }
    return () => {
      cancelAnimation(scaleY);
    };
  }, [active, index, scaleY]);

  const animatedStyle = useAnimatedStyle(() => ({
    transform: [{ scaleY: scaleY.value }],
  }));

  return (
    <Animated.View
      style={[
        {
          width: 3,
          height: 18,
          borderRadius: 999,
          backgroundColor: color,
        },
        animatedStyle,
      ]}
    />
  );
}

interface TouchVolumeSliderProps {
  percent: number;
  accentHex: string;
  onChangeRatio: (ratio: number) => void;
  onRelease?: () => void;
}

function TouchVolumeSlider({
  percent,
  accentHex,
  onChangeRatio,
  onRelease,
}: TouchVolumeSliderProps) {
  const widthRef = useRef<number>(240);
  const cbRef = useRef(onChangeRatio);
  cbRef.current = onChangeRatio;
  const relRef = useRef(onRelease);
  relRef.current = onRelease;

  const applyX = useCallback((x: number) => {
    const w = Math.max(1, widthRef.current);
    const ratio = Math.round(Math.max(0, Math.min(1, x / w)) * 100) / 100;
    cbRef.current(ratio);
  }, []);

  const handleRelease = useCallback(() => {
    relRef.current?.();
  }, []);

  const gesture = useMemo(() => {
    const pan = Gesture.Pan()
      .activeOffsetX([-4, 4])
      .onBegin((e) => {
        runOnJS(applyX)(e.x);
      })
      .onUpdate((e) => {
        runOnJS(applyX)(e.x);
      })
      .onFinalize(() => {
        runOnJS(handleRelease)();
      });

    const tap = Gesture.Tap().onEnd((e) => {
      runOnJS(applyX)(e.x);
      runOnJS(handleRelease)();
    });

    return Gesture.Race(pan, tap);
  }, [applyX, handleRelease]);

  const onLayout = useCallback((e: LayoutChangeEvent) => {
    const w = e.nativeEvent.layout.width;
    if (w > 0) widthRef.current = w;
  }, []);

  return (
    <GestureDetector gesture={gesture}>
      <View
        onLayout={onLayout}
        style={{
          height: 32,
          justifyContent: 'center',
          position: 'relative',
        }}
      >
        <View className="w-full h-2.5 bg-slate-800 rounded-full overflow-hidden border border-white/5">
          <View
            style={{
              width: `${percent}%`,
              height: '100%',
              backgroundColor: accentHex,
              borderRadius: 999,
            }}
          />
        </View>
        <View
          pointerEvents="none"
          style={{
            position: 'absolute',
            left: `${percent}%`,
            marginLeft: -9,
            width: 18,
            height: 18,
            borderRadius: 9,
            backgroundColor: '#ffffff',
            borderWidth: 2.5,
            borderColor: accentHex,
          }}
        />
      </View>
    </GestureDetector>
  );
}

export function AudioSettingsModal() {
  const { width: windowWidth, height: windowHeight } = useWindowDimensions();
  const {
    sfxVolume,
    sfxMuted,
    setSfxVolume,
    setSfxMuted,
    toggleSfxMuted,
    musicEnabled,
    musicMuted,
    musicVolume,
    setMusicEnabled,
    toggleMusicEnabled,
    setMusicMuted,
    toggleMusicMuted,
    setMusicVolume,
    playSfx,
  } = useAudio();

  const {
    style,
    playlists,
    isLoadingTracks,
    isInGame,
    isLobbyPlaying,
    lobbyTrackIndex,
    toggleLobbyPlayPause,
    selectLobbyTrack,
    skipLobbyTrack,
    isGameMusicPaused,
    gameTrackIndex,
    previewGameTrackIndex,
    toggleGameMusicPause,
    selectGameTrack,
    skipGameTrack,
    stopGamePreview,
    setMusicStyle,
    showSettingsModal,
    closeSettingsModal,
  } = useMusicSettings();

  const [selectedCategory, setSelectedCategory] = useState<MusicCategory>('lobby');

  useEffect(() => {
    if (showSettingsModal) {
      setSelectedCategory(isInGame ? 'game' : 'lobby');
    }
  }, [showSettingsModal, isInGame]);

  const effectiveCategory: MusicCategory = isInGame ? 'game' : selectedCategory;
  const currentTracks = playlists[effectiveCategory][style] || [];

  const activeTrackIndex = useMemo(() => {
    if (currentTracks.length === 0) return 0;
    const raw = effectiveCategory === 'game' ? gameTrackIndex : lobbyTrackIndex;
    return ((raw % currentTracks.length) + currentTracks.length) % currentTracks.length;
  }, [currentTracks.length, effectiveCategory, gameTrackIndex, lobbyTrackIndex]);

  const isCategoryPlaying = useMemo(() => {
    if (!musicEnabled || musicMuted) return false;
    if (isInGame) {
      return !isGameMusicPaused;
    }
    if (effectiveCategory === 'game') {
      return previewGameTrackIndex !== null;
    }
    return isLobbyPlaying && previewGameTrackIndex === null;
  }, [
    effectiveCategory,
    isGameMusicPaused,
    isInGame,
    isLobbyPlaying,
    musicEnabled,
    musicMuted,
    previewGameTrackIndex,
  ]);

  const currentTrackLabel =
    currentTracks[activeTrackIndex]?.label || 'KASINO21 — Arena Protocol';

  const displayMusicVolume = !musicEnabled || musicMuted ? 0 : musicVolume;
  const musicPercent = Math.round(displayMusicVolume * 100);

  const displaySfxVolume = sfxMuted ? 0 : sfxVolume;
  const sfxPercent = Math.round(displaySfxVolume * 100);

  const isClassic = style === 'classic';
  const accentHex = isClassic ? '#f59e0b' : '#06b6d4';
  const accentLightHex = isClassic ? '#fbbf24' : '#22d3ee';

  const handleMusicRatioChange = useCallback(
    (ratio: number) => {
      setMusicVolume(ratio);
      if (ratio === 0) {
        setMusicMuted(true);
      } else {
        if (!musicEnabled) setMusicEnabled(true);
        if (musicMuted) setMusicMuted(false);
      }
    },
    [musicEnabled, musicMuted, setMusicEnabled, setMusicMuted, setMusicVolume]
  );

  const handleSfxRatioChange = useCallback(
    (ratio: number) => {
      setSfxVolume(ratio);
      if (ratio === 0) {
        setSfxMuted(true);
      } else if (sfxMuted) {
        setSfxMuted(false);
      }
    },
    [setSfxMuted, setSfxVolume, sfxMuted]
  );

  const handleSfxRelease = useCallback(() => {
    if (!sfxMuted) {
      playSfx('cardPlay', { volumeMultiplier: 0.5 });
    }
  }, [playSfx, sfxMuted]);

  const handlePresetMusicVolume = (preset: number) => {
    triggerHaptic('light');
    setMusicVolume(preset);
    if (!musicEnabled) setMusicEnabled(true);
    if (musicMuted) setMusicMuted(false);
  };

  const handlePlayPausePress = () => {
    triggerHaptic('light');
    if (isInGame) {
      if (!musicEnabled) {
        setMusicEnabled(true);
        if (musicMuted) setMusicMuted(false);
        return;
      }
      toggleGameMusicPause();
      return;
    }
    if (effectiveCategory === 'game') {
      if (previewGameTrackIndex !== null) {
        stopGamePreview();
      } else {
        selectGameTrack(activeTrackIndex, { previewInLobby: true });
      }
      return;
    }
    toggleLobbyPlayPause();
  };

  const handleSkipPress = () => {
    triggerHaptic('light');
    if (isInGame) {
      skipGameTrack();
      return;
    }
    if (effectiveCategory === 'game') {
      skipGameTrack({ previewInLobby: true });
      return;
    }
    skipLobbyTrack();
  };

  const handleTrackSelect = (index: number) => {
    triggerHaptic('card_tap');
    if (effectiveCategory === 'game') {
      selectGameTrack(index, { previewInLobby: !isInGame });
    } else {
      selectLobbyTrack(index);
    }
  };

  const handleStylePress = (nextStyle: MusicStyle) => {
    if (nextStyle === style) return;
    triggerHaptic('light');
    playSfx('cardPlay', { volumeMultiplier: 0.5 });
    setMusicStyle(nextStyle);
  };

  const handleClose = () => {
    triggerHaptic('light');
    closeSettingsModal();
  };

  if (!showSettingsModal) return null;

  const cardWidth = Math.min(Math.max(windowWidth - 28, 290), 435);
  const cardMaxHeight = Math.min(windowHeight * 0.9, 680);

  return (
    <View
      style={[
        StyleSheet.absoluteFillObject,
        {
          width: windowWidth,
          height: windowHeight,
          zIndex: 999998,
          elevation: 999998,
          backgroundColor: 'rgba(2, 6, 23, 0.86)',
          justifyContent: 'center',
          alignItems: 'center',
          padding: 14,
        },
      ]}
    >
      <Pressable style={StyleSheet.absoluteFillObject} onPress={handleClose} />

      <View
        style={{
          width: cardWidth,
          maxHeight: cardMaxHeight,
          backgroundColor: '#0f172a',
          borderRadius: 24,
          borderWidth: 1,
          borderColor: isClassic
            ? 'rgba(251, 191, 36, 0.32)'
            : 'rgba(6, 182, 212, 0.32)',
          overflow: 'hidden',
          shadowColor: '#000',
          shadowOffset: { width: 0, height: 14 },
          shadowOpacity: 0.65,
          shadowRadius: 24,
        }}
      >
        {/* ── Header ─────────────────────────────────────────────── */}
        <View className="px-5 py-4 border-b border-white/10 bg-slate-950/60 flex-row items-center justify-between">
          <View className="flex-row items-center gap-3 flex-1 mr-2">
            <View
              className={`w-9 h-9 rounded-xl items-center justify-center border ${
                isClassic
                  ? 'bg-amber-500/15 border-amber-500/40'
                  : 'bg-cyan-500/15 border-cyan-500/40'
              }`}
            >
              <Settings color={accentLightHex} size={18} />
            </View>
            <View className="flex-1">
              <Text className="text-white font-black text-sm uppercase tracking-wider">
                Audio y Música
              </Text>
              <Text className="text-slate-400 text-[11px] mt-0.5" numberOfLines={1}>
                Controles independientes de Música y Efectos
              </Text>
            </View>
          </View>

          <Pressable
            onPress={handleClose}
            className="w-8 h-8 rounded-xl bg-slate-800/90 border border-slate-700 items-center justify-center active:bg-slate-700"
            accessibilityLabel="Cerrar configuraciones"
          >
            <X color="#94a3b8" size={16} />
          </Pressable>
        </View>

        <ScrollView
          showsVerticalScrollIndicator={false}
          contentContainerStyle={{ padding: 16, paddingBottom: 22 }}
        >
          {/* ── Sección 1: Música (Control Independiente) ── */}
          <View className="bg-slate-950/75 border border-slate-800 rounded-2xl p-4 mb-3">
            <View className="flex-row items-center justify-between mb-2.5">
              <View className="flex-row items-center gap-2.5">
                <Pressable
                  onPress={() => {
                    triggerHaptic('light');
                    toggleMusicMuted();
                  }}
                  disabled={!musicEnabled}
                  className={`w-9 h-9 rounded-xl items-center justify-center border ${
                    !musicEnabled || musicMuted || musicPercent === 0
                      ? 'bg-red-500/15 border-red-500/30'
                      : isClassic
                        ? 'bg-amber-500/15 border-amber-500/30'
                        : 'bg-cyan-500/15 border-cyan-500/30'
                  }`}
                  accessibilityLabel={musicMuted ? 'Quitar silencio de música' : 'Silenciar música'}
                >
                  {!musicEnabled || musicMuted || musicPercent === 0 ? (
                    <VolumeX color="#f87171" size={17} />
                  ) : (
                    <Music color={accentLightHex} size={17} />
                  )}
                </Pressable>
                <View>
                  <Text className="text-[10px] uppercase tracking-widest font-black text-slate-400">
                    Volumen Música
                  </Text>
                  <Text className="text-sm font-black text-white">
                    {!musicEnabled
                      ? 'Desactivada'
                      : musicMuted
                        ? 'Silenciada'
                        : `${musicPercent}%`}
                  </Text>
                </View>
              </View>

              <Pressable
                onPress={() => {
                  triggerHaptic('light');
                  toggleMusicEnabled();
                }}
                className={`px-3 py-1.5 rounded-full border ${
                  musicEnabled
                    ? 'bg-emerald-500/15 border-emerald-500/35'
                    : 'bg-slate-800 border-slate-700'
                }`}
              >
                <Text
                  className={`text-[10px] uppercase font-black tracking-wider ${
                    musicEnabled ? 'text-emerald-300' : 'text-slate-400'
                  }`}
                >
                  {musicEnabled ? 'Música On' : 'Música Off'}
                </Text>
              </Pressable>
            </View>

            <TouchVolumeSlider
              percent={musicPercent}
              accentHex={accentHex}
              onChangeRatio={handleMusicRatioChange}
            />

            <View className="flex-row items-center justify-between mt-1.5">
              {[
                { label: 'Suave', value: 0.25 },
                { label: 'Medio', value: 0.5 },
                { label: 'Óptimo', value: 0.7 },
                { label: 'Intenso', value: 1.0 },
              ].map((preset) => {
                const isSelected =
                  musicEnabled &&
                  !musicMuted &&
                  Math.abs(musicVolume - preset.value) < 0.06;
                return (
                  <Pressable
                    key={preset.label}
                    onPress={() => handlePresetMusicVolume(preset.value)}
                    className={`px-2.5 py-1 rounded-lg border ${
                      isSelected
                        ? isClassic
                          ? 'bg-amber-500/20 border-amber-500/40'
                          : 'bg-cyan-500/20 border-cyan-500/40'
                        : 'bg-slate-900 border-slate-800'
                    }`}
                  >
                    <Text
                      className={`text-[10px] font-bold uppercase ${
                        isSelected
                          ? isClassic
                            ? 'text-amber-300'
                            : 'text-cyan-300'
                          : 'text-slate-400'
                      }`}
                    >
                      {preset.label}
                    </Text>
                  </Pressable>
                );
              })}
            </View>
          </View>

          {/* ── Sección 2: Efectos de Sonido (SFX — Control Independiente) ── */}
          <View className="bg-slate-950/75 border border-slate-800 rounded-2xl p-4 mb-4">
            <View className="flex-row items-center justify-between mb-2">
              <View className="flex-row items-center gap-2.5">
                <Pressable
                  onPress={() => {
                    triggerHaptic('light');
                    toggleSfxMuted();
                  }}
                  className={`w-9 h-9 rounded-xl items-center justify-center border ${
                    sfxMuted || sfxPercent === 0
                      ? 'bg-red-500/15 border-red-500/30'
                      : 'bg-amber-500/15 border-amber-500/30'
                  }`}
                  accessibilityLabel={sfxMuted ? 'Activar efectos de sonido' : 'Silenciar efectos de sonido'}
                >
                  {sfxMuted || sfxPercent === 0 ? (
                    <VolumeX color="#f87171" size={17} />
                  ) : (
                    <Sparkles color="#fbbf24" size={17} />
                  )}
                </Pressable>
                <View>
                  <Text className="text-[10px] uppercase tracking-widest font-black text-slate-400">
                    Efectos de Sonido (SFX)
                  </Text>
                  <Text className="text-sm font-black text-white">
                    {sfxMuted ? 'Silenciados' : `${sfxPercent}%`}
                  </Text>
                </View>
              </View>

              <Pressable
                onPress={() => {
                  triggerHaptic('light');
                  const wasMuted = sfxMuted;
                  toggleSfxMuted();
                  if (wasMuted) {
                    setTimeout(() => playSfx('cardPlay', { volumeMultiplier: 0.55 }), 50);
                  }
                }}
                className={`px-3 py-1.5 rounded-full border ${
                  sfxMuted
                    ? 'bg-red-500/15 border-red-500/35'
                    : 'bg-amber-500/15 border-amber-500/35'
                }`}
              >
                <Text
                  className={`text-[10px] uppercase font-black tracking-wider ${
                    sfxMuted ? 'text-red-300' : 'text-amber-300'
                  }`}
                >
                  {sfxMuted ? 'SFX Off' : 'SFX On'}
                </Text>
              </Pressable>
            </View>

            <TouchVolumeSlider
              percent={sfxPercent}
              accentHex="#f59e0b"
              onChangeRatio={handleSfxRatioChange}
              onRelease={handleSfxRelease}
            />
          </View>

          {/* ── Sección 3: Estilo Musical ── */}
          <View className="mb-4">
            <View className="flex-row items-center justify-between mb-2">
              <Text className="text-[10px] uppercase tracking-widest font-black text-slate-400">
                Identidad Sonora
              </Text>
              <Text
                className={`text-[10px] font-black uppercase ${
                  isClassic ? 'text-amber-400' : 'text-cyan-400'
                }`}
              >
                {isClassic ? '🎻 Clásico' : '⚡ Competitivo'}
              </Text>
            </View>

            <View className="flex-row gap-2.5">
              <Pressable
                onPress={() => handleStylePress('modern')}
                className={`flex-1 rounded-2xl py-3 px-3 border items-center ${
                  !isClassic
                    ? 'bg-cyan-500/15 border-cyan-500/50'
                    : 'bg-slate-950/60 border-slate-800'
                }`}
              >
                <Text className="text-lg mb-0.5">⚡</Text>
                <Text
                  className={`text-[11px] font-black uppercase tracking-wider ${
                    !isClassic ? 'text-cyan-400' : 'text-slate-400'
                  }`}
                >
                  Competitivo
                </Text>
                <Text className="text-[9px] text-slate-500 mt-0.5">
                  KASINO21 Electronic
                </Text>
              </Pressable>

              <Pressable
                onPress={() => handleStylePress('classic')}
                className={`flex-1 rounded-2xl py-3 px-3 border items-center ${
                  isClassic
                    ? 'bg-amber-500/15 border-amber-500/50'
                    : 'bg-slate-950/60 border-slate-800'
                }`}
              >
                <Text className="text-lg mb-0.5">🎻</Text>
                <Text
                  className={`text-[11px] font-black uppercase tracking-wider ${
                    isClassic ? 'text-amber-400' : 'text-slate-400'
                  }`}
                >
                  Clásico
                </Text>
                <Text className="text-[9px] text-slate-500 mt-0.5">
                  Piano & Lounge
                </Text>
              </Pressable>
            </View>
          </View>

          {/* ── Sección 4: Reproductor y Pistas de Audio ── */}
          <View className="bg-slate-950/75 border border-slate-800 rounded-2xl p-4">
            {!isInGame ? (
              <View className="flex-row bg-slate-900 p-1 rounded-xl border border-slate-800 mb-3.5">
                <Pressable
                  onPress={() => {
                    triggerHaptic('light');
                    stopGamePreview();
                    setSelectedCategory('lobby');
                  }}
                  className={`flex-1 py-1.5 rounded-lg items-center ${
                    effectiveCategory === 'lobby'
                      ? isClassic
                        ? 'bg-amber-500/20 border border-amber-500/40'
                        : 'bg-cyan-500/20 border border-cyan-500/40'
                      : ''
                  }`}
                >
                  <Text
                    className={`text-[11px] font-black uppercase ${
                      effectiveCategory === 'lobby'
                        ? isClassic
                          ? 'text-amber-300'
                          : 'text-cyan-300'
                        : 'text-slate-400'
                    }`}
                  >
                    🎵 Pistas Menú
                  </Text>
                </Pressable>

                <Pressable
                  onPress={() => {
                    triggerHaptic('light');
                    setSelectedCategory('game');
                  }}
                  className={`flex-1 py-1.5 rounded-lg items-center ${
                    effectiveCategory === 'game'
                      ? isClassic
                        ? 'bg-amber-500/20 border border-amber-500/40'
                        : 'bg-cyan-500/20 border border-cyan-500/40'
                      : ''
                  }`}
                >
                  <Text
                    className={`text-[11px] font-black uppercase ${
                      effectiveCategory === 'game'
                        ? isClassic
                          ? 'text-amber-300'
                          : 'text-cyan-300'
                        : 'text-slate-400'
                    }`}
                  >
                    🃏 Pistas Partida
                  </Text>
                </Pressable>
              </View>
            ) : (
              <View className="flex-row items-center justify-between mb-3">
                <Text className="text-[10px] uppercase tracking-widest font-black text-slate-400">
                  🃏 Música en Partida
                </Text>
                <Text className="text-[10px] text-slate-500 font-semibold">
                  Cambia en vivo
                </Text>
              </View>
            )}

            {/* Barra de reproducción actual */}
            <View className="flex-row items-center justify-between bg-slate-900/90 border border-white/5 rounded-xl px-3 py-2.5 mb-3">
              <View className="flex-row items-center gap-2.5 flex-1 mr-2">
                <View
                  className={`w-8 h-8 rounded-lg items-center justify-center border ${
                    isCategoryPlaying
                      ? isClassic
                        ? 'bg-amber-500/20 border-amber-500/40'
                        : 'bg-cyan-500/20 border-cyan-500/40'
                      : 'bg-slate-800 border-slate-700'
                  }`}
                >
                  <Music
                    color={isCategoryPlaying ? accentLightHex : '#94a3b8'}
                    size={15}
                  />
                </View>

                <View className="flex-1">
                  <Text className="text-xs font-bold text-white" numberOfLines={1}>
                    {currentTrackLabel}
                  </Text>
                  <Text className="text-[10px] text-slate-400 mt-0.5">
                    {!musicEnabled
                      ? 'Música desactivada'
                      : musicMuted
                        ? 'Música silenciada'
                        : isCategoryPlaying
                          ? !isInGame && effectiveCategory === 'game'
                            ? 'Vista previa activa'
                            : 'Reproduciendo en bucle'
                          : 'Música en pausa'}
                  </Text>
                </View>
              </View>

              <View className="flex-row items-center gap-2">
                <View className="flex-row items-center gap-[2px] h-5 px-1">
                  {[0, 1, 2, 3].map((idx) => (
                    <EqualizerBar
                      key={idx}
                      index={idx}
                      active={isCategoryPlaying}
                      color={accentLightHex}
                    />
                  ))}
                </View>

                <Pressable
                  onPress={handlePlayPausePress}
                  className={`w-8 h-8 rounded-lg items-center justify-center border ${
                    isCategoryPlaying
                      ? 'bg-white/10 border-white/20'
                      : isClassic
                        ? 'bg-amber-500/20 border-amber-500/40'
                        : 'bg-cyan-500/20 border-cyan-500/40'
                  }`}
                  accessibilityLabel={
                    isCategoryPlaying ? 'Pausar música' : 'Reproducir música'
                  }
                >
                  {isCategoryPlaying ? (
                    <Pause color="#ffffff" size={13} />
                  ) : (
                    <Play color={accentLightHex} size={13} />
                  )}
                </Pressable>

                <Pressable
                  onPress={handleSkipPress}
                  className="w-8 h-8 rounded-lg items-center justify-center border border-slate-700 bg-slate-800 active:bg-slate-700"
                  accessibilityLabel="Siguiente pista"
                >
                  <SkipForward color="#e2e8f0" size={13} />
                </Pressable>
              </View>
            </View>

            {/* Lista de Pistas seleccionables */}
            <View className="flex-row items-center justify-between mb-2">
              <Text className="text-[10px] uppercase tracking-wider font-bold text-slate-400">
                Elegir Pista ({currentTracks.length})
              </Text>
              {isLoadingTracks ? (
                <ActivityIndicator size="small" color={accentLightHex} />
              ) : null}
            </View>

            <View className="gap-1.5">
              {currentTracks.map((track, idx) => {
                const isSelected = idx === activeTrackIndex;
                const isThisPlaying = isSelected && isCategoryPlaying;

                return (
                  <Pressable
                    key={track.id}
                    onPress={() => handleTrackSelect(idx)}
                    className={`flex-row items-center justify-between px-3 py-2.5 rounded-xl border ${
                      isSelected
                        ? isClassic
                          ? 'bg-amber-500/15 border-amber-500/45'
                          : 'bg-cyan-500/15 border-cyan-500/45'
                        : 'bg-slate-900/60 border-slate-800/80 active:bg-slate-800'
                    }`}
                  >
                    <View className="flex-row items-center gap-2.5 flex-1 mr-2">
                      <View
                        className={`w-6 h-6 rounded-lg items-center justify-center ${
                          isSelected
                            ? isClassic
                              ? 'bg-amber-500/25'
                              : 'bg-cyan-500/25'
                            : 'bg-slate-800'
                        }`}
                      >
                        <Text
                          className={`text-[10px] font-mono font-black ${
                            isSelected
                              ? isClassic
                                ? 'text-amber-300'
                                : 'text-cyan-300'
                              : 'text-slate-400'
                          }`}
                        >
                          {idx + 1}
                        </Text>
                      </View>

                      <Text
                        className={`text-xs font-bold flex-1 ${
                          isSelected ? 'text-white' : 'text-slate-300'
                        }`}
                        numberOfLines={1}
                      >
                        {track.label}
                      </Text>
                    </View>

                    <View className="flex-row items-center gap-1.5">
                      {isThisPlaying ? (
                        <Text
                          className={`text-[10px] font-black uppercase ${
                            isClassic ? 'text-amber-400' : 'text-cyan-400'
                          }`}
                        >
                          Sonando
                        </Text>
                      ) : isSelected ? (
                        <Check color={accentLightHex} size={14} />
                      ) : (
                        <Play color="#64748b" size={12} />
                      )}
                    </View>
                  </Pressable>
                );
              })}
            </View>
          </View>
        </ScrollView>
      </View>
    </View>
  );
}
