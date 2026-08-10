import React, { useState } from 'react';
import { View, Text, Pressable, Modal, ScrollView, Alert } from 'react-native';
import { Swords, Users, Coins, X } from 'lucide-react-native';

interface CreateRoomModalProps {
  visible: boolean;
  userCoins: number;
  onClose: () => void;
  onCreateRoom: (mode: '1v1' | '2v2', betAmount: number) => void;
}

const BET_OPTIONS = [0, 50, 100, 250, 500, 1000];

export function CreateRoomModal({
  visible,
  userCoins,
  onClose,
  onCreateRoom,
}: CreateRoomModalProps) {
  const [selectedMode, setSelectedMode] = useState<'1v1' | '2v2'>('1v1');
  const [selectedBet, setSelectedBet] = useState<number>(0);

  const handleConfirm = () => {
    if (selectedBet > userCoins) {
      Alert.alert('Monedas insuficientes', 'No tienes suficientes monedas para esta apuesta.');
      return;
    }
    onCreateRoom(selectedMode, selectedBet);
  };

  return (
    <Modal visible={visible} transparent animationType="fade">
      <View className="flex-1 bg-black/80 justify-center items-center p-5">
        <View className="bg-slate-900 border border-slate-800 rounded-3xl p-6 w-full max-w-sm">
          {/* Header */}
          <View className="flex-row justify-between items-center mb-5">
            <View>
              <Text className="text-amber-400 font-bold text-xl">Crear Sala Privada</Text>
              <Text className="text-slate-400 text-xs mt-0.5">Configura tu partida personalizada</Text>
            </View>
            <Pressable onPress={onClose} className="p-2 bg-slate-800 rounded-xl">
              <X color="#94a3b8" size={18} />
            </Pressable>
          </View>

          {/* Selector de Modo (1v1 / 2v2) */}
          <Text className="text-slate-400 text-xs font-bold uppercase mb-2">Modo de Juego</Text>
          <View className="flex-row mb-5">
            <Pressable
              onPress={() => setSelectedMode('1v1')}
              className={`flex-1 py-3 px-3 rounded-2xl mr-2 flex-row items-center justify-center border ${
                selectedMode === '1v1'
                  ? 'bg-amber-500 border-amber-400'
                  : 'bg-slate-800 border-slate-700'
              }`}
            >
              <Swords color={selectedMode === '1v1' ? '#020617' : '#94a3b8'} size={18} className="mr-2" />
              <Text className={`font-bold text-sm ${selectedMode === '1v1' ? 'text-slate-950' : 'text-slate-300'}`}>
                1 vs 1
              </Text>
            </Pressable>

            <Pressable
              onPress={() => setSelectedMode('2v2')}
              className={`flex-1 py-3 px-3 rounded-2xl ml-2 flex-row items-center justify-center border ${
                selectedMode === '2v2'
                  ? 'bg-amber-500 border-amber-400'
                  : 'bg-slate-800 border-slate-700'
              }`}
            >
              <Users color={selectedMode === '2v2' ? '#020617' : '#94a3b8'} size={18} className="mr-2" />
              <Text className={`font-bold text-sm ${selectedMode === '2v2' ? 'text-slate-950' : 'text-slate-300'}`}>
                2 vs 2
              </Text>
            </Pressable>
          </View>

          {/* Selector de Apuesta en Monedas */}
          <Text className="text-slate-400 text-xs font-bold uppercase mb-2">
            Apuesta en Monedas (🪙 Tu Saldo: {userCoins})
          </Text>
          <View className="flex-row flex-wrap justify-between mb-6">
            {BET_OPTIONS.map((bet) => {
              const isDisabled = bet > userCoins;
              const isSelected = selectedBet === bet;

              return (
                <Pressable
                  key={bet}
                  disabled={isDisabled}
                  onPress={() => setSelectedBet(bet)}
                  className={`w-[30%] py-2.5 mb-2.5 rounded-xl items-center border ${
                    isSelected
                      ? 'bg-amber-500 border-amber-400'
                      : isDisabled
                      ? 'bg-slate-900 border-slate-800 opacity-40'
                      : 'bg-slate-800 border-slate-700'
                  }`}
                >
                  <Text className={`font-bold text-xs ${isSelected ? 'text-slate-950' : 'text-amber-400'}`}>
                    {bet === 0 ? 'Gratis' : `🪙 ${bet}`}
                  </Text>
                </Pressable>
              );
            })}
          </View>

          {/* Botón de Confirmación */}
          <Pressable
            onPress={handleConfirm}
            className="bg-amber-500 active:bg-amber-600 p-4 rounded-2xl items-center"
          >
            <Text className="text-slate-950 font-bold text-base uppercase">Confirmar y Crear Sala</Text>
          </Pressable>
        </View>
      </View>
    </Modal>
  );
}
