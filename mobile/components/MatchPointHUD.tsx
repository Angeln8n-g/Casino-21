import React from 'react';
import { View, Text, Pressable } from 'react-native';
import { Image } from 'expo-image';
import { Player } from 'domain/player';
import { Volume2, LogOut } from 'lucide-react-native';

interface MatchPointHUDProps {
  localPlayer: Player | undefined;
  opponent: Player | undefined;
  isCurrentTurn: boolean;
  timeRemaining: number;
  roundCount: number;
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
    <View className="mb-3">
      {/* Top Navbar */}
      <View className="flex-row justify-between items-center mb-3 px-1">
        <View>
          <View className="flex-row items-center">
            <View className="w-7 h-7 bg-amber-500/20 rounded-lg border border-amber-400/40 items-center justify-center mr-2">
              <Text className="text-amber-400 font-bold text-xs">K21</Text>
            </View>
            <Text className="text-amber-400 font-bold text-xl">Kasino21</Text>
          </View>
          <Text className="text-slate-400 text-xs font-semibold mt-0.5">Ronda: {roundCount}</Text>
        </View>

        <View className="flex-row items-center space-x-2">
          {onToggleSound && (
            <Pressable onPress={onToggleSound} className="p-2 bg-slate-900 border border-slate-800 rounded-xl mr-2">
              <Volume2 color="#cbd5e1" size={18} />
            </Pressable>
          )}
          <Pressable onPress={onLeaveMatch} className="px-3 py-1.5 bg-red-950/60 border border-red-500/40 rounded-xl">
            <Text className="text-red-400 font-bold text-xs">Salir</Text>
          </Pressable>
        </View>
      </View>

      {/* Main Players VS Card */}
      <View className="bg-slate-900/90 rounded-3xl p-3.5 border border-slate-800 shadow-xl">
        <View className="flex-row justify-between items-center mb-3">
          {/* Jugador Local (Tú) */}
          <View className={`flex-1 flex-row items-center p-2.5 rounded-2xl border ${isCurrentTurn ? 'bg-cyan-950/40 border-cyan-500/50' : 'bg-slate-800/40 border-slate-700/50'}`}>
            <View className="relative mr-2.5">
              <View className="w-11 h-11 rounded-full bg-slate-950 border-2 border-cyan-400 items-center justify-center overflow-hidden">
                {localAvatarUrl ? (
                  <Image source={{ uri: localAvatarUrl }} className="w-full h-full" />
                ) : (
                  <Text className="text-amber-400 font-bold text-base">
                    {localPlayer?.name?.charAt(0)?.toUpperCase() || 'T'}
                  </Text>
                )}
              </View>
            </View>

            <View className="flex-1">
              <View className="flex-row items-center">
                <Text className="text-white font-bold text-xs mr-1" numberOfLines={1}>
                  {localPlayer?.name || 'Tú'}
                </Text>
                <View className="bg-cyan-500/20 px-1.5 py-0.5 rounded-full border border-cyan-400/40">
                  <Text className="text-cyan-300 font-bold text-[9px]">TU</Text>
                </View>
              </View>
              <Text className={`text-[10px] font-bold uppercase mt-0.5 ${isCurrentTurn ? 'text-cyan-400' : 'text-slate-500'}`}>
                {isCurrentTurn ? 'TURNO' : 'ESPERA'}
              </Text>
              <Text className="text-amber-300 text-[10px] font-bold">Recogidas: {localCollected}</Text>
            </View>
          </View>

          {/* Insignia VS Central */}
          <View className="px-3 items-center">
            <Text className="text-amber-400 font-black text-base tracking-widest">VS</Text>
            {isCurrentTurn && (
              <Text className="text-amber-300 font-bold text-[10px] mt-0.5">⏳ {timeRemaining}s</Text>
            )}
          </View>

          {/* Oponente / Bot */}
          <View className={`flex-1 flex-row items-center p-2.5 rounded-2xl border ${!isCurrentTurn ? 'bg-amber-950/30 border-amber-500/50' : 'bg-slate-800/40 border-slate-700/50'}`}>
            <View className="flex-1 items-end mr-2.5">
              <View className="flex-row items-center">
                <Text className="text-white font-bold text-xs" numberOfLines={1}>
                  {opponent?.name || 'Oponente'}
                </Text>
              </View>
              <Text className={`text-[10px] font-bold uppercase mt-0.5 ${!isCurrentTurn ? 'text-amber-400' : 'text-slate-500'}`}>
                {!isCurrentTurn ? 'TURNO' : 'ESPERA'}
              </Text>
              <Text className="text-amber-300 text-[10px] font-bold">Recogidas: {opponentCollected}</Text>
            </View>

            <View className="w-11 h-11 rounded-full bg-slate-950 border-2 border-slate-700 items-center justify-center overflow-hidden">
              {opponentAvatarUrl ? (
                <Image source={{ uri: opponentAvatarUrl }} className="w-full h-full" />
              ) : isBotOpponent ? (
                <Text className="text-xl">🤖</Text>
              ) : (
                <Text className="text-amber-400 font-bold text-base">
                  {opponent?.name?.charAt(0)?.toUpperCase() || 'O'}
                </Text>
              )}
            </View>
          </View>
        </View>

        {/* Barras de Progreso (Puntos 0 / 21) */}
        <View className="flex-row justify-between items-center pt-2 border-t border-slate-800">
          {/* Tu Barra */}
          <View className="flex-1 mr-2">
            <View className="flex-row justify-between mb-1">
              <Text className="text-cyan-300 text-[10px] font-bold truncate">{localPlayer?.name || 'Tú'}</Text>
              <Text className="text-slate-300 font-mono text-[10px]">{localScore} / 21</Text>
            </View>
            <View className="w-full bg-slate-950 rounded-full h-2 overflow-hidden border border-slate-800">
              <View className="bg-cyan-500 h-full rounded-full" style={{ width: `${localProgress}%` }} />
            </View>
          </View>

          {/* Oponente Barra */}
          <View className="flex-1 ml-2">
            <View className="flex-row justify-between mb-1">
              <Text className="text-amber-300 text-[10px] font-bold truncate">{opponent?.name || 'Oponente'}</Text>
              <Text className="text-slate-300 font-mono text-[10px]">{opponentScore} / 21</Text>
            </View>
            <View className="w-full bg-slate-950 rounded-full h-2 overflow-hidden border border-slate-800">
              <View className="bg-amber-500 h-full rounded-full" style={{ width: `${opponentProgress}%` }} />
            </View>
          </View>
        </View>
      </View>
    </View>
  );
}
