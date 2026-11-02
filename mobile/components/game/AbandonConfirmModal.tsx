import React from 'react';
import { View, Text, Pressable, Modal } from 'react-native';
import { AlertTriangle } from 'lucide-react-native';

interface AbandonConfirmModalProps {
  visible: boolean;
  onConfirm: () => void;
  onCancel: () => void;
}

export function AbandonConfirmModal({ visible, onConfirm, onCancel }: AbandonConfirmModalProps) {
  return (
    <Modal visible={visible} transparent animationType="fade">
      <View className="flex-1 bg-black/80 items-center justify-center p-5">
        <View className="bg-slate-900 border border-red-500/50 rounded-3xl p-6 w-full max-w-sm items-center shadow-2xl">
          <View className="bg-red-500/20 p-4 rounded-full mb-3 border border-red-500/40">
            <AlertTriangle color="#ef4444" size={36} />
          </View>

          <Text className="text-white font-bold text-xl uppercase tracking-wider mb-2 text-center">
            ¿Abandonar Partida?
          </Text>

          <Text className="text-slate-300 text-xs text-center leading-relaxed mb-6">
            Si sales ahora, la partida terminará y perderás tus monedas apostadas y puntos ELO. Tu oponente obtendrá la victoria automáticamente.
          </Text>

          <View className="w-full gap-2.5">
            <Pressable
              onPress={onConfirm}
              className="bg-red-600 active:bg-red-700 p-3.5 rounded-xl items-center"
            >
              <Text className="text-white font-bold text-sm uppercase tracking-wider">
                Sí, Abandonar
              </Text>
            </Pressable>

            <Pressable
              onPress={onCancel}
              className="bg-slate-800 active:bg-slate-700 p-3.5 rounded-xl items-center border border-slate-700"
            >
              <Text className="text-slate-300 font-bold text-sm uppercase tracking-wider">
                Cancelar
              </Text>
            </Pressable>
          </View>
        </View>
      </View>
    </Modal>
  );
}
