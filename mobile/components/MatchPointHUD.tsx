import React, { useState, useEffect } from 'react';
import { View, Text, Pressable } from 'react-native';
import { Image } from 'expo-image';
import Svg, { Circle } from 'react-native-svg';
import { Player } from 'domain/player';
import { Volume2, VolumeX } from 'lucide-react-native';

interface MatchPointHUDProps {
  localPlayer: Player | undefined;
  opponent: Player | undefined;
  isCurrentTurn: boolean;
  timeRemaining: number;
  turnProgress?: number; // 0.0 a 1.0 (localTimeRemaining / 30000)
  roundCount: number;
  mode?: '1v1' | '2v2';
  muted?: boolean;
  localAvatarUrl?: string | null;
  opponentAvatarUrl?: string | null;
  onLeaveMatch: () => void;
  onToggleSound?: () => void;
}

const AVATAR_RING_SIZE = 38;
const AVATAR_STROKE = 2.5;
const AVATAR_RADIUS = (AVATAR_RING_SIZE - AVATAR_STROKE) / 2;
const AVATAR_CIRCUMFERENCE = 2 * Math.PI * AVATAR_RADIUS;
const AVATAR_INNER_SIZE = AVATAR_RING_SIZE - AVATAR_STROKE * 2 - 2;

export function MatchPointHUD({
  localPlayer,
  opponent,
  isCurrentTurn,
  timeRemaining,
  turnProgress = 1,
  roundCount,
  muted = false,
  localAvatarUrl,
  opponentAvatarUrl,
  onLeaveMatch,
  onToggleSound,
}: MatchPointHUDProps) {
  const [localImgError, setLocalImgError] = useState(false);
  const [opponentImgError, setOpponentImgError] = useState(false);

  useEffect(() => {
    setLocalImgError(false);
  }, [localAvatarUrl]);

  useEffect(() => {
    setOpponentImgError(false);
  }, [opponentAvatarUrl]);

  const localScore = localPlayer?.score || 0;
  const opponentScore = opponent?.score || 0;
  const localCollected = localPlayer?.collectedCards?.length || 0;
  const opponentCollected = opponent?.collectedCards?.length || 0;

  const localProgress = Math.min((localScore / 21) * 100, 100);
  const opponentProgress = Math.min((opponentScore / 21) * 100, 100);

  const clampedTurnProgress = Math.max(0, Math.min(1, turnProgress));
  const isUrgent = timeRemaining <= 10;

  const renderAvatarWithRing = (
    player: Player | undefined,
    avatarUrl: string | null | undefined,
    hasImgError: boolean,
    onImgError: () => void,
    isActiveTurn: boolean
  ) => {
    const progress = isActiveTurn ? clampedTurnProgress : 1;
    const strokeDashoffset = AVATAR_CIRCUMFERENCE * (1 - progress);
    const activeColor = isUrgent ? '#ef4444' : '#f59e0b';
    const ringColor = isActiveTurn ? activeColor : '#334155';
    const isBot = Boolean(
      player?.id?.startsWith('bot') || player?.name?.toLowerCase().includes('bot')
    );

    return (
      <View
        style={{
          width: AVATAR_RING_SIZE,
          height: AVATAR_RING_SIZE,
          alignItems: 'center',
          justifyContent: 'center',
          position: 'relative',
        }}
      >
        <Svg
          width={AVATAR_RING_SIZE}
          height={AVATAR_RING_SIZE}
          style={{ position: 'absolute', top: 0, left: 0 }}
        >
          {/* Fondo del anillo */}
          <Circle
            cx={AVATAR_RING_SIZE / 2}
            cy={AVATAR_RING_SIZE / 2}
            r={AVATAR_RADIUS}
            stroke="rgba(255,255,255,0.14)"
            strokeWidth={AVATAR_STROKE}
            fill="none"
          />
          {/* Progreso circular del turno (idéntico al conic-gradient de Web) */}
          <Circle
            cx={AVATAR_RING_SIZE / 2}
            cy={AVATAR_RING_SIZE / 2}
            r={AVATAR_RADIUS}
            stroke={ringColor}
            strokeWidth={AVATAR_STROKE}
            fill="none"
            strokeDasharray={`${AVATAR_CIRCUMFERENCE} ${AVATAR_CIRCUMFERENCE}`}
            strokeDashoffset={strokeDashoffset}
            strokeLinecap="round"
            rotation="-90"
            origin={`${AVATAR_RING_SIZE / 2}, ${AVATAR_RING_SIZE / 2}`}
          />
        </Svg>

        <View
          style={{
            width: AVATAR_INNER_SIZE,
            height: AVATAR_INNER_SIZE,
            borderRadius: AVATAR_INNER_SIZE / 2,
            backgroundColor: 'rgba(0,0,0,0.7)',
            borderWidth: 1,
            borderColor: 'rgba(255,255,255,0.15)',
            overflow: 'hidden',
            alignItems: 'center',
            justifyContent: 'center',
          }}
        >
          {avatarUrl && !hasImgError ? (
            <Image
              source={{ uri: avatarUrl }}
              style={{ width: '100%', height: '100%' }}
              contentFit="cover"
              cachePolicy="memory-disk"
              onError={onImgError}
            />
          ) : (
            <Text className="text-amber-300 font-bold text-xs">
              {isBot ? '🤖' : player?.name?.charAt(0)?.toUpperCase() || '?'}
            </Text>
          )}
        </View>
      </View>
    );
  };

  return (
    <View className="bg-black/35 p-2.5 rounded-2xl border border-white/10 shadow-2xl mb-1.5">
      {/* Row 1: Brand & Top Utilities (idéntico a GameScreen.tsx de Web) */}
      <View className="flex-row items-center justify-between w-full mb-2">
        <View className="flex-row items-center gap-1.5">
          <View className="w-6 h-6 rounded-lg bg-amber-500/20 border border-amber-400/30 items-center justify-center">
            <Text className="text-amber-400 font-black text-[9px]">K21</Text>
          </View>
          <Text className="text-xs font-black text-amber-400 tracking-tight">Kasino21</Text>
          <View className="px-1.5 py-0.5 rounded bg-white/5 border border-white/5">
            <Text className="text-[9px] text-gray-400 font-semibold">Ronda {roundCount}</Text>
          </View>
        </View>

        <View className="flex-row items-center gap-1.5">
          {onToggleSound && (
            <Pressable
              onPress={onToggleSound}
              className="w-7 h-7 rounded-lg bg-white/5 border border-white/10 items-center justify-center active:bg-white/10"
            >
              {muted ? (
                <VolumeX color="#9ca3af" size={14} />
              ) : (
                <Volume2 color="#e5e7eb" size={14} />
              )}
            </Pressable>
          )}
          <Pressable
            onPress={onLeaveMatch}
            className="bg-red-950/40 active:bg-red-900/60 px-2.5 py-1 rounded-lg border border-red-500/30"
          >
            <Text className="text-[11px] text-red-300 font-medium">Salir</Text>
          </Pressable>
        </View>
      </View>

      {/* Row 2: Matchup 100% Full Width (idéntico a renderTurnPlayer en Web) */}
      <View className="flex-row items-center justify-between gap-1.5 w-full">
        {/* Jugador Local */}
        <View
          className={`flex-1 flex-row items-center gap-2 px-2 py-1.5 rounded-xl border ${
            isCurrentTurn
              ? 'bg-amber-950/30 border-amber-400/50'
              : 'bg-black/35 border-white/10'
          }`}
        >
          {renderAvatarWithRing(
            localPlayer,
            localAvatarUrl,
            localImgError,
            () => setLocalImgError(true),
            isCurrentTurn
          )}

          <View className="flex-1 min-w-0">
            <View className="flex-row items-center justify-between gap-1">
              <View className="flex-row items-center gap-1 flex-1 min-w-0">
                <Text className="text-xs font-bold text-white shrink" numberOfLines={1}>
                  {localPlayer?.name || 'Jugador'}
                </Text>
                <View className="px-1.5 py-0.2 rounded-full bg-cyan-500/20 border border-cyan-400/30">
                  <Text className="text-[8px] text-cyan-300 font-bold uppercase">Tú</Text>
                </View>
              </View>
              <Text className="text-[11px] font-mono font-bold text-amber-300">
                {localScore}
                <Text className="text-gray-400 text-[9px] font-normal">/21</Text>
              </Text>
            </View>

            <View className="flex-row items-center justify-between mt-0.5">
              <Text
                className={`text-[10px] font-semibold ${
                  isCurrentTurn
                    ? isUrgent
                      ? 'text-red-400'
                      : 'text-amber-300'
                    : 'text-gray-400'
                }`}
              >
                {isCurrentTurn ? `Turno (${timeRemaining}s)` : 'Espera'}
              </Text>
              <Text className="text-gray-300 text-[10px] font-medium">🃏 {localCollected}</Text>
            </View>

            <View className="w-full bg-black/40 rounded-full h-1 mt-1 overflow-hidden">
              <View className="bg-amber-400 h-full rounded-full" style={{ width: `${localProgress}%` }} />
            </View>
          </View>
        </View>

        {/* VS Central + Temporizador en vivo */}
        <View className="items-center justify-center px-0.5">
          <Text className="text-amber-400/80 font-black tracking-widest text-[11px]">VS</Text>
          <View className="flex-row items-center mt-0.5">
            <Text className="text-[9px] mr-0.5">⏳</Text>
            <Text
              className={`text-[10px] font-mono font-bold ${
                isUrgent ? 'text-red-400' : 'text-amber-300'
              }`}
            >
              {timeRemaining}s
            </Text>
          </View>
        </View>

        {/* Oponente */}
        <View
          className={`flex-1 flex-row items-center gap-2 px-2 py-1.5 rounded-xl border ${
            !isCurrentTurn
              ? 'bg-amber-950/30 border-amber-400/50'
              : 'bg-black/35 border-white/10'
          }`}
        >
          {renderAvatarWithRing(
            opponent,
            opponentAvatarUrl,
            opponentImgError,
            () => setOpponentImgError(true),
            !isCurrentTurn
          )}

          <View className="flex-1 min-w-0">
            <View className="flex-row items-center justify-between gap-1">
              <Text className="text-xs font-bold text-white flex-1" numberOfLines={1}>
                {opponent?.name || 'Oponente'}
              </Text>
              <Text className="text-[11px] font-mono font-bold text-amber-300">
                {opponentScore}
                <Text className="text-gray-400 text-[9px] font-normal">/21</Text>
              </Text>
            </View>

            <View className="flex-row items-center justify-between mt-0.5">
              <Text
                className={`text-[10px] font-semibold ${
                  !isCurrentTurn
                    ? isUrgent
                      ? 'text-red-400'
                      : 'text-amber-300'
                    : 'text-gray-400'
                }`}
              >
                {!isCurrentTurn ? `Turno (${timeRemaining}s)` : 'Espera'}
              </Text>
              <Text className="text-gray-300 text-[10px] font-medium">🃏 {opponentCollected}</Text>
            </View>

            <View className="w-full bg-black/40 rounded-full h-1 mt-1 overflow-hidden">
              <View className="bg-amber-400 h-full rounded-full" style={{ width: `${opponentProgress}%` }} />
            </View>
          </View>
        </View>
      </View>
    </View>
  );
}
