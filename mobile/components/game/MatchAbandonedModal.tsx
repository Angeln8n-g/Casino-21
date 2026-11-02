import React from 'react';
import { View, Text, Pressable, Modal } from 'react-native';
import { Trophy, Frown, Home, Award, Coins } from 'lucide-react-native';

interface MatchAbandonedData {
  winnerId: string;
  coinsEarned: number;
  eloEarned: number;
}

interface MatchAbandonedModalProps {
  visible: boolean;
  data: MatchAbandonedData | null;
  localPlayerId: string | null;
  onBackToMenu: () => void;
}

export function MatchAbandonedModal({ visible, data, localPlayerId, onBackToMenu }: MatchAbandonedModalProps) {
  if (!data) return null;

  const isWinner = data.winnerId === localPlayerId;

  return (
    <Modal visible={visible} transparent animationType="fade">
      <View className="flex-1 bg-black/85 items-center justify-center p-5">
        <View className="bg-slate-900 border border-amber-500/40 rounded-3xl p-6 w-full max-w-sm items-center shadow-2xl">
          <View
            className={`p-4 rounded-full mb-3 border ${
              isWinner ? 'bg-amber-500/20 border-amber-500/50' : 'bg-red-500/20 border-red-500/50'
            }`}
          >
            {isWinner ? <Trophy color="#fbbf24" size={42} /> : <Frown color="#ef4444" size={42} />}
          </View>

          <Text className="text-white font-bold text-xl uppercase tracking-wider mb-1 text-center">
            {isWinner ? '¡Oponente Desconectado!' : 'Partida Abandonada'}
          </Text>

          <Text className="text-slate-400 text-xs text-center mb-5">
            {isWinner ? 'Has ganado la partida automáticamente.' : 'La partida ha concluido.'}
          </Text>

          {isWinner && (
            <View className="bg-slate-950 p-4 rounded-2xl border border-slate-800 w-full mb-6">
              <View className="flex-row items-center justify-between py-2 border-b border-slate-900">
                <View className="flex-row items-center">
                  <Coins color="#fbbf24" size={16} className="mr-2" />
                  <Text className="text-slate-300 text-xs font-bold">Monedas Ganadas:</Text>
                </View>
                <Text className="text-amber-400 font-bold text-sm">+{data.coinsEarned}</Text>
              </View>

              <View className="flex-row items-center justify-between py-2">
                <View className="flex-row items-center">
                  <Award color="#10b981" size={16} className="mr-2" />
                  <Text className="text-slate-300 text-xs font-bold">Puntos ELO:</Text>
                </View>
                <Text className="text-emerald-400 font-bold text-sm">+{data.eloEarned} ▲</Text>
              </View>
            </View>
          )}

          <Pressable
            onPress={onBackToMenu}
            className="bg-amber-500 active:bg-amber-600 p-3.5 rounded-xl flex-row items-center justify-center w-full"
          >
            <Home color="#020617" size={18} className="mr-2" />
            <Text className="text-slate-950 font-bold text-sm uppercase tracking-wider">
              Volver al Lobby
            </Text>
          </Pressable>
        </View>
      </View>
    </Modal>
  );
}
