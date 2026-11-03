import React, { useState } from 'react';
import {
  View,
  Text,
  Pressable,
  Alert,
  useWindowDimensions,
  StyleSheet,
} from 'react-native';
import { Swords, Users, X } from 'lucide-react-native';

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
  const { width: windowWidth, height: windowHeight } = useWindowDimensions();
  const [selectedMode, setSelectedMode] = useState<'1v1' | '2v2'>('1v1');
  const [selectedBet, setSelectedBet] = useState<number>(0);

  if (!visible) return null;

  const handleConfirm = () => {
    if (selectedBet > userCoins) {
      Alert.alert('Monedas insuficientes', 'No tienes suficientes monedas para esta apuesta.');
      return;
    }
    onCreateRoom(selectedMode, selectedBet);
  };

  const cardWidth = Math.min(Math.max(windowWidth - 32, 280), 370);

  return (
    <View
      style={[
        StyleSheet.absoluteFillObject,
        {
          width: windowWidth,
          height: windowHeight,
          backgroundColor: 'rgba(0, 0, 0, 0.82)',
          justifyContent: 'center',
          alignItems: 'center',
          padding: 16,
          zIndex: 999999,
          elevation: 999999,
        },
      ]}
    >
      <Pressable style={StyleSheet.absoluteFillObject} onPress={onClose} />

      <View
        style={{
          width: cardWidth,
          backgroundColor: '#0f172a',
          borderWidth: 1.5,
          borderColor: '#1e293b',
          borderRadius: 24,
          padding: 22,
        }}
      >
        {/* Header */}
        <View
          style={{
            flexDirection: 'row',
            justifyContent: 'space-between',
            alignItems: 'center',
            marginBottom: 18,
          }}
        >
          <View>
            <Text style={{ color: '#fbbf24', fontWeight: '800', fontSize: 19 }}>
              Crear Sala Privada
            </Text>
            <Text style={{ color: '#94a3b8', fontSize: 12, marginTop: 2 }}>
              Configura tu partida personalizada
            </Text>
          </View>
          <Pressable
            onPress={onClose}
            style={{
              padding: 8,
              backgroundColor: '#1e293b',
              borderRadius: 12,
            }}
          >
            <X color="#94a3b8" size={18} />
          </Pressable>
        </View>

        {/* Selector de Modo (1v1 / 2v2) */}
        <Text
          style={{
            color: '#94a3b8',
            fontSize: 11,
            fontWeight: '800',
            textTransform: 'uppercase',
            marginBottom: 8,
          }}
        >
          Modo de Juego
        </Text>
        <View style={{ flexDirection: 'row', gap: 10, marginBottom: 18 }}>
          <Pressable
            onPress={() => setSelectedMode('1v1')}
            style={{
              flex: 1,
              paddingVertical: 12,
              borderRadius: 14,
              flexDirection: 'row',
              alignItems: 'center',
              justifyContent: 'center',
              gap: 8,
              backgroundColor: selectedMode === '1v1' ? '#f59e0b' : '#1e293b',
              borderWidth: 1,
              borderColor: selectedMode === '1v1' ? '#fbbf24' : '#334155',
            }}
          >
            <Swords color={selectedMode === '1v1' ? '#020617' : '#94a3b8'} size={18} />
            <Text
              style={{
                fontWeight: '800',
                fontSize: 14,
                color: selectedMode === '1v1' ? '#020617' : '#cbd5e1',
              }}
            >
              1 vs 1
            </Text>
          </Pressable>

          <Pressable
            onPress={() => setSelectedMode('2v2')}
            style={{
              flex: 1,
              paddingVertical: 12,
              borderRadius: 14,
              flexDirection: 'row',
              alignItems: 'center',
              justifyContent: 'center',
              gap: 8,
              backgroundColor: selectedMode === '2v2' ? '#f59e0b' : '#1e293b',
              borderWidth: 1,
              borderColor: selectedMode === '2v2' ? '#fbbf24' : '#334155',
            }}
          >
            <Users color={selectedMode === '2v2' ? '#020617' : '#94a3b8'} size={18} />
            <Text
              style={{
                fontWeight: '800',
                fontSize: 14,
                color: selectedMode === '2v2' ? '#020617' : '#cbd5e1',
              }}
            >
              2 vs 2
            </Text>
          </Pressable>
        </View>

        {/* Selector de Apuesta en Monedas */}
        <Text
          style={{
            color: '#94a3b8',
            fontSize: 11,
            fontWeight: '800',
            textTransform: 'uppercase',
            marginBottom: 8,
          }}
        >
          Apuesta en Monedas (🪙 Tu Saldo: {userCoins})
        </Text>
        <View
          style={{
            flexDirection: 'row',
            flexWrap: 'wrap',
            justifyContent: 'space-between',
            marginBottom: 20,
          }}
        >
          {BET_OPTIONS.map((bet) => {
            const isDisabled = bet > userCoins;
            const isSelected = selectedBet === bet;

            return (
              <Pressable
                key={bet}
                disabled={isDisabled}
                onPress={() => setSelectedBet(bet)}
                style={{
                  width: '31%',
                  paddingVertical: 10,
                  marginBottom: 8,
                  borderRadius: 12,
                  alignItems: 'center',
                  backgroundColor: isSelected
                    ? '#f59e0b'
                    : isDisabled
                    ? '#020617'
                    : '#1e293b',
                  borderWidth: 1,
                  borderColor: isSelected
                    ? '#fbbf24'
                    : isDisabled
                    ? '#1e293b'
                    : '#334155',
                  opacity: isDisabled ? 0.45 : 1,
                }}
              >
                <Text
                  style={{
                    fontWeight: '800',
                    fontSize: 12,
                    color: isSelected ? '#020617' : '#fbbf24',
                  }}
                >
                  {bet === 0 ? 'Gratis' : `🪙 ${bet}`}
                </Text>
              </Pressable>
            );
          })}
        </View>

        {/* Botón de Confirmación */}
        <Pressable
          onPress={handleConfirm}
          style={({ pressed }) => ({
            width: '100%',
            backgroundColor: pressed ? '#d97706' : '#f59e0b',
            paddingVertical: 14,
            borderRadius: 14,
            alignItems: 'center',
          })}
        >
          <Text
            style={{
              color: '#020617',
              fontWeight: '900',
              fontSize: 14,
              textTransform: 'uppercase',
              letterSpacing: 1,
            }}
          >
            Confirmar y Crear Sala
          </Text>
        </Pressable>
      </View>
    </View>
  );
}
