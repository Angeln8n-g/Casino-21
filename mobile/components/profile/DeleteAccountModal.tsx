import React, { useState } from 'react';
import { View, Text, Pressable, Modal, ActivityIndicator, Alert, ScrollView } from 'react-native';
import { ShieldAlert, Trash2, X, CheckCircle2 } from 'lucide-react-native';
import { requestAccountDeletion } from '../../services/accountService';
import { triggerHaptic } from '../../utils/haptics';

interface DeleteAccountModalProps {
  isOpen: boolean;
  onClose: () => void;
  username?: string;
}

const FEEDBACK_REASONS = [
  'No me gustó la dinámica o reglas del juego',
  'Es demasiado difícil o competitivo',
  'Problemas de conexión o rendimiento',
  'Falta de tiempo para jugar',
  'Solo estaba probando el juego',
  'Otro motivo',
];

export function DeleteAccountModal({ isOpen, onClose, username = 'jugador' }: DeleteAccountModalProps) {
  const [selectedReason, setSelectedReason] = useState<string>('');
  const [isDeleting, setIsDeleting] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [isDone, setIsDone] = useState(false);

  if (!isOpen) return null;

  const handleDelete = async () => {
    setIsDeleting(true);
    setErrorMessage(null);
    triggerHaptic('card_tap');

    const result = await requestAccountDeletion(selectedReason || undefined);

    if (result.success) {
      triggerHaptic('success');
      setIsDone(true);
      setTimeout(() => {
        onClose();
      }, 2500);
    } else {
      setIsDeleting(false);
      setErrorMessage(result.error || 'No se pudo completar la baja. Inténtalo de nuevo.');
      triggerHaptic('error');
    }
  };

  return (
    <Modal visible={isOpen} transparent animationType="fade" onRequestClose={() => !isDeleting && onClose()}>
      <View className="flex-1 bg-black/85 justify-center items-center px-4">
        <View className="bg-slate-900 border border-red-500/40 rounded-3xl p-5 w-full max-w-sm overflow-hidden">
          {/* Barra superior con gradiente de advertencia */}
          <View className="h-1 bg-gradient-to-r from-red-600 via-amber-500 to-red-600 -mx-5 -mt-5 mb-4" />

          {isDone ? (
            <View className="py-6 items-center">
              <View className="w-16 h-16 rounded-full bg-emerald-500/20 border border-emerald-500/40 items-center justify-center mb-3">
                <CheckCircle2 color="#34d399" size={36} />
              </View>
              <Text className="text-white font-bold text-xl text-center mb-2">Baja completada</Text>
              <Text className="text-slate-300 text-xs text-center leading-relaxed mb-3">
                Tu cuenta y datos han sido eliminados de KASINO21 de forma permanente. Gracias por haber jugado con nosotros.
              </Text>
              <Text className="text-slate-500 text-[10px] font-mono">Cerrando sesión...</Text>
            </View>
          ) : (
            <View>
              {/* Header */}
              <View className="flex-row justify-between items-start mb-3">
                <View className="flex-row items-center gap-2.5 flex-1">
                  <View className="w-9 h-9 rounded-xl bg-red-500/20 border border-red-500/40 items-center justify-center">
                    <ShieldAlert color="#f87171" size={20} />
                  </View>
                  <View className="flex-1">
                    <Text className="text-white font-bold text-base">Darse de baja</Text>
                    <Text className="text-slate-400 text-[10px]">Eliminación permanente (GDPR)</Text>
                  </View>
                </View>
                <Pressable onPress={() => !isDeleting && onClose()} className="p-1">
                  <X color="#94a3b8" size={18} />
                </Pressable>
              </View>

              <Text className="text-slate-300 text-xs mb-3 leading-relaxed">
                Hola <Text className="text-amber-400 font-bold">{username}</Text>, esta acción es irreversible. Se borrarán tus fichas, nivel, ELO, inventario y registros de partidas.
              </Text>

              {/* Motivo de salida */}
              <Text className="text-slate-400 text-[11px] font-bold uppercase tracking-wider mb-2">
                ¿Por qué deseas marcharte? (opcional)
              </Text>

              <ScrollView className="max-h-44 mb-3">
                {FEEDBACK_REASONS.map((reason) => {
                  const isSelected = selectedReason === reason;
                  return (
                    <Pressable
                      key={reason}
                      onPress={() => {
                        triggerHaptic('light');
                        setSelectedReason(isSelected ? '' : reason);
                      }}
                      className={`p-2.5 rounded-xl border mb-1.5 ${
                        isSelected
                          ? 'bg-red-500/20 border-red-500/50'
                          : 'bg-slate-800/80 border-slate-700/60'
                      }`}
                    >
                      <Text
                        className={`text-xs ${
                          isSelected ? 'text-red-300 font-bold' : 'text-slate-300'
                        }`}
                      >
                        {reason}
                      </Text>
                    </Pressable>
                  );
                })}
              </ScrollView>

              {errorMessage && (
                <Text className="text-red-400 text-xs text-center mb-3 font-semibold">
                  {errorMessage}
                </Text>
              )}

              {/* Botones de acción */}
              <View className="flex-row gap-2 pt-1">
                <Pressable
                  disabled={isDeleting}
                  onPress={onClose}
                  className="flex-1 bg-slate-800 p-3 rounded-2xl items-center border border-slate-700"
                >
                  <Text className="text-slate-300 font-bold text-xs">Cancelar</Text>
                </Pressable>

                <Pressable
                  disabled={isDeleting}
                  onPress={handleDelete}
                  className="flex-1 bg-red-600 active:bg-red-700 p-3 rounded-2xl items-center flex-row justify-center gap-1.5"
                >
                  {isDeleting ? (
                    <ActivityIndicator size="small" color="#ffffff" />
                  ) : (
                    <>
                      <Trash2 color="#ffffff" size={14} />
                      <Text className="text-white font-bold text-xs">Eliminar Cuenta</Text>
                    </>
                  )}
                </Pressable>
              </View>
            </View>
          )}
        </View>
      </View>
    </Modal>
  );
}
