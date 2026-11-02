import React from 'react';
import { View, Text, Pressable } from 'react-native';
import { Image } from 'expo-image';
import { Player } from 'domain/player';
import { Volume2, VolumeX, AlertTriangle } from 'lucide-react-native';

interface MatchPointHUDProps {
  localPlayer: Player | undefined;
  opponent: Player | undefined;
  isCurrentTurn: boolean;
  timeRemaining: number;
  roundCount: number;
  mode?: '1v1' | '2v2';
  muted?: boolean;
  localAvatarUrl?: string | null;
  opponentAvatarUrl?: string | null;
  onLeaveMatch: () => void;
  onToggleSound?: () => void;
}

export function MatchPointHUD({
  localPlayer,
  opponent,
  isCurrentTurn,
  timeRemaining,
  roundCount,
  mode = '1v1',
  muted = false,
  localAvatarUrl,
  opponentAvatarUrl,
  onLeaveMatch,
  onToggleSound,
}: MatchPointHUDProps) {
  const localScore = localPlayer?.score || 0;
  const opponentScore = opponent?.score || 0;
  const localCollected = localPlayer?.collectedCards?.length || 0;
  const opponentCollected = opponent?.collectedCards?.length || 0;

  const localProgress = Math.min((localScore / 21) * 100, 100);
  const opponentProgress = Math.min((opponentScore / 21) * 100, 100);

  const isBotOpponent = opponent?.name?.toLowerCase().includes('bot') || opponent?.id?.startsWith('bot-');

  return (
    <View className="mb-2">
      {/* Top Navbar */}
      <View className="flex-row justify-between items-center mb-2 px-1">
        <View className="flex-row items-center">
          <View className="w-7 h-7 bg-amber-500/20 rounded-lg border border-amber-400/40 items-center justify-center mr-2">
            <Text className="text-amber-400 font-bold text-xs">K21</Text>
          </View>
          <View>
            <View className="flex-row items-center">
              <Text className="text-amber-400 font-bold text-lg mr-1.5">Kasino 21</Text>
              <View className="bg-slate-800 px-1.5 py-0.5 rounded border border-slate-700">
                <Text className="text-slate-400 font-mono text-[9px] uppercase font-bold">{mode}</Text>
              </View>
            </View>
            <Text className="text-slate-400 text-[10px] font-semibold">Ronda: {roundCount}</Text>
          </View>
        </View>

        <View className="flex-row items-center">
          {onToggleSound && (
            <Pressable
              onPress={onToggleSound}
              className="p-2 bg-slate-900 border border-slate-800 rounded-xl mr-2"
            >
              {muted ? <VolumeX color="#94a3b8" size={16} /> : <Volume2 color="#fbbf24" size={16} />}
            </Pressable>
          )}
          <Pressable
            onPress={onLeaveMatch}
            className="px-3 py-1.5 bg-red-950/60 border border-red-500/40 rounded-xl flex-row items-center"
          >
            <AlertTriangle color="#ef4444" size={12} className="mr-1" />
            <Text className="text-red-400 font-bold text-xs">Salir</Text>
          </Pressable>
        </View>
      </View>

      {/* VS Panel */}
      <View className="bg-slate-900/90 rounded-3xl p-3 border border-slate-800 shadow-xl">
        <View className="flex-row justify-between items-center mb-2.5">
          {/* Jugador Local */}
          <View
            className={`flex-1 flex-row items-center p-2 rounded-2xl border ${
              isCurrentTurn ? 'bg-cyan-950/40 border-cyan-500/50' : 'bg-slate-800/40 border-slate-700/50'
            }`}
          >
            <View className="w-10 h-10 rounded-full bg-slate-950 border-2 border-cyan-400 items-center justify-center overflow-hidden mr-2">
              {localAvatarUrl ? (
                <Image source={{ uri: localAvatarUrl }} className="w-full h-full" />
              ) : (
                <Text className="text-amber-400 font-bold text-sm">
                  {localPlayer?.name?.charAt(0)?.toUpperCase() || 'T'}
                </Text>
              )}
            </View>

            <View className="flex-1">
              <Text className="text-white font-bold text-xs" numberOfLines={1}>
                {localPlayer?.name || 'Tú'}
              </Text>
              <Text className={`text-[9px] font-bold uppercase mt-0.5 ${isCurrentTurn ? 'text-cyan-400' : 'text-slate-500'}`}>
                {isCurrentTurn ? 'TU TURNO' : 'ESPERA'}
              </Text>
              <Text className="text-amber-300 text-[9px] font-bold">Recogidas: {localCollected}</Text>
            </View>
          </View>

          {/* Insignia VS Central */}
          <View className="px-2.5 items-center">
            <Text className="text-amber-400 font-black text-sm tracking-widest">VS</Text>
            {isCurrentTurn && (
              <Text className="text-amber-300 font-mono font-bold text-[10px] mt-0.5">⏳ {timeRemaining}s</Text>
            )}
          </View>

          {/* Oponente */}
          <View
            className={`flex-1 flex-row items-center p-2 rounded-2xl border ${
              !isCurrentTurn ? 'bg-amber-950/30 border-amber-500/50' : 'bg-slate-800/40 border-slate-700/50'
            }`}
          >
            <View className="flex-1 items-end mr-2">
              <Text className="text-white font-bold text-xs text-right" numberOfLines={1}>
                {opponent?.name || 'Oponente'}
              </Text>
              <Text className={`text-[9px] font-bold uppercase mt-0.5 ${!isCurrentTurn ? 'text-amber-400' : 'text-slate-500'}`}>
                {!isCurrentTurn ? 'TURNO' : 'ESPERA'}
              </Text>
              <Text className="text-amber-300 text-[9px] font-bold">Recogidas: {opponentCollected}</Text>
            </View>

            <View className="w-10 h-10 rounded-full bg-slate-950 border-2 border-slate-700 items-center justify-center overflow-hidden">
              {opponentAvatarUrl ? (
                <Image source={{ uri: opponentAvatarUrl }} className="w-full h-full" />
              ) : isBotOpponent ? (
                <Text className="text-base">🤖</Text>
              ) : (
                <Text className="text-amber-400 font-bold text-sm">
                  {opponent?.name?.charAt(0)?.toUpperCase() || 'O'}
                </Text>
              )}
            </View>
          </View>
        </View>

        {/* Barras de Progreso a 21 */}
        <View className="flex-row justify-between items-center pt-2 border-t border-slate-800">
          <View className="flex-1 mr-2">
            <View className="flex-row justify-between mb-1">
              <Text className="text-cyan-300 text-[9px] font-bold truncate">{localPlayer?.name || 'Tú'}</Text>
              <Text className="text-slate-300 font-mono text-[9px]">{localScore} / 21</Text>
            </View>
            <View className="w-full bg-slate-950 rounded-full h-1.5 overflow-hidden border border-slate-800">
              <View className="bg-cyan-500 h-full rounded-full" style={{ width: `${localProgress}%` }} />
            </View>
          </View>

          <View className="flex-1 ml-2">
            <View className="flex-row justify-between mb-1">
              <Text className="text-amber-300 text-[9px] font-bold truncate">{opponent?.name || 'Oponente'}</Text>
              <Text className="text-slate-300 font-mono text-[9px]">{opponentScore} / 21</Text>
            </View>
            <View className="w-full bg-slate-950 rounded-full h-1.5 overflow-hidden border border-slate-800">
              <View className="bg-amber-500 h-full rounded-full" style={{ width: `${opponentProgress}%` }} />
            </View>
          </View>
        </View>
      </View>
    </View>
  );
}
