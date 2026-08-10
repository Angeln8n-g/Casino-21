import React, { useState } from 'react';
import { View, Text, Pressable, Modal, FlatList, Alert } from 'react-native';
import { Image } from 'expo-image';
import * as Clipboard from 'expo-clipboard';
import { Copy, Users, LogOut, CheckCircle2 } from 'lucide-react-native';

interface PlayerRoomData {
  name: string;
  id?: string;
  avatar?: string | null;
  team?: 1 | 2;
}

interface WaitingRoomModalProps {
  visible: boolean;
  roomId: string | null;
  mode: '1v1' | '2v2';
  betAmount: number;
  playersData: PlayerRoomData[];
  onCancelRoom: () => void;
  onSwitchTeam?: (team: 1 | 2) => void;
}

export function WaitingRoomModal({
  visible,
  roomId,
  mode,
  betAmount,
  playersData,
  onCancelRoom,
  onSwitchTeam,
}: WaitingRoomModalProps) {
  const [copied, setCopied] = useState(false);

  const handleCopyCode = async () => {
    if (!roomId) return;
    await Clipboard.setStringAsync(roomId);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const requiredPlayers = mode === '2v2' ? 4 : 2;

  return (
    <Modal visible={visible} transparent animationType="slide">
      <View className="flex-1 bg-black/85 justify-center items-center p-5">
        <View className="bg-slate-900 border border-slate-800 rounded-3xl p-6 w-full max-w-sm">
          {/* Header */}
          <Text className="text-amber-400 font-bold text-center text-xs uppercase tracking-widest mb-1">
            SALA PRIVADA ({mode})
          </Text>
          <Text className="text-white font-bold text-center text-2xl mb-4">Esperando Jugadores</Text>

          {/* Código de Sala Privada */}
          <View className="bg-slate-950 p-4 rounded-2xl border border-amber-500/40 items-center mb-5">
            <Text className="text-slate-400 text-xs font-bold uppercase mb-1">Código de Sala</Text>
            <Text className="text-amber-400 font-black text-3xl font-mono tracking-widest">{roomId || '---'}</Text>
            
            <Pressable
              onPress={handleCopyCode}
              className="mt-3 bg-amber-500/10 active:bg-amber-500/20 px-4 py-2 rounded-xl border border-amber-500/30 flex-row items-center"
            >
              {copied ? (
                <>
                  <CheckCircle2 color="#10b981" size={16} className="mr-1.5" />
                  <Text className="text-emerald-400 font-bold text-xs">¡Código Copiado!</Text>
                </>
              ) : (
                <>
                  <Copy color="#fbbf24" size={16} className="mr-1.5" />
                  <Text className="text-amber-400 font-bold text-xs">Copiar Código</Text>
                </>
              )}
            </Pressable>
          </View>

          {/* Apuesta */}
          {betAmount > 0 && (
            <View className="bg-amber-500/10 p-3 rounded-2xl border border-amber-500/30 flex-row justify-between items-center mb-5">
              <Text className="text-slate-300 text-xs font-bold">Apuesta de la Sala:</Text>
              <Text className="text-amber-400 font-bold text-sm">🪙 {betAmount} monedas</Text>
            </View>
          )}

          {/* Lista de Jugadores Unidos */}
          <View className="flex-row justify-between items-center mb-2">
            <Text className="text-slate-400 text-xs font-bold uppercase">
              Jugadores ({playersData.length} / {requiredPlayers})
            </Text>
            <Text className="text-amber-400 text-[10px] animate-pulse">En vivo</Text>
          </View>

          <View className="bg-slate-950 rounded-2xl p-3 border border-slate-800 mb-6 max-h-48">
            {playersData.length === 0 ? (
              <Text className="text-slate-500 text-xs italic text-center py-3">Esperando que se unan...</Text>
            ) : (
              playersData.map((player, index) => (
                <View key={index} className="flex-row items-center justify-between py-2 border-b border-slate-900 last:border-b-0">
                  <View className="flex-row items-center flex-1">
                    <View className="w-8 h-8 rounded-full bg-slate-800 border border-amber-400/40 items-center justify-center mr-2.5 overflow-hidden">
                      {player.avatar ? (
                        <Image source={{ uri: player.avatar }} className="w-full h-full" />
                      ) : (
                        <Text className="text-amber-400 font-bold text-xs">
                          {player.name.charAt(0).toUpperCase()}
                        </Text>
                      )}
                    </View>
                    <Text className="text-white font-bold text-sm truncate">{player.name}</Text>
                  </View>

                  <View className="bg-emerald-500/10 px-2 py-0.5 rounded-full border border-emerald-500/30">
                    <Text className="text-emerald-400 font-bold text-[10px]">Listo</Text>
                  </View>
                </View>
              ))
            )}
          </View>

          {/* Opciones 2v2 cambiar de equipo */}
          {mode === '2v2' && onSwitchTeam && (
            <View className="flex-row justify-between mb-5">
              <Pressable
                onPress={() => onSwitchTeam(1)}
                className="flex-1 py-2 bg-slate-800 rounded-xl mr-1 border border-slate-700 items-center"
              >
                <Text className="text-cyan-400 font-bold text-xs">Equipo 1</Text>
              </Pressable>
              <Pressable
                onPress={() => onSwitchTeam(2)}
                className="flex-1 py-2 bg-slate-800 rounded-xl ml-1 border border-slate-700 items-center"
              >
                <Text className="text-rose-400 font-bold text-xs">Equipo 2</Text>
              </Pressable>
            </View>
          )}

          {/* Botón Cancelar */}
          <Pressable
            onPress={onCancelRoom}
            className="bg-red-500/10 active:bg-red-500/20 border border-red-500/30 p-3.5 rounded-2xl flex-row items-center justify-center"
          >
            <LogOut color="#ef4444" size={18} className="mr-2" />
            <Text className="text-red-400 font-bold text-sm">Cancelar y Salir</Text>
          </Pressable>
        </View>
      </View>
    </Modal>
  );
}
